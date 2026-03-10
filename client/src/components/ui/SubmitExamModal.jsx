import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, AlertTriangle, Flag } from 'lucide-react';
import NexusButton from './NexusButton';

export default function SubmitExamModal({ isOpen, onClose, onConfirm, unansweredCount, flaggedCount, totalQuestions }) {
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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border-t-4 border-cyan-500 rounded-2xl shadow-2xl p-8 overflow-hidden"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6">
                <ClipboardCheck className="w-8 h-8 text-cyan-500" />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Ready to Submit?
              </h2>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You have answered <span className="font-bold text-slate-900 dark:text-white">{totalQuestions - unansweredCount}</span> out of <span className="font-bold text-slate-900 dark:text-white">{totalQuestions}</span> questions.
              </p>

              {unansweredCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg mb-4 text-sm font-medium w-full justify-center">
                  <AlertTriangle className="w-4 h-4" />
                  Warning: You have {unansweredCount} unanswered questions.
                </div>
              )}

              {flaggedCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg mb-6 text-sm font-medium w-full justify-center">
                  <Flag className="w-4 h-4" />
                  Note: You have {flaggedCount} questions marked for review.
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-500 mb-8">
                Once submitted, you cannot change your answers.
              </p>

              <div className="flex gap-3 w-full">
                <NexusButton
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Review Answers
                </NexusButton>
                <NexusButton
                  variant="primary"
                  onClick={onConfirm}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 border-none"
                >
                  Finalize Submission
                </NexusButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
