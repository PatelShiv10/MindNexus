import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function GlassCard({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl rounded-xl transition-all duration-300",
        "bg-white/60 border border-slate-200 shadow-lg", // Light mode
        "dark:bg-slate-900/50 dark:border-white/10 dark:shadow-2xl", // Dark mode
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
