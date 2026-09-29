import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';

export const MemberLoginView: React.FC = () => {
  const { memberLogin } = useClub();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = memberLogin(mobile);
    if (!res.success) {
      setError(res.error || 'Login failed. Please check your mobile number.');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm theme-card p-6 sm:p-8 rounded-2xl border theme-border shadow-lg space-y-6">
        
        {/* Header / Logo */}
        <div className="text-center space-y-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-3"></div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main">
            Member Portal
          </h1>
          <p className="text-xs theme-text-muted">
            Enter your registered mobile number
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block theme-text-muted mb-1 font-medium">
              Mobile Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="theme-input w-full px-3.5 py-2.5 rounded-xl font-mono text-xs tracking-wider"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Sign In
          </button>
        </form>

      </div>
    </div>
  );
};
