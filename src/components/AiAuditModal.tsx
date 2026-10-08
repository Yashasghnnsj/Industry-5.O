import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Download, Printer, RefreshCw } from 'lucide-react';
import { ShiftAuditReport } from '../types/ergonomics';

interface AiAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    sessionDurationSec: number;
    avgRula: number;
    peakRula: number;
    avgReba: number;
    peakReba: number;
    sustainedStrainCount: number;
    totalRepCycles: number;
    repFrequencyPerMin: number;
    safetyBreaches: number;
    highRiskJoints: string[];
    postureDistribution: { safe: number; warning: number; danger: number };
  };
}

export const AiAuditModal: React.FC<AiAuditModalProps> = ({
  isOpen,
  onClose,
  sessionData,
}) => {
  const [report, setReport] = useState<ShiftAuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ergonomics-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      setError('Could not generate AI report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report) {
      fetchAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                AI Ergonomics & OSHA Compliance Audit
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Industry 5.0 Human-Centric Assessment</span>
                <span aria-hidden="true">·</span>
                <span>Gemini Biomechanics Engine</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudit}
              disabled={loading}
              title="Regenerate Audit"
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="font-semibold text-slate-200 text-sm">
                Analyzing Biomechanical Joint Data with Gemini AI...
              </div>
              <div className="text-slate-400 text-xs">
                Evaluating RULA/REBA matrices against OSHA 1910 and ISO 11228 manual handling standards.
              </div>
            </div>
          ) : error ? (
            <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl text-rose-300 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : report ? (
            <>
              {/* Executive Summary Banner */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Executive Ergonomics Summary
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                    report.riskLevel.includes('High') || report.riskLevel.includes('Severe')
                      ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                      : report.riskLevel.includes('Medium')
                      ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                  }`}>
                    {report.riskLevel}
                  </span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed font-sans">
                  {report.summary}
                </p>
              </div>

              {/* OSHA & Regulatory Compliance Card */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-sky-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{report.oshaCompliance?.standard || 'OSHA Ergonomics Standard'}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-slate-400">Rating:</span>
                  <span className={`font-semibold ${
                    report.oshaCompliance?.rating === 'Compliant'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {report.oshaCompliance?.rating}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {report.oshaCompliance?.recommendation}
                </p>
              </div>

              {/* Biomechanical Analysis Findings */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Biomechanical Stress Factors & Joint Moments
                </h3>
                <div className="space-y-2">
                  {report.biomechanicalAnalysis?.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg flex items-start gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Plan: Engineering & Administrative Controls */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recommended Engineering & Administrative Controls
                </h3>
                <div className="space-y-2">
                  {report.actionPlan?.map((plan, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-slate-200">{plan}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Targeted Micro-Break & Stretching Schedule */}
              <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Targeted Recovery Stretches
                  </h3>
                  <span className="font-mono text-emerald-300">
                    Break: {report.breakSchedule?.recommendedBreakMinutes} mins ({report.breakSchedule?.microBreakFrequency})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {report.breakSchedule?.targetedStretches?.map((stretch, idx) => (
                    <div key={idx} className="bg-slate-950/80 border border-emerald-900/60 p-2.5 rounded-lg text-slate-300">
                      <div className="text-emerald-400 font-semibold mb-1">Stretch 0{idx + 1}</div>
                      <div>{stretch}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Certified Ergonomics Assessment Model · ISO 11228 / RULA Standard
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Audit</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
