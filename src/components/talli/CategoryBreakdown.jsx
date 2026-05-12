import React from "react";
import { motion } from "framer-motion";
import { ShoppingCart, UtensilsCrossed, Package, User, BedDouble, Fuel } from "lucide-react";

const CATEGORY_CONFIG = {
  meals: { label: "Meals", icon: UtensilsCrossed, color: "text-chart-2", bg: "bg-chart-2/15" },
  groceries: { label: "Groceries", icon: ShoppingCart, color: "text-chart-1", bg: "bg-chart-1/15" },
  lodging: { label: "Lodging", icon: BedDouble, color: "text-chart-4", bg: "bg-chart-4/15" },
  fuel: { label: "Fuel", icon: Fuel, color: "text-chart-3", bg: "bg-chart-3/15" },
  misc: { label: "Misc", icon: Package, color: "text-chart-5", bg: "bg-chart-5/15" },
  personal: { label: "Personal", icon: User, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function CategoryBreakdown({ expenses }) {
  const totals = {};
  expenses.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + (e.amount || 0);
  });

  const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Categories
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([key, config], i) => {
          const amount = totals[key] || 0;
          const Icon = config.icon;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-xl bg-card border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">
                ${amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}