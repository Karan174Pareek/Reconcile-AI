import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  CheckCircle2,
  GitMerge,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';

function AnimatedNumber({ value, isPercent = false, decimals = 0 }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString()
  );

  useEffect(() => {
    const controls = animate(count, numericValue, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [numericValue]);

  return (
    <span className="font-mono tabular-nums tracking-tight">
      <motion.span>{rounded}</motion.span>
      {isPercent && '%'}
    </span>
  );
}

export default function MetricCards({ run }) {
  if (!run) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-panel-subtle rounded-2xl p-4 animate-pulse h-28" />
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
      title: 'Total Ingested',
      numeric: total,
      isPercent: false,
      subtext: 'Paired B2B rows',
      icon: FileSpreadsheet,
      textColor: 'text-text-primary',
      badgeClass: 'bg-white/5 text-text-secondary border-white/10',
      isHero: false,
    },
    {
      title: 'Pass 1 (Exact)',
      numeric: pass1,
      isPercent: false,
      subtext: `${pass1Pct}% deterministic`,
      icon: CheckCircle2,
      textColor: 'text-teal-400',
      badgeClass: 'bg-teal-950/60 text-teal-400 border-teal-500/30',
      isHero: false,
    },
    {
      title: 'Pass 2 (Fuzzy)',
      numeric: pass2,
      isPercent: false,
      subtext: `${pass2Pct}% heuristics`,
      icon: GitMerge,
      textColor: 'text-teal-400',
      badgeClass: 'bg-teal-950/60 text-teal-400 border-teal-500/30',
      isHero: false,
    },
    {
      title: 'Pass 3 (Claude AI)',
      numeric: pass3,
      isPercent: false,
      subtext: `${pass3Pct}% AI resolved`,
      icon: Sparkles,
      textColor: 'text-amber-400',
      badgeClass: 'bg-amber-950/60 text-amber-400 border-amber-500/30',
      isHero: false,
    },
    {
      title: 'Exception Queue',
      numeric: unresolved,
      isPercent: false,
      subtext: `${unresolvedPct}% review needed`,
      icon: AlertCircle,
      textColor: unresolved > 0 ? 'text-coral-400' : 'text-text-secondary',
      badgeClass: unresolved > 0 ? 'bg-coral-950/60 text-coral-400 border-coral-500/30' : 'bg-white/5 text-text-muted border-white/10',
      isHero: false,
    },
    {
      title: 'Reconciliation Rate',
      numeric: matchRate,
      isPercent: true,
      decimals: 1,
      subtext: `${total - unresolved} / ${total} resolved`,
      icon: TrendingUp,
      textColor: 'text-teal-400',
      badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/40 shadow-glow-teal',
      isHero: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            className={`glass-panel rounded-2xl p-4 transition-all relative overflow-hidden group ${
              card.isHero
                ? 'border-teal-500/30 bg-teal-500/[0.04] shadow-glow-teal'
                : 'hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-secondary truncate tracking-tight">{card.title}</span>
              <div className={`p-1.5 rounded-lg border text-xs ${card.badgeClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-bold font-mono tracking-tight ${card.textColor}`}>
                <AnimatedNumber value={card.numeric} isPercent={card.isPercent} decimals={card.decimals || 0} />
              </div>
              <div className="text-[10px] text-text-secondary mt-1 truncate font-mono">{card.subtext}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
