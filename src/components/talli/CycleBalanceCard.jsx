import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingDown, TrendingUp, Minus, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { getOverrideSummaryLine } from "@/lib/overrideUtils";

const formatDateKey = (dateKey) => {
  try {
    return format(parseISO(dateKey), "MMM d");
  } catch {
    return dateKey;
  }
};

export default function CycleBalanceCard({ cycle, adjustedCycle, overrideRecord, spent }) {
  const extraDayKeys = (overrideRecord?.day_overrides || [])
    .filter((o) => o.type.startsWith("extra_"))
    .map((o) => o.date);

  const displayLabel = useMemo(() => {
    if (!cycle) return "";
    if (extraDayKeys.length === 0) return cycle.label;
    // Extend start backward based on extra days, but only extend end within original cycle bounds
    const extraDates = extraDayKeys.map((d) => parseISO(d));
    if (extraDates.length === 0) return cycle.label;
    const minExtra = new Date(Math.min(...extraDates.map((d) => d.getTime())));
    const maxExtra = new Date(Math.max(...extraDates.map((d) => d.getTime())));
    const startDate = new Date(Math.min(cycle.cycleStart.getTime(), minExtra.getTime()));
    // Only extend end if extra days fall within original cycle range
    const endDate = maxExtra <= cycle.cycleEnd
      ? new Date(Math.max(cycle.cycleEnd.getTime(), maxExtra.getTime()))
      : cycle.cycleEnd;
    return `${formatDateKey(format(startDate, "yyyy-MM-dd"))} - ${formatDateKey(format(endDate, "yyyy-MM-dd"))}`;
  }, [cycle, cycle?.cycleStart, cycle?.cycleEnd, overrideRecord, extraDayKeys]);

  if (!cycle) return null;

  // Use adjusted values if override exists, else base values
  const hasOverride = overrideRecord && (overrideRecord.day_overrides || []).length > 0;
  const totalAllowance = hasOverride ? adjustedCycle.adjustedTotalAllowance : cycle.totalAllowance;
  const earnedSoFar = hasOverride ? adjustedCycle.adjustedEarnedSoFar : cycle.earnedSoFar;
  const normalDays = cycle.eligibleDayCount + cycle.travelDayCount;
  const adjustedDays = hasOverride
    ? adjustedCycle.adjustedEligibleDayCount + adjustedCycle.adjustedTravelDayCount
    : normalDays;
  const netChange = adjustedDays - normalDays;

  const remaining = Math.max(totalAllowance - spent, 0);
  const isOver = spent > totalAllowance;
  const percentage = totalAllowance > 0 ? Math.min((spent / totalAllowance) * 100, 100) : 0;

  const pacingDelta = earnedSoFar - spent;
  const onTrack = Math.abs(pacingDelta) < totalAllowance * 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground"
    >
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        {/* Top row */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 opacity-70" />
            <span className="text-xs font-medium uppercase tracking-wider opacity-70">Remaining Balance</span>
          </div>
          <Link
            to={cycle ? `/adjust-cycle?cycle=${format(cycle.cycleStart, "yyyy-MM-dd")}` : "#"}
            className="flex items-center gap-1 text-[10px] font-semibold bg-white/15 hover:bg-white/25 transition-colors rounded-full px-2.5 py-1"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Adjust
          </Link>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold tracking-tight">${remaining.toFixed(2)}</span>
          {isOver && <span className="text-sm font-semibold text-red-300">over budget</span>}
        </div>

        <p className="text-xs opacity-60 mb-3">
          {`${displayLabel} · $${totalAllowance.toFixed(0)} allowance`}
        </p>

        {/* Days breakdown */}
        <div className="flex items-center gap-3 mb-4 text-xs">
          <span className="opacity-70">{normalDays} normal days</span>
          {hasOverride && netChange !== 0 && (
            <>
              <span className="opacity-40">+</span>
              <span className={`font-semibold ${netChange > 0 ? "text-emerald-200" : "text-red-300"}`}>
                {netChange > 0 ? "+" : ""}{netChange} adjusted
              </span>
              <span className="opacity-40">=</span>
              <span className="font-bold">{adjustedDays} days</span>
            </>
          )}
          {!hasOverride && (
            <span className="opacity-50">· {normalDays} eligible days</span>
          )}
        </div>

        {/* Override note chip */}
        {hasOverride && overrideRecord.note && (
          <div className="mb-3 text-[10px] bg-white/10 rounded-xl px-3 py-1.5 opacity-80 italic">
            "{overrideRecord.note}"
          </div>
        )}

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className={`h-full rounded-full ${
              isOver ? "bg-red-400" : percentage > 80 ? "bg-yellow-300" : "bg-white/90"
            }`}
          />
        </div>

        <div className="flex justify-between text-xs opacity-60 mb-3">
          <span>${spent.toFixed(2)} spent</span>
          <span>{percentage.toFixed(0)}% used</span>
        </div>

        {/* Pacing chip */}
        {totalAllowance > 0 && earnedSoFar > 0 && (
          <div className={`flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2 ${
            onTrack
              ? "bg-white/10 text-white/80"
              : pacingDelta > 0
              ? "bg-white/10 text-emerald-200"
              : "bg-red-500/20 text-red-200"
          }`}>
            {onTrack ? (
              <><Minus className="h-3 w-3" /> On pace</>
            ) : pacingDelta > 0 ? (
              <><TrendingUp className="h-3 w-3" /> ${pacingDelta.toFixed(0)} under pace — great</>
            ) : (
              <><TrendingDown className="h-3 w-3" /> ${Math.abs(pacingDelta).toFixed(0)} ahead of pace</>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}