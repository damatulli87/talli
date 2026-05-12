import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseISO, eachDayOfInterval, format, isWithinInterval, startOfDay } from "date-fns";
import { ArrowLeft, Plus, Trash2, Info, RotateCcw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { computeCycle, defaultConfig, formatDateKey } from "@/lib/cycleUtils";
import { applyOverrides, getOverrideSummaryLine } from "@/lib/overrideUtils";
import ShiftRotationSheet from "@/components/talli/ShiftRotationSheet";

const TYPE_OPTIONS = [
  { key: "full", label: "Full", color: "bg-primary/15 text-primary border-primary/30" },
  { key: "half", label: "½ Day", color: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  { key: "travel", label: "Travel", color: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  { key: "off", label: "Off", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

const EXTRA_TYPE_OPTIONS = [
  { key: "extra_full", label: "Full day", color: "bg-primary/15 text-primary border-primary/30" },
  { key: "extra_half", label: "Half day", color: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  { key: "extra_travel", label: "Travel day", color: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
];

function TypePill({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`h-8 px-3 rounded-full text-xs font-semibold border transition-all ${
            value === opt.key ? opt.color : "bg-muted border-transparent text-muted-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AdjustCycle() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cycleStartKey = searchParams.get("cycle");

  const { data: configs = [] } = useQuery({
    queryKey: ["cycle-configs"],
    queryFn: () => base44.entities.CycleConfig.list("-created_date", 1),
  });
  const config = configs[0] || defaultConfig();

  const cycle = useMemo(() => {
    if (!cycleStartKey) return null;
    return computeCycle(config, parseISO(cycleStartKey));
  }, [config, cycleStartKey]);

  const { data: overrides = [] } = useQuery({
    queryKey: ["cycle-override", cycleStartKey],
    queryFn: () => base44.entities.CycleOverride.filter({ cycle_start_key: cycleStartKey }),
    enabled: !!cycleStartKey,
  });
  const existingOverride = overrides[0] || null;

  const [dayOverrides, setDayOverrides] = useState([]);
  const [note, setNote] = useState("");
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraDate, setExtraDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [extraType, setExtraType] = useState("extra_full");
  const [extraNote, setExtraNote] = useState("");
  const [shiftOpen, setShiftOpen] = useState(false);

  useEffect(() => {
    if (existingOverride) {
      setDayOverrides(existingOverride.day_overrides || []);
      setNote(existingOverride.note || "");
    }
  }, [existingOverride]);

  // All days in the cycle (on-weeks only) for the "change existing day" section
  const cycleDays = useMemo(() => {
    if (!cycle) return [];
    const workDays = config.work_days || [];
    const travelDayDOWs = config.travel_days || [];
    return eachDayOfInterval({ start: cycle.cycleStart, end: cycle.cycleEnd }).filter((d) => {
      const dow = d.getDay();
      return workDays.includes(dow) || travelDayDOWs.includes(dow);
    });
  }, [cycle, config]);

  // Extra days (added by user)
  const extraDayOverrides = dayOverrides.filter((o) => o.type.startsWith("extra_"));
  // Modified existing days
  const modifiedDayOverrides = dayOverrides.filter((o) => !o.type.startsWith("extra_"));

  const getOverrideForDate = (dateKey) => dayOverrides.find((o) => o.date === dateKey);

  const setDayType = (dateKey, type) => {
    setDayOverrides((prev) => {
      const without = prev.filter((o) => o.date !== dateKey);
      // "full" on an already-full day = remove override
      const baseType = getBaseDayType(dateKey);
      if (type === baseType) return without; // reset to default
      return [...without, { date: dateKey, type, note: "" }];
    });
  };

  const getBaseDayType = (dateKey) => {
    if (!cycle) return null;
    const d = parseISO(dateKey);
    const dow = d.getDay();
    if ((config.travel_days || []).includes(dow)) return "travel";
    if ((config.work_days || []).includes(dow)) return "full";
    return null;
  };

  const removeOverride = (dateKey) => {
    setDayOverrides((prev) => prev.filter((o) => o.date !== dateKey));
  };

  const addExtraDay = () => {
    if (!extraDate) return;
    const exists = dayOverrides.find((o) => o.date === extraDate);
    if (exists) { toast.error("A day override for this date already exists"); return; }
    setDayOverrides((prev) => [...prev, { date: extraDate, type: extraType, note: extraNote }]);
    setExtraDate(format(new Date(), "yyyy-MM-dd"));
    setExtraNote("");
    setShowAddExtra(false);
    toast.success("Extra day added");
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingOverride?.id) {
        return base44.entities.CycleOverride.update(existingOverride.id, data);
      } else {
        return base44.entities.CycleOverride.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-override", cycleStartKey] });
      queryClient.invalidateQueries({ queryKey: ["cycle-override-dashboard", cycleStartKey] });
      toast.success("Cycle adjusted!");
      navigate(-1);
    },
  });

  const shiftMutation = useMutation({
    mutationFn: (newStartDate) => {
      if (!config?.id) throw new Error("No config to update");
      return base44.entities.CycleConfig.update(config.id, { cycle_start_date: newStartDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-configs"] });
      toast.success("Rotation shifted!");
      navigate("/");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (existingOverride?.id) {
        return base44.entities.CycleOverride.delete(existingOverride.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-override", cycleStartKey] });
      queryClient.invalidateQueries({ queryKey: ["cycle-override-dashboard", cycleStartKey] });
      setDayOverrides([]);
      setNote("");
      toast.success("Adjustments cleared");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ cycle_start_key: cycleStartKey, day_overrides: dayOverrides, note });
  };

  // Preview adjusted numbers
  const adj = useMemo(() => {
    if (!cycle) return null;
    return applyOverrides(cycle, config, { day_overrides: dayOverrides });
  }, [cycle, config, dayOverrides]);

  if (!cycle) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Cycle not found</p>
    </div>
  );

  const normalDays = cycle.eligibleDayCount + cycle.travelDayCount;
  const adjustedDays = adj ? adj.adjustedEligibleDayCount + adj.adjustedTravelDayCount : normalDays;
  const netChange = adjustedDays - normalDays;

  // Check if viewing current cycle
  const isCurrent = isWithinInterval(startOfDay(new Date()), {
    start: startOfDay(cycle.cycleStart),
    end: startOfDay(cycle.cycleEnd),
  });

  const handleAddCycle = () => {
    // Navigate back to dashboard to add next cycle
    navigate("/");
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Adjust This Cycle</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{cycle.label}</p>
              {isCurrent && <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Current Cycle</span>}
            </div>
          </div>
          {isCurrent ? (
            <button
              onClick={handleAddCycle}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Cycle
            </button>
          ) : (
            <button
              onClick={() => setShiftOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/70 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Shift Rotation
            </button>
          )}
        </div>

        {/* Two-tier explanation */}
        <div className="flex gap-3 p-3 rounded-xl bg-muted mb-5">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">This page:</span> one-time adjustments to this cycle only — override days, add extras, mark days off.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Shift Rotation:</span> move your hitch start date so all future cycles recalculate automatically.
            </p>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Allowance Preview</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Normal days</span>
              <span className="font-semibold text-foreground">{normalDays} days · ${cycle.totalAllowance.toFixed(0)}</span>
            </div>
            {dayOverrides.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Adjustments</span>
                <span className={`font-semibold ${netChange >= 0 ? "text-primary" : "text-destructive"}`}>
                  {netChange >= 0 ? "+" : ""}{netChange} days
                </span>
              </div>
            )}
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-foreground">Adjusted total</span>
              <span className="font-bold text-foreground">{adjustedDays} days · ${adj?.adjustedTotalAllowance.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Modify existing days */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Modify Existing Days</p>
          <p className="text-xs text-muted-foreground mb-4">Change a scheduled day to a different type</p>
          <div className="space-y-3">
            {cycleDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const ov = getOverrideForDate(key);
              const baseType = getBaseDayType(key);
              const currentType = ov?.type || baseType;
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div className="min-w-[80px]">
                    <p className="text-sm font-medium text-foreground">{format(day, "EEE, MMM d")}</p>
                    {ov && <p className="text-[10px] text-primary font-semibold">Modified</p>}
                  </div>
                  <TypePill
                    options={TYPE_OPTIONS}
                    value={currentType}
                    onChange={(type) => setDayType(key, type)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Extra days */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Extra Days</p>
            <button
              onClick={() => setShowAddExtra((v) => !v)}
              className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Add days outside your normal rotation</p>

          <AnimatePresence>
            {showAddExtra && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl bg-muted p-4 mb-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={extraDate}
                      onChange={(e) => setExtraDate(e.target.value)}
                      className="h-11 rounded-xl bg-card border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
                    <TypePill options={EXTRA_TYPE_OPTIONS} value={extraType} onChange={setExtraType} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label>
                    <Input
                      placeholder="e.g. Picked up extra shift"
                      value={extraNote}
                      onChange={(e) => setExtraNote(e.target.value)}
                      className="h-11 rounded-xl bg-card border-border"
                    />
                  </div>
                  <Button onClick={addExtraDay} className="w-full h-11 rounded-xl">
                    Add Day
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {extraDayOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No extra days added</p>
          ) : (
            <div className="space-y-2">
              {extraDayOverrides.map((o, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                  <div>
                    <p className="text-sm font-medium text-foreground">{format(parseISO(o.date), "EEE, MMM d")}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {o.type.replace("extra_", "")} per diem{o.note ? ` · ${o.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => removeOverride(o.date)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cycle note */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cycle Note</p>
          <Input
            placeholder="e.g. Left early, picked up 2 extra days before hitch"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-12 rounded-xl bg-muted border-0"
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full h-14 rounded-2xl text-base font-semibold"
          >
            {saveMutation.isPending ? "Saving…" : "Save Adjustments"}
          </Button>
          {(existingOverride || dayOverrides.length > 0) && (
            <Button
              variant="outline"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="w-full h-12 rounded-2xl text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Clear All Adjustments
            </Button>
          )}

          {/* Shift rotation shortcut */}
          <button
            onClick={() => setShiftOpen(true)}
            className="w-full h-12 rounded-2xl border border-border text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Shift Entire Rotation Instead…
          </button>
        </div>
      </div>

      <ShiftRotationSheet
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        config={config}
        onSave={(newDate) => shiftMutation.mutateAsync(newDate)}
      />
    </div>
  );
}