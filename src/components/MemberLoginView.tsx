import React, { useState } from 'react';
import { ClubBrand } from './ClubBrand';
import { useClub } from '../context/ClubContext';
import { Language } from '../utils/memberTranslations';

export const MemberLoginView: React.FC = () => {
  const { memberLogin } = useClub();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('monie_club_lang');
      if (stored === 'en' || stored === 'bn') return stored;
      return 'bn';
    } catch {
      return 'bn';
    }
  });

  const toggleLanguage = () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    try {
      localStorage.setItem('monie_club_lang', nextLang);
    } catch {}
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = memberLogin(mobile);
    if (!res.success) {
      if (lang === 'bn') {
        setError(res.error?.includes('Inactive') 
          ? 'এই সদস্যপদ বর্তমানে নিষ্ক্রিয় রয়েছে।' 
          : 'মোবাইল নম্বরটি সঠিক নয় বা ক্লাবের তালিকায় পাওয়া যায়নি।');
      } else {
        setError(res.error || 'Login failed. Please check your mobile number.');
      }
    }
  };

  return (
    <div lang={lang} className="auth-page min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="auth-card w-full max-w-sm theme-card p-6 sm:p-7 rounded-2xl border theme-border space-y-5 relative">
        <div className="auth-brand"><ClubBrand subtitle={lang === 'bn' ? 'সদস্য পোর্টাল' : 'Member Portal'} /><span className="auth-access-badge auth-member-badge">{lang === 'bn' ? 'সদস্য' : 'Member'}</span></div>

        {/* Language Switcher in top corner */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-2.5 py-1 rounded-lg theme-input text-xs font-semibold cursor-pointer flex items-center gap-1 hover:border-emerald-500/50 transition-colors shadow-2xs"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <span className={lang === 'bn' ? 'text-emerald-500 font-bold' : 'theme-text-muted'}>বাং</span>
            <span className="theme-text-muted text-[10px]">/</span>
            <span className={lang === 'en' ? 'text-emerald-500 font-bold' : 'theme-text-muted'}>EN</span>
          </button>
        </div>

        {/* Header / Logo */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight theme-text-main">
            {lang === 'bn' ? 'সদস্য পোর্টাল' : 'Member Portal'}
          </h1>
          <p className="text-sm theme-text-muted">
            {lang === 'bn' ? 'আপনার নিবন্ধিত মোবাইল নম্বর দিন' : 'Enter your registered mobile number'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label htmlFor="member-mobile" className="block theme-text-main mb-2 font-medium">
              {lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
            </label>
            <div className="relative">
              <input
                type="tel"
                id="member-mobile"
                autoComplete="tel-national"
                inputMode="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="theme-input w-full px-3.5 py-2.5 rounded-xl font-mono text-xs tracking-wider"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary-action w-full py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'প্রবেশ করুন' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
};
