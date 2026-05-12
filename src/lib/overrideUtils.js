import { formatDateKey } from "./cycleUtils";
import { eachDayOfInterval, isWithinInterval, parseISO } from "date-fns";

/**
 * Apply day_overrides from a CycleOverride record to a base cycle,
 * returning adjusted counts and allowance.
 *
 * Override types:
 *  - "full"        → change an existing day to full per diem
 *  - "half"        → change an existing day to half per diem
 *  - "travel"      → change an existing day to travel rate
 *  - "off"         → remove an existing eligible day
 *  - "extra_full"  → add a new full per diem day (outside normal schedule)
 *  - "extra_half"  → add a new half per diem day
 *  - "extra_travel"→ add a new travel-rate day
 */
export function applyOverrides(cycle, config, overrideRecord) {
  if (!cycle || !overrideRecord?.day_overrides?.length) {
    return {
      adjustedEligibleDayCount: cycle?.eligibleDayCount ?? 0,
      adjustedTravelDayCount: cycle?.travelDayCount ?? 0,
      adjustedTotalAllowance: cycle?.totalAllowance ?? 0,
      adjustedEarnedSoFar: cycle?.earnedSoFar ?? 0,
      extraDays: 0,
      removedDays: 0,
      changedDays: 0,
    };
  }

  const dailyRate = config.daily_rate || 0;
  const travelMultiplier = config.travel_day_multiplier ?? 0.5;
  const travelRate = config.travel_day_rate ?? dailyRate * travelMultiplier;
  const halfRate = dailyRate * 0.5;

  const workDays = config.work_days || [];
  const travelDayDOWs = config.travel_days || [];
  const { cycleStart, onEnd, cycleEnd } = cycle;

  // Build a map of normal per-day allowance keyed by date string
  const allDays = eachDayOfInterval({ start: cycleStart, end: cycleEnd });
  const baseDayMap = {}; // dateKey → { rate, type } | null
  allDays.forEach((day) => {
    const dow = day.getDay();
    const key = formatDateKey(day);
    if (!isWithinInterval(day, { start: cycleStart, end: onEnd })) {
      baseDayMap[key] = null;
      return;
    }
    if (travelDayDOWs.includes(dow)) {
      baseDayMap[key] = { rate: travelRate, type: "travel" };
    } else if (workDays.includes(dow)) {
      baseDayMap[key] = { rate: dailyRate, type: "full" };
    } else {
      baseDayMap[key] = null;
    }
  });

  // Apply overrides on top
  const overrideMap = {}; // dateKey → override entry
  (overrideRecord.day_overrides || []).forEach((o) => {
    overrideMap[o.date] = o;
  });

  let adjustedAllowance = 0;
  let adjustedEligible = 0;
  let adjustedTravel = 0;
  let extraDays = 0;
  let removedDays = 0;
  let changedDays = 0;

  // Re-tally all days with overrides applied
  const allDateKeys = Object.keys(baseDayMap);
  // Also include any extra days from overrides that may fall outside normal days
  const allOverrideDates = Object.keys(overrideMap).filter((k) => !allDateKeys.includes(k));
  const fullSet = [...allDateKeys, ...allOverrideDates];

  fullSet.forEach((key) => {
    const base = baseDayMap[key] ?? null;
    const ov = overrideMap[key];

    if (ov) {
      const isExtra = ov.type.startsWith("extra_");
      const wasEligible = base !== null;

      if (ov.type === "off") {
        // Off days always contribute $0 allowance
        if (wasEligible) removedDays++;
        return; // $0 — no allowance accrual
      }

      if (ov.type === "full" || ov.type === "extra_full") {
        adjustedAllowance += dailyRate;
        adjustedEligible++;
        if (isExtra) extraDays++;
        else if (wasEligible && base.type !== "full") changedDays++;
      } else if (ov.type === "half" || ov.type === "extra_half") {
        adjustedAllowance += halfRate;
        adjustedEligible++;
        if (isExtra) extraDays++;
        else if (wasEligible) changedDays++;
      } else if (ov.type === "travel" || ov.type === "extra_travel") {
        adjustedAllowance += travelRate;
        adjustedTravel++;
        if (isExtra) extraDays++;
        else if (wasEligible && base.type !== "travel") changedDays++;
      }
    } else if (base) {
      // No override — use base value
      adjustedAllowance += base.rate;
      if (base.type === "travel") adjustedTravel++;
      else adjustedEligible++;
    }
  });

  // Recalculate earnedSoFar with overrides
  const today = new Date();
  let adjustedEarnedSoFar = 0;
  const elapsed = isWithinInterval(today, { start: cycleStart, end: cycleEnd })
    ? eachDayOfInterval({ start: cycleStart, end: today })
    : today > cycleEnd
    ? eachDayOfInterval({ start: cycleStart, end: cycleEnd })
    : [];

  elapsed.forEach((day) => {
    const key = formatDateKey(day);
    const base = baseDayMap[key] ?? null;
    const ov = overrideMap[key];

    if (ov) {
      if (ov.type === "off") return;
      if (ov.type === "full" || ov.type === "extra_full") adjustedEarnedSoFar += dailyRate;
      else if (ov.type === "half" || ov.type === "extra_half") adjustedEarnedSoFar += halfRate;
      else if (ov.type === "travel" || ov.type === "extra_travel") adjustedEarnedSoFar += travelRate;
    } else if (base) {
      adjustedEarnedSoFar += base.rate;
    }
  });

  return {
    adjustedEligibleDayCount: adjustedEligible,
    adjustedTravelDayCount: adjustedTravel,
    adjustedTotalAllowance: adjustedAllowance,
    adjustedEarnedSoFar,
    extraDays,
    removedDays,
    changedDays,
  };
}

export function getOverrideSummaryLine(adj) {
  const parts = [];
  if (adj.extraDays > 0) parts.push(`+${adj.extraDays} added`);
  if (adj.removedDays > 0) parts.push(`-${adj.removedDays} removed`);
  if (adj.changedDays > 0) parts.push(`${adj.changedDays} changed`);
  return parts.join(" · ");
}