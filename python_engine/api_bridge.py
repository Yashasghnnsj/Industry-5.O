"""
API Bridge between Python Engine and Web Application
Executes SQLite queries, logs real-time frame telemetry, and processes video files.
"""
import sys
import json
import os

import db_manager
from geometry_math import calculate_angle_3d, calculate_vertical_inclination
from rula_reba import calculate_rula, calculate_reba

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        return

    cmd = sys.argv[1]

    if cmd == "stats":
        stats = db_manager.get_shift_statistics()
        print(json.dumps(stats))

    elif cmd == "logs":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        logs = db_manager.get_recent_logs(limit)
        print(json.dumps(logs))

    elif cmd == "log":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No data payload"}))
            return
        try:
            payload = json.loads(sys.argv[2])
            db_manager.log_telemetry(payload)
            if payload.get("is_breached"):
                db_manager.log_incident("HAZARD_BREACH", payload.get("rula_score", 1), "Worker safety zone breach recorded")
            print(json.dumps({"status": "ok"}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    elif cmd == "clear":
        conn = db_manager.sqlite3.connect(db_manager.DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM ergonomics_logs")
        c.execute("DELETE FROM incidents")
        conn.commit()
        conn.close()
        print(json.dumps({"status": "cleared"}))

    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}))

if __name__ == "__main__":
    main()
