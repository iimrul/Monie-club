import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { UITheme, AppFont } from '../types';

export type ActiveTab = 'dashboard' | 'investment' | 'ledger' | 'dues' | 'members' | 'expenses' | 'approvals';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenRecordModal: () => void;
  onOpenReportsModal: () => void;
  onOpenRBACModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenRecordModal,
  onOpenReportsModal,
  onOpenRBACModal,
}) => {
  const { 
    summary, 
    theme, 
    setTheme, 
    fontFamily, 
    setFontFamily,
    currentAdminUser,
    adminLogout,
    adminSignOutAndGoToMemberPortal,
    pendingClaims,
    setPortalMode
  } = useClub();

  const [showSettingsMobile, setShowSettingsMobile] = useState(false);

  const pendingCount = pendingClaims.filter(c => c.status === 'Pending').length;
  const isSuperAdmin = currentAdminUser?.role === 'Super Admin' && currentAdminUser?.canEdit;

  const themes: { id: UITheme; label: string }[] = [
    { id: 'midnight', label: 'Midnight (Dark Blue)' },
    { id: 'light', label: 'Light Paper' },
    { id: 'dark', label: 'Minimal Dark' },
    { id: 'warm', label: 'Warm Linen' },
  ];

  const fonts: { id: AppFont; label: string }[] = [
    { id: 'outfit', label: 'Outfit' },
    { id: 'inter', label: 'Inter' },
    { id: 'system', label: 'System' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'investment', label: 'Investments' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'dues', label: `Dues (৳${(summary.totalDues / 1000).toFixed(0)}k)` },
    { id: 'members', label: `Members (${summary.activeMembersCount})` },
    { id: 'expenses', label: 'Costs & Fees' },
    { 
      id: 'approvals', 
      label: pendingCount > 0 ? `Approvals (${pendingCount})` : 'Approvals',
      badge: pendingCount > 0
    },
  ];

  return (
    <header className="sticky top-0 z-40 theme-header backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo / Club Title */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="text-left cursor-pointer flex items-center gap-2"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <div className="text-base font-bold tracking-tight theme-text-main">
                Monie Club
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 theme-text-muted hidden sm:inline-block">
                Admin Panel
              </span>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer relative ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : tab.badge
                      ? 'text-amber-600 dark:text-amber-400 font-semibold hover:bg-black/5 dark:hover:bg-white/5'
                      : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            
            {/* When Admin is Logged In */}
            {currentAdminUser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenRBACModal}
                  className="theme-input px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer hover:border-emerald-500 transition-colors"
                  title="Admin Access & Roles"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuperAdmin ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  <span className="font-medium">{currentAdminUser.designation}</span>
                </button>

                <button
                  onClick={() => {
                    setPortalMode('member');
                  }}
                  className="hidden lg:inline-flex px-2 py-1 text-xs theme-text-muted hover:theme-text-main rounded-lg transition-colors cursor-pointer"
                  title="Preview Member Portal"
                >
                  Member View
                </button>

                <button
                  onClick={() => {
                    adminLogout();
                  }}
                  className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer font-medium"
                  title="Sign Out of Admin"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Desktop Theme */}
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as UITheme)}
              className="hidden sm:inline-block theme-input px-2 py-1 rounded-lg text-xs focus:outline-none cursor-pointer"
              title="Theme"
            >
              {themes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <button
              onClick={onOpenReportsModal}
              className="theme-input px-2.5 py-1 text-xs rounded-lg hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
            >
              Reports
            </button>
          </div>

        </div>

        {/* Mobile Navigation and Settings Drawer (if toggled) */}
        {showSettingsMobile && (
          <div className="sm:hidden py-3 px-3 mb-2 rounded-xl theme-card border theme-border space-y-3 text-xs">
            {/* Admin Role Status */}
            <div className="p-2 rounded-lg border theme-border theme-card-subtle flex items-center justify-between">
              <div>
                <div className="font-semibold">{currentAdminUser?.name}</div>
                <div className="text-[10px] theme-text-muted">
                  {currentAdminUser?.designation} · {isSuperAdmin ? 'Super Admin (Editor)' : 'View-Only Admin'}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSettingsMobile(false);
                  onOpenRBACModal();
                }}
                className="text-[11px] text-emerald-600 font-medium"
              >
                Roles →
              </button>
            </div>

            {/* Mobile Theme & Font Selectors */}
            <div className="flex items-center justify-between">
              <span className="theme-text-muted">Theme:</span>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value as UITheme)}
                className="theme-input px-2 py-1 rounded text-xs"
              >
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="theme-text-muted">Font:</span>
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value as AppFont)}
                className="theme-input px-2 py-1 rounded text-xs"
              >
                {fonts.map(f => (
                  <option key={f.id} value={f.id}>{f.label} Font</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1 border-t theme-border">
              <button
                onClick={() => {
                  setShowSettingsMobile(false);
                  adminSignOutAndGoToMemberPortal();
                }}
                className="text-xs text-rose-500 hover:underline font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Mobile Horizontal Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t theme-border no-scrollbar text-xs">
          {navItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : tab.badge
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'theme-text-muted hover:theme-text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
