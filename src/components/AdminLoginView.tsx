import React, { useState } from 'react';
import { ClubBrand } from './ClubBrand';
import { LoaderCircle } from 'lucide-react';
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
    <div className="auth-page min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="auth-card w-full max-w-sm theme-card p-6 sm:p-7 rounded-2xl border theme-border space-y-5">

        {/* Brand / Logo */}
        <div className="auth-brand"><ClubBrand subtitle="Club treasury & ventures" /><span className="auth-access-badge">Admin</span></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight theme-text-main">Admin sign in</h1>
          <p className="text-sm theme-text-muted">Manage your club’s treasury, members, and ventures.</p>
        </div>

        {/* Error message */}
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-500 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label htmlFor="admin-username" className="block theme-text-main mb-2 font-medium">
              Admin Email / Username
            </label>
            <input
              type="text"
              id="admin-username"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="theme-input w-full px-3.5 py-2.5 rounded-xl font-mono text-xs"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block theme-text-main mb-2 font-medium">
              Password
            </label>
            <input
              type="password"
              id="admin-password"
              autoComplete="current-password"
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
            className="primary-action w-full py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <LoaderCircle size={17} className="animate-spin" />}{isLoading ? 'Verifying...' : 'Sign In as Administrator'}
          </button>
        </form>

        {/* Switch to Member Portal Link */}
        <div className="text-center pt-3 border-t theme-border">
          <button
            type="button"
            onClick={() => setPortalMode('member')}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
          >
            <span>Switch to Member Portal</span>
          </button>
        </div>

      </div>
    </div>
  );
};
