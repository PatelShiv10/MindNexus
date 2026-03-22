import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Brain, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import NetworkBackground from '../../components/ui/NetworkBackground';
import ThemeToggle from '../../components/ui/ThemeToggle';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp } = useAuth();

  const email = location.state?.email || '';

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  const inputRefs = useRef([]);

  // If no email in state, redirect back to register
  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitOtp = useCallback(async (fullOtp) => {
    setIsVerifying(true);
    setError('');
    try {
      await verifyOtp(email, fullOtp);
      setSuccess('Identity verified! Redirecting...');
      setTimeout(() => navigate('/nexus', { replace: true }), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification failed.';
      setError(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      setShakeKey((k) => k + 1);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
  }, [email, navigate, verifyOtp]);

  const handleChange = (index, value) => {
    // Accept only single digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    if (digit) {
      // Move focus forward
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // Last digit filled — auto-verify
        inputRefs.current[index]?.blur();
        const code = next.join('');
        if (code.length === OTP_LENGTH) {
          submitOtp(code);
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError('');
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setSuccess('');
    try {
      await resendOtp(email);
      setSuccess('New code sent! Check your inbox.');
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(b.length, 3)) + c)
    : '';

  const allFilled = digits.every(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <NetworkBackground />

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 relative z-10 transition-colors duration-300">
        
        {/* Back button */}
        <button
          onClick={() => navigate('/register')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs mb-6 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Register
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Brain className="w-8 h-8 text-neon-blue" />
            <span className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">MindNexus</span>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-full">
              <ShieldCheck className="w-7 h-7 text-cyan-500" />
            </div>
          </div>
          <h1 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
            Verify Your Identity
          </h1>
          <p className="text-slate-400 text-sm px-4">
            We sent a 6-digit code to{' '}
            <span className="text-slate-600 dark:text-slate-300 font-medium">{maskedEmail}</span>
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 text-xs text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-xs text-center">
            {success}
          </div>
        )}

        {/* OTP Boxes */}
        <div
          key={shakeKey}
          className={`flex justify-center gap-3 mb-8 ${error ? 'animate-shake' : ''}`}
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              disabled={isVerifying}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              className={`
                w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
                bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100
                ${d
                  ? 'border-cyan-400 dark:border-cyan-500 shadow-md shadow-cyan-500/20 scale-105'
                  : 'border-slate-200 dark:border-slate-700'
                }
                focus:border-cyan-400 focus:shadow-md focus:shadow-cyan-500/30 focus:scale-105
                disabled:opacity-60 disabled:cursor-not-allowed
              `}
            />
          ))}
        </div>

        {/* Verify Button (manual fallback) */}
        <button
          onClick={() => allFilled && !isVerifying && submitOtp(digits.join(''))}
          disabled={!allFilled || isVerifying}
          className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold rounded-full shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isVerifying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying...
            </span>
          ) : (
            'Verify Code'
          )}
        </button>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="flex items-center gap-1.5 mx-auto text-xs font-medium text-cyan-500 hover:text-cyan-400 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : isResending
              ? 'Sending...'
              : 'Resend Code'}
          </button>
        </div>
      </div>

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
