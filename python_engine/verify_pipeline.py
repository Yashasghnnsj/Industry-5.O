import os
import sys

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from pose_pipeline import PoseProcessor
import db_manager

def run_test():
    processor = PoseProcessor(load_kg=5.0)

    # Create synthetic test frame
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.circle(img, (320, 100), 25, (200, 200, 200), -1)
    cv2.line(img, (320, 125), (320, 280), (200, 200, 200), 10)
    cv2.line(img, (320, 150), (250, 220), (200, 200, 200), 8)
    cv2.line(img, (320, 150), (390, 220), (200, 200, 200), 8)

    safety_poly = [(0.65, 0.15), (0.95, 0.15), (0.95, 0.90), (0.65, 0.90)]
    telemetry, annotated = processor.process_frame(img, safety_polygon=safety_poly, db_log=True)

    print("[+] Test Frame processed successfully:")
    print(f"    RULA Score: {telemetry['rula_score']} ({telemetry['rula_breakdown']['riskLevel']})")
    print(f"    REBA Score: {telemetry['reba_score']} ({telemetry['reba_breakdown']['riskLevel']})")
    print(f"    Trunk Flexion: {telemetry['angles']['trunkFlexion']} deg")
    print(f"    Upper Arm Angle: {telemetry['angles']['upperArmRight']} deg")
    print(f"    Fatigue Index: {telemetry['fatigue_index']}%")

    stats = db_manager.get_shift_statistics()
    print("[+] SQLite DB Persistence Verified:")
    print(f"    Total Logged Frames: {stats['total_frames']}")
    print(f"    Avg RULA: {stats['avg_rula']}")

if __name__ == "__main__":
    run_test()
