/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClubProvider, useClub } from './context/ClubContext';
import { Header, ActiveTab } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { InvestmentTracker } from './components/InvestmentTracker';
import { MonthlyLedger } from './components/MonthlyLedger';
import { PendingDuesView } from './components/PendingDuesView';
import { MembersDirectory } from './components/MembersDirectory';
import { ExpensesAndFees } from './components/ExpensesAndFees';
import { PendingApprovalsView } from './components/PendingApprovalsView';
import { MemberLoginView } from './components/MemberLoginView';
import { MemberPortal } from './components/MemberPortal';
import { AdminLoginView } from './components/AdminLoginView';
import { AdminRBACModal } from './components/AdminRBACModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { ReportsModal } from './components/ReportsModal';
import { PrintableSummary } from './components/PrintableSummary';
import { MonthKey } from './types';

function AppContent() {
  const { 
    theme, 
    fontFamily, 
    portalMode, 
    setPortalMode, 
    adminSignOutAndGoToMemberPortal,
    currentAdminUser, 
    currentMemberUser 
  } = useClub();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isRBACModalOpen, setIsRBACModalOpen] = useState(false);

  // Sync hash routing if user manually specifies #member or #admin
  useEffect(() => {
    const handleUrlCheck = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.toLowerCase();
        if (hash === '#member') {
          if (portalMode !== 'member') {
            setPortalMode('member');
          }
        } else if (hash === '#admin') {
          if (portalMode !== 'admin') {
            setPortalMode('admin');
          }
        }
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, [setPortalMode, portalMode]);

  const themeClass = `theme-${theme}`;
  const fontClass = `font-${fontFamily}`;

  // 1. ADMIN PANEL MODE (Default mode for Monie Club management)
  if (portalMode === 'admin') {
    // If not authenticated as admin, show the secured Admin Credentials Login
    if (!currentAdminUser) {
      return (
        <div className={`theme-container ${themeClass} ${fontClass} transition-colors duration-200 min-h-screen flex flex-col`}>
          <AdminLoginView />
        </div>
      );
    }

    // Authenticated Admin Dashboard
    return (
      <div className={`theme-container ${themeClass} ${fontClass} transition-colors duration-200 flex flex-col min-h-screen`}>
        {/* Printable View (Visible only during window.print) */}
        <PrintableSummary />

        {/* Regular Interactive Admin Application */}
        <div className="flex-1 flex flex-col no-print">
          
          {/* Header Navigation */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenRecordModal={() => {}}
            onOpenReportsModal={() => setIsReportsModalOpen(true)}
            onOpenRBACModal={() => setIsRBACModalOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
            {activeTab === 'dashboard' && (
              <DashboardOverview
                setActiveTab={setActiveTab}
                onOpenRecordModal={() => {}}
              />
            )}

            {activeTab === 'investment' && (
              <InvestmentTracker />
            )}

            {activeTab === 'ledger' && (
              <MonthlyLedger />
            )}

            {activeTab === 'dues' && (
              <PendingDuesView />
            )}

            {activeTab === 'members' && (
              <MembersDirectory />
            )}

            {activeTab === 'expenses' && (
              <ExpensesAndFees />
            )}

            {activeTab === 'approvals' && (
              <PendingApprovalsView />
            )}
          </main>

          {/* Minimal Clean Footer */}
          <footer className="border-t theme-border py-3 text-xs theme-text-muted mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px]">
              Monie Club Admin · Session 2025–2026
            </div>
          </footer>

        </div>

        {/* Modals */}
        <ReportsModal
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
        />

        <AdminRBACModal
          isOpen={isRBACModalOpen}
          onClose={() => setIsRBACModalOpen(false)}
        />

      </div>
    );
  }

  // 2. MEMBER PORTAL MODE (Default for monieclub.com.vercel / root web app)
  return (
    <div className={`theme-container ${themeClass} ${fontClass} transition-colors duration-200 min-h-screen flex flex-col`}>
      {!currentMemberUser ? (
        <MemberLoginView />
      ) : (
        <MemberPortal />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ClubProvider>
      <AppContent />
    </ClubProvider>
  );
}
