import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw } from "lucide-react";

const PULL_THRESHOLD = 72;
const MAX_PULL = 100;

/**
 * PullToRefresh — wraps scrollable content and triggers onRefresh
 * when user pulls down past the threshold.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);
  const triggered = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY <= 0) {
      setPullY(0);
      return;
    }
    // Resist pull with rubber-band feel
    const resistance = Math.min(deltaY * 0.45, MAX_PULL);
    setPullY(resistance);
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullY >= PULL_THRESHOLD && !triggered.current) {
      triggered.current = true;
      setRefreshing(true);
      setPullY(PULL_THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
    startY.current = null;
  }, [pullY, onRefresh]);

  const progress = Math.min(pullY / PULL_THRESHOLD, 1);
  const isReady = pullY >= PULL_THRESHOLD;

  return (
    <div className="relative h-full overflow-hidden">
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullY > 4 || refreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none"
            style={{ paddingTop: Math.max(pullY - 8, 4) }}
          >
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-colors ${
              isReady || refreshing ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
            }`}>
              <motion.div
                animate={{ rotate: refreshing ? 360 : progress * 200 }}
                transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              >
                <RotateCw className="h-4 w-4" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        style={{
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
          transform: pullY > 0 ? `translateY(${pullY * 0.5}px)` : undefined,
          transition: pullY === 0 ? "transform 0.3s ease" : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}