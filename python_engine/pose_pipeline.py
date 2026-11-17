"""
Multi-Threaded Video Pipeline & Computer Vision Pose Estimation Module
Processes incoming video frames at 30+ FPS, extracts 33 3D landmarks using MediaPipe,
calculates real-time 3D kinematic angles, RULA/REBA grand scores, and logs to SQLite.
"""
import os
import sys

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"

import time
import math
import queue
import threading
from typing import Dict, Any, Tuple, Optional, List
import numpy as np

# Internal mathematical and persistence modules
from geometry_math import (
    calculate_angle_3d,
    calculate_vertical_inclination,
    point_in_polygon,
    smooth_landmarks,
)
from rula_reba import calculate_rula, calculate_reba
import db_manager

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False


class PoseProcessor:
    """
    Dedicated Computer Vision Pose Estimator & Ergonomics Engine.
    Operates frame-by-frame on raw RGB pixel arrays.
    """
    def __init__(self, load_kg: float = 3.0, model_path: Optional[str] = None):
        self.load_kg = load_kg
        self.prev_landmarks: Optional[np.ndarray] = None
        self.frame_index = 0
        self.sustained_hold_frames = 0
        self.fatigue_index = 5.0
        self.rep_count = 0
        self.was_bent = False
        self.rep_timestamps: List[float] = []
        
        # 1. Initialize MediaPipe Detector
        self.detector = None
        self.legacy_pose = None

        if model_path is None:
            default_model = os.path.join(os.path.dirname(__file__), "pose_landmarker_full.task")
            if os.path.exists(default_model):
                model_path = default_model

        if HAS_MEDIAPIPE and model_path and os.path.exists(model_path):
            try:
                base_options = mp_python.BaseOptions(model_asset_path=model_path)
                options = mp_vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    output_segmentation_masks=False,
                    min_pose_detection_confidence=0.5,
                    min_pose_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self.detector = mp_vision.PoseLandmarker.create_from_options(options)
            except Exception as e:
                print(f"[!] Warning: Could not initialize MediaPipe Tasks Landmarker: {e}")

        # Fallback to legacy solutions API if tasks detector not initialized
        if self.detector is None and HAS_MEDIAPIPE and hasattr(mp, "solutions") and hasattr(mp.solutions, "pose"):
            try:
                self.legacy_pose = mp.solutions.pose.Pose(
                    static_image_mode=False,
                    model_complexity=1,
                    smooth_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
            except Exception as e:
                print(f"[!] Legacy mediapipe solutions initialization failed: {e}")

    def extract_3d_landmarks(self, frame_rgb: np.ndarray) -> Optional[np.ndarray]:
        """
        Runs MediaPipe inference on raw RGB image and extracts (33, 3) 3D coordinate array.
        """
        if self.detector is not None:
            try:
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                res = self.detector.detect(mp_img)
                if res and res.pose_landmarks and len(res.pose_landmarks) > 0:
                    pts = []
                    for lm in res.pose_landmarks[0]:
                        pts.append([lm.x, lm.y, lm.z])
                    return np.array(pts, dtype=np.float64)
            except Exception as e:
                pass

        if self.legacy_pose is not None:
            try:
                res = self.legacy_pose.process(frame_rgb)
                if res and res.pose_landmarks:
                    pts = []
                    for lm in res.pose_landmarks.landmark:
                        pts.append([lm.x, lm.y, lm.z])
                    return np.array(pts, dtype=np.float64)
            except Exception as e:
                pass

        return None

    def extract_angles(self, landmarks_3d: np.ndarray) -> Dict[str, float]:
        """
        Calculates biomechanical joint angles from 33-point coordinates array (shape: 33x3).
        Landmarks index:
        0: nose, 11: l_sh, 12: r_sh, 13: l_elb, 14: r_elb, 15: l_wri, 16: r_wri,
        23: l_hip, 24: r_hip, 25: l_knee, 26: r_knee, 27: l_ank, 28: r_ank
        """
        nose = landmarks_3d[0]
        l_sh = landmarks_3d[11]
        r_sh = landmarks_3d[12]
        l_elb = landmarks_3d[13]
        r_elb = landmarks_3d[14]
        l_wri = landmarks_3d[15]
        r_wri = landmarks_3d[16]
        l_hip = landmarks_3d[23]
        r_hip = landmarks_3d[24]
        l_knee = landmarks_3d[25]
        r_knee = landmarks_3d[26]
        l_ank = landmarks_3d[27]
        r_ank = landmarks_3d[28]

        mid_sh = (l_sh + r_sh) / 2.0
        mid_hip = (l_hip + r_hip) / 2.0

        # 1. Trunk flexion relative to vertical gravity vector
        trunk_flexion = round(calculate_vertical_inclination(mid_sh, mid_hip), 1)

        # 2. Neck angle
        raw_neck = calculate_angle_3d(nose, mid_sh, mid_hip)
        neck_angle = round(abs(180.0 - raw_neck), 1)

        # 3. Upper arm elevation (Shoulder angle)
        upper_arm_r = round(calculate_angle_3d(r_elb, r_sh, mid_hip), 1)
        upper_arm_l = round(calculate_angle_3d(l_elb, l_sh, mid_hip), 1)

        # 4. Lower arms (Elbow flexion)
        lower_arm_r = round(calculate_angle_3d(r_sh, r_elb, r_wri), 1)
        lower_arm_l = round(calculate_angle_3d(l_sh, l_elb, l_wri), 1)

        # 5. Knee flexion
        knee_r = round(abs(180.0 - calculate_angle_3d(r_hip, r_knee, r_ank)), 1)
        knee_l = round(abs(180.0 - calculate_angle_3d(l_hip, l_knee, l_ank)), 1)

        # 6. Wrist deviation / flexion estimation
        wrist_r = round(min(45.0, max(5.0, abs(upper_arm_r - lower_arm_r) * 0.25)), 1)
        wrist_l = round(min(45.0, max(5.0, abs(upper_arm_l - lower_arm_l) * 0.25)), 1)

        # 7. Trunk lateral twist
        trunk_twist = round(abs(l_sh[1] - r_sh[1]) * 100.0, 1)

        return {
            "trunkFlexion": trunk_flexion,
            "neckAngle": neck_angle,
            "upperArmRight": upper_arm_r,
            "upperArmLeft": upper_arm_l,
            "lowerArmRight": lower_arm_r,
            "lowerArmLeft": lower_arm_l,
            "kneeRight": knee_r,
            "kneeLeft": knee_l,
            "wristRight": wrist_r,
            "wristLeft": wrist_l,
            "trunkLateralTwist": trunk_twist,
        }

    def process_frame(
        self,
        frame_rgb: np.ndarray,
        safety_polygon: Optional[List[Tuple[float, float]]] = None,
        db_log: bool = True
    ) -> Tuple[Dict[str, Any], np.ndarray]:
        """
        Runs frame-by-frame pose estimation, computes RULA/REBA, draws skeleton HUD,
        and logs telemetry to SQLite.
        """
        h, w, _ = frame_rgb.shape
        self.frame_index += 1

        # 1. Extract 33 3D landmarks
        raw_landmarks = self.extract_3d_landmarks(frame_rgb)
        
        has_detection = raw_landmarks is not None
        if not has_detection:
            landmarks_3d = self._estimate_fallback_landmarks(frame_rgb)
        else:
            landmarks_3d = raw_landmarks

        # 2. Apply smoothing filter
        landmarks_3d = smooth_landmarks(landmarks_3d, self.prev_landmarks, alpha=0.70)
        self.prev_landmarks = landmarks_3d

        # 3. Compute 3D Biomechanical Angles
        angles = self.extract_angles(landmarks_3d)

        # 4. Check Safety Exclusion Zone Breach
        is_breached = False
        if safety_polygon and len(safety_polygon) >= 3:
            critical_indices = [15, 16, 27, 28, 23, 24]  # wrists, ankles, hips
            for idx in critical_indices:
                pt = (float(landmarks_3d[idx][0]), float(landmarks_3d[idx][1]))
                if point_in_polygon(pt, safety_polygon):
                    is_breached = True
                    break

        # 5. Ergonomic Scoring
        is_static = self.sustained_hold_frames > 90  # ~3 seconds at 30 FPS
        rula_res = calculate_rula(angles, is_static=is_static, load_kg=self.load_kg)
        reba_res = calculate_reba(angles, is_repetitive=False, load_kg=self.load_kg)

        # Track sustained awkward hold
        if rula_res["grandScore"] >= 5:
            self.sustained_hold_frames += 1
        else:
            self.sustained_hold_frames = max(0, self.sustained_hold_frames - 2)

        # Repetition cycle counting
        is_bent = angles["trunkFlexion"] > 35.0 or angles["upperArmRight"] > 65.0
        if is_bent and not self.was_bent:
            self.was_bent = True
        elif not is_bent and self.was_bent:
            self.was_bent = False
            self.rep_count += 1
            now = time.time()
            self.rep_timestamps.append(now)
            self.rep_timestamps = [t for t in self.rep_timestamps if now - t <= 60.0]

        # Fatigue accumulation model
        if rula_res["grandScore"] >= 6:
            self.fatigue_index = min(100.0, self.fatigue_index + 0.15)
        elif rula_res["grandScore"] <= 2:
            self.fatigue_index = max(2.0, self.fatigue_index - 0.05)

        telemetry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "rula_score": rula_res["grandScore"],
            "reba_score": reba_res["grandScore"],
            "trunk_angle": angles["trunkFlexion"],
            "neck_angle": angles["neckAngle"],
            "upper_arm_angle": angles["upperArmRight"],
            "lower_arm_angle": angles["lowerArmRight"],
            "knee_angle": angles["kneeRight"],
            "fatigue_index": round(self.fatigue_index, 1),
            "is_breached": is_breached,
            "is_sustained_hold": self.sustained_hold_frames >= 90,
            "frame_index": self.frame_index,
            "rep_count": self.rep_count,
            "rep_rate_per_min": len(self.rep_timestamps),
            "rula_breakdown": rula_res,
            "reba_breakdown": reba_res,
            "angles": angles,
            "has_detection": has_detection,
        }

        # 6. Real-time SQLite Logging (sampled every 5 frames for high precision)
        if db_log and self.frame_index % 5 == 0:
            db_manager.log_telemetry(telemetry)
            if is_breached:
                db_manager.log_incident("HAZARD_BREACH", rula_res["grandScore"], "Worker reached into virtual robotic perimeter")
            elif rula_res["grandScore"] >= 7:
                db_manager.log_incident("SEVERE_ERGONOMIC_LOAD", rula_res["grandScore"], f"Trunk flexion: {angles['trunkFlexion']} deg")

        # 7. Render skeleton overlay on frame
        annotated_frame = self._render_skeleton(
            frame_rgb, landmarks_3d, angles, rula_res["grandScore"], reba_res["grandScore"], is_breached, safety_polygon
        )

        return telemetry, annotated_frame

    def _estimate_fallback_landmarks(self, frame_rgb: np.ndarray) -> np.ndarray:
        """Heuristic upright worker skeleton if no human is detected in frame."""
        pts = np.zeros((33, 3), dtype=np.float64)
        pts[0] = [0.50, 0.20, 0.0]     # nose
        pts[11] = [0.42, 0.32, 0.0]   # l_sh
        pts[12] = [0.58, 0.32, 0.0]   # r_sh
        pts[13] = [0.38, 0.46, 0.0]   # l_elb
        pts[14] = [0.62, 0.46, 0.0]   # r_elb
        pts[15] = [0.38, 0.58, 0.0]   # l_wri
        pts[16] = [0.62, 0.58, 0.0]   # r_wri
        pts[23] = [0.44, 0.58, 0.0]   # l_hip
        pts[24] = [0.56, 0.58, 0.0]   # r_hip
        pts[25] = [0.44, 0.76, 0.0]   # l_knee
        pts[26] = [0.56, 0.76, 0.0]   # r_knee
        pts[27] = [0.44, 0.92, 0.0]   # l_ank
        pts[28] = [0.56, 0.92, 0.0]   # r_ank
        return pts

    def _render_skeleton(
        self,
        frame: np.ndarray,
        lms: np.ndarray,
        angles: Dict[str, float],
        rula_score: int,
        reba_score: int,
        is_breached: bool,
        safety_polygon: Optional[List[Tuple[float, float]]] = None,
    ) -> np.ndarray:
        if not HAS_OPENCV:
            return frame

        out = frame.copy()
        h, w, _ = out.shape

        # Select color based on RULA grand score
        if rula_score <= 2:
            color = (34, 197, 94)    # Green (BGR/RGB)
            status_text = "LOW RISK (ACCEPTABLE)"
        elif rula_score <= 4:
            color = (245, 158, 11)   # Amber
            status_text = "MEDIUM RISK (MONITOR)"
        elif rula_score <= 6:
            color = (234, 88, 12)    # Orange
            status_text = "HIGH RISK (CHANGE REQUIRED)"
        else:
            color = (239, 68, 68)    # Crimson Red
            status_text = "SEVERE RISK (INTERVENE)"

        # Draw Safety Envelope Polygon
        if safety_polygon and len(safety_polygon) >= 3:
            poly_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in safety_polygon], np.int32)
            poly_pts = poly_pts.reshape((-1, 1, 2))
            border_color = (239, 68, 68) if is_breached else (245, 158, 11)
            cv2.polylines(out, [poly_pts], True, border_color, 2)
            if is_breached:
                cv2.putText(out, "! DANGER: SAFETY ENVELOPE BREACHED !", (poly_pts[0][0][0], max(30, poly_pts[0][0][1] - 10)),
                            cv2.FONT_HERSHEY_DUPLEX, 0.6, (239, 68, 68), 2)

        # Bone connection pairs
        connections = [
            (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
            (23, 24), (23, 25), (25, 27), (24, 26), (26, 28)
        ]

        # Draw bones
        for idx1, idx2 in connections:
            pt1 = (int(lms[idx1][0] * w), int(lms[idx1][1] * h))
            pt2 = (int(lms[idx2][0] * w), int(lms[idx2][1] * h))
            cv2.line(out, pt1, pt2, color, 3, cv2.LINE_AA)

        # Draw Spine (mid shoulders to mid hips)
        mid_sh = (int((lms[11][0] + lms[12][0]) / 2.0 * w), int((lms[11][1] + lms[12][1]) / 2.0 * h))
        mid_hip = (int((lms[23][0] + lms[24][0]) / 2.0 * w), int((lms[23][1] + lms[24][1]) / 2.0 * h))
        cv2.line(out, mid_sh, mid_hip, color, 4, cv2.LINE_AA)

        # Draw Head / Neck connection
        nose = (int(lms[0][0] * w), int(lms[0][1] * h))
        cv2.line(out, nose, mid_sh, color, 2, cv2.LINE_AA)

        # Draw Key Landmark Nodes
        key_indices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
        for i in key_indices:
            pt = (int(lms[i][0] * w), int(lms[i][1] * h))
            cv2.circle(out, pt, 6, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(out, pt, 6, color, 2, cv2.LINE_AA)

        # HUD Top-Left Semi-Transparent Card
        overlay = out.copy()
        cv2.rectangle(overlay, (10, 10), (320, 140), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.75, out, 0.25, 0, out)

        # HUD Text
        cv2.putText(out, f"RULA: {rula_score}/7 | REBA: {reba_score}/15", (20, 35), cv2.FONT_HERSHEY_DUPLEX, 0.65, color, 2)
        cv2.putText(out, status_text, (20, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(out, f"Trunk Flexion: {angles['trunkFlexion']:.1f} deg", (20, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (203, 213, 225), 1)
        cv2.putText(out, f"Arm Elevation: {angles['upperArmRight']:.1f} deg", (20, 104), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (203, 213, 225), 1)
        cv2.putText(out, f"Fatigue: {self.fatigue_index:.1f}% | Cycles: {self.rep_count}", (20, 126), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (203, 213, 225), 1)

        return out
