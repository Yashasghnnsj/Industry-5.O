import React from 'react';
import { Shield, ShieldAlert, CheckCircle2, RotateCcw, AlertOctagon } from 'lucide-react';
import { SafetyZone } from '../types/ergonomics';

interface SafetyZoneManagerProps {
  safetyZone: SafetyZone;
  onUpdateSafetyZone: (zone: SafetyZone) => void;
  isBreached: boolean;
  breachCount: number;
}

export const SafetyZoneManager: React.FC<SafetyZoneManagerProps> = ({
  safetyZone,
  onUpdateSafetyZone,
  isBreached,
  breachCount,
}) => {
  const PRESET_ZONES = [
    {
      name: 'Robotic Cell Operating Envelope',
      vertices: [
        { x: 0.65, y: 0.20 },
        { x: 0.96, y: 0.20 },
        { x: 0.96, y: 0.85 },
        { x: 0.65, y: 0.85 },
      ],
    },
    {
      name: 'High-Speed Conveyor Pinch Point',
      vertices: [
        { x: 0.50, y: 0.40 },
        { x: 0.90, y: 0.40 },
        { x: 0.90, y: 0.90 },
        { x: 0.50, y: 0.90 },
      ],
    },
    {
      name: 'AGV / Forklift Pathway Crossing',
      vertices: [
        { x: 0.70, y: 0.60 },
        { x: 0.98, y: 0.60 },
        { x: 0.98, y: 0.95 },
        { x: 0.70, y: 0.95 },
      ],
    },
    {
      name: 'Full Right Workstation Exclusion',
      vertices: [
        { x: 0.58, y: 0.15 },
        { x: 0.98, y: 0.15 },
        { x: 0.98, y: 0.92 },
        { x: 0.58, y: 0.92 },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        isBreached
          ? 'bg-rose-950/30 border-rose-500/60'
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isBreached ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            {isBreached ? <AlertOctagon className="w-6 h-6 animate-pulse" /> : <Shield className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Virtual Safety Zone Perimeter
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ray-casting point-in-polygon collision tracking prevents workers from encroaching into hazardous machinery zones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Breaches</div>
            <div className="text-xl font-bold font-mono text-white tabular-nums">
              {breachCount} incidents
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
            isBreached
              ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse'
              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
          }`}>
            {isBreached ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Zone Breached</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zone Clear</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preset Boundaries & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preset Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Safety Boundary Presets
          </h4>
          <div className="space-y-2">
            {PRESET_ZONES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  onUpdateSafetyZone({
                    ...safetyZone,
                    name: preset.name,
                    vertices: preset.vertices,
                  });
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                  safetyZone.name === preset.name
                    ? 'bg-slate-800/90 border-amber-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-200">{preset.name}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {preset.vertices.length} boundary vertices · Normalized coordinates
                  </div>
                </div>
                {safetyZone.name === preset.name && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Boundary Coordinates Inspector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Interactive Boundary Coordinates
              </h4>
              <button
                onClick={() => {
                  onUpdateSafetyZone({
                    ...safetyZone,
                    vertices: [
                      { x: 0.60, y: 0.20 },
                      { x: 0.95, y: 0.20 },
                      { x: 0.95, y: 0.85 },
                      { x: 0.60, y: 0.85 },
                    ],
                  });
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              You can drag the circular yellow vertices directly on the live stream video canvas to calibrate the machinery boundary!
            </p>

            <div className="space-y-1.5 font-mono text-xs">
              {safetyZone.vertices.map((v, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400">Vertex {i + 1}:</span>
                  <span className="text-slate-200">
                    X: {(v.x * 100).toFixed(1)}% · Y: {(v.y * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Detection Sensitivity:</span>
            <span className="text-emerald-400 font-medium">Full Body & Extremities (33 Nodes)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
