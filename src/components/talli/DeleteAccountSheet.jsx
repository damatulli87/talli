import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * DeleteAccountSheet
 * App Store–required account deletion flow.
 * Asks for confirmation text, then deletes all user data and logs out.
 */
export default function DeleteAccountSheet({ open, onClose }) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const CONFIRM_WORD = "DELETE";
  const ready = confirm === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!ready) return;
    setDeleting(true);
    try {
      // Delete all expenses
      const expenses = await base44.entities.Expense.list("-date", 1000);
      await Promise.all(expenses.map((e) => base44.entities.Expense.delete(e.id)));
      // Delete all cycle configs
      const configs = await base44.entities.CycleConfig.list("-created_date", 10);
      await Promise.all(configs.map((c) => base44.entities.CycleConfig.delete(c.id)));
      // Delete all overrides
      const overrides = await base44.entities.CycleOverride.list("-created_date", 100);
      await Promise.all(overrides.map((o) => base44.entities.CycleOverride.delete(o.id)));

      toast.success("Account data deleted. Logging out…");
      setTimeout(() => base44.auth.logout(), 1500);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

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
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-8 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Delete Account</h2>
                    <p className="text-xs text-muted-foreground">This action is permanent</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Warning */}
              <div className="flex gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-5">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-destructive">All data will be permanently deleted</p>
                  <p className="text-xs text-destructive/80 leading-relaxed">
                    This removes all your expenses, cycle configs, and overrides. This cannot be undone.
                  </p>
                </div>
              </div>

              {/* Confirm input */}
              <div className="mb-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Type <span className="text-destructive font-bold">DELETE</span> to confirm
                </label>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="h-12 rounded-xl bg-muted border-0 text-base font-mono"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </div>

              <div className="space-y-2.5">
                <Button
                  onClick={handleDelete}
                  disabled={!ready || deleting}
                  variant="destructive"
                  className="w-full h-14 rounded-2xl text-base font-semibold"
                >
                  {deleting ? "Deleting…" : "Delete My Account & Data"}
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