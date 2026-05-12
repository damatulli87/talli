import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ShoppingCart, UtensilsCrossed, Package, User, Trash2, BedDouble, Fuel } from "lucide-react";
import ReceiptViewer from "@/components/talli/ReceiptViewer";

const CATEGORY_ICONS = {
  meals: { icon: UtensilsCrossed, color: "text-chart-2", bg: "bg-chart-2/15" },
  groceries: { icon: ShoppingCart, color: "text-chart-1", bg: "bg-chart-1/15" },
  lodging: { icon: BedDouble, color: "text-chart-4", bg: "bg-chart-4/15" },
  fuel: { icon: Fuel, color: "text-chart-3", bg: "bg-chart-3/15" },
  misc: { icon: Package, color: "text-chart-5", bg: "bg-chart-5/15" },
  personal: { icon: User, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function TransactionList({ expenses, onDelete }) {
  const [viewingReceipt, setViewingReceipt] = useState(null);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No expenses this week</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Tap + to add one</p>
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <>
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Transactions
      </h3>
      <div className="space-y-2 pb-24">
        <AnimatePresence>
          {sorted.map((expense) => {
            const catConfig = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.misc;
            const Icon = catConfig.icon;

            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-xl bg-card border border-border p-4 pr-4"
              >
                <div className={`h-10 w-10 rounded-xl ${catConfig.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${catConfig.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {expense.description || expense.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(expense.date), "EEE, MMM d")}
                    {!expense.counts_toward_per_diem && (
                      <span className="ml-1 text-chart-4">· Non per diem</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    -${expense.amount.toFixed(2)}
                  </p>

                  {expense.receipt_url && (
                    <button
                      onClick={() => setViewingReceipt(expense.receipt_url)}
                      className="relative h-9 w-9 rounded-lg overflow-hidden border border-border flex-shrink-0"
                    >
                      <img
                        src={expense.receipt_url}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(expense.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>

    <ReceiptViewer
      url={viewingReceipt}
      open={!!viewingReceipt}
      onClose={() => setViewingReceipt(null)}
    />
    </>
  );
}