import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, UtensilsCrossed, Package, User, Sparkles, CheckCircle2, BedDouble, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { format, parseISO } from "date-fns";
import ReceiptPicker from "@/components/talli/ReceiptPicker";
import ReceiptScanner from "@/components/talli/ReceiptScanner";

const CATEGORIES = [
  { key: "meals", label: "Meals", icon: UtensilsCrossed, color: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  { key: "groceries", label: "Groceries", icon: ShoppingCart, color: "bg-chart-1/15 text-chart-1 border-chart-1/30" },
  { key: "lodging", label: "Lodging", icon: BedDouble, color: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  { key: "fuel", label: "Fuel", icon: Fuel, color: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  { key: "misc", label: "Misc", icon: Package, color: "bg-chart-5/15 text-chart-5 border-chart-5/30" },
  { key: "personal", label: "Personal", icon: User, color: "bg-muted text-muted-foreground border-border" },
];

const today = () => format(new Date(), "yyyy-MM-dd");

export default function ExpenseModal({ open, onClose, onSubmit, initialAmount }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("meals");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [countsTowardPerDiem, setCountsTowardPerDiem] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [ocrApplied, setOcrApplied] = useState(false); // show "AI filled" badge

  // When modal opens, reset form
  React.useEffect(() => {
    if (open) {
      setAmount(initialAmount ? initialAmount.toString() : "");
      setCategory("meals");
      setDescription("");
      setDate(today());
      setCountsTowardPerDiem(true);
      setReceiptUrl(null);
      setOcrApplied(false);
      setShowScanner(false);
    }
  }, [open, initialAmount]);

  // Called by ReceiptScanner when OCR succeeds
  const handleScanned = (ocr) => {
    setShowScanner(false);
    if (ocr.total) setAmount(ocr.total.toString());
    if (ocr.suggested_category) setCategory(ocr.suggested_category);
    if (ocr.merchant) setDescription(ocr.merchant);
    if (ocr.receipt_date) {
      // Validate date format before setting
      try { parseISO(ocr.receipt_date); setDate(ocr.receipt_date); } catch {}
    }
    if (ocr.receipt_url) setReceiptUrl(ocr.receipt_url);
    setOcrApplied(true);
  };

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    setIsSubmitting(true);
    await onSubmit({
      amount: num,
      category,
      description: description.trim(),
      date,
      counts_toward_per_diem: countsTowardPerDiem,
      receipt_url: receiptUrl || undefined,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto bg-card rounded-t-3xl border-t border-border"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-6 pb-8 pt-2">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">Add Expense</h2>
                  <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Scan Receipt CTA — shown when no OCR yet */}
                {!ocrApplied && (
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full mb-5 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Scan Receipt with AI
                  </button>
                )}

                {/* OCR Applied badge */}
                {ocrApplied && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mb-5 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">AI filled from receipt — review & save</span>
                  </motion.div>
                )}

                {/* Amount */}
                <div className="mb-5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoFocus={!ocrApplied}
                      className="w-full h-16 pl-10 pr-4 text-3xl font-bold bg-muted rounded-2xl border-0 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.key;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => setCategory(cat.key)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? cat.color + " border-current"
                              : "bg-muted border-transparent text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-[10px] font-medium">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Description (optional)
                  </label>
                  <Input
                    placeholder="e.g., Lunch at diner"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-12 rounded-xl bg-muted border-0"
                  />
                </div>

                {/* Date */}
                <div className="mb-5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-xl bg-muted border-0"
                  />
                </div>

                {/* Per diem toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted mb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Counts toward per diem</p>
                    <p className="text-xs text-muted-foreground">Track against weekly allowance</p>
                  </div>
                  <Switch
                    checked={countsTowardPerDiem}
                    onCheckedChange={setCountsTowardPerDiem}
                  />
                </div>

                {/* Receipt photo */}
                <div className="mb-8">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                    Receipt Photo
                  </label>
                  <ReceiptPicker receiptUrl={receiptUrl} onChange={setReceiptUrl} />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
                  className="w-full h-14 rounded-2xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Receipt Scanner — sits above the modal */}
      {open && showScanner && (
        <ReceiptScanner
          onScanned={handleScanned}
          onManual={() => setShowScanner(false)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}