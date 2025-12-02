import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import NexusButton from './NexusButton';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, fileName }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-red-500/30 rounded-xl shadow-2xl dark:shadow-[0_0_30px_rgba(239,68,68,0.2)] p-6 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Deletion</h3>
              
              <p className="text-slate-400 mb-8">
                Are you sure you want to permanently delete <span className="text-slate-700 dark:text-slate-200 font-medium">{fileName}</span>? This action cannot be undone.
              </p>

              <div className="flex gap-3 w-full">
                <NexusButton 
                  variant="ghost" 
                  onClick={onClose}
                  className="flex-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </NexusButton>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
