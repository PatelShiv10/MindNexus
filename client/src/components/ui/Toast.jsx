import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'info', onClose }) => {
  const isError = type === 'error';
  const isSuccess = type === 'success';

  const styles = {
    error: "bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-200",
    success: "bg-green-50/90 dark:bg-green-950/90 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-200",
    info: "bg-white/90 dark:bg-slate-900/80 border-cyan-200 dark:border-cyan-500/50 text-slate-700 dark:text-cyan-200"
  };

  const Icon = isError ? AlertCircle : (isSuccess ? CheckCircle : Info);
  const iconColor = isError ? "text-red-500" : "text-cyan-500";

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-full shadow-xl backdrop-blur-md border flex items-center gap-3 min-w-[300px] ${styles[type] || styles.info}`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="text-sm font-medium flex-1">{message}</span>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
              <X className="w-4 h-4 opacity-50" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
