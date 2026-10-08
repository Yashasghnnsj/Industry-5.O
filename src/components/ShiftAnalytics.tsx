import React, { useState, useEffect } from 'react';
import { Download, Coffee, AlertTriangle, ShieldAlert, CheckCircle2, Database, RefreshCw, Trash2 } from 'lucide-react';
import { TelemetryPoint } from '../types/ergonomics';

interface ShiftAnalyticsProps {
  telemetryHistory: TelemetryPoint[];
  sessionDurationSec: number;
  avgRula: number;
  peakRula: number;
  avgReba: number;
  peakReba: number;
  totalBreaches: number;
  sustainedHoldCount: number;
  totalRepCycles: number;
  onExportCsv: () => void;
  onExportJson: () => void;
  dbRecordsCount: number;
  onRefreshDb: () => void;
}

interface DbRow {
  id: number;
  timestamp: string;
  rula_score: number;
  reba_score: number;
  trunk_angle: number;
  neck_angle: number;
  upper_arm_angle: number;
  lower_arm_angle: number;
  knee_angle: number;
  fatigue_index: number;
  is_breached: number;
  is_sustained_hold: number;
  frame_index: number;
}

export const ShiftAnalytics: React.FC<ShiftAnalyticsProps> = ({
  telemetryHistory,
  sessionDurationSec,
  avgRula,
  peakRula,
  avgReba,
  peakReba,
  totalBreaches,
  sustainedHoldCount,
  totalRepCycles,
  onExportCsv,
  onExportJson,
  dbRecordsCount,
  onRefreshDb,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'hazard' | 'high_rula'>('all');
  const [dbLogs, setDbLogs] = useState<DbRow[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Fetch actual rows from SQLite ergonomics.db
  const fetchDbLogs = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/db/logs?limit=40');
      if (res.ok) {
        const data = await res.json();
        setDbLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Could not load SQLite logs:', e);
    } finally {
      setLoadingDb(false);
    }
  };

  const clearDb = async () => {
    if (confirm('Clear ergonomics.db table records?')) {
      await fetch('/api/db/clear', { method: 'POST' });
      onRefreshDb();
      fetchDbLogs();
    }
  };

  useEffect(() => {
    fetchDbLogs();
  }, []);

  // Compute shift posture distribution
  let safeCount = 0;
  let warningCount = 0;
  let dangerCount = 0;

  telemetryHistory.forEach((pt) => {
    if (pt.rula <= 2) safeCount++;
    else if (pt.rula <= 4) warningCount++;
    else dangerCount++;
  });

  const totalPoints = Math.max(1, telemetryHistory.length);
  const safePct = Math.round((safeCount / totalPoints) * 100);
  const warnPct = Math.round((warningCount / totalPoints) * 100);
  const dangerPct = Math.round((dangerCount / totalPoints) * 100);

  // Dynamic automated break recommendation based on cumulative fatigue
  const breakMinutes = peakRula >= 6 ? 10 : peakRula >= 4 ? 6 : 4;
  const breakIntervalMin = peakRula >= 6 ? 30 : peakRula >= 4 ? 45 : 60;
  const elapsedMin = Math.round(sessionDurationSec / 60);
  const nextBreakInMin = Math.max(1, breakIntervalMin - (elapsedMin % breakIntervalMin));

  // Build SVG path for RULA score time-series
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = 20;

  const ptsToRender = telemetryHistory.slice(-40);
  let pathD = '';
  if (ptsToRender.length > 1) {
    const xStep = (svgWidth - padding * 2) / (ptsToRender.length - 1);
    ptsToRender.forEach((pt, idx) => {
      const x = padding + idx * xStep;
      const y = svgHeight - padding - ((pt.rula - 1) / 6) * (svgHeight - padding * 2);
      if (idx === 0) pathD += `M ${x} ${y}`;
      else pathD += ` L ${x} ${y}`;
    });
  }

  return (
    <div className="space-y-6">
      {/* SQLite Database Status Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>SQLite Persistent Storage:</span>
              <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-sky-300">
                ergonomics.db
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Persistent storage of real-time pose metrics, fatigue progression, and safety envelope breach timestamps.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onRefreshDb();
              fetchDbLogs();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin' : ''}`} />
            <span>Sync SQLite ({dbRecordsCount})</span>
          </button>
          <button
            onClick={clearDb}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-800 transition-colors"
            title="Reset database records"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Session Duration</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
            {Math.floor(sessionDurationSec / 60)}m {Math.floor(sessionDurationSec % 60)}s
          </div>
          <div className="text-[11px] text-slate-500 mt-1">30+ FPS Frame Processor</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Avg / Peak RULA</div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums mt-1">
            {avgRula.toFixed(1)} <span className="text-sm text-slate-400">/ {peakRula}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">From Dynamic Coordinates</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Sustained Awkward Holds</div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-1">
            {sustainedHoldCount} <span className="text-xs text-slate-400">&gt;5s</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cumulative Strain Triggers</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Safety Zone Breaches</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
            {totalBreaches}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ray-Casting Collision Checks</div>
        </div>
      </div>

      {/* Time Series Chart & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Series Graph */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Live RULA Posture Score Trend (Frame-by-Frame)
              </h3>
              <div className="text-xs text-slate-400 mt-0.5">
                Dynamic posture risk calculated from live coordinates
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                1-2 Safe
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                3-4 Investigate
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                5-7 Immediate
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-950 rounded-lg p-2 border border-slate-800/80 overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-44 overflow-visible"
            >
              <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" />
              <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#334155" strokeDasharray="3 3" />
              <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#334155" />

              <text x={padding - 6} y={padding + 4} fill="#ef4444" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">7</text>
              <text x={padding - 6} y={svgHeight / 2 + 3} fill="#f59e0b" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">4</text>
              <text x={padding - 6} y={svgHeight - padding} fill="#22c55e" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">1</text>

              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {ptsToRender.map((pt, idx) => {
                const xStep = (svgWidth - padding * 2) / Math.max(1, ptsToRender.length - 1);
                const x = padding + idx * xStep;
                const y = svgHeight - padding - ((pt.rula - 1) / 6) * (svgHeight - padding * 2);
                const color = pt.rula >= 5 ? '#ef4444' : pt.rula >= 3 ? '#f59e0b' : '#22c55e';
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={3}
                    fill={color}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Posture Distribution & Automated Break Recommendation */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Shift Posture Exposure
            </h4>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-medium">Safe Posture (RULA 1-2)</span>
                  <span className="font-mono text-slate-200">{safePct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${safePct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-medium">Mild Strain (RULA 3-4)</span>
                  <span className="font-mono text-slate-200">{warnPct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${warnPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-medium">Severe Risk (RULA 5-7)</span>
                  <span className="font-mono text-slate-200">{dangerPct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${dangerPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Coffee className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Automated Recovery Schedule
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Based on continuous biomechanical load, we recommend a{' '}
              <strong className="text-emerald-300 font-semibold">{breakMinutes}-minute micro-break</strong>{' '}
              in approximately{' '}
              <strong className="text-emerald-300 font-mono font-semibold">{nextBreakInMin} minutes</strong>{' '}
              to decompress lumbar intervertebral discs.
            </p>
            <div className="text-[11px] text-slate-400 border-t border-emerald-900/50 pt-2 flex items-center justify-between">
              <span>Target Cadence:</span>
              <span className="font-mono text-emerald-300">Every {breakIntervalMin} mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical SQLite Database Records Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Real-Time Records in ergonomics.db (SQLite)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct SQL records retrieved from SQLite table `ergonomics_logs`
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* High-Density Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-2.5 px-3">Frame ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">RULA</th>
                <th className="py-2.5 px-3 text-right">REBA</th>
                <th className="py-2.5 px-3 text-right">Trunk Flexion</th>
                <th className="py-2.5 px-3 text-right">Arm Elevation</th>
                <th className="py-2.5 px-3 text-right">Fatigue Index</th>
                <th className="py-2.5 px-3">Hazard Breach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {dbLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No rows stored in `ergonomics.db` yet. Active camera or video stream will log records.
                  </td>
                </tr>
              ) : (
                dbLogs.slice(0, 20).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-400 tabular-nums">#{row.frame_index || row.id}</td>
                    <td className="py-2 px-3 text-slate-300 tabular-nums">{row.timestamp}</td>
                    <td className={`py-2 px-3 text-right font-bold tabular-nums ${
                      row.rula_score >= 5 ? 'text-rose-400' : row.rula_score >= 3 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {row.rula_score}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{row.reba_score}</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{row.trunk_angle}°</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{row.upper_arm_angle}°</td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{Math.round(row.fatigue_index)}%</td>
                    <td className="py-2 px-3 font-sans">
                      {row.is_breached ? (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Breached
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Nominal
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
