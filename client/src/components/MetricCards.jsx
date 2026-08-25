import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
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
  const pass3 = run?.pass3_matched || 0;
  const unresolved = run?.unresolved || 0;
  const matchRate = run?.match_rate || 0;
  const autoMatched = (total - unresolved > 0) ? (total - unresolved) : (pass1 + pass2);
  const isPendingCreation = !run;

  const cards = [
    {
      title: 'Total Ingested',
      numeric: total,
      isPercent: false,
      subtext: 'Statements & ledger line items',
      icon: FileSpreadsheet,
      textColor: 'text-gray-900',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      bgCard: 'bg-white',
    },
    {
      title: 'Automatically Matched',
      numeric: autoMatched,
      isPercent: false,
      subtext: 'Zero manual intervention needed',
      icon: CheckCircle2,
      textColor: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bgCard: 'bg-white',
    },
    {
      title: 'Flagged for Review',
      numeric: unresolved,
      isPercent: false,
      subtext: unresolved > 0 ? 'Gateway fees, refunds & variances' : 'Zero exceptions flagged',
      icon: AlertCircle,
      textColor: unresolved > 0 ? 'text-amber-700' : 'text-gray-600',
      badgeClass: unresolved > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200',
      bgCard: 'bg-white',
    },
    {
      title: 'Reconciliation Rate',
      numeric: matchRate,
      isPercent: true,
      decimals: 1,
      subtext: `${autoMatched} of ${total} records reconciled`,
      icon: TrendingUp,
      textColor: 'text-blue-700',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      bgCard: 'bg-white',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            className={`card-base p-4 sm:p-5 border border-gray-200 ${card.bgCard} shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 truncate">{card.title}</span>
              <div className={`p-1.5 rounded-lg border text-xs ${card.badgeClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-2.5">
              <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${card.textColor}`}>
                <AnimatedNumber
                  value={card.numeric}
                  isPercent={card.isPercent}
                  isCurrency={card.isCurrency}
                  decimals={card.decimals || 0}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1 truncate">
                {card.subtext}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
