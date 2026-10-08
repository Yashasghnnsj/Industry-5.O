import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Upload, Eye, EyeOff, Shield, AlertTriangle, FileVideo, Database } from 'lucide-react';
import { PoseLandmarks, JointAngles, RulaBreakdown, SafetyZone } from '../types/ergonomics';

interface LiveStreamViewProps {
  landmarks: PoseLandmarks | null;
  angles: JointAngles;
  rula: RulaBreakdown;
  safetyZone: SafetyZone;
  onUpdateSafetyZone: (zone: SafetyZone) => void;
  inputMode: 'webcam' | 'upload';
  setInputMode: (mode: 'webcam' | 'upload') => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onFileUpload: (file: File) => void;
  onLoadSampleVideo: () => void;
  fps: number;
  confidence: number;
  sustainedHoldSec: number;
  isBreached: boolean;
  loadKg: number;
  setLoadKg: (kg: number) => void;
  dbRecordsCount: number;
}

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  landmarks,
  angles,
  rula,
  safetyZone,
  onUpdateSafetyZone,
  inputMode,
  setInputMode,
  videoRef,
  onFileUpload,
  onLoadSampleVideo,
  fps,
  confidence,
  sustainedHoldSec,
  isBreached,
  loadKg,
  setLoadKg,
  dbRecordsCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showZone, setShowZone] = useState(true);
  const [draggedVertexIdx, setDraggedVertexIdx] = useState<number | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>('sample_industrial_worker.mp4');

  // Handle Dragging of Safety Zone boundary vertices on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showZone || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    safetyZone.vertices.forEach((v, idx) => {
      const dist = Math.hypot(v.x - clickX, v.y - clickY);
      if (dist < 0.05) {
        setDraggedVertexIdx(idx);
      }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedVertexIdx === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const newY = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));

    const updatedVertices = [...safetyZone.vertices];
    updatedVertices[draggedVertexIdx] = { x: newX, y: newY };
    onUpdateSafetyZone({
      ...safetyZone,
      vertices: updatedVertices,
    });
  };

  const handleCanvasMouseUp = () => {
    setDraggedVertexIdx(null);
  };

  // Main canvas render loop: draws incoming video frame + colored skeleton overlay
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText(
        inputMode === 'webcam'
          ? 'Initializing camera video stream...'
          : 'Upload an .mp4 video file to begin computer vision analysis',
        width / 2,
        height / 2
      );
    }

    // Draw Virtual Safety Exclusion Zone
    if (showZone && safetyZone.vertices.length >= 3) {
      ctx.save();
      ctx.beginPath();
      const first = safetyZone.vertices[0];
      ctx.moveTo(first.x * width, first.y * height);
      for (let i = 1; i < safetyZone.vertices.length; i++) {
        const v = safetyZone.vertices[i];
        ctx.lineTo(v.x * width, v.y * height);
      }
      ctx.closePath();

      if (isBreached) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
      } else {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
      }
      ctx.fill();
      ctx.stroke();

      // Corner handles
      safetyZone.vertices.forEach((v) => {
        ctx.beginPath();
        ctx.arc(v.x * width, v.y * height, 6, 0, Math.PI * 2);
        ctx.fillStyle = isBreached ? '#ef4444' : '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();
      });

      // Label
      const centerVx = safetyZone.vertices.reduce((acc, v) => acc + v.x, 0) / safetyZone.vertices.length;
      const centerVy = safetyZone.vertices.reduce((acc, v) => acc + v.y, 0) / safetyZone.vertices.length;
      ctx.setLineDash([]);
      ctx.font = '600 11px Plus Jakarta Sans';
      ctx.fillStyle = isBreached ? '#fecaca' : '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(
        isBreached ? '⚠️ HAZARD ZONE BREACHED' : 'VIRTUAL SAFETY BOUNDARY',
        centerVx * width,
        centerVy * height
      );
      ctx.restore();
    }

    // Draw Skeleton Landmark Overlay (Green = Safe, Amber = Warning, Red = Severe)
    if (showSkeleton && landmarks && landmarks.length >= 29) {
      const getJointColor = (name: string): string => {
        if (name === 'trunk') {
          return angles.trunkFlexion > 25 ? '#ef4444' : angles.trunkFlexion > 15 ? '#f59e0b' : '#22c55e';
        }
        if (name === 'shoulder') {
          const maxSh = Math.max(angles.upperArmRight, angles.upperArmLeft);
          return maxSh > 70 ? '#ef4444' : maxSh > 40 ? '#f59e0b' : '#22c55e';
        }
        if (name === 'neck') {
          return angles.neckAngle > 20 ? '#ef4444' : angles.neckAngle > 10 ? '#f59e0b' : '#22c55e';
        }
        return '#22c55e';
      };

      const drawBone = (idx1: number, idx2: number, color: string, strokeWidth = 3.5) => {
        const p1 = landmarks[idx1];
        const p2 = landmarks[idx2];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      };

      const trunkColor = getJointColor('trunk');
      const shoulderColor = getJointColor('shoulder');
      const neckColor = getJointColor('neck');

      // Shoulders
      drawBone(11, 12, shoulderColor, 4);

      // Spine (mid-shoulder to mid-hip)
      const midShoulderX = ((landmarks[11].x + landmarks[12].x) / 2) * width;
      const midShoulderY = ((landmarks[11].y + landmarks[12].y) / 2) * height;
      const midHipX = ((landmarks[23].x + landmarks[24].x) / 2) * width;
      const midHipY = ((landmarks[23].y + landmarks[24].y) / 2) * height;

      ctx.beginPath();
      ctx.moveTo(midShoulderX, midShoulderY);
      ctx.lineTo(midHipX, midHipY);
      ctx.strokeStyle = trunkColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Neck
      const noseX = landmarks[0].x * width;
      const noseY = landmarks[0].y * height;
      ctx.beginPath();
      ctx.moveTo(midShoulderX, midShoulderY);
      ctx.lineTo(noseX, noseY);
      ctx.strokeStyle = neckColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Arms
      drawBone(11, 13, shoulderColor);
      drawBone(13, 15, shoulderColor);
      drawBone(12, 14, shoulderColor);
      drawBone(14, 16, shoulderColor);

      // Pelvis & Legs
      drawBone(23, 24, '#38bdf8', 4);
      drawBone(23, 25, '#38bdf8');
      drawBone(25, 27, '#38bdf8');
      drawBone(24, 26, '#38bdf8');
      drawBone(26, 28, '#38bdf8');

      // Nodes
      const keyNodes = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
      keyNodes.forEach((idx) => {
        const pt = landmarks[idx];
        if (!pt) return;
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 11 || idx === 12 ? shoulderColor : idx === 0 ? neckColor : trunkColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Joint Angle HUD Callouts
      if (showAngles) {
        ctx.font = '600 11px Plus Jakarta Sans';
        ctx.textAlign = 'left';

        // Trunk
        const trunkLabel = `Trunk Flexion: ${angles.trunkFlexion}°`;
        const trunkBadgeColor = angles.trunkFlexion > 25 ? '#ef4444' : angles.trunkFlexion > 15 ? '#f59e0b' : '#22c55e';
        drawHudPill(ctx, midHipX + 15, (midShoulderY + midHipY) / 2, trunkLabel, trunkBadgeColor);

        // Shoulder
        const maxArm = Math.max(angles.upperArmRight, angles.upperArmLeft);
        const shoulderLabel = `Arm Elev: ${maxArm}°`;
        const shBadgeColor = maxArm > 70 ? '#ef4444' : maxArm > 40 ? '#f59e0b' : '#22c55e';
        drawHudPill(ctx, landmarks[12].x * width + 12, landmarks[12].y * height - 8, shoulderLabel, shBadgeColor);

        // Neck
        const neckLabel = `Neck: ${angles.neckAngle}°`;
        const neckBadgeColor = angles.neckAngle > 20 ? '#ef4444' : '#22c55e';
        drawHudPill(ctx, noseX + 15, noseY - 8, neckLabel, neckBadgeColor);
      }
    }

    // Telemetry HUD overlay
    ctx.save();
    ctx.font = '500 11px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(width - 190, 10, 180, 50);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.strokeRect(width - 190, 10, 180, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`FPS: ${(fps || 30).toFixed(1)} (Multi-threaded)`, width - 18, 26);
    ctx.fillText(`SQLITE: ${dbRecordsCount} records logged`, width - 18, 44);
    ctx.restore();

    // Sustained Strain Alert
    if (sustainedHoldSec >= 5) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.90)';
      ctx.fillRect(16, height - 48, width - 32, 36);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.strokeRect(16, height - 48, width - 32, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText(
        `⚠️ SUSTAINED ERGONOMIC STRAIN (${sustainedHoldSec}s): AWKWARD POSTURE HELD PAST 5s SAFE THRESHOLD`,
        width / 2,
        height - 25
      );
      ctx.restore();
    }
  }, [
    inputMode,
    showZone,
    safetyZone,
    isBreached,
    showSkeleton,
    landmarks,
    angles,
    showAngles,
    fps,
    sustainedHoldSec,
    dbRecordsCount,
    videoRef,
  ]);

  const drawHudPill = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
  ) => {
    ctx.save();
    const metrics = ctx.measureText(text);
    const w = metrics.width + 12;
    const h = 18;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x, y - 12, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y - 12, w, h);

    ctx.fillStyle = color;
    ctx.fillText(text, x + 6, y + 1);
    ctx.restore();
  };

  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Video Canvas Container */}
      <div className="relative aspect-[16/9] w-full bg-slate-950 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full h-full object-cover cursor-crosshair"
        />

        {/* Video element for active stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="hidden"
        />

        {/* Top left overlay badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-white font-semibold">
              {inputMode === 'webcam' ? 'Live Webcam Pipeline' : `Ingested Video: ${activeFileName}`}
            </span>
          </div>

          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2 py-1 rounded-md text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>SQLite Active</span>
          </div>

          {isBreached && (
            <div className="bg-rose-950/90 border border-rose-500/80 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-300 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Boundary Breach</span>
            </div>
          )}
        </div>

        {/* Bottom Left Overlay Controls */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-1 rounded-lg">
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            title={showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showSkeleton ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowAngles(!showAngles)}
            title="Toggle Joint Angle Callouts"
            className={`px-2 py-1 rounded-md text-xs font-mono transition-colors ${
              showAngles ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Angles
          </button>
          <button
            onClick={() => setShowZone(!showZone)}
            title="Toggle Virtual Safety Boundary"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              showZone ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stream Controls Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Dynamic Video Ingestion Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setInputMode('webcam')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              inputMode === 'webcam' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Webcam Feed</span>
          </button>
          <button
            onClick={() => {
              setInputMode('upload');
              fileInputRef.current?.click();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              inputMode === 'upload' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload .MP4 Video</span>
          </button>
          <button
            onClick={() => {
              setInputMode('upload');
              setActiveFileName('industrial_pallet_lifting.mp4');
              onLoadSampleVideo();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-400 hover:text-slate-200 transition-colors"
            title="Load sample industrial worker footage to test OpenCV pipeline"
          >
            <FileVideo className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Footage</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setActiveFileName(file.name);
                onFileUpload(file);
              }
            }}
          />
        </div>

        {/* Load / Weight parameter */}
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-slate-400">Object Load:</span>
          <div className="flex items-center gap-1">
            {[2, 10, 20].map((kg) => (
              <button
                key={kg}
                onClick={() => setLoadKg(kg)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  loadKg === kg
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {kg}kg
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
