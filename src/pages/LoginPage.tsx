import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth, ApiError } from '../lib/auth-context';
import { Eye, EyeOff, Lock, User as UserIcon, LogIn, Mail, Phone, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signup, user } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const routeAfterAuth = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate(redirectParam ? `/${redirectParam}` : '/bookings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser =
        mode === 'login'
          ? await login(email, password)
          : await signup(email, password, name, phone || undefined);
      routeAfterAuth(loggedUser.role);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    routeAfterAuth(user.role);
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans">

      {/* Main Login Card - Editorial Liquid Glass containing block */}
      <div className="relative w-full max-w-md liquid-glass rounded-2xl p-8 md:p-10 z-10 animate-fade-rise duration-700 ease-out">

        {/* Brand Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" />
          <h2 className="font-sans font-light text-3xl text-white mt-6 tracking-tight leading-tight">
            Where dreams rise <br />
            <span className="italic font-normal text-white">through the silence</span>
          </h2>
          <p className="text-xs text-ink-secondary mt-2 tracking-wide font-light max-w-xs leading-relaxed">
            Professional-grade football and box cricket grounds, illuminated under nocturnal skies.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 text-[10px] font-sans font-bold uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer
              ${mode === 'login' ? 'bg-white text-brand-navy' : 'text-ink-secondary hover:text-white'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2 text-[10px] font-sans font-bold uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer
              ${mode === 'signup' ? 'bg-white text-brand-navy' : 'text-ink-secondary hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-3">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary/70">
                  <UserIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                </span>
                <input
                  type="text"
                  placeholder="Elite Player"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-5 py-3 bg-white/5 border border-white/10 text-xs text-white rounded-full focus:outline-none focus:border-white/30 transition-all duration-300 font-sans placeholder:opacity-30"
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-3">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary/70">
                <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-5 py-3 bg-white/5 border border-white/10 text-xs text-white rounded-full focus:outline-none focus:border-white/30 transition-all duration-300 font-sans placeholder:opacity-30"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-3">
                Phone (optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary/70">
                  <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                </span>
                <input
                  type="tel"
                  placeholder="10-digit phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-5 py-3 bg-white/5 border border-white/10 text-xs text-white rounded-full focus:outline-none focus:border-white/30 transition-all duration-300 font-sans placeholder:opacity-30"
                />
              </div>
            </div>
          )}

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-sans font-semibold uppercase tracking-wider text-ink-secondary ml-3">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary/70">
                <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 text-xs text-white rounded-full focus:outline-none focus:border-white/30 transition-all duration-300 font-sans placeholder:opacity-30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-ink-secondary hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-[10px] font-sans bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Submit Button - Pill Shaped (White/near-black neutral logic) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-white text-brand-navy hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer font-sans text-[10px] uppercase font-bold tracking-wider mt-2"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-3.5 h-3.5 text-brand-navy" strokeWidth={1.5} />
                Step Inside
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 text-brand-navy" strokeWidth={1.5} />
                Create Account
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
