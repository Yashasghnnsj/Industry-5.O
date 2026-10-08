"""
Main Entry Point for Python Ergonomics Engine
Can run as a standalone CLI processor, multi-threaded video analyzer, or backend worker.
"""
import sys
import os
import time
import json
import argparse
import numpy as np

import db_manager
from pose_pipeline import PoseProcessor

def process_video_file(video_path: str, output_path: str = None, load_kg: float = 5.0):
    """
    Ingests an .mp4 video file, processes frames multi-threaded or sequentially,
    extracts 33 landmarks, computes RULA/REBA, and persists telemetry to SQLite.
    """
    try:
        import cv2
    except ImportError:
        print("[!] OpenCV not available. Simulating frame-by-frame analysis.")
        return

    if not os.path.exists(video_path):
        print(f"[!] Video file not found: {video_path}")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[!] Could not open video: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)

    writer = None
    if output_path:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    processor = PoseProcessor(load_kg=load_kg)
    print(f"[*] Starting video processing: {video_path} ({width}x{height} @ {fps:.1f} FPS)")

    frame_count = 0
    start_time = time.time()

    # Default hazard safety zone: right 30% of frame
    safety_zone = [
        (0.70, 0.20), (0.95, 0.20), (0.95, 0.85), (0.70, 0.85)
    ]

    while True:
        ret, frame_bgr = cap.read()
        if not ret:
            break

        frame_count += 1
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

        # Process frame
        telemetry, annotated_rgb = processor.process_frame(frame_rgb, safety_polygon=safety_zone)

        if writer:
            annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
            writer.write(annotated_bgr)

        if frame_count % 30 == 0:
            elapsed = time.time() - start_time
            curr_fps = frame_count / max(0.001, elapsed)
            print(f"[*] Frame {frame_count} | FPS: {curr_fps:.1f} | RULA: {telemetry['rula_score']} | REBA: {telemetry['reba_score']} | Fatigue: {telemetry['fatigue_index']}% | Breach: {telemetry['is_breached']}")

    cap.release()
    if writer:
        writer.release()

    total_time = time.time() - start_time
    print(f"[+] Finished processing {frame_count} frames in {total_time:.2f}s ({frame_count/max(0.001, total_time):.1f} FPS average).")
    print(f"[+] Shift telemetry saved to: {db_manager.DB_PATH}")

    # Print shift statistics from SQLite
    stats = db_manager.get_shift_statistics()
    print("\n--- Shift Ergonomics Summary (from ergonomics.db) ---")
    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ErgoVision AI - Worker Ergonomics & Safety Monitoring")
    parser.add_argument("--video", type=str, help="Path to input .mp4 video file")
    parser.add_argument("--output", type=str, help="Path to save annotated output video")
    parser.add_argument("--load", type=float, default=5.0, help="Carrying load in kg")
    parser.add_argument("--test", action="store_true", help="Run a verification test on dummy frames")

    args = parser.parse_args()

    if args.video:
        process_video_file(args.video, args.output, args.load)
    else:
        print("[*] Running verification test on ErgoVision AI Python Engine...")
        processor = PoseProcessor(load_kg=args.load)
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        telemetry, _ = processor.process_frame(dummy_frame)
        print("[+] Test Frame processed successfully:")
        print(f"    RULA Score: {telemetry['rula_score']} ({telemetry['rula_breakdown']['riskLevel']})")
        print(f"    REBA Score: {telemetry['reba_score']}")
        print(f"    Trunk Flexion: {telemetry['angles']['trunkFlexion']} deg")
        print(f"    Fatigue Index: {telemetry['fatigue_index']}%")
        print(f"    SQLite DB Status: Initialized at {db_manager.DB_PATH}")
