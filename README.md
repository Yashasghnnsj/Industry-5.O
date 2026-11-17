# 🛡️ ErgoVision AI: Industry 5.0 Real-Time Worker Ergonomics & Safety Monitoring

> 📄 **Academic & Viva Evaluation Notes (30 Marks)**:  
> • Read the full readable study notes: **[PROJECT_TEST_NOTES.md](PROJECT_TEST_NOTES.md)**  
> • Download the printable PDF document: **[PROJECT_TEST_NOTES.pdf](PROJECT_TEST_NOTES.pdf)**

A robust, fully dynamic Computer Vision and Biomechanical Analysis system built strictly in **Python 3.10+**, **OpenCV**, **MediaPipe**, **NumPy/SciPy**, **Pandas**, **SQLite**, and **Streamlit**.

---

## 🚀 Key Architectural Improvements

### 1. Pure Python 3.10+ Tech Stack
- **Eliminated Web Simulation Scenarios**: Replaced static TypeScript/React prototypes with an algorithmic computer vision pipeline running on raw pixel data.
- **Biomechanical Vector Kinematics**: Implemented 3D vector geometry using **NumPy** and **SciPy** for true angle calculations, vertical gravity inclination vectors, lateral trunk twisting, and cervical/lumbar spine flexion.
- **Streamlit Application Layer**: Clean, high-performance UI directly bridging computer vision telemetry with responsive frontend visualization.

### 2. True Dynamic Frame-by-Frame Video Processing
- **33-Landmark Pose Estimation**: MediaPipe Pose extracts full-body spatial coordinates ($x, y, z$) frame-by-frame from any arbitrary `.mp4` file or live webcam stream.
- **Exact RULA & REBA Scoring**:
  - **RULA (Rapid Upper Limb Assessment)**: Standard Table A, Table B, and Table C lookups with force/load modifiers and sustained hold detection.
  - **REBA (Rapid Entire Body Assessment)**: Group A (Trunk, Neck, Legs), Group B (Upper Arm, Lower Arm, Wrist) score matrices and 1-15 scale action levels.
- **Dynamic HUD Overlays**: Colored skeleton wireframe rendered directly onto frames via OpenCV (Green = Low Risk, Amber = Medium Risk, Orange = High Risk, Crimson = Severe Risk).
- **Virtual Safety Perimeter Monitoring**: Real-time Point-in-Polygon ray-casting algorithm to detect hazardous intrusions into automated robotic envelopes.

### 3. Persistent SQLite Database & Shift Analytics
- **Local Persistence (`ergonomics.db`)**: Every telemetry frame, fatigue accumulation index, cycle count, and safety boundary incident is stored in an actual SQLite database.
- **Shift Audit & Trends**:
  - Interactive **Plotly** time-series graphs tracking RULA/REBA progression.
  - Cumulative worker fatigue curves.
  - Biomechanical joint angle trajectories (trunk, shoulder, neck, elbow).
  - High-risk incident event log and direct **CSV export**.

### 4. High-Performance Multi-Threading & 30+ FPS
- Frame-by-frame video pipeline capable of sustained 30+ FPS throughput.
- Smooth OpenCV HUD rendering and background database logging.

---

## 📁 Repository Structure

```
Industry-5.O-main/
├── app.py                       # Root launcher for Streamlit Dashboard
├── requirements.txt             # Python dependencies
├── python_engine/
│   ├── geometry_math.py         # 3D vector math, segment inclination, smoothing
│   ├── rula_reba.py             # Official RULA & REBA standard scoring matrices
│   ├── pose_pipeline.py         # OpenCV & MediaPipe frame-by-frame vision engine
│   ├── db_manager.py            # SQLite database manager & Pandas export
│   ├── main.py                  # CLI processor & video batch analyzer
│   ├── streamlit_app.py         # Comprehensive Streamlit Industrial Dashboard
│   ├── verify_pipeline.py       # Quick pipeline verification script
│   ├── pose_landmarker_full.task# Local MediaPipe full pose model
│   └── ergonomics.db            # Persistent SQLite database
```

---

## 🛠️ Installation & Setup

Ensure you have Python 3.10+ installed:

```bash
pip install -r requirements.txt
```

---

## 🖥️ Running the Application

### 1. Launch the Streamlit Industrial Dashboard
```bash
streamlit run app.py
```
Open your browser to `http://localhost:8501`. Features include:
- **Video Ingestion Tab**: Upload any `.mp4` video footage for frame-by-frame analysis with live skeleton overlay and progress tracking.
- **Live Webcam Stream Tab**: Perform real-time camera inference with instant posture scorecards and joint strain breakdowns.
- **Shift Audit & Analytics Tab**: Inspect historical trends, fatigue curves, and download raw shift logs as CSV.
- **Biomechanical Diagnostics Tab**: View ergonomic threshold standards and engineering intervention guidelines.

### 2. Standalone Verification Test
```bash
python python_engine/verify_pipeline.py
```

### 3. Command-Line Video Batch Processor
Analyze an input `.mp4` file and save an annotated video:
```bash
python python_engine/main.py --video path/to/factory_worker.mp4 --output annotated_output.mp4 --load 5.0
```
