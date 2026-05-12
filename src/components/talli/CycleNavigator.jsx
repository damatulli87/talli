import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { navigateCycle } from "@/lib/cycleUtils";
import { startOfDay, isWithinInterval, format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";

export default function CycleNavigator({ config, cycle, onNavigate, onAddCycle, overrideRecord, historyIndex = -1, historyLength = 0 }) {
  const formatDateKey = (dateKey) => {
    try {
      return format(parseISO(dateKey), "MMM d");
    } catch {
      return dateKey;
    }
  };
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState(cycle ? format(cycle.cycleEnd, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));

  const today = startOfDay(new Date());
  const cycleStartDay = cycle ? startOfDay(cycle.cycleStart) : null;
  const cycleEndDay = cycle ? startOfDay(cycle.cycleEnd) : null;
  const todayKey = format(today, "yyyy-MM-dd");

  // "Current Cycle" label: today is within the cycle OR today is one of the added extra days
  const extraDayKeys = (overrideRecord?.day_overrides || [])
    .filter((o) => o.type.startsWith("extra_"))
    .map((o) => o.date);
  const isCurrent = cycle && cycleStartDay && cycleEndDay && (isWithinInterval(today, {
    start: cycleStartDay,
    end: cycleEndDay,
  }) || extraDayKeys.includes(todayKey));
  
  // Check if we're in current cycle or future
  const isCurrentOrFuture = cycle && cycleStartDay && cycleStartDay >= today;

  // Compute extended cycle dates if there are extra days
  const cycleLabel = useMemo(() => {
    if (!cycle) return "";
    if (!overrideRecord || extraDayKeys.length === 0) return cycle.label;
    // Extra days only affect the *displayed* range, not the cycle boundaries
    // Show the actual cycle start/end (not extended), just note extra days exist
    const extraDates = extraDayKeys.map((d) => parseISO(d));
    if (extraDates.length === 0) return cycle.label;
    const minExtra = new Date(Math.min(...extraDates.map((d) => d.getTime())));
    // Display range: min of cycle start and extra days, to cycle end
    const displayStart = new Date(Math.min(cycle.cycleStart.getTime(), minExtra.getTime()));
    return `${formatDateKey(format(displayStart, "yyyy-MM-dd"))} - ${formatDateKey(format(cycle.cycleEnd, "yyyy-MM-dd"))}`;
  }, [cycle, cycle?.label, cycle?.cycleStart, cycle?.cycleEnd, overrideRecord, extraDayKeys]);

  if (!config || !cycle) return null;

  const handleAddCycle = () => {
    if (onAddCycle) {
      onAddCycle(newDate);
    }
    setShowDatePicker(false);
  };

  // Disable forward if already viewing current or future cycle
  const forwardDisabled = isCurrentOrFuture;

  const isFirstTimeUser = historyLength === 0;

  return (
    <div className="flex items-center justify-between py-3">
      {!isFirstTimeUser && (
        <AnimatePresence mode="wait">
          <motion.div
            key={cycle.cycleStart?.toString()}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="text-center flex-1"
          >
            <p className="text-sm font-semibold text-foreground">{cycleLabel}</p>
            {isCurrent && (
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Current Cycle
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {!isFirstTimeUser && (
          <>
            <button
              onClick={() => onNavigate(-1)}
              disabled={historyIndex <= 0}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => onNavigate(1)}
              disabled={historyIndex >= historyLength - 1}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="h-10 px-3 rounded-xl flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          New Cycle
        </button>

        {showDatePicker && (
          <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl p-3 z-50 w-48 shadow-lg">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Cycle Start Date</label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-10 rounded-lg bg-muted border-0 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCycle}
                className="flex-1 h-8 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 h-8 bg-muted text-muted-foreground text-xs font-semibold rounded-lg hover:bg-muted/70"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}