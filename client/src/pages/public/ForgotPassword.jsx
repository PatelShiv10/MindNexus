import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Brain, Loader2 } from 'lucide-react';
import NetworkBackground from '../../components/ui/NetworkBackground';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
      setMessage(res.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <NetworkBackground />
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 relative z-10 transition-colors duration-300">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/logo.png" alt="MindNexus Logo" className="h-16 w-auto object-contain" />
            <span className="text-2xl font-semibold text-slate-800 dark:text-white tracking-tight">MindNexus</span>
          </div>
          <h1 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
            {step === 1 ? 'RESET AUTHORIZATION' : 'ESTABLISH NEW PARADIGM'}
          </h1>
          <p className="text-slate-400 text-sm px-4">
            {step === 1 
              ? 'Enter your Neural ID to receive a reset code.' 
              : 'Enter the 6-digit code sent to your email and your new access code.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 text-xs text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-500 text-xs text-center">
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold rounded-full shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                required
                maxLength="6"
                className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent transition-all shadow-inner font-mono text-center tracking-[0.5em]"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div className="relative group">
              <input
                type="password"
                required
                className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-transparent transition-all shadow-inner"
                placeholder="New Access Code"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold rounded-full shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm New Code'}
            </button>
          </form>
        )}

        <div className="mt-8 flex justify-between items-center text-xs">
          <Link to="/login" className="text-neon-blue hover:text-neon-purple transition-colors font-medium">
            Return to Login
          </Link>
          {step === 2 && (
            <button 
              type="button"
              onClick={handleSendOtp} 
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
