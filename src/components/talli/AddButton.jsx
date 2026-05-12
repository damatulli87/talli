import React from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function AddButton({ onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="fixed bottom-24 right-6 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center z-40 active:shadow-md transition-shadow"
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </motion.button>
  );
}