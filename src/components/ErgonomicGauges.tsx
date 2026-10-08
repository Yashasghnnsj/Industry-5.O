import React from 'react';
import { Activity, Clock, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { RulaBreakdown, RebaBreakdown } from '../types/ergonomics';

interface ErgonomicGaugesProps {
  rula: RulaBreakdown;
  reba: RebaBreakdown;
  fatigueIndex: number;
  sustainedHoldSec: number;
  repCount: number;
  repRatePerMin: number;
}

export const ErgonomicGauges: React.FC<ErgonomicGaugesProps> = ({
  rula,
  reba,
  fatigueIndex,
  sustainedHoldSec,
  repCount,
  repRatePerMin,
}) => {
  // Color tokens based on RULA grand score
  const getRulaColor = (score: number) => {
    if (score <= 2) return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/40', badge: 'bg-emerald-950/60 text-emerald-300' };
    if (score <= 4) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/40', badge: 'bg-amber-950/60 text-amber-300' };
    if (score <= 6) return { text: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/40', badge: 'bg-orange-950/60 text-orange-300' };
    return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/40', badge: 'bg-rose-950/60 text-rose-300' };
  };

  const getRebaColor = (score: number) => {
    if (score <= 3) return { text: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (score <= 7) return { text: 'text-amber-400', bg: 'bg-amber-500' };
    if (score <= 10) return { text: 'text-orange-400', bg: 'bg-orange-500' };
    return { text: 'text-rose-400', bg: 'bg-rose-500' };
  };

  const rulaTheme = getRulaColor(rula.grandScore);
  const rebaTheme = getRebaColor(reba.grandScore);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. RULA Score Gauge Card */}
      <div className={`bg-slate-900/90 border ${rulaTheme.border} rounded-xl p-4 flex flex-col justify-between transition-all`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            RULA Score
          </span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${rulaTheme.badge}`}>
            {rula.riskLevel} Risk
          </span>
        </div>

        <div className="my-3 flex items-baseline gap-2">
          <span className={`text-4xl font-extrabold font-mono tabular-nums ${rulaTheme.text}`}>
            {rula.grandScore}
          </span>
          <span className="text-sm text-slate-400 font-mono">/ 7</span>
        </div>

        {/* 7-Segment Progress Bar */}
        <div className="grid grid-cols-7 gap-1 h-2 mb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((val) => (
            <div
              key={val}
              className={`rounded-sm transition-colors ${
                val <= rula.grandScore
                  ? val <= 2
                    ? 'bg-emerald-500'
                    : val <= 4
                    ? 'bg-amber-500'
                    : val <= 6
                    ? 'bg-orange-500'
                    : 'bg-rose-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="text-xs text-slate-400 line-clamp-2">
          {rula.actionLevel}
        </div>
      </div>

      {/* 2. REBA Score Gauge Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            REBA Entire Body
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Table A: {reba.scoreA} · B: {reba.scoreB}
          </span>
        </div>

        <div className="my-3 flex items-baseline gap-2">
          <span className={`text-4xl font-extrabold font-mono tabular-nums ${rebaTheme.text}`}>
            {reba.grandScore}
          </span>
          <span className="text-sm text-slate-400 font-mono">/ 15</span>
        </div>

        {/* 15-Segment Progress Bar */}
        <div className="grid grid-cols-15 gap-0.5 h-2 mb-2">
          {Array.from({ length: 15 }, (_, i) => i + 1).map((val) => (
            <div
              key={val}
              className={`rounded-sm transition-colors ${
                val <= reba.grandScore
                  ? val <= 3
                    ? 'bg-emerald-500'
                    : val <= 7
                    ? 'bg-amber-500'
                    : val <= 10
                    ? 'bg-orange-500'
                    : 'bg-rose-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="text-xs text-slate-400 truncate">
          Risk: <span className="text-slate-200 font-medium">{reba.riskLevel}</span>
        </div>
      </div>

      {/* 3. Fatigue Accumulation Index */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Fatigue Index
          </span>
          <span className="text-xs font-mono text-slate-400">Industry 5.0</span>
        </div>

        <div className="my-3 flex items-baseline gap-2">
          <span
            className={`text-4xl font-extrabold font-mono tabular-nums ${
              fatigueIndex > 70
                ? 'text-rose-400'
                : fatigueIndex > 40
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {Math.round(fatigueIndex)}%
          </span>
        </div>

        {/* Smooth meter */}
        <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              fatigueIndex > 70
                ? 'bg-rose-500'
                : fatigueIndex > 40
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, fatigueIndex))}%` }}
          />
        </div>

        <div className="text-xs text-slate-400">
          {fatigueIndex > 70
            ? 'Severe: Recommend immediate recovery break'
            : fatigueIndex > 40
            ? 'Moderate: Muscle strain accumulating'
            : 'Nominal physiological reserve'}
        </div>
      </div>

      {/* 4. Repetition & Sustained Awkward Posture Hold */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Cycle & Strain Hold
          </span>
          {sustainedHoldSec >= 5 ? (
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              Over 5s!
            </span>
          ) : (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Dynamic
            </span>
          )}
        </div>

        <div className="my-3 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {repCount}
            </div>
            <div className="text-xs text-slate-400">Lift Cycles</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {repRatePerMin.toFixed(1)}
            </div>
            <div className="text-xs text-slate-400">Cycles/Min</div>
          </div>
        </div>

        {/* Sustained Hold Warning bar */}
        <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
          <span>Continuous Hold:</span>
          <span
            className={`font-mono font-bold ${
              sustainedHoldSec >= 5
                ? 'text-rose-400 animate-pulse'
                : sustainedHoldSec > 2
                ? 'text-amber-400'
                : 'text-slate-300'
            }`}
          >
            {sustainedHoldSec}s / 5s limit
          </span>
        </div>
      </div>
    </div>
  );
};
