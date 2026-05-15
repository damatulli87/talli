import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Settings2, RotateCcw } from "lucide-react";

import Header from "@/components/talli/Header";
import CycleNavigator from "@/components/talli/CycleNavigator";
import CycleBalanceCard from "@/components/talli/CycleBalanceCard";
import CategoryBreakdown from "@/components/talli/CategoryBreakdown";
import TransactionList from "@/components/talli/TransactionList";
import ExpenseModal from "@/components/talli/ExpenseModal";
import AddButton from "@/components/talli/AddButton";
import BottomNav from "@/components/talli/BottomNav";
import ShiftRotationSheet from "@/components/talli/ShiftRotationSheet";
import PullToRefresh from "@/components/talli/PullToRefresh";

import {
  computeCycle,
  navigateCycle,
  formatDateKey,
  defaultConfig,
} from "@/lib/cycleUtils";
import { parseISO, addDays, differenceInDays } from "date-fns";
import { applyOverrides } from "@/lib/overrideUtils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cycleAnchor, setCycleAnchor] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shiftOpen, setShiftOpen] = useState(false);
  const contentRef = useRef(null);
  const queryClient = useQueryClient();

  // Load cycle config — always fetch fresh, never use cache
  const { data: configs = [] } = useQuery({
    queryKey: ["cycle-configs"],
    queryFn: async () => {
      const result = await base44.entities.CycleConfig.list("-created_date", 1);
      console.log("Dashboard fetched config:", result[0]);
      return result;
    },
    staleTime: 0,
    gcTime: 0,
  });
  const config = configs[0] || null;
  const effectiveConfig = config || defaultConfig();

  // Initialize/reset anchor when config changes
  useEffect(() => {
    if (!config?.cycle_start_date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const configStart = parseISO(config.cycle_start_date);
    if (configStart > today) {
      setCycleAnchor(configStart);
    } else {
      // Find which cycle today falls into by stepping forward from the configured start
      const cycleLengthDays = config.cycle_days ?? (((config.weeks_on || 1) + (config.weeks_off || 0)) * 7);
      const daysSinceStart = differenceInDays(today, configStart);
      const completedCycles = Math.floor(daysSinceStart / cycleLengthDays);
      setCycleAnchor(addDays(configStart, completedCycles * cycleLengthDays));
    }
  }, [config?.cycle_start_date]);

  // Compute current cycle from anchor
  const cycle = useMemo(() => {
    if (!cycleAnchor) return null;
    const c = computeCycle(effectiveConfig, cycleAnchor);
    console.log("Dashboard cycle:", { anchor: cycleAnchor, cycleStart: c?.cycleStart, label: c?.label, configStartDate: config?.cycle_start_date });
    return c;
  }, [effectiveConfig, cycleAnchor, config?.cycle_start_date]);

  // Fetch cycle start key early so we can load overrides
  const cycleDateKey = cycle ? formatDateKey(cycle.cycleStart) : null;

  // Load override for this cycle
  const { data: overrides = [] } = useQuery({
    queryKey: ["cycle-override-dashboard", cycleDateKey],
    queryFn: () => base44.entities.CycleOverride.filter({ cycle_start_key: cycleDateKey }),
    enabled: !!cycleDateKey,
  });
  const overrideRecord = overrides[0] || null;

  // Compute extended cycle start/end if there are extra days
  const { cycleStartWithExtras, cycleEndWithExtras } = useMemo(() => {
    if (!cycle || !overrideRecord) return { cycleStartWithExtras: cycle?.cycleStart, cycleEndWithExtras: cycle?.cycleEnd };
    const extraDays = (overrideRecord.day_overrides || [])
      .filter((o) => o.type.startsWith("extra_"))
      .map((o) => parseISO(o.date));
    if (extraDays.length === 0) return { cycleStartWithExtras: cycle.cycleStart, cycleEndWithExtras: cycle.cycleEnd };
    const extraDates = extraDays.map((d) => d.getTime());
    const minExtra = Math.min(...extraDates);
    const maxExtra = Math.max(...extraDates);
    const start = new Date(Math.min(cycle.cycleStart.getTime(), minExtra));
    // Only extend end if extra days fall within original cycle range
    const end = maxExtra <= cycle.cycleEnd.getTime()
      ? new Date(Math.max(cycle.cycleEnd.getTime(), maxExtra))
      : cycle.cycleEnd;
    return {
      cycleStartWithExtras: start,
      cycleEndWithExtras: end
    };
  }, [cycle, overrideRecord]);

  const cycleStartKey = cycleStartWithExtras ? formatDateKey(cycleStartWithExtras) : null;
  const cycleEndKey = cycleEndWithExtras ? formatDateKey(cycleEndWithExtras) : null;

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses-cycle", cycleStartKey],
    queryFn: async () => {
      if (!cycleStartKey) return [];
      const all = await base44.entities.Expense.list("-date", 500);
      return all.filter((e) => e.date >= cycleStartKey && e.date <= cycleEndKey);
    },
    enabled: !!cycleStartKey && !!cycleEndKey,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ["expenses-cycle", cycleStartKey] });
      const prev = queryClient.getQueryData(["expenses-cycle", cycleStartKey]) || [];
      const optimistic = { ...newExpense, id: `temp-${Date.now()}`, created_date: new Date().toISOString() };
      queryClient.setQueryData(["expenses-cycle", cycleStartKey], [...prev, optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["expenses-cycle", cycleStartKey], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-cycle", cycleStartKey] });
      queryClient.invalidateQueries({ queryKey: ["all-expenses-history"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["expenses-cycle", cycleStartKey] });
      const prev = queryClient.getQueryData(["expenses-cycle", cycleStartKey]) || [];
      queryClient.setQueryData(["expenses-cycle", cycleStartKey], prev.filter((e) => e.id !== id));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["expenses-cycle", cycleStartKey], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-cycle", cycleStartKey] });
      queryClient.invalidateQueries({ queryKey: ["all-expenses-history"] });
    },
  });

  // Apply overrides to cycle
  const adjustedCycle = useMemo(() => {
    if (!cycle) return null;
    return applyOverrides(cycle, effectiveConfig, overrideRecord);
  }, [cycle, effectiveConfig, overrideRecord]);

  const spent = useMemo(
    () => expenses.filter((e) => e.counts_toward_per_diem !== false).reduce((s, e) => s + (e.amount || 0), 0),
    [expenses]
  );

  // Track all created cycle start dates and navigate through them
  useEffect(() => {
    if (!cycleAnchor) return;
    const today = formatDateKey(cycleAnchor);
    setCycleHistory(prev => {
      if (prev.includes(today)) return prev;
      const updated = [...prev, today].sort();
      const idx = updated.indexOf(today);
      setHistoryIndex(idx);
      return updated;
    });
  }, [cycleAnchor]);

  const handleNavigate = (dir) => {
    const newIndex = historyIndex + dir;
    if (newIndex >= 0 && newIndex < cycleHistory.length) {
      setHistoryIndex(newIndex);
      setCycleAnchor(parseISO(cycleHistory[newIndex]));
    }
  };

  const handleAddCycle = (newStartDate) => {
    const parsed = parseISO(newStartDate);
    setCycleAnchor(parsed);
  };

  const handleAddExpense = async (data) => {
    await createMutation.mutateAsync({
      ...data,
      week_start: cycle ? formatDateKey(cycle.cycleStart) : data.date,
    });
  };

  const shiftMutation = useMutation({
    mutationFn: (newStartDate) => {
      if (!config?.id) throw new Error("No config to update");
      return base44.entities.CycleConfig.update(config.id, { cycle_start_date: newStartDate });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["cycle-configs"] });
      setCycleAnchor(new Date()); // snap back to current cycle with fresh config
      toast.success("Rotation shifted!");
    },
  });

  // No config yet — prompt setup
  const needsSetup = !config;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cycle-configs"] }),
      queryClient.invalidateQueries({ queryKey: ["expenses-cycle", cycleStartKey] }),
      queryClient.invalidateQueries({ queryKey: ["cycle-override-dashboard", cycleDateKey] }),
    ]);
  }, [queryClient, cycleStartKey, cycleDateKey]);

  const handleShiftOpen = useCallback(async () => {
    try {
      await queryClient.refetchQueries({ queryKey: ["cycle-configs"] });
    } catch (e) {}
    // Give React time to update the config prop
    await new Promise(resolve => setTimeout(resolve, 50));
    setShiftOpen(true);
  }, [queryClient]);

  return (
    <div className="h-full bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-lg mx-auto px-5 pb-36 min-h-screen" ref={contentRef}>
          <Header />

          {needsSetup && (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 mb-5">
              <p className="text-sm font-semibold text-primary mb-1">Set up your schedule</p>
              <p className="text-xs text-primary/70 mb-3">
                Configure your work rotation and per diem rate to get accurate allowance tracking.
              </p>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                <Settings2 className="h-4 w-4" />
                Open Schedule Setup
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2 relative">
            <div className="flex-1">
              <CycleNavigator
                config={effectiveConfig}
                cycle={cycle}
                onNavigate={handleNavigate}
                onAddCycle={handleAddCycle}
                overrideRecord={overrideRecord}
                historyIndex={historyIndex}
                historyLength={cycleHistory.length}
              />
            </div>
            {config && (
              <button
                onClick={handleShiftOpen}
                className="h-10 px-3 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Shift
              </button>
            )}
          </div>

          {cycleHistory.length > 0 && (
            <div className="space-y-5 mt-1">
              <CycleBalanceCard
                cycle={cycle}
                adjustedCycle={adjustedCycle}
                overrideRecord={overrideRecord}
                spent={spent}
              />

              <CategoryBreakdown expenses={expenses} />

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <TransactionList expenses={expenses} onDelete={(id) => deleteMutation.mutate(id)} />
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      <AddButton onClick={() => setModalOpen(true)} />
      <BottomNav onTabChange={() => contentRef.current?.scrollTo(0, 0)} />

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddExpense}
      />

      <ShiftRotationSheet
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        config={config}
        onSave={(newDate) => shiftMutation.mutateAsync(newDate)}
      />
    </div>
  );
}