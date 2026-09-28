import React from 'react';
import { useClub } from '../context/ClubContext';
import { AdminUser } from '../types';

interface AdminRBACModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminRBACModal: React.FC<AdminRBACModalProps> = ({ isOpen, onClose }) => {
  const { 
    adminUsers, 
    currentAdminUser, 
    designateSuperAdmin
  } = useClub();

  const isSuperAdmin = currentAdminUser?.role === 'Super Admin' && currentAdminUser?.canEdit;

  if (!isOpen) return null;

  const handleDesignate = (adminId: string, adminName: string) => {
    if (confirm(`Designate "${adminName}" as the active Super Admin? The previous Super Admin will switch to View-Only Admin.`)) {
      designateSuperAdmin(adminId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="theme-card w-full max-w-2xl rounded-2xl shadow-2xl border theme-border overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b theme-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold theme-text-main flex items-center gap-2">
              <span>Admin Access & Roles (RBAC)</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                2 Authorized Credentials
              </span>
            </h2>
            <p className="text-xs theme-text-muted mt-0.5">
              Role-Based Access Control configured strictly for Monie Club administration.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">

          {/* Admin Role Scope Banner */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                ADMIN ACCESS ARCHITECTURE
              </div>
              <div className="text-sm font-bold theme-text-main mt-0.5">
                Super Admin (Treasurer) & General Admin
              </div>
              <div className="text-[11px] theme-text-muted">
                • <strong>treasurer@monieclub</strong>: Super Admin with full modification rights (Members, Investments, Payments, Profits).<br />
                • <strong>admin@monieclub</strong>: Admin with view-only monitoring and audit access.
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
              🛡️
            </div>
          </div>

          {/* Admins Table / List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold theme-text-main">
                Configured Credentials ({adminUsers.length})
              </span>
            </div>

            <div className="divide-y theme-border rounded-xl border theme-border overflow-hidden">
              {adminUsers.map((admin: AdminUser) => {
                const isThisSuperAdmin = admin.role === 'Super Admin';

                return (
                  <div key={admin.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 theme-card">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold theme-text-main">{admin.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-black/5 dark:bg-white/10 theme-text-muted">
                          {admin.designation}
                        </span>
                        {isThisSuperAdmin ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            Super Admin (Editor)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-500/15 theme-text-muted">
                            Admin (View-Only)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] theme-text-muted flex items-center gap-2">
                        <span className="font-mono text-emerald-500">{admin.email}</span>
                        {admin.phone && <span>· {admin.phone}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSuperAdmin && !isThisSuperAdmin && (
                        <button
                          onClick={() => handleDesignate(admin.id, admin.name)}
                          className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg border theme-border transition-colors cursor-pointer"
                          title="Designate this account as Super Admin"
                        >
                          Make Super Admin
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t theme-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium theme-input rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
