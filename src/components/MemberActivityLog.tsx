import React, { useState, useMemo } from 'react';
import { Member, MonthlyPayment, PendingPaymentClaim, FeeCollection } from '../types';
import { MonthInfo } from '../context/ClubContext';
import { 
  Language, 
  toBengaliNumber, 
  formatCurrency, 
  translateMonthLabel 
} from '../utils/memberTranslations';

export interface ActivityRecord {
  id: string;
  sourceType: 'monthly_payment' | 'claim_submission' | 'fee_collection' | 'settlement';
  title: string;
  category: 'Monthly Subscription' | 'Payment Notice' | 'Registration Fee' | 'Account Settlement';
  amount: number;
  date: string;
  status: 'Paid' | 'Approved' | 'Pending' | 'Rejected';
  paymentMethod?: string;
  referenceId?: string;
  monthLabel?: string;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  timestamp: number;
  units: number;
}

interface MemberActivityLogProps {
  member: Member;
  monthlyPayments: MonthlyPayment[];
  pendingClaims: PendingPaymentClaim[];
  feeCollections: FeeCollection[];
  months?: MonthInfo[];
  lang?: Language;
  onOpenSubmitNotice?: () => void;
}

export const MemberActivityLog: React.FC<MemberActivityLogProps> = ({
  member,
  monthlyPayments,
  pendingClaims,
  feeCollections,
  months,
  lang = 'bn',
  onOpenSubmitNotice,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'approved' | 'pending' | 'fees'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedReceipt, setSelectedReceipt] = useState<ActivityRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Compile all activity items for this member strictly synced with ledger months
  const allActivities = useMemo<ActivityRecord[]>(() => {
    const list: ActivityRecord[] = [];
    const activeMonthKeys = months && months.length > 0 ? new Set(months.map(m => m.key)) : null;

    // A. Paid Monthly Payments from Ledger (only months active in the ledger)
    const myPaidPayments = monthlyPayments.filter(
      p => p.memberId === member.id && p.status === 'Paid' && (!activeMonthKeys || activeMonthKeys.has(p.monthKey))
    );

    myPaidPayments.forEach(p => {
      const dateStr = p.paymentDate || p.payment_date || '—';
      // Anchor chronologically by the actual ledger month key
      const [year, month] = p.monthKey.split('-').map(Number);
      const time = new Date(year, month - 1, 10).getTime();

      list.push({
        id: `pay-${p.id}`,
        sourceType: 'monthly_payment',
        title: lang === 'bn' 
          ? `${translateMonthLabel(p.monthLabel, lang)} কিস্তির জমা` 
          : `${p.monthLabel} Subscription Payment`,
        category: 'Monthly Subscription',
        amount: p.amountPaid,
        date: dateStr,
        status: 'Paid',
        paymentMethod: p.paymentMethod,
        referenceId: p.receiptNumber,
        monthLabel: p.monthLabel,
        notes: p.notes || (lang === 'bn' ? 'অফিসিয়ালি ক্লাবের মূল লেজারে যুক্ত ও ক্রেডিট করা হয়েছে' : 'Officially recorded and credited to Monie Club master ledger'),
        verifiedBy: lang === 'bn' ? 'ক্লাব ট্রেজারার' : 'Club Treasurer',
        timestamp: time,
        units: p.units,
      });
    });

    // B. Submitted Notices & Claims (only months active in the ledger)
    const myClaims = pendingClaims.filter(
      c => c.memberId === member.id && (
        !activeMonthKeys || 
        activeMonthKeys.has(c.monthKey) || 
        (c.monthKeys && c.monthKeys.some(mk => activeMonthKeys.has(mk)))
      )
    );
    myClaims.forEach(c => {
      const dateStr = c.paymentDate || c.payment_date || (c.submittedAt ? c.submittedAt.split('T')[0] : '2026-09-25');
      let time = c.submittedAt ? new Date(c.submittedAt).getTime() : Date.now();
      if (c.monthKey) {
        const [year, month] = c.monthKey.split('-').map(Number);
        time = new Date(year, month - 1, 11).getTime();
      }

      list.push({
        id: `claim-${c.id}`,
        sourceType: 'claim_submission',
        title: lang === 'bn' 
          ? `${translateMonthLabel(c.monthLabel, lang)} জমার নোটিশ` 
          : `${c.monthLabel} Deposit Notice`,
        category: 'Payment Notice',
        amount: c.amount,
        date: dateStr,
        status: c.status,
        paymentMethod: c.paymentMethod,
        referenceId: c.trxId || `TX-${c.id}`,
        monthLabel: c.monthLabel,
        notes: c.notes,
        verifiedBy: c.reviewedBy || (c.status === 'Approved' ? (lang === 'bn' ? 'ট্রেজারার' : 'Treasurer') : undefined),
        verifiedAt: c.reviewedAt,
        rejectionReason: c.rejectionReason,
        timestamp: time,
        units: c.units,
      });
    });

    // C. Registration / Admin Fee Payments
    const myFees = feeCollections.filter(
      f => f.memberId === member.id && f.status === 'Paid'
    );
    myFees.forEach(f => {
      const dateStr = f.date || '2025-12-30';
      const time = new Date(dateStr).getTime() || Date.now() - 86400000 * 200;

      list.push({
        id: `fee-${f.id}`,
        sourceType: 'fee_collection',
        title: lang === 'bn' ? 'সদস্য ভর্তি ও প্রশাসনিক ফি' : 'Registration & Administrative Fee',
        category: 'Registration Fee',
        amount: f.feeAmount,
        date: dateStr,
        status: 'Paid',
        paymentMethod: f.paymentMethod || 'Cash',
        referenceId: f.receiptNo || `FEE-${f.memberId}`,
        notes: f.notes || (lang === 'bn' ? 'সদস্যপদ কনফার্মেশন ও অফিসিয়াল ডকুমেন্টেশন ফি' : 'Membership confirmation and official documentation fee'),
        verifiedBy: lang === 'bn' ? 'নির্বাহী কমিটি' : 'Executive Committee',
        timestamp: time,
        units: f.units || member.units,
      });
    });

    // D. Inactive Member Settlement Record (if inactive)
    if (member.status === 'Inactive' && member.inactiveDate) {
      const time = new Date(member.inactiveDate).getTime();
      list.push({
        id: `settle-${member.id}`,
        sourceType: 'settlement',
        title: lang === 'bn' ? 'মেম্বারশিপ হিসাব নিকাশ নিষ্পত্তি' : 'Final Membership Settlement & Clearance',
        category: 'Account Settlement',
        amount: 0,
        date: member.inactiveDate,
        status: 'Approved',
        referenceId: `SETTLE-${member.id}`,
        notes: member.leaveReason || (lang === 'bn' ? 'হিসাব সম্পন্ন' : 'Account finalized and settled'),
        verifiedBy: lang === 'bn' ? 'ট্রেজারার ও নির্বাহী কমিটি' : 'Treasurer & Executive Committee',
        timestamp: time,
        units: member.units,
      });
    }

    return list;
  }, [monthlyPayments, pendingClaims, feeCollections, member, months, lang]);

  // 2. Metrics calculated from activities
  const metrics = useMemo(() => {
    const totalPaidDeposits = allActivities
      .filter(a => a.status === 'Paid' && a.sourceType === 'monthly_payment')
      .reduce((sum, a) => sum + a.amount, 0);

    const paidMonthsCount = allActivities.filter(
      a => a.status === 'Paid' && a.sourceType === 'monthly_payment'
    ).length;

    const approvedNoticesCount = allActivities.filter(
      a => a.status === 'Approved' && a.sourceType === 'claim_submission'
    ).length;

    const pendingNoticesCount = allActivities.filter(
      a => a.status === 'Pending' && a.sourceType === 'claim_submission'
    ).length;

    const totalRegFee = allActivities
      .filter(a => a.sourceType === 'fee_collection' && a.status === 'Paid')
      .reduce((sum, a) => sum + a.amount, 0);

    return {
      totalPaidDeposits,
      paidMonthsCount,
      approvedNoticesCount,
      pendingNoticesCount,
      totalRegFee,
    };
  }, [allActivities]);

  // 3. Filtered and Sorted list
  const filteredActivities = useMemo(() => {
    let result = allActivities.filter(item => {
      // Type Filter
      if (filterType === 'paid') {
        if (!(item.status === 'Paid' && item.sourceType === 'monthly_payment')) return false;
      } else if (filterType === 'approved') {
        if (!(item.status === 'Approved' && item.sourceType === 'claim_submission')) return false;
      } else if (filterType === 'pending') {
        if (!(item.status === 'Pending' && item.sourceType === 'claim_submission')) return false;
      } else if (filterType === 'fees') {
        if (item.sourceType !== 'fee_collection') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          item.title.toLowerCase().includes(q) ||
          item.date.includes(q) ||
          (item.referenceId && item.referenceId.toLowerCase().includes(q)) ||
          (item.paymentMethod && item.paymentMethod.toLowerCase().includes(q)) ||
          (item.monthLabel && item.monthLabel.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));

        if (!matches) return false;
      }

      return true;
    });

    // Sort Order
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });

    return result;
  }, [allActivities, filterType, searchQuery, sortOrder]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="theme-card p-5 sm:p-6 rounded-2xl border theme-border space-y-5">
      
      {/* Activity Log Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b theme-border gap-2">
        <div>
          <span className="text-base font-bold theme-text-main">
            Payment & Activity History
          </span>
          <p className="text-xs theme-text-muted mt-0.5">
            Verified monthly contributions, deposit notices, and approved transactions
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenSubmitNotice && (
            <button
              onClick={onOpenSubmitNotice}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span>
              <span>New Notice</span>
            </button>
          )}

          <button
            onClick={handlePrintReceipt}
            className="theme-input px-3 py-1.5 rounded-xl text-xs hover:theme-text-main transition-colors cursor-pointer"
            title="Print your personal transaction statement"
          >
            Print
          </button>
        </div>
      </div>

      {/* 4 Quick Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
          <span className="theme-text-muted block text-[11px]">Settled Payments</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
            ৳{metrics.totalPaidDeposits.toLocaleString()}
          </span>
          <span className="text-[10px] theme-text-muted">{metrics.paidMonthsCount} Months Confirmed</span>
        </div>

        <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
          <span className="theme-text-muted block text-[11px]">Approved Notices</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
            {metrics.approvedNoticesCount}
          </span>
          <span className="text-[10px] theme-text-muted">Verified by Treasurer</span>
        </div>

        <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
          <span className="theme-text-muted block text-[11px]">Pending Verifications</span>
          <span className={`text-lg font-bold font-mono mt-0.5 block tabular-nums ${
            metrics.pendingNoticesCount > 0 ? 'text-amber-500' : 'theme-text-muted'
          }`}>
            {metrics.pendingNoticesCount}
          </span>
          <span className="text-[10px] theme-text-muted">
            {metrics.pendingNoticesCount > 0 ? 'Awaiting treasurer audit' : 'No notices pending'}
          </span>
        </div>

        <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
          <span className="theme-text-muted block text-[11px]">Admission Fee</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
            ৳{metrics.totalRegFee.toLocaleString()}
          </span>
          <span className="text-[10px] theme-text-muted">One-time Registration</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'theme-input theme-text-muted hover:theme-text-main'
            }`}
          >
            All ({allActivities.length})
          </button>

          <button
            onClick={() => setFilterType('paid')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
              filterType === 'paid'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'theme-input theme-text-muted hover:theme-text-main'
            }`}
          >
            Past Payments ({allActivities.filter(a => a.status === 'Paid' && a.sourceType === 'monthly_payment').length})
          </button>

          <button
            onClick={() => setFilterType('approved')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
              filterType === 'approved'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'theme-input theme-text-muted hover:theme-text-main'
            }`}
          >
            Approved ({allActivities.filter(a => a.status === 'Approved' && a.sourceType === 'claim_submission').length})
          </button>

          {metrics.pendingNoticesCount > 0 && (
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
                filterType === 'pending'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'theme-input text-amber-500 hover:text-amber-400'
              }`}
            >
              Pending ({metrics.pendingNoticesCount})
            </button>
          )}

          <button
            onClick={() => setFilterType('fees')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
              filterType === 'fees'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'theme-input theme-text-muted hover:theme-text-main'
            }`}
          >
            Fees ({allActivities.filter(a => a.sourceType === 'fee_collection').length})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="theme-input px-3 py-1.5 rounded-lg text-xs focus:outline-none flex-1 sm:w-44"
          />

          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="theme-input px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline Stream */}
      <div className="space-y-2.5">
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center theme-text-muted text-xs theme-card-subtle rounded-xl border theme-border">
            No transaction or payment activity found matching your criteria.
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isSettledPayment = act.sourceType === 'monthly_payment';
            const isClaimApproved = act.sourceType === 'claim_submission' && act.status === 'Approved';
            const isClaimPending = act.sourceType === 'claim_submission' && act.status === 'Pending';
            const isClaimRejected = act.sourceType === 'claim_submission' && act.status === 'Rejected';
            const isFee = act.sourceType === 'fee_collection';

            return (
              <div
                key={act.id}
                className="p-3.5 sm:p-4 rounded-xl border theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Category Indicator */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 font-mono theme-card-subtle">
                    {isSettledPayment ? '৳' : isClaimApproved ? '✓' : isClaimPending ? '•' : isClaimRejected ? '✕' : '•'}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm theme-text-main">
                        {act.title}
                      </span>

                      {/* Status Badges */}
                      {isSettledPayment && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ✓ Confirmed in Master Ledger
                        </span>
                      )}
                      {isClaimApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                          ✓ Approved by Treasurer
                        </span>
                      )}
                      {isClaimPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          Pending Audit
                        </span>
                      )}
                      {isClaimRejected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                          ✕ Rejected
                        </span>
                      )}
                      {isFee && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                          ✓ Official Fee Paid
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="text-[11px] theme-text-muted mt-1 flex flex-wrap items-center gap-2">
                      <span>Date: <strong className="font-mono">{act.date}</strong></span>
                      {act.paymentMethod && (
                        <>
                          <span>·</span>
                          <span>Method: <strong className="theme-text-main">{act.paymentMethod}</strong></span>
                        </>
                      )}
                      {act.referenceId && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            Ref: <span>{act.referenceId}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(act.id, act.referenceId!);
                              }}
                              className="text-[10px] theme-text-muted hover:theme-text-main cursor-pointer"
                              title="Copy transaction/receipt ID"
                            >
                              {copiedId === act.id ? 'Copied' : 'Copy'}
                            </button>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Additional Notes or Audit Remarks */}
                    {act.notes && (
                      <div className="text-[11px] theme-text-muted mt-1 italic">
                        "{act.notes}"
                      </div>
                    )}
                    {act.rejectionReason && (
                      <div className="text-[11px] text-rose-500 mt-1 font-medium">
                        Reason: {act.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Receipt Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 theme-border">
                  {act.amount > 0 ? (
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ৳{act.amount.toLocaleString()}
                      </span>
                      <span className="text-[10px] theme-text-muted block">
                        BDT
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs theme-text-muted font-mono">Status Event</span>
                  )}

                  <button
                    onClick={() => setSelectedReceipt(act)}
                    className="theme-input px-2.5 py-1 rounded-lg text-[11px] font-medium hover:border-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    View Receipt
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Official Transaction Receipt Modal (Read-Only) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-md rounded-2xl shadow-2xl border theme-border overflow-hidden p-6 space-y-4">
            
            {/* Receipt Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  MC
                </div>
                <div>
                  <h3 className="font-bold text-sm theme-text-main">
                    Monie Club Official Voucher
                  </h3>
                  <p className="text-[10px] theme-text-muted">
                    Confidential Member Payment Record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center theme-text-muted hover:theme-text-main cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Details Box */}
            <div className="p-4 rounded-xl theme-card-subtle border theme-border space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b theme-border">
                <span className="theme-text-muted font-sans">Shareholder Member:</span>
                <span className="font-bold theme-text-main font-sans">{member.name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="theme-text-muted font-sans">Contact Number:</span>
                <span className="theme-text-main">{member.contactNumber}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="theme-text-muted font-sans">Shareholdings:</span>
                <span className="theme-text-main">{selectedReceipt.units} Unit(s)</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="theme-text-muted font-sans">Transaction Item:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-sans">
                  {selectedReceipt.title}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="theme-text-muted font-sans">Effective Date:</span>
                <span className="theme-text-main">{selectedReceipt.date}</span>
              </div>

              {selectedReceipt.paymentMethod && (
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Payment Channel:</span>
                  <span className="theme-text-main font-sans">{selectedReceipt.paymentMethod}</span>
                </div>
              )}

              {selectedReceipt.referenceId && (
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Reference / Trx ID:</span>
                  <span className="theme-text-muted font-bold">{selectedReceipt.referenceId}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t theme-border">
                <span className="theme-text-muted font-sans font-semibold">Total Amount:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ৳{selectedReceipt.amount.toLocaleString()} BDT
                </span>
              </div>
            </div>

            {/* Audit & Verification Footer */}
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>✓</span>
                <span>Verification Audit Status</span>
              </div>
              <p className="theme-text-muted">
                {selectedReceipt.sourceType === 'monthly_payment'
                  ? 'Officially confirmed and settled in the Monie Club Master Google Sheets Ledger.'
                  : selectedReceipt.status === 'Approved'
                  ? 'Verified by Club Treasurer and credited to your personal account balance.'
                  : selectedReceipt.status === 'Pending'
                  ? 'Notice is in review queue for official verification.'
                  : 'Recorded official club transaction.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-3.5 py-1.5 text-xs font-medium theme-input rounded-xl hover:theme-text-main cursor-pointer"
              >
                Print Voucher
              </button>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
