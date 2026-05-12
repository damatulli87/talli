import { startOfWeek, endOfWeek, addWeeks, format, isWithinInterval, parseISO } from "date-fns";

export function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date = new Date()) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekRange(weekStart) {
  const start = typeof weekStart === "string" ? parseISO(weekStart) : weekStart;
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return { start, end };
}

export function formatWeekLabel(weekStart) {
  const { start, end } = getWeekRange(weekStart);
  return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
}

export function navigateWeek(currentWeekStart, direction) {
  const current = typeof currentWeekStart === "string" ? parseISO(currentWeekStart) : currentWeekStart;
  return addWeeks(current, direction);
}

export function formatDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

export function isCurrentWeek(weekStart) {
  const now = new Date();
  const { start, end } = getWeekRange(weekStart);
  return isWithinInterval(now, { start, end });
}