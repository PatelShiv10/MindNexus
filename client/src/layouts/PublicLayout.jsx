import { Link, Outlet } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';
import NexusButton from '../components/ui/NexusButton';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark bg-grid-pattern text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-nexus-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            MindNexus
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium hover:text-neon-blue transition-colors">Features</Link>
            <Link to="/" className="text-sm font-medium hover:text-neon-blue transition-colors">Pricing</Link>
            <Link to="/" className="text-sm font-medium hover:text-neon-blue transition-colors">Docs</Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login">
              <NexusButton variant="ghost" className="hidden sm:flex">Login</NexusButton>
            </Link>
            <Link to="/register">
              <NexusButton>Initialize</NexusButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 py-8 bg-white/30 dark:bg-nexus-dark/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} MindNexus Systems. All Neural Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
