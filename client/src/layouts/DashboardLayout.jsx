import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Settings, Menu, Activity, X, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Handle Mobile Resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: 'Nexus',  path: '/nexus' },
    { icon: Database,        label: 'Archives', path: '/nexus/archives' },
    { icon: BrainCircuit,   label: 'AI Tutor', path: '/nexus/tutor' },
    // { icon: Settings, label: 'Settings', path: '/nexus/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark bg-grid-pattern text-slate-900 dark:text-slate-100 flex overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 240 : (isMobile ? 0 : 72),
          x: isMobile && !isSidebarOpen ? -240 : 0
        }}
        className={clsx(
          "fixed left-0 top-0 h-full z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-300",
          isMobile ? "shadow-2xl" : ""
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent whitespace-nowrap"
              >
                MindNexus
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
          >
            {isMobile && isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link to={item.path} key={item.path} onClick={() => isMobile && setIsSidebarOpen(false)}>
                <div
                  className={clsx(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden whitespace-nowrap",
                    isActive
                      ? "bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 text-neon-blue"
                      : "hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-neon-blue rounded-r-full"
                    />
                  )}
                  <item.icon className={clsx("w-6 h-6 shrink-0", isActive && "text-neon-blue drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]")} />
                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className={clsx("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                  Terminate Session
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div 
        className={clsx(
          "flex-1 flex flex-col transition-all duration-300 min-w-0",
          isMobile ? "ml-0" : (isSidebarOpen ? "ml-60" : "ml-[72px]")
        )}
      >
        {/* Topbar */}
        <header 
          className={clsx(
            "h-16 fixed top-0 right-0 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 md:px-6 flex items-center justify-between transition-all duration-300",
            isMobile ? "left-0" : (isSidebarOpen ? "left-60" : "left-[72px]")
          )}
        >
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {/* Active Session removed */}
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
              <Activity className="w-3 h-3" />
              <span>Network: Stable</span>
            </div> */}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto mt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
