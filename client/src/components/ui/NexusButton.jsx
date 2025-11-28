import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function NexusButton({ children, variant = 'primary', className, ...props }) {
  const baseStyles = "px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/20 hover:shadow-neon-purple/40",
    ghost: "bg-transparent border border-slate-300 dark:border-slate-700 hover:border-neon-blue dark:hover:border-neon-blue text-slate-700 dark:text-slate-300 hover:text-neon-blue dark:hover:text-neon-blue hover:bg-neon-blue/5 dark:hover:bg-neon-blue/10",
    danger: "bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
