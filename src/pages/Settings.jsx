import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, ChevronRight, Check, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/talli/BottomNav";
import Header from "@/components/talli/Header";
import DeleteAccountSheet from "@/components/talli/DeleteAccountSheet";
import PullToRefresh from "@/components/talli/PullToRefresh";
import { SCHEDULE_PRESETS, getDayName, defaultConfig } from "@/lib/cycleUtils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Settings() {
  const queryClient = useQueryClient();
  const contentRef = useRef(null);

  const { data: configs = [] } = useQuery({
    queryKey: ["cycle-configs"],
    queryFn: () => base44.entities.CycleConfig.list("-created_date", 1),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["all-expenses-export"],
    queryFn: () => base44.entities.Expense.list("-date", 1000),
  });

  const existingConfig = configs[0];

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cycle-configs"] }),
      queryClient.invalidateQueries({ queryKey: ["all-expenses-export"] }),
    ]);
  }, [queryClient]);

  const [form, setForm] = useState(defaultConfig());
  const [schedulePreset, setSchedulePreset] = useState("mon_fri");
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [travelDayEnabled, setTravelDayEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (existingConfig) {
      setForm({ ...defaultConfig(), ...existingConfig });
      const preset = SCHEDULE_PRESETS.find(
        (p) => JSON.stringify(p.workDays.sort()) === JSON.stringify([...(existingConfig.work_days || [])].sort())
      );
      setSchedulePreset(preset ? preset.key : "custom_days");
      setUseCustomDays(!preset || preset.key === "custom_days");
      setTravelDayEnabled((existingConfig.travel_days || []).length > 0);
    }
  }, [existingConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingConfig?.id) {
        return base44.entities.CycleConfig.update(existingConfig.id, data);
      } else {
        return base44.entities.CycleConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-configs"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-cycle"] });
      setSaved(true);
      toast.success("Schedule saved!");
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const applySchedulePreset = (key) => {
    setSchedulePreset(key);
    setUseCustomDays(key === "custom_days");
    const preset = SCHEDULE_PRESETS.find((p) => p.key === key);
    if (preset && key !== "custom_days") {
      setForm((f) => ({ ...f, work_days: preset.workDays, schedule_type: key }));
    }
  };



  const toggleDay = (dow, type) => {
    const key = type === "work" ? "work_days" : "travel_days";
    const current = form[key] || [];
    const updated = current.includes(dow) ? current.filter((d) => d !== dow) : [...current, dow];
    // A day can't be both work and travel
    if (type === "work") {
      setForm((f) => ({ ...f, work_days: updated, travel_days: (f.travel_days || []).filter((d) => !updated.includes(d)) }));
    } else {
      setForm((f) => ({ ...f, travel_days: updated, work_days: (f.work_days || []).filter((d) => !updated.includes(d)) }));
    }
  };

  const handleSave = () => {
    if (!form.daily_rate || form.daily_rate <= 0) {
      toast.error("Enter a valid daily rate");
      return;
    }
    if ((form.work_days || []).length === 0 && (form.travel_days || []).length === 0) {
      toast.error("Select at least one work day");
      return;
    }
    saveMutation.mutate({
      ...form,
      travel_days: travelDayEnabled ? (form.travel_days || []) : [],
    });
  };

  const handleExport = () => {
    if (!allExpenses.length) { toast.error("No expenses to export"); return; }
    const headers = ["Date", "Category", "Description", "Amount", "Per Diem", "Cycle Start"];
    const rows = allExpenses.map((e) => [
      e.date, e.category, e.description || "", e.amount.toFixed(2),
      e.counts_toward_per_diem !== false ? "Yes" : "No", e.week_start || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talli-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  };

  const workDays = form.work_days || [];
  const travelDays = form.travel_days || [];

  return (
    <div className="h-full bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-lg mx-auto px-5 pb-32" ref={contentRef}>
          <Header />

        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">Schedule Setup</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure your allowance cycle</p>
        </div>

        <div className="space-y-5">

          {/* Daily Rate */}
          <Section title="Daily Per Diem Rate">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.daily_rate || ""}
                onChange={(e) => setForm((f) => ({ ...f, daily_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="68.00"
                className="w-full h-14 pl-9 pr-4 text-2xl font-bold bg-muted rounded-2xl border-0 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">Amount earned per full work day</p>
          </Section>

          {/* Schedule Type */}
          <Section title="Work Schedule">
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applySchedulePreset(p.key)}
                  className={`h-12 rounded-xl text-sm font-medium border-2 transition-all ${
                    schedulePreset === p.key
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-transparent text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Day picker */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Work Days</p>
              <div className="flex gap-1.5 justify-between">
                {DAY_LABELS.map((name, dow) => {
                  const isWork = workDays.includes(dow);
                  const isTravel = travelDays.includes(dow);
                  return (
                    <button
                      key={dow}
                      onClick={() => toggleDay(dow, "work")}
                      className={`flex-1 h-10 rounded-xl text-xs font-semibold transition-all border-2 ${
                        isWork
                          ? "bg-primary text-primary-foreground border-primary"
                          : isTravel
                          ? "bg-chart-3/20 text-chart-3 border-chart-3/40"
                          : "bg-muted border-transparent text-muted-foreground"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Travel Days */}
          <Section title="Travel Days">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-foreground">Enable travel days</p>
                <p className="text-xs text-muted-foreground">Receive partial per diem on travel days</p>
              </div>
              <Switch checked={travelDayEnabled} onCheckedChange={setTravelDayEnabled} />
            </div>

            {travelDayEnabled && (
              <>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Travel Day Multiplier</p>
                <div className="flex gap-2 mb-4">
                  {[0.5, 0.75, 1.0].map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm((f) => ({ ...f, travel_day_multiplier: m }))}
                      className={`flex-1 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${
                        (form.travel_day_multiplier ?? 0.5) === m
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted border-transparent text-muted-foreground"
                      }`}
                    >
                      {m === 1 ? "Full" : `${m * 100}%`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Travel Days</p>
                <div className="flex gap-1.5 justify-between">
                  {DAY_LABELS.map((name, dow) => {
                    const isTravel = travelDays.includes(dow);
                    const isWork = workDays.includes(dow);
                    return (
                      <button
                        key={dow}
                        onClick={() => toggleDay(dow, "travel")}
                        className={`flex-1 h-10 rounded-xl text-xs font-semibold transition-all border-2 ${
                          isTravel
                            ? "bg-chart-3/20 text-chart-3 border-chart-3/40"
                            : "bg-muted border-transparent text-muted-foreground"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Section>



          {/* Cycle Start */}
          <Section title="Cycle Start Date">
            <Input
              type="date"
              value={form.cycle_start_date || ""}
              onChange={(e) => setForm((f) => ({ ...f, cycle_start_date: e.target.value }))}
              className="h-12 rounded-xl bg-muted border-0"
            />
            <p className="text-xs text-muted-foreground mt-2 px-1">The first day of your first allowance cycle</p>
          </Section>

          {/* Cycle Length */}
          <Section title="Cycle Length">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Days per cycle</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={form.cycle_days ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, cycle_days: parseInt(e.target.value) || undefined }))}
                placeholder="e.g. 22"
                className="w-full h-12 px-4 text-lg font-bold bg-muted rounded-xl border-0 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">How many days per cycle. Leave blank to auto-calculate from work days.</p>
          </Section>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full h-14 rounded-2xl text-base font-semibold"
          >
            {saved ? <><Check className="h-4 w-4 mr-2" /> Saved!</> : saveMutation.isPending ? "Saving…" : "Save Schedule"}
          </Button>

          {/* Export */}
          <div className="rounded-2xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Export Data</h3>
            <p className="text-xs text-muted-foreground mb-4">Download all expenses as CSV</p>
            <Button variant="outline" onClick={handleExport} className="h-12 w-full rounded-xl font-semibold">
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>

          {/* Delete Account — App Store required */}
          <div className="rounded-2xl bg-card border border-destructive/20 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Delete Account</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="h-12 w-full rounded-xl font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </div>

        </div>
        </div>
      </PullToRefresh>
      <BottomNav onTabChange={() => contentRef.current?.scrollTo(0, 0)} />

      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}