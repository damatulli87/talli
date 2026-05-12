import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

/**
 * ReceiptViewer — full-screen lightbox for viewing a receipt image.
 */
export default function ReceiptViewer({ url, open, onClose }) {
  if (!url) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          onClick={onClose}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium text-white/70">Receipt</span>
            <div className="flex items-center gap-3">
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Image */}
          <motion.div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <img
              src={url}
              alt="Receipt"
              className="max-w-full max-h-full object-contain rounded-xl"
              style={{ touchAction: "pinch-zoom" }}
            />
          </motion.div>

          {/* Bottom hint */}
          <div className="pb-10 pt-3 flex justify-center flex-shrink-0">
            <span className="text-xs text-white/30">Tap anywhere to close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}