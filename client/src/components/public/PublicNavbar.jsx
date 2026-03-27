import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import NexusButton from '../ui/NexusButton';

export default function PublicNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-nexus-dark/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 h-20 flex items-center transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        {/* <Link to="/" className="flex items-center group">
          <div className="w-16 h-16 overflow-hidden flex items-center justify-center">
            <img src="/logo1.png" alt="MindNexus Logo" className="w-28 h-28 object-contain scale-[2.2]" />
          </div>
        </Link> */}
        <Link to="/" className="flex items-center -ml-14">
          <img 
            src="/logo1.png" 
            alt="MindNexus Logo" 
            className="h-64 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-6">
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-6">
            <Link to="/register">
              <NexusButton variant="primary" className="!py-2.5 !px-5 !text-sm shadow-lg shadow-neon-blue/20">
                Get Started
              </NexusButton>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
