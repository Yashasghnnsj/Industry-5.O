import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "ErgoVision AI: Industry 5.0 Project Documentation")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "Confidential - Academic Exam / Evaluation Material (30 Marks)")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()


def build_pdf(filename="PROJECT_TEST_NOTES.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2563EB"),
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )

    story = []

    # Title & Header
    story.append(Paragraph("🛡️ ErgoVision AI: Industry 5.0 Ergonomics & Safety", title_style))
    story.append(Paragraph("Comprehensive Project Implementation & 30-Marks Test Study Notes", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563EB"), spaceAfter=12))

    # Section 1: Overview
    story.append(Paragraph("1. Project Overview & Scope", h1_style))
    story.append(Paragraph(
        "<b>ErgoVision AI</b> is a real-time, non-invasive Computer Vision and Biomechanical Analysis system built strictly with Python 3.10+, OpenCV, MediaPipe, NumPy, SciPy, Pandas, SQLite, and Streamlit. It captures video or live webcam footage of factory workers, extracts 33 full-body 3D anatomical landmarks, performs real-time kinematic calculations, evaluates international ergonomic standards (RULA and REBA), monitors virtual robotic hazard perimeters, and persists all shift telemetry to an embedded SQLite database.",
        body_style
    ))

    # Section 2: Objectives
    story.append(Paragraph("2. Project Objectives", h1_style))
    story.append(Paragraph("• <b>Automate Posture Auditing:</b> Replace slow, subjective pen-and-paper assessments with instantaneous, deterministic 30+ FPS computer vision telemetry.", bullet_style))
    story.append(Paragraph("• <b>Prevent WMSDs:</b> Detect high-risk awkward joint angles (lumbar flexion, neck hyperextension, shoulder elevation) before chronic injury occurs.", bullet_style))
    story.append(Paragraph("• <b>Industrial Hazard Envelope Enforcement:</b> Establish virtual cobot exclusion zones and flag unauthorized intrusion using ray-casting geometry.", bullet_style))
    story.append(Paragraph("• <b>Shift Fatigue & Cycle Tracking:</b> Accumulate continuous physical fatigue indices and count repetitive movement cycles across operational shifts.", bullet_style))
    story.append(Paragraph("• <b>Non-Invasive Deployment:</b> Eliminate wearable sensors and battery suits; run purely on standard RGB industrial CCTV / webcam feeds.", bullet_style))

    # Section 3: Problem Solved
    story.append(Paragraph("3. Problem Statement & Problem Solved", h1_style))
    story.append(Paragraph(
        "<b>The Industrial Bottleneck:</b> Work-Related Musculoskeletal Disorders (WMSDs) cost global industries billions annually in lost workdays and workers' compensation. Traditional ergonomics audits (RULA/REBA checklists) are done manually once or twice a year by human observers, suffering from severe observational bias, missing short-duration awkward posture spikes, and providing zero real-time alerts. Wearable IMU suits require tedious calibration, run out of battery, and create severe entanglement hazards around industrial robotics.<br/><br/>"
        "<b>The ErgoVision AI Solution:</b> A continuous, contact-free vision pipeline that evaluates 33 landmarks frame-by-frame. It combines true 3D spatial trigonometry against gravity with multi-table RULA and REBA lookups, tracks cumulative fatigue curves, and logs every incident to SQLite for occupational health compliance.",
        body_style
    ))

    # Section 4: Tech Stack Table
    story.append(Paragraph("4. Technologies Used & Role", h1_style))
    tech_data = [
        [Paragraph("Technology", table_header_style), Paragraph("Category", table_header_style), Paragraph("Implementation Purpose", table_header_style)],
        [Paragraph("Python 3.10+", table_cell_style), Paragraph("Core Runtime", table_cell_style), Paragraph("Backend engine, multi-threading, geometry pipelines.", table_cell_style)],
        [Paragraph("OpenCV (cv2)", table_cell_style), Paragraph("Computer Vision", table_cell_style), Paragraph("Frame acquisition, video decode, skeleton HUD rendering.", table_cell_style)],
        [Paragraph("MediaPipe Pose", table_cell_style), Paragraph("Deep Learning", table_cell_style), Paragraph("Extracts 33 full-body 3D landmarks (x, y, z) per frame.", table_cell_style)],
        [Paragraph("NumPy & SciPy", table_cell_style), Paragraph("Kinematics", table_cell_style), Paragraph("Vector dot products, 3D angles, EMA smoothing filter.", table_cell_style)],
        [Paragraph("SQLite3", table_cell_style), Paragraph("Database", table_cell_style), Paragraph("Local persistence (ergonomics.db) for telemetry & incidents.", table_cell_style)],
        [Paragraph("Pandas", table_cell_style), Paragraph("Analytics", table_cell_style), Paragraph("DataFrame queries, shift aggregations, and CSV exports.", table_cell_style)],
        [Paragraph("Streamlit", table_cell_style), Paragraph("UI / Dashboard", table_cell_style), Paragraph("Web interface with multi-tab video/webcam analytics.", table_cell_style)],
        [Paragraph("Plotly", table_cell_style), Paragraph("Data Viz", table_cell_style), Paragraph("Time-series risk curves, fatigue area charts.", table_cell_style)],
    ]
    t_tech = Table(tech_data, colWidths=[100, 90, 314])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_tech)

    story.append(PageBreak())

    # Section 5: Algorithms & Justifications
    story.append(Paragraph("5. Algorithms Used & Mathematical Justifications", h1_style))
    
    story.append(Paragraph("A. MediaPipe BlazePose 33-Landmark Estimation", h2_style))
    story.append(Paragraph(
        "A lightweight convolutional pose detector-tracker pipeline that produces 33 3D spatial keypoints (normalized x, y, z coordinates). <i>Justification:</i> Operates at sub-30ms inference on standard CPUs, enabling edge deployment without enterprise GPUs.",
        body_style
    ))

    story.append(Paragraph("B. Exponential Moving Average (EMA) Landmark Smoothing", h2_style))
    story.append(Paragraph(
        "Formula: <b>P[t] = α · X[t] + (1 - α) · P[t-1]</b> with α = 0.70.<br/>"
        "<i>Justification:</i> Raw landmark predictions suffer from camera sensor noise and illumination flicker. The EMA filter stabilizes the 3D skeleton while preserving true fast biomechanical movements.",
        body_style
    ))

    story.append(Paragraph("C. 3D Vector Biomechanical Kinematics", h2_style))
    story.append(Paragraph(
        "• <b>3-Point Vertex Joint Angle:</b> cos(θ) = (BA · BC) / (||BA|| · ||BC||). Yields shoulder, elbow, and knee angles independent of camera perspective.<br/>"
        "• <b>Gravitational Vertical Inclination:</b> cos(θ_trunk) = (S_spine · g) / ||S_spine|| where g = [0, -1, 0]ᵀ (upward vertical vector in camera coordinate space). Measures absolute trunk bending relative to gravity.",
        body_style
    ))

    story.append(Paragraph("D. Standard RULA & REBA Scoring Engines", h2_style))
    story.append(Paragraph(
        "• <b>RULA (McAtamney & Corlett, 1993):</b> Upper arm, lower arm, wrist (Table A) + muscle use/load modifiers → Score C; Neck, trunk, legs (Table B) + modifiers → Score D; Combined in Table C to yield Grand Score 1–7 (Green: 1-2, Amber: 3-4, Orange: 5-6, Red: 7+).<br/>"
        "• <b>REBA (Hignett & McAtamney, 2000):</b> Group A (Trunk, Neck, Legs) + Group B (Upper/Lower Arm, Wrist) combined via Table C + activity repetition score → Grand Score 1–15.",
        body_style
    ))

    story.append(Paragraph("E. Ray-Casting Point-in-Polygon (PIP) Algorithm", h2_style))
    story.append(Paragraph(
        "Casts a ray from each critical extremity joint (wrists, hips, ankles) to infinity. If ray-edge intersections are odd, the joint has penetrated the virtual robotic cell boundary (O(N) complexity). Alerts supervisor instantly.",
        body_style
    ))

    story.append(Paragraph("F. Repetition & Fatigue Accumulation Models", h2_style))
    story.append(Paragraph(
        "• <b>Cycle Counting:</b> Hysteresis thresholding on trunk flexion (>35° bend followed by return to upright <20° increments rep counter).<br/>"
        "• <b>Fatigue Index (%):</b> Accumulates +0.15% per frame when RULA ≥ 6; dissipates -0.05% per frame when in restorative posture (RULA ≤ 2).",
        body_style
    ))

    # Section 6: Implementation Architecture
    story.append(Paragraph("6. Implementation Architecture & Data Flow", h1_style))
    flow_steps = [
        "1. Video Ingestion: Captures raw frames from file (.mp4) or webcam via OpenCV.",
        "2. Landmark Extraction: MediaPipe extracts 33 3D coordinates.",
        "3. Jitter Smoothing: EMA filter stabilizes coordinates across consecutive frames.",
        "4. Biomechanical Kinematics: Computes trunk inclination, neck, shoulder, and elbow angles.",
        "5. Ergonomic Evaluation: RULA & REBA matrices look up grand risk scores.",
        "6. Safety & Hazard Check: PIP ray-caster checks if wrists or feet enter hazard zone.",
        "7. HUD Overlay: OpenCV renders color-coded skeleton and HUD telemetry.",
        "8. Persistence: SQLite commits telemetry every 5 frames and logs incident triggers.",
        "9. Dashboard Presentation: Streamlit visualizes live stream, Plotly trends, and CSV export."
    ]
    for step in flow_steps:
        story.append(Paragraph(step, bullet_style))

    # Section 7: Results & KPIs
    story.append(Paragraph("7. Results & Key Performance Indicators (KPIs)", h1_style))
    kpi_data = [
        [Paragraph("Metric / KPI", table_header_style), Paragraph("Observed Performance", table_header_style), Paragraph("Industrial Significance", table_header_style)],
        [Paragraph("Processing Throughput", table_cell_style), Paragraph("30 - 35 FPS", table_cell_style), Paragraph("Real-time zero-lag analysis on standard multi-core CPU.", table_cell_style)],
        [Paragraph("Perimeter Breach Latency", table_cell_style), Paragraph("< 33 ms (1 frame)", table_cell_style), Paragraph("Instantaneous collision hazard alerting around cobots.", table_cell_style)],
        [Paragraph("Ergonomic Risk Mapping", table_cell_style), Paragraph("100% Deterministic", table_cell_style), Paragraph("Conforms to peer-reviewed RULA/REBA published matrices.", table_cell_style)],
        [Paragraph("Hardware Requirements", table_cell_style), Paragraph("Zero Wearables", table_cell_style), Paragraph("No battery charging, no sensor calibration, no snag hazards.", table_cell_style)],
        [Paragraph("Data Persistence", table_cell_style), Paragraph("SQLite (ergonomics.db)", table_cell_style), Paragraph("Full audit compliance and automated shift CSV exports.", table_cell_style)],
    ]
    t_kpi = Table(kpi_data, colWidths=[120, 110, 274])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_kpi)

    # Section 8: Exam Summary Marks Breakdown
    story.append(Paragraph("8. Exam/Test Evaluation Summary (30 Marks)", h1_style))
    marks_data = [
        [Paragraph("Section", table_header_style), Paragraph("Core Content to Write", table_header_style), Paragraph("Marks", table_header_style)],
        [Paragraph("1. Problem & Objective", table_cell_style), Paragraph("WMSD prevention in Industry 5.0, non-invasive automated 30 FPS monitoring, replacing manual paper audits.", table_cell_style), Paragraph("5 Marks", table_cell_style)],
        [Paragraph("2. Tech Stack Used", table_cell_style), Paragraph("Python 3.10+, OpenCV, MediaPipe Pose, NumPy/SciPy, SQLite3, Pandas, Streamlit, Plotly.", table_cell_style), Paragraph("4 Marks", table_cell_style)],
        [Paragraph("3. Algorithms & Formulas", table_cell_style), Paragraph("MediaPipe 33-point CNN, EMA filter (α=0.70), 3D dot-product vector angles, RULA/REBA table lookups, Ray-casting PIP.", table_cell_style), Paragraph("8 Marks", table_cell_style)],
        [Paragraph("4. Implementation Flow", table_cell_style), Paragraph("Modular pipeline: Frame Ingestion → Landmark Smoothing → Biomechanical Kinematics → RULA/REBA Lookups → PIP Hazard Check → HUD Overlay → SQLite DB → Streamlit Dashboard.", table_cell_style), Paragraph("8 Marks", table_cell_style)],
        [Paragraph("5. Results & Conclusion", table_cell_style), Paragraph("30+ FPS speed, sub-33ms hazard warning, fatigue tracking, automated CSV shift audit reports.", table_cell_style), Paragraph("5 Marks", table_cell_style)],
        [Paragraph("<b>TOTAL</b>", table_cell_style), Paragraph("<b>Comprehensive End-to-End Project Documentation</b>", table_cell_style), Paragraph("<b>30 Marks</b>", table_cell_style)],
    ]
    t_marks = Table(marks_data, colWidths=[130, 310, 64])
    t_marks.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#E2E8F0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_marks)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully: {filename}")

if __name__ == "__main__":
    build_pdf()
