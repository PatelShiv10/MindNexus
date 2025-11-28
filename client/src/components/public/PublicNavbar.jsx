import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import NexusButton from '../ui/NexusButton';

export default function PublicNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-nexus-dark/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 h-20 flex items-center transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
            MindNexus
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-6">
            <Link to="/login">
              <button className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-neon-blue dark:hover:text-cyan-400 transition-colors">
                Login
              </button>
            </Link>
            <Link to="/register">
              <NexusButton variant="primary" className="!py-2.5 !px-5 !text-sm shadow-lg shadow-neon-blue/20">
                Initialize Cortex
              </NexusButton>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
