import React, { useState } from 'react';
import { Sliders, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { JointAngles, RulaBreakdown, RebaBreakdown } from '../types/ergonomics';
import { calculateRula } from '../utils/rulaScoring';
import { calculateReba } from '../utils/rebaScoring';

interface JointRiskBreakdownProps {
  currentAngles: JointAngles;
  rula: RulaBreakdown;
  reba: RebaBreakdown;
}

export const JointRiskBreakdown: React.FC<JointRiskBreakdownProps> = ({
  currentAngles,
  rula,
  reba,
}) => {
  // Sandbox mode for manual angle testing
  const [sandboxMode, setSandboxMode] = useState(false);
  const [testAngles, setTestAngles] = useState<JointAngles>(currentAngles);

  const activeAngles = sandboxMode ? testAngles : currentAngles;
  const activeRula = sandboxMode ? calculateRula(testAngles) : rula;
  const activeReba = sandboxMode ? calculateReba(testAngles) : reba;

  const jointConfigs = [
    {
      id: 'trunk',
      name: 'Lumbar Spine (Trunk Flexion)',
      angle: activeAngles.trunkFlexion,
      safeMax: 20,
      dangerMin: 45,
      unit: '°',
      rulaScore: activeRula.trunkScore,
      description: 'Angle of spine relative to vertical gravity vector. Flexion >20° increases L5/S1 intradiscal pressure significantly.',
      key: 'trunkFlexion' as const,
      max: 90,
    },
    {
      id: 'neck',
      name: 'Cervical Spine (Neck Tilt)',
      angle: activeAngles.neckAngle,
      safeMax: 10,
      dangerMin: 25,
      unit: '°',
      rulaScore: activeRula.neckScore,
      description: 'Forward flexion or extension of head relative to torso. Sustained tilt leads to trapezius fatigue.',
      key: 'neckAngle' as const,
      max: 60,
    },
    {
      id: 'upperArmRight',
      name: 'Right Shoulder (Upper Arm Elevation)',
      angle: activeAngles.upperArmRight,
      safeMax: 45,
      dangerMin: 90,
      unit: '°',
      rulaScore: activeRula.upperArmScore,
      description: 'Humeral elevation from torso. Elevation above 45° impinges supraspinatus tendon; >90° is severe overhead hazard.',
      key: 'upperArmRight' as const,
      max: 150,
    },
    {
      id: 'upperArmLeft',
      name: 'Left Shoulder (Upper Arm Elevation)',
      angle: activeAngles.upperArmLeft,
      safeMax: 45,
      dangerMin: 90,
      unit: '°',
      rulaScore: activeRula.upperArmScore,
      description: 'Bilateral symmetry check. Asymmetrical reaching induces spinal torsion.',
      key: 'upperArmLeft' as const,
      max: 150,
    },
    {
      id: 'lowerArm',
      name: 'Elbow / Forearm Flexion',
      angle: activeAngles.lowerArmRight,
      safeMin: 60,
      safeMax: 100,
      unit: '°',
      rulaScore: activeRula.lowerArmScore,
      description: 'Ideal functional work envelope is 60°–100° flexion for optimal bicep/brachialis mechanical advantage.',
      key: 'lowerArmRight' as const,
      max: 160,
    },
    {
      id: 'knees',
      name: 'Knee Flexion (Squat Stance)',
      angle: activeAngles.kneeRight,
      safeMax: 45,
      dangerMin: 90,
      unit: '°',
      rulaScore: activeRula.legScore,
      description: 'Squat lifting utilizes quadriceps and gluteals, protecting lumbar ligaments from shear forces.',
      key: 'kneeRight' as const,
      max: 130,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Sandbox Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Biomechanical Joint Angle Telemetry
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>3D Vector Mathematics</span>
            <span aria-hidden="true">·</span>
            <span>OSHA Ergonomic Safe Zone Thresholds</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Kinematic Matrix</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (!sandboxMode) {
              setTestAngles({ ...currentAngles });
            }
            setSandboxMode(!sandboxMode);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            sandboxMode
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
              : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{sandboxMode ? 'Exit Angle Sandbox' : 'Interactive Sandbox Mode'}</span>
        </button>
      </div>

      {sandboxMode && (
        <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl text-xs text-emerald-300">
          <strong>Interactive Angle Sandbox Active:</strong> Adjust the sliders below to simulate any joint combination and inspect how the RULA (Current: {activeRula.grandScore}) and REBA (Current: {activeReba.grandScore}) scores react in real time.
        </div>
      )}

      {/* Joint Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jointConfigs.map((joint) => {
          const isDanger = joint.dangerMin ? joint.angle >= joint.dangerMin : joint.angle > joint.safeMax;
          const isWarning = !isDanger && joint.angle > joint.safeMax;
          const isSafe = !isDanger && !isWarning;

          return (
            <div
              key={joint.id}
              className={`bg-slate-900/90 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                isDanger
                  ? 'border-rose-500/50 bg-rose-950/10'
                  : isWarning
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    {joint.name}
                  </span>
                  {isDanger ? (
                    <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Critical
                    </span>
                  ) : isWarning ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Warning
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Safe
                    </span>
                  )}
                </div>

                <div className="my-2 flex items-baseline justify-between">
                  <span
                    className={`text-3xl font-bold font-mono tabular-nums ${
                      isDanger
                        ? 'text-rose-400'
                        : isWarning
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {joint.angle}
                    {joint.unit}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Sub-score: {joint.rulaScore}
                  </span>
                </div>

                {/* Progress bar representing range */}
                <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isDanger
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(5, (joint.angle / joint.max) * 100))}%`,
                    }}
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {joint.description}
                </p>
              </div>

              {/* Sandbox Slider Control */}
              {sandboxMode && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Angle Adjustment</span>
                    <span className="font-mono">{joint.angle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={joint.max}
                    value={joint.angle}
                    onChange={(e) => {
                      setTestAngles({
                        ...testAngles,
                        [joint.key]: Number(e.target.value),
                      });
                    }}
                    className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
