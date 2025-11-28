import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Brain, Lock, Mail, User, ArrowRight, Sparkles } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await register(name, email, password);
      navigate('/nexus');
    } catch (err) {
      setError('Initialization Failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-neon-purple/10 to-neon-blue/10 blur-[100px] rounded-full opacity-50 pointer-events-none" />
      
      {/* Theme Toggle (Absolute) */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <GlassCard className="w-full max-w-md p-8 relative z-10 border-neon-purple/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center text-white mx-auto mb-6 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
            Initialize Cortex
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Create your neural profile to begin.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
              Designation (Name)
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-neon-blue transition-colors" />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
              Neural ID (Email)
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-neon-blue transition-colors" />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
                placeholder="user@mindnexus.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
              Access Code
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-neon-purple transition-colors" />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <NexusButton 
            variant="primary" 
            className="w-full py-3 text-base mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Initializing...' : 'Create Link'} <ArrowRight className="w-4 h-4 ml-2" />
          </NexusButton>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Already linked?{' '}
          <Link to="/login" className="text-neon-blue hover:text-neon-purple transition-colors font-medium">
            Access System
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
