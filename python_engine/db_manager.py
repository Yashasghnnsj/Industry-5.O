"""
SQLite Database and Telemetry Persistence Module
Manages ergonomics.db for shift analytics, incidents, and break recommendations.
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "ergonomics.db")

def init_db(db_path: str = DB_PATH):
    """Initializes tables in ergonomics.db if they do not exist."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ergonomics_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        rula_score INTEGER NOT NULL,
        reba_score INTEGER NOT NULL,
        trunk_angle REAL NOT NULL,
        neck_angle REAL NOT NULL,
        upper_arm_angle REAL NOT NULL,
        lower_arm_angle REAL NOT NULL,
        knee_angle REAL NOT NULL,
        fatigue_index REAL NOT NULL,
        is_breached INTEGER NOT NULL,
        is_sustained_hold INTEGER NOT NULL,
        frame_index INTEGER NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        score INTEGER NOT NULL,
        details TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shift_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_date TEXT NOT NULL,
        avg_rula REAL NOT NULL,
        peak_rula INTEGER NOT NULL,
        avg_reba REAL NOT NULL,
        peak_reba INTEGER NOT NULL,
        total_cycles INTEGER NOT NULL,
        breach_count INTEGER NOT NULL,
        total_frames INTEGER NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def log_telemetry(data: Dict[str, Any], db_path: str = DB_PATH):
    """Inserts a real-time frame telemetry record."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO ergonomics_logs (
        timestamp, rula_score, reba_score, trunk_angle, neck_angle,
        upper_arm_angle, lower_arm_angle, knee_angle, fatigue_index,
        is_breached, is_sustained_hold, frame_index
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("timestamp", datetime.utcnow().isoformat()),
        data.get("rula_score", 1),
        data.get("reba_score", 1),
        data.get("trunk_angle", 0.0),
        data.get("neck_angle", 0.0),
        data.get("upper_arm_angle", 0.0),
        data.get("lower_arm_angle", 0.0),
        data.get("knee_angle", 0.0),
        data.get("fatigue_index", 0.0),
        1 if data.get("is_breached", False) else 0,
        1 if data.get("is_sustained_hold", False) else 0,
        data.get("frame_index", 0)
    ))
    conn.commit()
    conn.close()

def log_incident(event_type: str, score: int, details: str, db_path: str = DB_PATH):
    """Inserts a high-priority ergonomic or hazard boundary incident."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO incidents (timestamp, event_type, score, details)
    VALUES (?, ?, ?, ?)
    """, (datetime.utcnow().isoformat(), event_type, score, details))
    conn.commit()
    conn.close()

def get_recent_logs(limit: int = 50, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieves recent telemetry entries for frontend dashboards."""
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ergonomics_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_shift_statistics(db_path: str = DB_PATH) -> Dict[str, Any]:
    """Computes aggregated shift statistics directly using SQL."""
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        COUNT(*),
        AVG(rula_score),
        MAX(rula_score),
        AVG(reba_score),
        MAX(reba_score),
        SUM(is_breached),
        SUM(is_sustained_hold)
    FROM ergonomics_logs
    """)
    row = cursor.fetchone()
    conn.close()

    total_records = row[0] or 0
    if total_records == 0:
        return {
            "total_frames": 0,
            "avg_rula": 1.0,
            "peak_rula": 1,
            "avg_reba": 1.0,
            "peak_reba": 1,
            "total_breaches": 0,
            "sustained_holds": 0,
        }

    return {
        "total_frames": total_records,
        "avg_rula": round(row[1] or 1.0, 2),
        "peak_rula": int(row[2] or 1),
        "avg_reba": round(row[3] or 1.0, 2),
        "peak_reba": int(row[4] or 1),
        "total_breaches": int(row[5] or 0),
        "sustained_holds": int(row[6] or 0),
    }

# Run init on module load
init_db()
