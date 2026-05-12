import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { formatWeekLabel, isCurrentWeek } from "@/lib/weekUtils";

export default function WeekNavigator({ weekStart, onNavigate }) {
  const isCurrent = isCurrentWeek(weekStart);

  return (
    <div className="flex items-center justify-between py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onNavigate(-1)}
        className="h-10 w-10 rounded-xl"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <AnimatePresence mode="wait">
        <motion.div
          key={weekStart.toString()}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="text-center"
        >
          <p className="text-sm font-semibold text-foreground">
            {formatWeekLabel(weekStart)}
          </p>
          {isCurrent && (
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
              This Week
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onNavigate(1)}
        className="h-10 w-10 rounded-xl"
        disabled={isCurrent}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}