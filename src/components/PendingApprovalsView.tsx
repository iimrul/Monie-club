import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { PendingPaymentClaim } from '../types';

export const PendingApprovalsView: React.FC = () => {
  const { 
    pendingClaims, 
    approvePaymentClaim, 
    rejectPaymentClaim, 
    deletePaymentClaim, 
    currentAdminUser 
  } = useClub();

  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isSuperAdmin = currentAdminUser?.role === 'Super Admin' && currentAdminUser?.canEdit;

  const filteredClaims = pendingClaims.filter(c => {
    if (filter === 'All') return true;
    return c.status === filter;
  });

  const pendingCount = pendingClaims.filter(c => c.status === 'Pending').length;

  const handleConfirmReject = (claimId: string) => {
    rejectPaymentClaim(claimId, rejectReason);
    setRejectingClaimId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-5">
      {/* Header & Status Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b theme-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight theme-text-main">
              Pending Member Payments
            </h1>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs theme-text-muted mt-0.5">
            Submissions made by club members after sending dues via bKash, CellFin, or Bank AC.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 theme-input p-1 rounded-lg text-xs self-start sm:self-auto">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === tab 
                  ? 'bg-emerald-600 text-white font-medium' 
                  : 'theme-text-muted hover:theme-text-main'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* View-Only Banner for Non-Super Admins */}
      {!isSuperAdmin && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              <strong>View-Only Admin Mode:</strong> You are signed in as {currentAdminUser?.name || 'Admin'} ({currentAdminUser?.designation || 'Observer'}). Verification and approvals can only be performed by the <strong>Treasurer (Super Admin)</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="theme-card p-12 text-center rounded-xl space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-base font-bold">
            ✓
          </div>
          <div className="text-sm font-semibold theme-text-main">
            No {filter !== 'All' ? filter.toLowerCase() : ''} payment claims found
          </div>
          <div className="text-xs theme-text-muted max-w-sm mx-auto">
            When members submit payment references through the Member Portal, they will appear here for verification.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim: PendingPaymentClaim) => {
            const isPending = claim.status === 'Pending';
            const isApproved = claim.status === 'Approved';
            const isRejected = claim.status === 'Rejected';

            return (
              <div 
                key={claim.id} 
                className={`theme-card p-4 sm:p-5 rounded-xl transition-all border ${
                  isPending ? 'border-amber-500/40 shadow-xs' : 'theme-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Member & Payment Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm theme-text-main">
                        {claim.memberName}
                      </span>
                      <span className="text-xs font-mono theme-text-muted">
                        ({claim.memberMobile})
                      </span>
                      <span className="text-xs theme-text-muted">·</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {claim.monthLabel}
                      </span>
                      {claim.monthKeys && claim.monthKeys.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400">
                          {claim.monthKeys.length} Months
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        isPending 
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                          : isApproved 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {claim.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs theme-text-muted">
                      <span>Method: <strong className="theme-text-main">{claim.paymentMethod}</strong></span>
                      {claim.trxId && (
                        <span>Trx ID / Ref: <strong className="font-mono theme-text-main">{claim.trxId}</strong></span>
                      )}
                      <span>Submitted: {new Date(claim.submittedAt).toLocaleDateString()}</span>
                    </div>

                    {claim.monthKeys && claim.monthKeys.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">Covers {claim.monthKeys.length} Months:</span>
                        {claim.monthKeys.map((mk, idx) => (
                          <span key={mk} className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                            {claim.monthLabels && claim.monthLabels[idx] ? claim.monthLabels[idx] : mk} (৳{Math.round(claim.amount / claim.monthKeys!.length).toLocaleString()})
                          </span>
                        ))}
                      </div>
                    )}

                    {claim.notes && (
                      <div className="text-xs italic theme-text-muted bg-black/5 dark:bg-white/5 p-2 rounded-lg max-w-xl">
                        "{claim.notes}"
                      </div>
                    )}

                    {isApproved && claim.reviewedBy && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Approved by {claim.reviewedBy} on {claim.reviewedAt ? new Date(claim.reviewedAt).toLocaleDateString() : ''} · Credited to member ledger
                      </div>
                    )}

                    {isRejected && (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        ✕ Rejected: {claim.rejectionReason || 'Verification failed'}
                      </div>
                    )}
                  </div>

                  {/* Right: Amount & Action Buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 theme-border">
                    <div className="text-right">
                      <div className="text-xs theme-text-muted">Claimed Amount</div>
                      <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ৳{claim.amount.toLocaleString()}
                      </div>
                    </div>

                    {/* Super Admin Verification Actions */}
                    {isPending && (
                      <div className="flex items-center gap-2">
                        {isSuperAdmin ? (
                          <>
                            <button
                              onClick={() => setRejectingClaimId(claim.id)}
                              className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => approvePaymentClaim(claim.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <span>✓</span>
                              <span>Approve & Credit</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs italic theme-text-muted">
                            Super Admin approval required
                          </span>
                        )}
                      </div>
                    )}

                    {/* Delete Claim Button for Super Admin */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Permanently remove payment claim from ${claim.memberName}?`)) {
                            deletePaymentClaim(claim.id);
                          }
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer pt-0.5 hover:underline"
                        title="Permanently remove this claim"
                      >
                        Delete Record
                      </button>
                    )}
                  </div>
                </div>

                {/* Reject Reason Form Inline */}
                {rejectingClaimId === claim.id && (
                  <div className="mt-3 pt-3 border-t theme-border space-y-2">
                    <label className="block text-xs font-medium theme-text-main">
                      Rejection Reason (will be shown to member):
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Transaction ID not found in bank statement"
                      className="theme-input w-full px-3 py-1.5 text-xs rounded-lg"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRejectingClaimId(null)}
                        className="px-3 py-1 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmReject(claim.id)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
