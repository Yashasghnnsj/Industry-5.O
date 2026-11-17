"""
SQLite Database and Telemetry Persistence Module
Manages ergonomics.db for shift analytics, incidents, fatigue indices, and Pandas exports.
"""
import sqlite3
import os
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "ergonomics.db")


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Returns a thread-safe sqlite3 connection with Row factory."""
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str = DB_PATH):
    """Initializes tables and indexes in ergonomics.db if they do not exist."""
    conn = get_connection(db_path)
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
        rep_count INTEGER DEFAULT 0,
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
        sustained_holds INTEGER NOT NULL,
        total_frames INTEGER NOT NULL
    )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ergo_ts ON ergonomics_logs (timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_incident_ts ON incidents (timestamp);")

    # Migration check for rep_count column if upgrading existing DB
    cursor.execute("PRAGMA table_info(ergonomics_logs)")
    columns = [row[1] for row in cursor.fetchall()]
    if "rep_count" not in columns:
        try:
            cursor.execute("ALTER TABLE ergonomics_logs ADD COLUMN rep_count INTEGER DEFAULT 0;")
        except Exception:
            pass

    conn.commit()
    conn.close()


def log_telemetry(data: Dict[str, Any], db_path: str = DB_PATH):
    """Inserts a real-time frame telemetry record."""
    try:
        conn = get_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO ergonomics_logs (
            timestamp, rula_score, reba_score, trunk_angle, neck_angle,
            upper_arm_angle, lower_arm_angle, knee_angle, fatigue_index,
            is_breached, is_sustained_hold, rep_count, frame_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("timestamp", datetime.utcnow().isoformat()),
            int(data.get("rula_score", 1)),
            int(data.get("reba_score", 1)),
            float(data.get("trunk_angle", 0.0)),
            float(data.get("neck_angle", 0.0)),
            float(data.get("upper_arm_angle", 0.0)),
            float(data.get("lower_arm_angle", 0.0)),
            float(data.get("knee_angle", 0.0)),
            float(data.get("fatigue_index", 0.0)),
            1 if data.get("is_breached", False) else 0,
            1 if data.get("is_sustained_hold", False) else 0,
            int(data.get("rep_count", 0)),
            int(data.get("frame_index", 0))
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[!] Error logging telemetry to SQLite: {e}")


def log_incident(event_type: str, score: int, details: str, db_path: str = DB_PATH):
    """Inserts a high-priority ergonomic or hazard boundary incident."""
    try:
        conn = get_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO incidents (timestamp, event_type, score, details)
        VALUES (?, ?, ?, ?)
        """, (datetime.utcnow().isoformat(), event_type, score, details))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[!] Error logging incident: {e}")


def get_recent_logs(limit: int = 100, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieves recent telemetry entries."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ergonomics_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in reversed(rows)]


def get_recent_incidents(limit: int = 50, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieves recent high-risk incidents."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_telemetry_dataframe(limit: int = 500, db_path: str = DB_PATH) -> pd.DataFrame:
    """Returns telemetry data as a Pandas DataFrame for analytics and graphing."""
    init_db(db_path)
    conn = get_connection(db_path)
    df = pd.read_sql_query(f"SELECT * FROM ergonomics_logs ORDER BY id DESC LIMIT {limit}", conn)
    conn.close()
    if not df.empty:
        df = df.sort_values("id").reset_index(drop=True)
    return df


def get_shift_statistics(db_path: str = DB_PATH) -> Dict[str, Any]:
    """Computes aggregated shift statistics directly using SQL."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        COUNT(*),
        AVG(rula_score),
        MAX(rula_score),
        AVG(reba_score),
        MAX(reba_score),
        SUM(is_breached),
        SUM(is_sustained_hold),
        AVG(fatigue_index),
        MAX(fatigue_index),
        MAX(rep_count)
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
            "avg_fatigue": 0.0,
            "peak_fatigue": 0.0,
            "total_cycles": 0,
        }

    return {
        "total_frames": total_records,
        "avg_rula": round(row[1] or 1.0, 2),
        "peak_rula": int(row[2] or 1),
        "avg_reba": round(row[3] or 1.0, 2),
        "peak_reba": int(row[4] or 1),
        "total_breaches": int(row[5] or 0),
        "sustained_holds": int(row[6] or 0),
        "avg_fatigue": round(row[7] or 0.0, 1),
        "peak_fatigue": round(row[8] or 0.0, 1),
        "total_cycles": int(row[9] or 0),
    }


def clear_database(db_path: str = DB_PATH):
    """Clears all records for session reset."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ergonomics_logs")
    cursor.execute("DELETE FROM incidents")
    cursor.execute("DELETE FROM shift_summary")
    conn.commit()
    conn.close()


# Auto-initialize database on import
init_db()
