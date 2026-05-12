import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

/**
 * ShiftRotationSheet
 * A simple bottom sheet that lets users change the cycle anchor date (cycle_start_date)
 * on their saved CycleConfig — shifting all future (and historical) cycle calculations
 * without touching any other rotation settings.
 */
export default function ShiftRotationSheet({ open, onClose, config, onSave }) {
  const [newDate, setNewDate] = useState(
    config?.cycle_start_date || format(new Date(), "yyyy-MM-dd")
  );
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Update newDate when config changes
  useEffect(() => {
    const val = config?.cycle_start_date || format(new Date(), "yyyy-MM-dd");
    console.log("Shift: config loaded", { current: config?.cycle_start_date, newDate: val });
    setNewDate(val);
  }, [config?.cycle_start_date]);

  const handleSave = async () => {
    if (!newDate) return;
    setSaving(true);
    await onSave(newDate);
    setSaving(false);
    onClose();
  };

  const unchanged = newDate === config?.cycle_start_date;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-10 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Shift Rotation</h2>
                    <p className="text-xs text-muted-foreground">Change your cycle anchor date</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Info callout */}
              <div className="flex gap-3 p-3 rounded-xl bg-muted mb-5">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This shifts when your rotation starts — all cycles recalculate automatically.
                  Use this when your hitch date changes unexpectedly. Your work days and rate stay the same.
                </p>
              </div>

              {/* Current vs New */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current Start</p>
                  <p className="text-sm font-semibold text-foreground">
                    {config?.cycle_start_date
                      ? format(parseISO(config.cycle_start_date), "MMM d, yyyy")
                      : "Not set"}
                  </p>
                </div>
                <div className={`rounded-xl p-3 border-2 transition-colors ${
                  !unchanged ? "bg-primary/5 border-primary/30" : "bg-muted border-transparent"
                }`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">New Start</p>
                  <p className={`text-sm font-semibold ${!unchanged ? "text-primary" : "text-foreground"}`}>
                    {newDate ? format(parseISO(newDate), "MMM d, yyyy") : "No date selected"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {!unchanged && `Change: ${!config?.cycle_start_date ? "→ " : ""}${format(parseISO(newDate), "MMM d")}`}
                  </p>
                </div>
              </div>

              {/* Date picker */}
              <div className="mb-6">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  New Cycle Start Date
                </label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-13 rounded-xl bg-muted border-0 text-base"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <Button
                  onClick={handleSave}
                  disabled={saving || unchanged || !newDate}
                  className="w-full h-14 rounded-2xl text-base font-semibold"
                >
                  {saving ? "Saving…" : "Apply Shift"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-11 rounded-2xl text-sm text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}