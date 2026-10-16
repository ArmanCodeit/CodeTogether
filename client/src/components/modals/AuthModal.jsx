import React, { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        confetti({ particleCount: 30, spread: 60 });
        onClose();
      } else if (mode === 'register') {
        await register(name, email, password);
        confetti({ particleCount: 40, spread: 70 });
        onClose();
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setMessage(data.message || 'Password reset link dispatched.');
      }
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = () => {
    setEmail('sarah@codetogether.dev');
    setPassword('password123');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101522] border border-[#222E44] rounded-2xl w-full max-w-md shadow-2xl p-6 relative select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-[#1A2336] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CodeTogether Auth Mesh</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' && 'Sign in to CodeTogether'}
            {mode === 'register' && 'Create Developer Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Access synchronized workspaces and active audio/video rooms.'}
            {mode === 'register' && 'Join the P2P developer mesh across your organization.'}
            {mode === 'forgot' && 'Enter your registered email address to receive reset instructions.'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Connor"
                  required
                  className="w-full bg-[#0A0D14] border border-[#222E44] focus:border-sky-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@codetogether.dev"
                required
                className="w-full bg-[#0A0D14] border border-[#222E44] focus:border-sky-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none font-mono"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-400">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0A0D14] border border-[#222E44] focus:border-sky-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 outline-none font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
          >
            <span>
              {loading 
                ? 'Processing...' 
                : mode === 'login' 
                  ? 'Sign In to Workspace' 
                  : mode === 'register' 
                    ? 'Complete Registration' 
                    : 'Send Reset Link'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Demo Fill Helper */}
        <div className="mt-4 pt-4 border-t border-[#1E2638] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={setDemoCredentials}
            className="flex items-center space-x-1.5 text-sky-400 hover:text-sky-300 font-mono text-[11px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Use Demo Account (Sarah)</span>
          </button>

          {mode === 'login' ? (
            <button
              onClick={() => setMode('register')}
              className="text-slate-400 hover:text-white"
            >
              Need account? <span className="text-sky-400 font-semibold">Sign Up</span>
            </button>
          ) : (
            <button
              onClick={() => setMode('login')}
              className="text-slate-400 hover:text-white"
            >
              Have account? <span className="text-sky-400 font-semibold">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
