"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DiceRoller } from "./DiceRoller";

interface SurpriseModalProps {
  open: boolean;
  onClose: () => void;
}

export function SurpriseModal({ open, onClose }: SurpriseModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl rounded-t-2xl border border-slate-800 bg-slate-900 shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold">
              {"I don't know what to make"}
            </h2>
            <button
              onClick={onClose}
              className="rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <DiceRoller />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
