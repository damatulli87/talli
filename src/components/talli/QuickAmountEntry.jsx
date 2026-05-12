import React from "react";
import { motion } from "framer-motion";

const QUICK_AMOUNTS = [5, 10, 15, 20, 25, 50];

export default function QuickAmountEntry({ onSelect }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Quick Add
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_AMOUNTS.map((amount, i) => (
          <motion.button
            key={amount}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            onClick={() => onSelect(amount)}
            className="flex-shrink-0 h-11 px-5 rounded-xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all"
          >
            ${amount}
          </motion.button>
        ))}
      </div>
    </div>
  );
}