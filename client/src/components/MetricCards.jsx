import React from 'react';
import {
  CheckCircle2,
  GitMerge,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';

export default function MetricCards({ run }) {
  if (!run) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const total = run.total_records || 0;
  const pass1 = run.pass1_matched || 0;
  const pass2 = run.pass2_matched || 0;
  const pass3 = run.pass3_matched || 0;
  const unresolved = run.unresolved || 0;
  const matchRate = run.match_rate || 0;

  const pass1Pct = total > 0 ? ((pass1 / total) * 100).toFixed(1) : 0;
  const pass2Pct = total > 0 ? ((pass2 / total) * 100).toFixed(1) : 0;
  const pass3Pct = total > 0 ? ((pass3 / total) * 100).toFixed(1) : 0;
  const unresolvedPct = total > 0 ? ((unresolved / total) * 100).toFixed(1) : 0;

  const cards = [
    {
      title: 'Total Records',
      value: total,
      subtext: 'Ingested paired entries',
      icon: FileSpreadsheet,
      color: 'text-slate-200',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    },
    {
      title: 'Pass 1 (Exact)',
      value: pass1,
      subtext: `${pass1Pct}% of total`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    },
    {
      title: 'Pass 2 (Fuzzy)',
      value: pass2,
      subtext: `${pass2Pct}% of total`,
      icon: GitMerge,
      color: 'text-blue-400',
      badgeColor: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    },
    {
      title: 'Pass 3 (Claude AI)',
      value: pass3,
      subtext: `${pass3Pct}% of total`,
      icon: Sparkles,
      color: 'text-purple-400',
      badgeColor: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
    },
    {
      title: 'Exceptions / Queue',
      value: unresolved,
      subtext: `${unresolvedPct}% unresolved`,
      icon: AlertCircle,
      color: unresolved > 0 ? 'text-amber-400' : 'text-slate-400',
      badgeColor: unresolved > 0 ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      title: 'Reconciliation Rate',
      value: `${matchRate}%`,
      subtext: `${total - unresolved} / ${total} matched`,
      icon: TrendingUp,
      color: 'text-brand-400',
      badgeColor: 'bg-brand-950/60 text-brand-400 border-brand-800/60',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 shadow-sm transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 truncate">{card.title}</span>
              <div className={`p-1 rounded-md border ${card.badgeColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className={`text-xl font-bold font-mono tracking-tight ${card.color}`}>
                {card.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{card.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
