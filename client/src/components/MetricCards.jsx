import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

function AnimatedNumber({ value, isPercent = false, isCurrency = false, decimals = 0 }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toLocaleString('en-IN')
  );

  useEffect(() => {
    const controls = animate(count, numericValue, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [numericValue]);

  return (
    <span className="font-mono tabular-nums tracking-tight">
      {isCurrency && '₹'}
      <motion.span>{rounded}</motion.span>
      {isPercent && '%'}
    </span>
  );
}

export default function MetricCards({ run }) {
  const total = run?.total_records || 0;
  const pass1 = run?.pass1_matched || 0;
  const pass2 = run?.pass2_matched || 0;
  const unresolved = run?.unresolved || 0;
  const matchRate = run?.match_rate || 0;
  const level1Balanced = Number.isFinite(Number(run?.level1_balanced)) ? Number(run.level1_balanced) : 0;
  const level1Flagged = Number.isFinite(Number(run?.level1_flagged)) ? Number(run.level1_flagged) : 0;
  const level1Total = level1Balanced + level1Flagged;
  const autoMatched = (total - unresolved > 0) ? (total - unresolved) : (pass1 + pass2);

  const cards = [
    {
      title: 'TOTAL INGESTED',
      numeric: total,
      isPercent: false,
      subtext: 'Settlement & ledger items',
      icon: FileSpreadsheet,
      textColor: 'text-slate-900',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      bgCard: 'bg-white',
    },
    {
      title: 'AUTOMATICALLY MATCHED',
      numeric: autoMatched,
      isPercent: false,
      subtext: 'Cleared via Pass 1 & Level 2',
      icon: CheckCircle2,
      textColor: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bgCard: 'bg-white',
    },
    {
      title: 'HITL REVIEW QUEUE',
      numeric: unresolved,
      isPercent: false,
      subtext: unresolved > 0 ? 'Gateway fees, refunds & timing lag' : 'Zero exceptions flagged',
      icon: AlertCircle,
      textColor: unresolved > 0 ? 'text-amber-700' : 'text-slate-600',
      badgeClass: unresolved > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200',
      bgCard: 'bg-white',
    },
    {
      title: 'RECONCILIATION RATE',
      numeric: matchRate,
      isPercent: true,
      decimals: 1,
      subtext: `${autoMatched} of ${total} records reconciled`,
      icon: TrendingUp,
      textColor: 'text-[#0B72E7]',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      bgCard: 'bg-white',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={`card-base p-3.5 sm:p-4 border border-slate-200/80 ${card.bgCard} shadow-2xs hover:border-slate-300 transition-colors`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 truncate">{card.title}</span>
                <div className={`p-1.5 rounded-md border text-xs ${card.badgeClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="mt-2">
                <div className={`text-2xl font-bold font-mono tracking-tight ${card.textColor}`}>
                  <AnimatedNumber
                    value={card.numeric}
                    isPercent={card.isPercent}
                    isCurrency={card.isCurrency}
                    decimals={card.decimals || 0}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate font-sans">
                  {card.subtext}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dedicated Level 1 Batch Integrity Gate Status Card */}
      <div className="p-3 rounded-lg border flex items-center justify-between text-xs font-mono transition-colors bg-emerald-50/60 border-emerald-200 text-emerald-900">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              LEVEL 1 BATCH INTEGRITY GATE:
            </span>
            <span>
              {level1Flagged > 0
                ? `${level1Balanced} of ${level1Total} settlement batches balanced (${level1Flagged} isolated to HITL queue)`
                : level1Total > 0
                ? `All ${level1Balanced} settlement batches verified balanced (Σ line items == bank credit)`
                : 'No settlement batch integrity results yet'}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300">
          {level1Total > 0 ? `${level1Balanced}/${level1Total} BALANCED` : 'PENDING'}
        </span>
      </div>
    </div>
  );
}
