import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';

export const AdminLoginView: React.FC = () => {
  const { adminLogin, setPortalMode } = useClub();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = adminLogin(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials. Please use treasurer@monieclub or admin@monieclub.');
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md theme-card p-6 sm:p-8 rounded-2xl border theme-border shadow-xl space-y-6">
        
        {/* Brand / Logo */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-1">
            <span className="text-xl">🛡️</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main">
            Admin Authentication
          </h1>
          <p className="text-xs theme-text-muted">
            Monie Club Administration Portal
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-500 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block theme-text-muted mb-1 font-medium">
              Admin Email / Username
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="theme-input w-full px-3.5 py-2.5 rounded-xl font-mono text-xs"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block theme-text-muted mb-1 font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••••"
              className="theme-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Sign In as Administrator'}
          </button>
        </form>

        {/* Switch to Member Portal Link */}
        <div className="text-center pt-3 border-t theme-border">
          <button
            type="button"
            onClick={() => setPortalMode('member')}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
          >
            <span>Need Member Passbook & Dues Portal?</span>
            <span>Switch to Member Portal →</span>
          </button>
        </div>

      </div>
    </div>
  );
};
