import React from "react";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";

export default function BalanceCard({ perDiem, spent, weekLabel }) {
  const remaining = Math.max(perDiem - spent, 0);
  const percentage = perDiem > 0 ? Math.min((spent / perDiem) * 100, 100) : 0;
  const isOver = spent > perDiem;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground"
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-4 w-4 opacity-80" />
          <span className="text-xs font-medium uppercase tracking-wider opacity-80">
            Remaining Balance
          </span>
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-bold tracking-tight">
            ${remaining.toFixed(2)}
          </span>
        </div>

        <p className="text-xs opacity-70 mb-5">
          {weekLabel} · ${perDiem.toFixed(2)} allowance
        </p>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className={`h-full rounded-full ${
              isOver
                ? "bg-red-400"
                : percentage > 75
                ? "bg-yellow-300"
                : "bg-white/90"
            }`}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs opacity-70">
          <span>${spent.toFixed(2)} spent</span>
          <span>{percentage.toFixed(0)}% used</span>
        </div>
      </div>
    </motion.div>
  );
}