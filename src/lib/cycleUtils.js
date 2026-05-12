import {
  addDays,
  addWeeks,
  differenceInDays,
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";

export const SCHEDULE_PRESETS = [
  { key: "mon_fri", label: "Mon – Fri (5 days)", workDays: [1, 2, 3, 4, 5], travelDays: [] },
  { key: "mon_sat", label: "Mon – Sat (6 days)", workDays: [1, 2, 3, 4, 5, 6], travelDays: [] },
  { key: "sun_sat", label: "Sun – Sat (7 days)", workDays: [0, 1, 2, 3, 4, 5, 6], travelDays: [] },
  { key: "custom_days", label: "Custom days…", workDays: [], travelDays: [] },
];

// Rotation presets removed — all schedules are now weekly repeating by default
export const ROTATION_PRESETS = [];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const getDayName = (d) => DAY_NAMES[d];

/**
 * Given a CycleConfig and a reference date, compute the current cycle:
 * { cycleStart, cycleEnd, totalDays, eligibleDays, travelDays, totalAllowance, label }
 */
export function computeCycle(config, referenceDate = new Date()) {
  if (!config?.cycle_start_date) return null;

  const ref = startOfDay(referenceDate);
  const dailyRate = config.daily_rate || 0;
  const travelMultiplier = config.travel_day_multiplier ?? 0.5;
  const travelRate = config.travel_day_rate ?? dailyRate * travelMultiplier;
  const workDays = config.work_days || [];
  const travelDayDOWs = config.travel_days || [];

  const weeksOn = config.weeks_on || 1;
  const weeksOff = config.weeks_off || 0;
  const daysOn = config.days_on ?? (weeksOn * 7);
  const daysOff = config.days_off ?? (weeksOff * 7);
  // Use custom cycle_days if set, otherwise calculate from on/off pattern
  const cycleLengthDays = config.cycle_days ?? (daysOn + daysOff);

  // Use reference date directly as cycle start—no rotation math
  // cycleStart is the actual rotation anchor (e.g., May 13)
  // cycleEnd extends from there for the full cycle length
  const cycleStart = ref;
  const cycleEnd = addDays(cycleStart, cycleLengthDays - 1);

  // "on" period end — use full cycle if cycle_days is explicit, else use daysOn
  const onEnd = config.cycle_days ? cycleEnd : addDays(cycleStart, daysOn - 1);

  const allDays = eachDayOfInterval({ start: cycleStart, end: cycleEnd });

  let eligibleDayCount = 0;
  let travelDayCount = 0;
  let totalAllowance = 0;

  allDays.forEach((day) => {
    const dow = day.getDay();
    // Count days within the "on" period (full cycle if cycle_days set, else just daysOn)
    if (!isWithinInterval(day, { start: cycleStart, end: onEnd })) return;
    if (travelDayDOWs.includes(dow)) {
      travelDayCount++;
      totalAllowance += travelRate;
    } else if (workDays.includes(dow)) {
      eligibleDayCount++;
      totalAllowance += dailyRate;
    }
  });

  // Days elapsed in cycle so far (capped at cycle length)
  const daysElapsed = Math.max(0, Math.min(differenceInDays(ref, cycleStart) + 1, cycleLengthDays));
  // Allowance earned so far (prorated by eligible days elapsed)
  const elapsedDays = eachDayOfInterval({ start: cycleStart, end: addDays(cycleStart, daysElapsed - 1) });
  let earnedSoFar = 0;
  elapsedDays.forEach((day) => {
    const dow = day.getDay();
    if (!isWithinInterval(day, { start: cycleStart, end: onEnd })) return;
    if (travelDayDOWs.includes(dow)) {
      earnedSoFar += travelRate;
    } else if (workDays.includes(dow)) {
      earnedSoFar += dailyRate;
    }
  });

  return {
    cycleStart,
    cycleEnd,
    onEnd,
    totalDays: cycleLengthDays,
    eligibleDayCount,
    travelDayCount,
    totalAllowance,
    earnedSoFar,
    daysElapsed,
    // Label only shows the on-weeks date range, not the off weeks
    label: formatCycleLabel(cycleStart, onEnd, weeksOff),
    isCurrent: isWithinInterval(ref, { start: cycleStart, end: cycleEnd }),
  };
}

export function navigateCycle(config, currentStart, direction) {
  const weeksOn = config.weeks_on || 1;
  const weeksOff = config.weeks_off || 0;
  const daysOn = config.days_on ?? (weeksOn * 7);
  const daysOff = config.days_off ?? (weeksOff * 7);
  // Use custom cycle_days if set, otherwise calculate from on/off pattern
  const cycleLengthDays = config.cycle_days ?? (daysOn + daysOff);
  return addDays(currentStart, direction * cycleLengthDays);
}

export function formatCycleLabel(start, end, weeksOff = 0) {
  const s = format(start, "MMM d");
  const e = format(end, "MMM d");
  return `${s} – ${e}`;
}

export function formatDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get start of cycle that contains a given date
 */
export function getCycleStartForDate(config, date) {
  const cycle = computeCycle(config, date);
  return cycle?.cycleStart || date;
}

/**
 * Default config for new users
 */
export function defaultConfig() {
  return {
    schedule_type: "mon_fri",
    work_days: [1, 2, 3, 4, 5],
    travel_days: [],
    daily_rate: 68,
    travel_day_multiplier: 0.5,
    cycle_type: "weekly",
    weeks_on: 1,
    weeks_off: 0,
    cycle_start_date: format(new Date(), "yyyy-MM-dd"),
    label: "My Schedule",
  };
}