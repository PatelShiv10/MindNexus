import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden transition-colors border border-slate-300 dark:border-slate-700 hover:border-neon-blue dark:hover:border-neon-blue"
    >
      <motion.div
        initial={false}
        animate={{
          y: theme === 'dark' ? -30 : 0,
          opacity: theme === 'dark' ? 0 : 1,
        }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Sun className="w-5 h-5 text-amber-500" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          y: theme === 'dark' ? 0 : 30,
          opacity: theme === 'dark' ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Moon className="w-5 h-5 text-neon-purple" />
      </motion.div>
    </button>
  );
}
