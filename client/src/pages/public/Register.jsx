import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Brain, Lock, Mail, User, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import NetworkBackground from '../../components/ui/NetworkBackground';
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
      const data = await register(name, email, password);
      navigate('/verify-otp', { state: { email: data.email } });
    } catch (err) {
      setError('Initialization Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <NetworkBackground />
      
      {/* Theme Toggle (Absolute) */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Back to Home (Absolute) */}
      <div className="absolute top-6 left-6 z-50">
        <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-neon-blue dark:hover:text-neon-blue transition-colors px-4 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10 shadow-sm group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Home</span>
        </Link>
      </div>

      <div className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 relative z-10 transition-colors duration-300">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/logo.png" alt="MindNexus Logo" className="h-16 w-auto object-contain" />
            <span className="text-2xl font-semibold text-slate-800 dark:text-white tracking-tight">MindNexus</span>
          </div>
          
          <h1 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
            INITIALIZE CORTEX
          </h1>
          <p className="text-slate-400 text-sm px-4">
            Create your neural profile to begin.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="h-5 w-1 bg-neon-blue/50 rounded-full"></div>
            </div>
            <input
              type="text"
              required
              className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent transition-all shadow-inner"
              placeholder="Designation (Name)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="relative group">
            <input
              type="email"
              required
              className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent transition-all shadow-inner"
              placeholder="Neural ID (Email)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative group">
            <input
              type="password"
              required
              className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent transition-all shadow-inner"
              placeholder="Access Code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold rounded-full shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? 'Initializing...' : 'Create Link'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Already linked?{' '}
          <Link to="/login" className="text-neon-blue hover:text-neon-purple transition-colors font-medium">
            Access System
          </Link>
        </div>
      </div>
    </div>
  );
}
