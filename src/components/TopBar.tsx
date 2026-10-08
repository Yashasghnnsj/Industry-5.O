import React from 'react';
import { Volume2, VolumeX, Download, Sparkles, Video, Play, ShieldAlert } from 'lucide-react';

interface TopBarProps {
  activeTab: 'monitor' | 'biomechanics' | 'zones' | 'analytics';
  setActiveTab: (tab: 'monitor' | 'biomechanics' | 'zones' | 'analytics') => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onOpenAiAudit: () => void;
  onExportCsv: () => void;
  inputMode: 'webcam' | 'upload';
  setInputMode: (mode: 'webcam' | 'upload') => void;
  isBreached: boolean;
  dbRecordsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  isMuted,
  setIsMuted,
  onOpenAiAudit,
  onExportCsv,
  inputMode,
  setInputMode,
  isBreached,
  dbRecordsCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title (single element wordmark) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <span className="font-mono text-base tracking-tighter">EV</span>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">
              ErgoVision AI
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Industry 5.0</span>
              <span aria-hidden="true">·</span>
              <span>Vision & Safety</span>
              {isBreached && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                    Hazard Active
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean tabs) */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'monitor'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setActiveTab('biomechanics')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'biomechanics'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Biomechanical Breakdown
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'zones'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Safety Boundaries
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shift Audit & Trends
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5">
          {/* Sound Alarm Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              isMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* AI Ergonomics Audit Button */}
          <button
            onClick={onOpenAiAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI OSHA Audit</span>
          </button>

          {/* Export Report CSV */}
          <button
            onClick={onExportCsv}
            title="Export shift metrics to CSV"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
