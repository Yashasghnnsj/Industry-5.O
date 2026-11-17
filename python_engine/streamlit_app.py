"""
🛡️ ErgoVision AI: Industry 5.0 Real-Time Worker Ergonomics & Safety Monitoring
Full Python + OpenCV + MediaPipe + SciPy + Pandas + SQLite + Streamlit Architecture.
Performs frame-by-frame 33-landmark 3D pose estimation, kinematic joint angle calculation,
standard RULA/REBA grand scoring, virtual safety zone monitoring, and shift analytics.
"""
import os
import sys

# Suppress background logging noise
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"

import time
import tempfile
from datetime import datetime
import numpy as np
import pandas as pd
import streamlit as st

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    import plotly.express as px
    import plotly.graph_objects as go
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

# Import local Python Ergonomics Engine modules
import db_manager
from geometry_math import calculate_angle_3d, calculate_vertical_inclination
from rula_reba import calculate_rula, calculate_reba
from pose_pipeline import PoseProcessor

# Configure Streamlit Page
st.set_page_config(
    page_title="ErgoVision AI - Industry 5.0 Ergonomics",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Industrial CSS Styling
st.markdown("""
<style>
    /* Dark Industrial Theme Overrides */
    .stApp {
        background-color: #0B0F19;
        color: #F1F5F9;
        font-family: 'Inter', -apple-system, sans-serif;
    }
    
    /* Top Header Glass Banner */
    .header-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    /* Metric Score Cards */
    .metric-card {
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 16px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .metric-title {
        color: #94A3B8;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
    }
    
    .metric-value {
        font-size: 2.1rem;
        font-weight: 800;
        margin-bottom: 4px;
    }
    
    .badge-safe { color: #10B981; }
    .badge-medium { color: #F59E0B; }
    .badge-high { color: #F97316; }
    .badge-severe { color: #EF4444; }

    /* Custom Streamlit component styling */
    div[data-testid="stMetricValue"] {
        font-size: 1.8rem !important;
        font-weight: 700;
    }
    
    .stProgress > div > div > div > div {
        background-color: #3B82F6;
    }
</style>
""", unsafe_allow_html=True)


def render_header():
    st.markdown("""
    <div class="header-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div>
                <h1 style="margin: 0; font-size: 1.9rem; font-weight: 800; color: #F8FAFC;">
                    🛡️ ErgoVision AI <span style="font-size: 1rem; color: #38BDF8; font-weight: 600; vertical-align: middle; margin-left: 8px;">INDUSTRY 5.0</span>
                </h1>
                <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 0.95rem;">
                    Real-Time Biomechanical Computer Vision · 33-Landmark Pose Estimation · RULA & REBA Analytics · SQLite Persistence
                </p>
            </div>
            <div style="text-align: right; margin-top: 8px;">
                <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #10B981; padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: 600;">
                    ● CV ENGINE ACTIVE (30+ FPS)
                </span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def main():
    render_header()

    # Sidebar Controls & Parameters
    st.sidebar.markdown("### ⚙️ Engine Parameters")
    load_kg = st.sidebar.slider("Lifting Load (kg)", min_value=0.0, max_value=30.0, value=5.0, step=0.5,
                               help="Weight of carried tools or lifted load for RULA/REBA force modifiers")
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("### ⚠️ Hazard Envelope Boundaries")
    enable_safety_zone = st.sidebar.checkbox("Enable Robotic Cell Safety Zone", value=True)
    zone_x_min = st.sidebar.slider("Safety Zone X-Min (%)", 0, 100, 65) / 100.0
    zone_x_max = st.sidebar.slider("Safety Zone X-Max (%)", 0, 100, 95) / 100.0

    safety_polygon = None
    if enable_safety_zone:
        safety_polygon = [
            (zone_x_min, 0.15),
            (zone_x_max, 0.15),
            (zone_x_max, 0.90),
            (zone_x_min, 0.90),
        ]

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🗄️ SQLite Database")
    if st.sidebar.button("🧹 Clear Shift Records"):
        db_manager.clear_database()
        st.sidebar.success("Database records cleared!")

    # Tab Navigation
    tab_video, tab_webcam, tab_analytics, tab_diagnostics = st.tabs([
        "📹 Video Ingestion & Processing",
        "📷 Live Webcam Stream",
        "📊 Shift Audit & SQLite Analytics",
        "📐 Biomechanical Joint Diagnostics"
    ])

    # ----------------------------------------------------------------------------------
    # TAB 1: Video File Ingestion & Frame-by-Frame Processing
    # ----------------------------------------------------------------------------------
    with tab_video:
        st.subheader("Process Unpredicted Video Footage (.mp4, .webm, .avi, .mov)")
        st.write("Upload any factory floor or worker video. The engine processes raw pixel frames with MediaPipe 33-landmark estimation and calculates exact RULA/REBA metrics.")

        uploaded_video = st.file_uploader("Select Video File", type=["mp4", "webm", "avi", "mov"])
        
        col_ctrl, col_stats = st.columns([1, 1])
        with col_ctrl:
            max_frames_to_process = st.number_input("Maximum Frames to Process (0 = All)", min_value=0, max_value=5000, value=300, step=50)
            start_btn = st.button("🚀 Start Computer Vision Processing", type="primary", use_container_width=True)

        if uploaded_video is not None and start_btn:
            tfile = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            tfile.write(uploaded_video.read())
            tfile.close()

            cap = cv2.VideoCapture(tfile.name)
            total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

            if max_frames_to_process > 0:
                frames_to_run = min(total_video_frames, max_frames_to_process)
            else:
                frames_to_run = total_video_frames

            st.info(f"Ingesting video: {total_video_frames} total frames detected ({fps:.1f} FPS). Processing {frames_to_run} frames...")

            processor = PoseProcessor(load_kg=load_kg)
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            frame_display_col, metrics_display_col = st.columns([3, 2])
            with frame_display_col:
                image_placeholder = st.empty()
            with metrics_display_col:
                score_placeholder = st.empty()

            frame_idx = 0
            start_time = time.time()
            rula_history = []
            reba_history = []
            fatigue_history = []

            while cap.isOpened() and frame_idx < frames_to_run:
                ret, frame_bgr = cap.read()
                if not ret:
                    break

                frame_idx += 1
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                
                # Dynamic algorithmic computation
                telemetry, annotated_rgb = processor.process_frame(frame_rgb, safety_polygon=safety_polygon, db_log=True)

                rula_history.append(telemetry["rula_score"])
                reba_history.append(telemetry["reba_score"])
                fatigue_history.append(telemetry["fatigue_index"])

                # Update live preview every 3 frames for UI responsiveness
                if frame_idx % 3 == 0 or frame_idx == frames_to_run:
                    image_placeholder.image(annotated_rgb, channels="RGB", use_container_width=True)
                    
                    progress_pct = frame_idx / float(frames_to_run)
                    progress_bar.progress(progress_pct)
                    
                    elapsed = time.time() - start_time
                    current_fps = frame_idx / max(0.001, elapsed)
                    status_text.text(f"Processed Frame {frame_idx}/{frames_to_run} | Speed: {current_fps:.1f} FPS | Elapsed: {elapsed:.1f}s")

                    with score_placeholder.container():
                        st.markdown(f"""
                        <div class="metric-card" style="margin-bottom: 12px; border-left: 4px solid {telemetry['rula_breakdown']['color']};">
                            <div class="metric-title">Current RULA Score</div>
                            <div class="metric-value" style="color: {telemetry['rula_breakdown']['color']};">{telemetry['rula_score']} / 7</div>
                            <div style="font-size: 0.9rem; font-weight: 600;">{telemetry['rula_breakdown']['riskLevel']} Risk</div>
                        </div>
                        <div class="metric-card" style="margin-bottom: 12px; border-left: 4px solid {telemetry['reba_breakdown']['color']};">
                            <div class="metric-title">Current REBA Score</div>
                            <div class="metric-value" style="color: {telemetry['reba_breakdown']['color']};">{telemetry['reba_score']} / 15</div>
                            <div style="font-size: 0.9rem; font-weight: 600;">{telemetry['reba_breakdown']['riskLevel']} Risk</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-title">Fatigue Accumulation Index</div>
                            <div class="metric-value" style="color: #38BDF8;">{telemetry['fatigue_index']}%</div>
                            <div style="font-size: 0.85rem; color: #94A3B8;">Cycle Count: {telemetry['rep_count']} Reps</div>
                        </div>
                        """, unsafe_allow_html=True)

            cap.release()
            total_duration = time.time() - start_time
            avg_processing_fps = frame_idx / max(0.001, total_duration)
            
            st.success(f"✅ Completed algorithmic analysis of {frame_idx} frames in {total_duration:.2f}s ({avg_processing_fps:.1f} FPS). All telemetry saved to SQLite (`ergonomics.db`).")

    # ----------------------------------------------------------------------------------
    # TAB 2: Live Webcam Stream
    # ----------------------------------------------------------------------------------
    with tab_webcam:
        st.subheader("Live Real-Time Webcam Stream Analysis")
        st.write("Capture real-time worker frames directly from your webcam. MediaPipe Pose extracts joint angles on the fly and evaluates ergonomic risk.")

        webcam_col1, webcam_col2 = st.columns([3, 2])
        
        with webcam_col1:
            camera_frame = st.camera_input("Take a Snapshot or Stream Frame from Camera")
            
            if camera_frame is not None:
                # Convert uploaded image buffer to OpenCV image
                file_bytes = np.asarray(bytearray(camera_frame.read()), dtype=np.uint8)
                img_bgr = cv2.imdecode(file_bytes, 1)
                img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

                processor = PoseProcessor(load_kg=load_kg)
                telemetry, annotated_rgb = processor.process_frame(img_rgb, safety_polygon=safety_polygon, db_log=True)

                st.image(annotated_rgb, caption="Analyzed Skeleton Overlay (RULA Color-Coded)", use_container_width=True)

                with webcam_col2:
                    st.markdown("### 📊 Instant Posture Scorecard")
                    c1, c2 = st.columns(2)
                    with c1:
                        st.metric("RULA Score", f"{telemetry['rula_score']} / 7", telemetry['rula_breakdown']['riskLevel'])
                    with c2:
                        st.metric("REBA Score", f"{telemetry['reba_score']} / 15", telemetry['reba_breakdown']['riskLevel'])

                    st.markdown("#### 🦾 Joint Strain Breakdown")
                    st.write(f"**Trunk Flexion**: {telemetry['angles']['trunkFlexion']}° (Safe threshold: < 20°)")
                    st.progress(min(1.0, telemetry['angles']['trunkFlexion'] / 60.0))

                    st.write(f"**Upper Arm (Right)**: {telemetry['angles']['upperArmRight']}° (Safe threshold: < 45°)")
                    st.progress(min(1.0, telemetry['angles']['upperArmRight'] / 90.0))

                    st.write(f"**Neck Angle**: {telemetry['angles']['neckAngle']}° (Safe threshold: < 10°)")
                    st.progress(min(1.0, telemetry['angles']['neckAngle'] / 45.0))

                    st.write(f"**Elbow Angle**: {telemetry['angles']['lowerArmRight']}° (Optimal: 60° - 100°)")
                    st.progress(min(1.0, telemetry['angles']['lowerArmRight'] / 140.0))

                    if telemetry['is_breached']:
                        st.error("🚨 CRITICAL WARNING: Worker breached the virtual robotic safety envelope!")
                    else:
                        st.success("✅ Worker is operating within the safe ergonomic perimeter.")

    # ----------------------------------------------------------------------------------
    # TAB 3: Shift Audit & SQLite Analytics
    # ----------------------------------------------------------------------------------
    with tab_analytics:
        st.subheader("Shift Audit & Ergonomic Analytics (SQLite Persistence)")
        st.write("Aggregated analytics queried directly from `ergonomics.db` using Pandas and SQLite.")

        stats = db_manager.get_shift_statistics()

        m1, m2, m3, m4, m5 = st.columns(5)
        with m1:
            st.metric("Total Frames Logged", f"{stats['total_frames']:,}")
        with m2:
            st.metric("Avg RULA Score", f"{stats['avg_rula']:.2f} / 7", f"Peak: {stats['peak_rula']}")
        with m3:
            st.metric("Avg REBA Score", f"{stats['avg_reba']:.2f} / 15", f"Peak: {stats['peak_reba']}")
        with m4:
            st.metric("Hazard Breaches", f"{stats['total_breaches']}", delta_color="inverse")
        with m5:
            st.metric("Avg Fatigue Index", f"{stats['avg_fatigue']}%", f"Peak: {stats['peak_fatigue']}%")

        st.markdown("---")

        df = db_manager.get_telemetry_dataframe(limit=500)
        
        if not df.empty and HAS_PLOTLY:
            c_left, c_right = st.columns(2)

            with c_left:
                st.markdown("#### 📈 Ergonomic Risk Timeline (RULA & REBA)")
                fig_timeline = px.line(
                    df, 
                    x="id", 
                    y=["rula_score", "reba_score"],
                    labels={"id": "Log Sequence ID", "value": "Score", "variable": "Metric"},
                    title="Real-Time Ergonomic Score Progression",
                    color_discrete_map={"rula_score": "#EF4444", "reba_score": "#F59E0B"},
                    template="plotly_dark"
                )
                fig_timeline.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig_timeline, use_container_width=True)

            with c_right:
                st.markdown("#### ⚡ Fatigue Index Accumulation")
                fig_fatigue = px.area(
                    df, 
                    x="id", 
                    y="fatigue_index",
                    labels={"id": "Log Sequence ID", "fatigue_index": "Fatigue (%)"},
                    title="Cumulative Worker Fatigue Trajectory",
                    color_discrete_sequence=["#38BDF8"],
                    template="plotly_dark"
                )
                fig_fatigue.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
                st.plotly_chart(fig_fatigue, use_container_width=True)

            st.markdown("#### 📐 Joint Angle Trajectories (Trunk, Shoulder, Neck)")
            fig_angles = px.line(
                df,
                x="id",
                y=["trunk_angle", "upper_arm_angle", "neck_angle", "lower_arm_angle"],
                labels={"id": "Log Sequence ID", "value": "Angle (Degrees)", "variable": "Joint"},
                title="Biomechanical Joint Flexion Over Time",
                template="plotly_dark"
            )
            fig_angles.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
            st.plotly_chart(fig_angles, use_container_width=True)

            st.markdown("#### 📋 Raw Telemetry Log Records (from ergonomics.db)")
            st.dataframe(df, use_container_width=True)

            # CSV Export button
            csv_data = df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download Shift Ergonomics Telemetry (CSV)",
                data=csv_data,
                file_name=f"ergonomics_shift_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
            )
        else:
            st.info("No recorded telemetry data in `ergonomics.db` yet. Process a video or run webcam inference to populate the database.")

    # ----------------------------------------------------------------------------------
    # TAB 4: Biomechanical Joint Diagnostics
    # ----------------------------------------------------------------------------------
    with tab_diagnostics:
        st.subheader("Biomechanical 3D Kinematics & Joint Threshold Standards")
        
        diag_col1, diag_col2 = st.columns(2)
        with diag_col1:
            st.markdown("""
            ### 📖 RULA (Rapid Upper Limb Assessment) Criteria
            - **Upper Arm**:
                - 1: 20° extension to 20° flexion
                - 2: >20° extension or 20°-45° flexion
                - 3: 45°-90° flexion
                - 4: >90° flexion
            - **Lower Arm (Elbow)**:
                - 1: 60°-100° flexion (Optimal Zone)
                - 2: <60° or >100° flexion
            - **Trunk**:
                - 1: Upright 0°-10°
                - 2: 10°-20° flexion
                - 3: 20°-60° flexion
                - 4: >60° flexion
            - **Neck**:
                - 1: 0°-10° flexion
                - 2: 10°-20° flexion
                - 3: >20° flexion or in extension
            """)

        with diag_col2:
            st.markdown("""
            ### 🏥 Action Level Matrix & Recommendations
            - **RULA Score 1-2**: *Low Risk* — Posture is acceptable if not maintained or repeated for long periods.
            - **RULA Score 3-4**: *Medium Risk* — Further investigation is needed and changes may be required.
            - **RULA Score 5-6**: *High Risk* — Prompt investigation and ergonomic redesign required soon.
            - **RULA Score 7+**: *Severe Risk* — Immediate engineering intervention and workstation reconfiguration required.
            """)


if __name__ == "__main__":
    main()
