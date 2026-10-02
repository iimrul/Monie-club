import React, { useState } from 'react';
import { ClubBrand } from './ClubBrand';
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
    <header className="admin-header sticky top-0 z-40 theme-header backdrop-blur-xl no-print">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="app-topbar">
          <button onClick={() => setActiveTab('dashboard')} className="brand-button" aria-label="Monie Club overview">
            <ClubBrand subtitle="Administration" />
          </button>
          <div className="app-header-controls">
            <button type="button" onClick={onOpenReportsModal} className="header-control" title="Reports" aria-label="Open reports">Reports</button>
            <button type="button" onClick={() => setShowSettingsMobile(!showSettingsMobile)} className="header-control" title="Appearance" aria-label="Appearance settings" aria-expanded={showSettingsMobile}>Appearance</button>
            {currentAdminUser && <>
              <button onClick={onOpenRBACModal} className="header-control admin-role-control" title="Admin Access & Roles" aria-label="Admin access and roles"><span className="md:hidden">Access</span><span className="hidden md:inline">{currentAdminUser.designation}</span></button>
              <button onClick={() => setPortalMode('member')} className="header-control member-preview-control" title="Preview Member Portal">Member view</button>
              <button onClick={() => adminLogout()} className="header-control signout-control" title="Sign Out of Admin" aria-label="Sign out">Sign out</button>
            </>}
          </div>
        </div>

        {showSettingsMobile && (
          <div className="appearance-panel theme-card">
            <div className="flex items-center justify-between gap-4"><strong className="text-sm theme-text-main">Appearance</strong><button type="button" className="header-control" aria-label="Close appearance settings" onClick={() => setShowSettingsMobile(false)}>Close</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs theme-text-muted">Theme<select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value as UITheme)} className="theme-input w-full mt-1.5 px-3 py-2 rounded-lg">{themes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
              <label className="text-xs theme-text-muted">Font<select aria-label="Font" value={fontFamily} onChange={e => setFontFamily(e.target.value as AppFont)} className="theme-input w-full mt-1.5 px-3 py-2 rounded-lg">{fonts.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs theme-text-muted">{currentAdminUser?.name} · {isSuperAdmin ? 'Super Admin' : 'View-Only Admin'}</p><button type="button" onClick={() => { setShowSettingsMobile(false); adminSignOutAndGoToMemberPortal(); }} className="text-xs text-rose-500 hover:underline">Sign out to Member Portal</button></div>
          </div>
        )}

        <nav className="admin-navigation" aria-label="Main navigation">
          {navItems.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)} aria-current={activeTab === tab.id ? 'page' : undefined} className={`admin-nav-item ${activeTab === tab.id ? 'nav-item-active' : ''} ${tab.badge ? 'nav-item-pending' : ''}`}><span>{tab.label}</span>{tab.badge && <span className="navigation-notification" aria-hidden="true" />}</button>
          ))}
        </nav>
      </div>
    </header>
  );
};
