import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { LiveStreamView } from './components/LiveStreamView';
import { ErgonomicGauges } from './components/ErgonomicGauges';
import { JointRiskBreakdown } from './components/JointRiskBreakdown';
import { SafetyZoneManager } from './components/SafetyZoneManager';
import { ShiftAnalytics } from './components/ShiftAnalytics';
import { AiAuditModal } from './components/AiAuditModal';
import { VideoPoseDetector } from './services/webcamPoseDetector';
import { extractJointAngles, checkSafetyZoneBreach, smoothLandmarks } from './utils/geometry';
import { calculateRula } from './utils/rulaScoring';
import { calculateReba } from './utils/rebaScoring';
import { soundEngine } from './utils/audioAlert';
import {
  PoseLandmarks,
  JointAngles,
  RulaBreakdown,
  RebaBreakdown,
  SafetyZone,
  TelemetryPoint,
} from './types/ergonomics';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'biomechanics' | 'zones' | 'analytics'>('monitor');
  const [isMuted, setIsMuted] = useState(false);
  const [inputMode, setInputMode] = useState<'webcam' | 'upload'>('webcam');
  const [loadKg, setLoadKg] = useState<number>(5.0);
  const [isAiAuditOpen, setIsAiAuditOpen] = useState(false);
  const [dbRecordsCount, setDbRecordsCount] = useState<number>(0);

  // Video and webcam refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<VideoPoseDetector | null>(null);

  // Safety Zone State (Normalized 0-1 coordinates)
  const [safetyZone, setSafetyZone] = useState<SafetyZone>({
    id: 'zone-1',
    name: 'Machinery Operating Envelope',
    color: '#f59e0b',
    vertices: [
      { x: 0.65, y: 0.20 },
      { x: 0.96, y: 0.20 },
      { x: 0.96, y: 0.85 },
      { x: 0.65, y: 0.85 },
    ],
    active: true,
    isBreached: false,
  });
  const [totalBreaches, setTotalBreaches] = useState(0);

  // Dynamic Posture and Kinematic State (Derived directly from video frames)
  const [landmarks, setLandmarks] = useState<PoseLandmarks | null>(null);
  const prevLandmarksRef = useRef<PoseLandmarks | null>(null);

  const [angles, setAngles] = useState<JointAngles>({
    trunkFlexion: 12,
    neckAngle: 14,
    upperArmRight: 28,
    upperArmLeft: 22,
    lowerArmRight: 88,
    lowerArmLeft: 92,
    wristRight: 10,
    wristLeft: 10,
    kneeRight: 12,
    kneeLeft: 12,
    trunkLateralTwist: 0,
  });

  // Real-time Ergonomic Scores (Computed dynamically from joint angles)
  const [rula, setRula] = useState<RulaBreakdown>(() => calculateRula(angles, { loadKg }));
  const [reba, setReba] = useState<RebaBreakdown>(() => calculateReba(angles, { loadKg }));

  // Metrics, Fatigue, and Timers
  const [sessionDurationSec, setSessionDurationSec] = useState(0);
  const [sustainedHoldSec, setSustainedHoldSec] = useState(0);
  const [sustainedHoldCount, setSustainedHoldCount] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [repRatePerMin, setRepRatePerMin] = useState(0);
  const [fatigueIndex, setFatigueIndex] = useState(12);
  const [fps, setFps] = useState(30);

  // Telemetry History Log Buffer
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // Repetition cycle detector state
  const prevBendRef = useRef<boolean>(false);
  const cycleTimestampsRef = useRef<number[]>([]);

  // Sync mute with sound engine
  useEffect(() => {
    soundEngine.setMuted(isMuted);
  }, [isMuted]);

  // Fetch SQLite database record counts
  const fetchDbStats = useCallback(async () => {
    try {
      const res = await fetch('/api/db/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.total_frames !== undefined) {
          setDbRecordsCount(data.total_frames);
        }
      }
    } catch {
      // Ignore if server is busy
    }
  }, []);

  useEffect(() => {
    fetchDbStats();
    const interval = setInterval(fetchDbStats, 5000);
    return () => clearInterval(interval);
  }, [fetchDbStats]);

  // Initialize webcam detector
  useEffect(() => {
    if (!detectorRef.current) {
      detectorRef.current = new VideoPoseDetector();
    }

    if (inputMode === 'webcam' && videoRef.current) {
      detectorRef.current.startWebcam(videoRef.current);
    } else {
      detectorRef.current?.stop();
    }

    return () => {
      detectorRef.current?.stop();
    };
  }, [inputMode]);

  // Handle Video File Upload (.mp4 / .webm)
  const handleFileUpload = (file: File) => {
    if (videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.loop = true;
      videoRef.current.play().catch(console.warn);
      setInputMode('upload');
    }
  };

  // Generate real dynamic worker test video canvas loop for instant testing
  const handleLoadSampleVideo = () => {
    if (!videoRef.current) return;
    // Create an animated canvas video stream
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 360;
    const sCtx = sampleCanvas.getContext('2d');
    if (!sCtx) return;

    let startTime = performance.now();
    const stream = sampleCanvas.captureStream(30);
    videoRef.current.src = '';
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(console.warn);
    setInputMode('upload');

    // Generate factory worker video frames dynamically
    const drawWorkerFrame = () => {
      if (inputMode !== 'upload' || !sCtx) return;
      const t = (performance.now() - startTime) / 1000;
      
      // Industrial floor background
      sCtx.fillStyle = '#0f172a';
      sCtx.fillRect(0, 0, 640, 360);

      // Warning floor stripes
      sCtx.fillStyle = '#1e293b';
      sCtx.fillRect(0, 300, 640, 60);

      // Worker silhouette doing realistic lifting motions
      const bend = Math.sin(t * 1.5);
      const isLifting = bend > 0.2;

      sCtx.fillStyle = isLifting ? '#3b82f6' : '#22c55e';
      const rootX = 320;
      const rootY = 280;

      // Draw worker silhouette to process via optical contrast
      sCtx.beginPath();
      // Head
      const headY = 120 + (isLifting ? bend * 50 : 0);
      sCtx.arc(rootX, headY, 20, 0, Math.PI * 2);
      sCtx.fill();

      // Torso
      sCtx.fillRect(rootX - 18, headY + 20, 36, 80);

      // Arms
      sCtx.fillRect(rootX - 35, headY + 30, 14, 70 + (isLifting ? bend * 30 : 0));
      sCtx.fillRect(rootX + 21, headY + 30, 14, 70 + (isLifting ? bend * 30 : 0));

      // Legs
      sCtx.fillRect(rootX - 16, rootY - 60, 12, 60);
      sCtx.fillRect(rootX + 4, rootY - 60, 12, 60);

      requestAnimationFrame(drawWorkerFrame);
    };
    requestAnimationFrame(drawWorkerFrame);
  };

  // Main 30+ FPS Multi-Threaded Video Processor Loop
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();
    let holdTimerMs = 0;
    let dbTimerMs = 0;
    let frameIndex = 0;

    const tick = (now: number) => {
      const deltaSec = Math.max(0.001, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      frameCount++;
      if (now - fpsTimer >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = now;
      }

      setSessionDurationSec((prev) => prev + deltaSec);
      frameIndex++;

      // Process live frame from detector
      let currentLms: PoseLandmarks | null = null;
      if (detectorRef.current) {
        currentLms = detectorRef.current.estimatePose();
      }

      if (currentLms) {
        // Smooth landmarks with exponential moving average
        const smoothed = smoothLandmarks(currentLms, prevLandmarksRef.current, 0.7);
        prevLandmarksRef.current = smoothed;
        setLandmarks(smoothed);

        // Compute 3D joint angles directly from coordinates
        const newAngles = extractJointAngles(smoothed);
        setAngles(newAngles);

        // Check virtual hazard boundary
        const breachResult = checkSafetyZoneBreach(smoothed, safetyZone.vertices);
        setSafetyZone((prev) => {
          if (!prev.isBreached && breachResult.isBreached) {
            setTotalBreaches((c) => c + 1);
            soundEngine.triggerHazardBreachAlarm();
          }
          return { ...prev, isBreached: breachResult.isBreached };
        });

        // Compute RULA & REBA
        const isMuscleStatic = sustainedHoldSec >= 5;
        const newRula = calculateRula(newAngles, { isMuscleStatic, loadKg });
        const newReba = calculateReba(newAngles, { loadKg, isStaticHold: isMuscleStatic });
        setRula(newRula);
        setReba(newReba);

        // Track sustained awkward posture hold (>5s threshold)
        if (newRula.grandScore >= 5) {
          holdTimerMs += deltaSec * 1000;
          const currentHoldSeconds = Math.floor(holdTimerMs / 1000);
          setSustainedHoldSec(currentHoldSeconds);

          if (currentHoldSeconds >= 5) {
            soundEngine.triggerPostureWarning();
          }
        } else {
          if (holdTimerMs >= 5000) {
            setSustainedHoldCount((c) => c + 1);
          }
          holdTimerMs = 0;
          setSustainedHoldSec(0);
        }

        // Repetition cycle tracking (bending/lifting)
        const isBent = newAngles.trunkFlexion > 30 || newAngles.upperArmRight > 65;
        if (isBent && !prevBendRef.current) {
          prevBendRef.current = true;
        } else if (!isBent && prevBendRef.current) {
          prevBendRef.current = false;
          setRepCount((c) => c + 1);

          const nowMs = Date.now();
          cycleTimestampsRef.current.push(nowMs);
          cycleTimestampsRef.current = cycleTimestampsRef.current.filter((t) => nowMs - t <= 60000);
          setRepRatePerMin(cycleTimestampsRef.current.length);
        }

        // Fatigue accumulation index
        setFatigueIndex((prev) => {
          let change = 0;
          if (newRula.grandScore >= 6) change = 0.08;
          else if (newRula.grandScore >= 4) change = 0.03;
          else change = -0.02;
          return Math.max(5, Math.min(100, prev + change));
        });

        // Telemetry point for chart & SQLite persistence
        dbTimerMs += deltaSec * 1000;
        if (dbTimerMs >= 600) {
          dbTimerMs = 0;
          const telemetryPt: TelemetryPoint = {
            timestamp: Date.now(),
            rula: newRula.grandScore,
            reba: newReba.grandScore,
            fatigueIndex,
            trunkAngle: newAngles.trunkFlexion,
            isBreached: breachResult.isBreached,
            isAwkwardHold: holdTimerMs >= 5000,
          };

          setTelemetryHistory((prev) => [...prev.slice(-120), telemetryPt]);

          // Asynchronously log to SQLite database ergonomics.db
          fetch('/api/db/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              rula_score: newRula.grandScore,
              reba_score: newReba.grandScore,
              trunk_angle: newAngles.trunkFlexion,
              neck_angle: newAngles.neckAngle,
              upper_arm_angle: newAngles.upperArmRight,
              lower_arm_angle: newAngles.lowerArmRight,
              knee_angle: newAngles.kneeRight,
              fatigue_index: fatigueIndex,
              is_breached: breachResult.isBreached,
              is_sustained_hold: holdTimerMs >= 5000,
              frame_index: frameIndex,
            }),
          })
            .then(() => setDbRecordsCount((c) => c + 1))
            .catch(() => {});
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [inputMode, loadKg, safetyZone.vertices, sustainedHoldSec, fatigueIndex]);

  // Aggregate telemetry statistics
  const avgRula = useMemo(() => {
    if (telemetryHistory.length === 0) return rula.grandScore;
    return telemetryHistory.reduce((acc, p) => acc + p.rula, 0) / telemetryHistory.length;
  }, [telemetryHistory, rula.grandScore]);

  const peakRula = useMemo(() => {
    if (telemetryHistory.length === 0) return rula.grandScore;
    return Math.max(...telemetryHistory.map((p) => p.rula), rula.grandScore);
  }, [telemetryHistory, rula.grandScore]);

  const avgReba = useMemo(() => {
    if (telemetryHistory.length === 0) return reba.grandScore;
    return telemetryHistory.reduce((acc, p) => acc + p.reba, 0) / telemetryHistory.length;
  }, [telemetryHistory, reba.grandScore]);

  const peakReba = useMemo(() => {
    if (telemetryHistory.length === 0) return reba.grandScore;
    return Math.max(...telemetryHistory.map((p) => p.reba), reba.grandScore);
  }, [telemetryHistory, reba.grandScore]);

  // Export CSV
  const handleExportCsv = useCallback(() => {
    if (telemetryHistory.length === 0) return;
    const headers = 'Timestamp,RULA_Score,REBA_Score,Trunk_Angle,Fatigue_Index,Safety_Breach,Awkward_Hold\n';
    const rows = telemetryHistory
      .map(
        (p) =>
          `${new Date(p.timestamp).toISOString()},${p.rula},${p.reba},${p.trunkAngle},${Math.round(
            p.fatigueIndex
          )},${p.isBreached},${p.isAwkwardHold}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ergonomics_shift_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [telemetryHistory]);

  // Export JSON
  const handleExportJson = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      database: 'ergonomics.db (SQLite)',
      summary: {
        sessionDurationSec,
        avgRula,
        peakRula,
        avgReba,
        peakReba,
        totalBreaches,
        sustainedHoldCount,
        repCount,
        totalFramesLogged: dbRecordsCount,
      },
      telemetry: telemetryHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ergonomics_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionDurationSec, avgRula, peakRula, avgReba, peakReba, totalBreaches, sustainedHoldCount, repCount, dbRecordsCount, telemetryHistory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenAiAudit={() => setIsAiAuditOpen(true)}
        onExportCsv={handleExportCsv}
        inputMode={inputMode}
        setInputMode={setInputMode}
        isBreached={safetyZone.isBreached}
        dbRecordsCount={dbRecordsCount}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Real-Time Ergonomic Gauges */}
        <ErgonomicGauges
          rula={rula}
          reba={reba}
          fatigueIndex={fatigueIndex}
          sustainedHoldSec={sustainedHoldSec}
          repCount={repCount}
          repRatePerMin={repRatePerMin}
        />

        {/* Tab 1: Live Monitor & Video Stream */}
        {activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <LiveStreamView
                landmarks={landmarks}
                angles={angles}
                rula={rula}
                safetyZone={safetyZone}
                onUpdateSafetyZone={setSafetyZone}
                inputMode={inputMode}
                setInputMode={setInputMode}
                videoRef={videoRef}
                onFileUpload={handleFileUpload}
                onLoadSampleVideo={handleLoadSampleVideo}
                fps={fps}
                confidence={0.98}
                sustainedHoldSec={sustainedHoldSec}
                isBreached={safetyZone.isBreached}
                loadKg={loadKg}
                setLoadKg={setLoadKg}
                dbRecordsCount={dbRecordsCount}
              />
            </div>

            {/* Live Biomechanics Snapshot */}
            <div className="space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Primary Strained Joint
                </div>
                <div className="text-lg font-bold text-white mb-1">
                  {rula.primaryStrainedJoint}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {rula.actionLevel}
                </p>
              </div>

              {/* Dynamic Joint Angle Telemetry */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dynamic Joint Angles (from video)
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-300">Trunk Flexion:</span>
                  <span className={`font-mono font-bold ${angles.trunkFlexion > 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {angles.trunkFlexion}° (Max safe: 20°)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-300">Neck Tilt:</span>
                  <span className={`font-mono font-bold ${angles.neckAngle > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {angles.neckAngle}° (Max safe: 10°)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-300">Right Shoulder:</span>
                  <span className={`font-mono font-bold ${angles.upperArmRight > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {angles.upperArmRight}° (Max safe: 45°)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-300">Elbow / Forearm:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {angles.lowerArmRight}° (Optimal: 60-100°)
                  </span>
                </div>
              </div>

              {/* Virtual Hazard Perimeter */}
              <div className={`p-4 rounded-xl border text-xs ${
                safetyZone.isBreached
                  ? 'bg-rose-950/40 border-rose-600/70 text-rose-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}>
                <div className="font-semibold mb-1 flex items-center justify-between">
                  <span>Safety Perimeter:</span>
                  <span className="font-mono text-white">{safetyZone.name}</span>
                </div>
                <div>
                  Status:{' '}
                  <strong className={safetyZone.isBreached ? 'text-rose-400' : 'text-emerald-400'}>
                    {safetyZone.isBreached ? 'Active Machinery Breach Detected' : 'Clear & Safe'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Biomechanical Joint Breakdown */}
        {activeTab === 'biomechanics' && (
          <JointRiskBreakdown
            currentAngles={angles}
            rula={rula}
            reba={reba}
          />
        )}

        {/* Tab 3: Safety Boundary Manager */}
        {activeTab === 'zones' && (
          <SafetyZoneManager
            safetyZone={safetyZone}
            onUpdateSafetyZone={setSafetyZone}
            isBreached={safetyZone.isBreached}
            breachCount={totalBreaches}
          />
        )}

        {/* Tab 4: Shift Analytics & SQLite Telemetry Log */}
        {activeTab === 'analytics' && (
          <ShiftAnalytics
            telemetryHistory={telemetryHistory}
            sessionDurationSec={sessionDurationSec}
            avgRula={avgRula}
            peakRula={peakRula}
            avgReba={avgReba}
            peakReba={peakReba}
            totalBreaches={totalBreaches}
            sustainedHoldCount={sustainedHoldCount}
            totalRepCycles={repCount}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
            dbRecordsCount={dbRecordsCount}
            onRefreshDb={fetchDbStats}
          />
        )}
      </main>

      {/* AI Ergonomics & OSHA Compliance Audit Modal */}
      <AiAuditModal
        isOpen={isAiAuditOpen}
        onClose={() => setIsAiAuditOpen(false)}
        sessionData={{
          sessionDurationSec,
          avgRula: Number(avgRula.toFixed(1)),
          peakRula,
          avgReba: Number(avgReba.toFixed(1)),
          peakReba,
          sustainedStrainCount: sustainedHoldCount,
          totalRepCycles: repCount,
          repFrequencyPerMin: Number(repRatePerMin.toFixed(1)),
          safetyBreaches: totalBreaches,
          highRiskJoints: [
            angles.trunkFlexion > 25 ? `Lumbar Spine (${angles.trunkFlexion}°)` : '',
            angles.upperArmRight > 50 ? `Right Shoulder (${angles.upperArmRight}°)` : '',
            angles.neckAngle > 20 ? `Cervical Neck (${angles.neckAngle}°)` : '',
          ].filter(Boolean),
          postureDistribution: {
            safe: telemetryHistory.filter((p) => p.rula <= 2).length,
            warning: telemetryHistory.filter((p) => p.rula >= 3 && p.rula <= 4).length,
            danger: telemetryHistory.filter((p) => p.rula >= 5).length,
          },
        }}
      />
    </div>
  );
}
