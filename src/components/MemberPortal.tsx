import React, { useState, useMemo, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { PaymentMethod, MonthKey } from '../types';
import { MemberActivityLog } from './MemberActivityLog';
import { 
  getMemberPaymentPeriodOptions, 
  getCurrentDateString, 
  compareMonthKeys,
  OFFICIAL_CLUB_NAME 
} from '../services/paymentDueManager';

export const MemberPortal: React.FC = () => {
  const { 
    currentMemberUser, 
    memberLogout, 
    monthlyPayments, 
    summary, 
    investments,
    investment, 
    expenses, 
    feeCollections, 
    months, 
    pendingClaims, 
    submitPaymentClaim,
    theme,
    setTheme
  } = useClub();

  // Tab mode within Member Portal: 'activity' (default) | 'ledger' | 'notices' | 'treasury'
  const [portalTab, setPortalTab] = useState<'activity' | 'ledger' | 'notices' | 'treasury'>('activity');

  // Dynamic payment period data generated from actual ledger and calendar status
  const periodData = useMemo(() => {
    if (!currentMemberUser) return null;
    return getMemberPaymentPeriodOptions(currentMemberUser, months, monthlyPayments, pendingClaims);
  }, [currentMemberUser, months, monthlyPayments, pendingClaims]);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  // Support multiple months payment claim simultaneously
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<MonthKey[]>(['2026-09']);
  const selectedMonthKey = selectedMonthKeys[0] || '2026-09';
  const setSelectedMonthKey = (key: MonthKey) => {
    setSelectedMonthKeys([key]);
    const opt = periodData?.options.find(o => o.monthKey === key);
    if (opt) {
      setAmount(opt.amountDue > 0 ? opt.amountDue : (currentMemberUser?.units || 1) * 1000);
    }
  };
  const [paymentDate, setPaymentDate] = useState<string>(getCurrentDateString());
  const [amount, setAmount] = useState<number>((currentMemberUser?.units || 1) * 1000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bkash');
  const [trxId, setTrxId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Sync recommended or overdue months when modal opens or period data changes
  useEffect(() => {
    if (periodData && isSubmitModalOpen) {
      const overdueKeys = periodData.options
        .filter(o => o.category === 'overdue' && o.canSelect)
        .map(o => o.monthKey);
      const initialKeys = overdueKeys.length > 0 ? overdueKeys : [periodData.recommendedMonthKey];
      setSelectedMonthKeys(initialKeys);

      const targetAmount = initialKeys.reduce((sum, mk) => {
        const opt = periodData.options.find(o => o.monthKey === mk);
        return sum + (opt && opt.amountDue > 0 ? opt.amountDue : (currentMemberUser?.units || 1) * 1000);
      }, 0);
      setAmount(targetAmount);
      setPaymentDate(getCurrentDateString());
    }
  }, [isSubmitModalOpen, periodData, currentMemberUser?.units]);

  // Toggle month selection on/off for multi-month payment
  const toggleMonth = (mKey: MonthKey) => {
    const opt = periodData?.options.find(o => o.monthKey === mKey);
    if (opt && !opt.canSelect) return;

    setSelectedMonthKeys(prev => {
      let nextKeys: MonthKey[];
      if (prev.includes(mKey)) {
        if (prev.length <= 1) {
          return prev; // keep at least 1 month selected
        }
        nextKeys = prev.filter(k => k !== mKey);
      } else {
        nextKeys = [...prev, mKey].sort(compareMonthKeys);
      }

      const targetAmount = nextKeys.reduce((sum, mk) => {
        const o = periodData?.options.find(item => item.monthKey === mk);
        return sum + (o && o.amountDue > 0 ? o.amountDue : (currentMemberUser?.units || 1) * 1000);
      }, 0);
      setAmount(targetAmount);

      return nextKeys;
    });
  };

  const handleSelectAllDue = () => {
    if (!periodData) return;
    const dueKeys = periodData.options
      .filter(o => (o.category === 'overdue' || o.isCurrent) && o.canSelect)
      .map(o => o.monthKey);
    if (dueKeys.length > 0) {
      setSelectedMonthKeys(dueKeys);
      const targetAmount = dueKeys.reduce((sum, mk) => {
        const o = periodData.options.find(item => item.monthKey === mk);
        return sum + (o && o.amountDue > 0 ? o.amountDue : (currentMemberUser?.units || 1) * 1000);
      }, 0);
      setAmount(targetAmount);
    }
  };

  if (!currentMemberUser) {
    return null;
  }

  // Active ledger months filter (strictly sync with ledger)
  const activeMonthKeys = useMemo(() => new Set(months.map(m => m.key)), [months]);

  // Filter ONLY this member's payment records strictly for active ledger months
  const myPayments = useMemo(() => {
    return monthlyPayments
      .filter(p => p.memberId === currentMemberUser.id && activeMonthKeys.has(p.monthKey))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [monthlyPayments, currentMemberUser.id, activeMonthKeys]);

  // Filter ONLY this member's submitted claims strictly for active ledger months
  const myClaims = useMemo(() => {
    return pendingClaims.filter(c => 
      c.memberId === currentMemberUser.id && 
      (activeMonthKeys.has(c.monthKey) || (c.monthKeys && c.monthKeys.some(mk => activeMonthKeys.has(mk))))
    );
  }, [pendingClaims, currentMemberUser.id, activeMonthKeys]);

  // Financial summary for this member
  const totalPaid = myPayments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + (Number(p.amountPaid) > 0 ? Number(p.amountPaid) : Number(p.amountExpected) || 0), 0);

  const totalDue = currentMemberUser.totalDueAmount;
  const monthlyRate = currentMemberUser.units * 1000;

  // Unpaid months for this member strictly from active ledger months
  const dueMonths = myPayments.filter(p => p.status === 'Due');

  // Expenses covered by membership fees
  const operationalExpenses = expenses;
  const totalFeeCollected = summary.totalFeeCollected;
  const totalExpensesAmount = summary.totalExpenses;
  const feeBalance = summary.feeBalance;

  // Projected return for this member dynamically based on all active ventures set by Admin
  const activeVentures = useMemo(() => investments.filter(inv => inv.status === 'Active'), [investments]);
  const totalActiveVentureProfit = summary.expectedVentureProfit;
  const perUnitProfit = summary.totalActiveUnits > 0 
    ? totalActiveVentureProfit / summary.totalActiveUnits 
    : 0;
  const myExpectedShareProfit = perUnitProfit * currentMemberUser.units;

  const totalActiveMinProfit = useMemo(() => {
    return activeVentures.reduce((sum, v) => {
      if (v.profitMode === 'range' && v.minProfit !== undefined) return sum + v.minProfit;
      if (v.minRoiPercent !== undefined) return sum + (v.principalAmount * v.minRoiPercent) / 100;
      return sum + v.expectedProfit;
    }, 0);
  }, [activeVentures]);

  const totalActiveMaxProfit = useMemo(() => {
    return activeVentures.reduce((sum, v) => {
      if (v.profitMode === 'range' && v.maxProfit !== undefined) return sum + v.maxProfit;
      if (v.maxRoiPercent !== undefined) return sum + (v.principalAmount * v.maxRoiPercent) / 100;
      return sum + v.expectedProfit;
    }, 0);
  }, [activeVentures]);

  const perUnitMinProfit = (summary.totalActiveUnits || 35) > 0 ? totalActiveMinProfit / (summary.totalActiveUnits || 35) : 0;
  const perUnitMaxProfit = (summary.totalActiveUnits || 35) > 0 ? totalActiveMaxProfit / (summary.totalActiveUnits || 35) : 0;

  const myMinShareProfit = Math.round(perUnitMinProfit * currentMemberUser.units);
  const myMaxShareProfit = Math.round(perUnitMaxProfit * currentMemberUser.units);
  const hasShareRange = myMinShareProfit !== myMaxShareProfit && activeVentures.length > 0;

  const handleSubmitPaymentNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonthKeys.length === 0) return;

    // Check all selected options can be submitted
    const selectedOptions = selectedMonthKeys.map(mk => periodData?.options.find(o => o.monthKey === mk));
    if (selectedOptions.some(opt => opt && !opt.canSelect)) {
      return;
    }

    const sortedKeys = [...selectedMonthKeys].sort(compareMonthKeys);
    const labels = sortedKeys.map(mk => {
      const opt = periodData?.options.find(o => o.monthKey === mk);
      return opt ? opt.monthLabel : mk;
    });

    const monthLabel = labels.length === 1 
      ? labels[0] 
      : `${labels.join(', ')} (${labels.length} months)`;

    submitPaymentClaim({
      memberId: currentMemberUser.id,
      memberName: currentMemberUser.name,
      memberMobile: currentMemberUser.contactNumber,
      monthKey: sortedKeys[0],
      monthKeys: sortedKeys,
      monthLabel,
      monthLabels: labels,
      units: currentMemberUser.units,
      amount: Number(amount) || (monthlyRate * sortedKeys.length),
      paymentMethod,
      paymentDate: paymentDate || getCurrentDateString(),
      payment_date: paymentDate || getCurrentDateString(),
      trxId: trxId.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setIsSubmitModalOpen(false);
      setTrxId('');
      setNotes('');
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col theme-container">
      
      {/* Member Portal Top Navigation */}
      <header className="sticky top-0 z-40 theme-header backdrop-blur-md border-b theme-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <div>
              <span className="font-bold text-sm theme-text-main">{OFFICIAL_CLUB_NAME}</span>
              <span className="text-[11px] theme-text-muted ml-2 font-mono">Member Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs theme-text-muted hidden sm:inline">
              <strong className="theme-text-main">{currentMemberUser.name}</strong> ({currentMemberUser.units} {currentMemberUser.units === 1 ? 'unit' : 'units'})
            </span>

            <button
              onClick={() => setTheme(theme === 'dark' || theme === 'midnight' ? 'light' : 'midnight')}
              className="px-2.5 py-1 rounded-lg theme-input text-xs cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' || theme === 'midnight' ? 'Light' : 'Dark'}
            </button>

            <button
              onClick={memberLogout}
              className="px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Member Profile Bar */}
        <div className="theme-card p-5 sm:p-6 rounded-2xl border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-base flex items-center justify-center shrink-0">
              {currentMemberUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h1 className="text-lg font-bold theme-text-main">
                {currentMemberUser.name}
              </h1>
              <div className="text-xs theme-text-muted flex flex-wrap items-center gap-2 mt-0.5">
                <span>{currentMemberUser.units} {currentMemberUser.units === 1 ? 'Unit' : 'Units'} (৳{monthlyRate.toLocaleString()}/mo)</span>
                <span>·</span>
                <span className="font-mono">{currentMemberUser.contactNumber}</span>
                <span>·</span>
                <span>Blood: {currentMemberUser.bloodGroup}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (dueMonths.length > 0) {
                setSelectedMonthKey(dueMonths[0].monthKey);
              }
              setIsSubmitModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <span>+</span>
            <span>Submit Payment Notice</span>
          </button>
        </div>

        {/* 1. Member's Personal Financial Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          
          <div className="theme-card p-4 rounded-xl border theme-border">
            <div className="text-xs theme-text-muted font-medium">Total Deposited</div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              ৳{totalPaid.toLocaleString()}
            </div>
            <div className="text-[11px] theme-text-muted mt-1">
              Deposited to date
            </div>
          </div>

          <div className="theme-card p-4 rounded-xl border theme-border">
            <div className="text-xs theme-text-muted font-medium">Pending Dues</div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono mt-1 tabular-nums ${
              totalDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'theme-text-main'
            }`}>
              ৳{totalDue.toLocaleString()}
            </div>
            <div className="text-[11px] theme-text-muted mt-1">
              {currentMemberUser.monthsPending === 0 ? 'All cleared' : `${currentMemberUser.monthsPending} month(s) pending`}
            </div>
          </div>

          <div className="theme-card p-4 rounded-xl border theme-border">
            <div className="text-xs theme-text-muted font-medium">Projected Profit</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {activeVentures.length === 0 ? (
                '+৳0'
              ) : hasShareRange ? (
                `+৳${myMinShareProfit.toLocaleString()} – ৳${myMaxShareProfit.toLocaleString()}`
              ) : (
                `+৳${Math.round(myExpectedShareProfit).toLocaleString()}`
              )}
            </div>
            <div className="text-[11px] theme-text-muted mt-1">
              {activeVentures.length === 0 ? 'No active ventures' : hasShareRange ? 'Estimated ROI range' : 'From active ventures'}
            </div>
          </div>

        </div>

        {/* Member Portal Section Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl theme-card border theme-border text-xs">
          <button
            onClick={() => setPortalTab('activity')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              portalTab === 'activity'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Activity Log
          </button>

          <button
            onClick={() => setPortalTab('ledger')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              portalTab === 'ledger'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Ledger
          </button>

          <button
            onClick={() => setPortalTab('notices')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              portalTab === 'notices'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>Notices</span>
            {myClaims.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-emerald-500/20 text-emerald-400">
                {myClaims.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setPortalTab('treasury')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              portalTab === 'treasury'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Club Treasury
          </button>
        </div>

        {/* TAB 1: MEMBER-SPECIFIC ACTIVITY LOG (Read-Only) */}
        {portalTab === 'activity' && (
          <MemberActivityLog
            member={currentMemberUser}
            monthlyPayments={monthlyPayments}
            pendingClaims={pendingClaims}
            feeCollections={feeCollections}
            months={months}
            onOpenSubmitNotice={() => {
              if (dueMonths.length > 0) {
                setSelectedMonthKey(dueMonths[0].monthKey);
              }
              setIsSubmitModalOpen(true);
            }}
          />
        )}

        {/* TAB 2: MONTHLY SUBSCRIPTION LEDGER */}
        {portalTab === 'ledger' && (
          <div className="theme-card p-5 rounded-2xl border theme-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h2 className="text-sm font-bold theme-text-main">
                Monthly Subscription Ledger
              </h2>
              <span className="text-[11px] theme-text-muted font-mono">
                {myPayments.filter(p => p.status === 'Paid').length} of {myPayments.length} Paid
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b theme-border text-xs theme-text-muted">
                    <th className="py-2.5 font-medium">Month</th>
                    <th className="py-2.5 font-medium">Target</th>
                    <th className="py-2.5 font-medium">Paid</th>
                    <th className="py-2.5 font-medium">Status</th>
                    <th className="py-2.5 font-medium">Payment Date</th>
                    <th className="py-2.5 font-medium">Method</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {myPayments.map(p => {
                    const isPaid = p.status === 'Paid';
                    const isDue = p.status === 'Due';

                    return (
                      <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 font-semibold theme-text-main">
                          {p.monthLabel}
                        </td>
                        <td className="py-3 font-mono theme-text-muted tabular-nums">
                          ৳{p.amountExpected.toLocaleString()}
                        </td>
                        <td className="py-3 font-mono font-semibold tabular-nums theme-text-main">
                          ৳{p.amountPaid.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            isPaid 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : isDue 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                              : 'bg-slate-500/15 theme-text-muted'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-xs theme-text-muted font-mono">
                          {p.paymentDate || '—'}
                        </td>
                        <td className="py-3 text-xs theme-text-muted">
                          {p.paymentMethod || '—'}
                        </td>
                        <td className="py-3 text-right">
                          {isDue && (
                            <button
                              onClick={() => {
                                setSelectedMonthKey(p.monthKey);
                                setAmount(p.amountExpected);
                                setIsSubmitModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              Submit Notice →
                            </button>
                          )}
                          {isPaid && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SUBMITTED PAYMENT NOTICES */}
        {portalTab === 'notices' && (
          <div className="theme-card p-5 rounded-2xl border theme-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h2 className="text-sm font-bold theme-text-main">
                Payment Submission Notices ({myClaims.length})
              </h2>
              <button
                onClick={() => {
                  if (dueMonths.length > 0) {
                    setSelectedMonthKey(dueMonths[0].monthKey);
                  }
                  setIsSubmitModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                + New Notice
              </button>
            </div>

            {myClaims.length === 0 ? (
              <div className="p-8 text-center theme-text-muted text-xs">
                You have not submitted any payment notices yet.
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {myClaims.map(claim => {
                  const isPending = claim.status === 'Pending';
                  const isApproved = claim.status === 'Approved';

                  return (
                    <div key={claim.id} className="p-3.5 rounded-xl border theme-border theme-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold theme-text-main">{claim.monthLabel}</span>
                          {claim.monthKeys && claim.monthKeys.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-600 dark:text-sky-400">
                              {claim.monthKeys.length} Months
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            isPending 
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                              : isApproved 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <div className="text-[11px] theme-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Method: {claim.paymentMethod}</span>
                          {claim.trxId && <span>· Trx ID: <strong className="font-mono">{claim.trxId}</strong></span>}
                          <span>· Submitted: {new Date(claim.submittedAt).toLocaleDateString()}</span>
                        </div>
                        {isApproved && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            ✓ Verified by Treasurer & credited to your ledger
                          </div>
                        )}
                        {claim.status === 'Rejected' && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                            ✕ {claim.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums self-start sm:self-auto">
                        ৳{claim.amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CLUB TREASURY & FUND DEPLOYMENT */}
        {portalTab === 'treasury' && (
          <div className="space-y-5">
            {/* Where Club Funds Have Been Invested & Total Club Funds */}
            <div className="theme-card p-5 rounded-2xl border theme-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b theme-border gap-1">
                <h2 className="text-sm font-bold theme-text-main">
                  Club Treasury & Investment Overview
                </h2>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold self-start sm:self-auto">
                  Total Capital: ৳{summary.totalClubFunds.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">Central Liquid Reserves</span>
                  <span className="text-lg font-bold font-mono theme-text-main mt-0.5 block tabular-nums">
                    ৳{summary.liquidReserves.toLocaleString()}
                  </span>
                  <span className="text-[10px] theme-text-muted">Available in club bank accounts</span>
                </div>

                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">Deployed in Business Venture</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                    ৳{summary.investedFunds.toLocaleString()}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    {activeVentures.length === 1 
                      ? `Partner: ${activeVentures[0].partnerOrVenture}` 
                      : activeVentures.length > 1 
                      ? `${activeVentures.length} Active Projects` 
                      : 'No active deployment'}
                  </span>
                </div>

                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">Expected Venture Profit</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                    +৳{summary.expectedVentureProfit.toLocaleString()}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    {activeVentures.length === 1 && activeVentures[0].maturityDate 
                      ? `Maturity: ${activeVentures[0].maturityDate}`
                      : activeVentures.length > 1
                      ? `Total Return: ৳${(summary.investedFunds + summary.expectedVentureProfit).toLocaleString()}`
                      : 'Awaiting deployment'}
                  </span>
                </div>
              </div>

              {/* Active Business Ventures List (Live sync with Admin Tracker) */}
              {activeVentures.length > 0 ? (
                <div className="space-y-2 pt-2 border-t theme-border">
                  <span className="text-[11px] font-semibold theme-text-muted block uppercase tracking-wider">
                    Active Deployed Ventures ({activeVentures.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeVentures.map(v => (
                      <div key={v.id} className="p-3 rounded-xl border theme-border theme-card-subtle flex flex-col justify-between text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold theme-text-main text-xs">{v.title}</div>
                            <div className="text-[11px] theme-text-muted">Partner: {v.partnerOrVenture}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t theme-border font-mono">
                          <span className="theme-text-muted">Deployed: ৳{v.principalAmount.toLocaleString()}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {v.profitMode === 'range' && v.minProfit !== undefined && v.maxProfit !== undefined && v.minProfit !== v.maxProfit
                              ? `+৳${v.minProfit.toLocaleString()} – ৳${v.maxProfit.toLocaleString()} (${v.minRoiPercent}%–${v.maxRoiPercent}%)`
                              : `+৳${v.expectedProfit.toLocaleString()} profit`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border theme-border text-center text-xs theme-text-muted">
                  No business ventures are currently deployed. All funds are preserved in liquid bank reserves.
                </div>
              )}
            </div>

            {/* Breakdown of Expenses Covered by Membership Fees */}
            <div className="theme-card p-5 rounded-2xl border theme-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b theme-border gap-1">
                <h2 className="text-sm font-bold theme-text-main">
                  Membership Fees & Operating Expenses
                </h2>
                <div className="text-[11px] font-mono text-right">
                  <span className="theme-text-muted">Fee Pool: </span>
                  <strong className="theme-text-main">৳{totalFeeCollected.toLocaleString()}</strong>
                  <span className="theme-text-muted"> · Spent: </span>
                  <strong className="text-rose-500">৳{totalExpensesAmount.toLocaleString()}</strong>
                  <span className="theme-text-muted"> · Net: </span>
                  <strong className="text-emerald-500">৳{feeBalance.toLocaleString()}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b theme-border text-xs theme-text-muted">
                      <th className="py-2 font-medium">Expense Item</th>
                      <th className="py-2 font-medium">Category</th>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {operationalExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 font-medium theme-text-main">{exp.title}</td>
                        <td className="py-2.5 theme-text-muted">{exp.category}</td>
                        <td className="py-2.5 font-mono theme-text-muted">{exp.date}</td>
                        <td className="py-2.5 font-mono font-semibold text-right theme-text-main tabular-nums">
                          ৳{exp.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Member Portal Footer */}
      <footer className="border-t theme-border py-3 text-xs theme-text-muted mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-[11px]">
          {OFFICIAL_CLUB_NAME} Member Portal · Session 2025–2026
        </div>
      </footer>

      {/* Submit Payment Notice Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border theme-border overflow-hidden">
            
            <div className="p-3.5 sm:p-4 border-b theme-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm theme-text-main">
                  Submit Payment Notice
                </h3>
                <p className="text-[11px] theme-text-muted mt-0.5">
                  Record and notify the Treasurer of your subscription deposit
                </p>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center theme-text-muted hover:theme-text-main cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center mx-auto text-lg">
                  ✓
                </div>
                <div className="font-bold text-sm theme-text-main">
                  Payment Notice Submitted!
                </div>
                <p className="text-xs theme-text-muted">
                  Your deposit details have been recorded with submission date {paymentDate} and forwarded to the Treasurer for verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPaymentNotice} className="p-3.5 sm:p-4 space-y-3 text-xs overflow-y-auto flex-1">
                
                {/* 1. Dynamic Data-Driven Payment Month Selector (Single & Multiple Months) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="theme-text-muted font-medium flex items-center gap-1.5">
                      <span>Select Month(s)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {periodData && periodData.overdueCount > 0 && (
                        <span className="text-[10px] text-amber-500 font-medium">
                          {periodData.overdueCount} {periodData.overdueCount === 1 ? 'month' : 'months'} due
                        </span>
                      )}
                      {periodData && periodData.options.filter(o => (o.category === 'overdue' || o.isCurrent) && o.canSelect).length > 1 && (
                        <button
                          type="button"
                          onClick={handleSelectAllDue}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
                          title="Select all overdue and current months at once"
                        >
                          Select All Due
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Dropdown selector */}
                  <select
                    value={selectedMonthKeys.length === 1 ? selectedMonthKeys[0] : ""}
                    onChange={e => {
                      const newKey = e.target.value as MonthKey;
                      if (newKey && !selectedMonthKeys.includes(newKey)) {
                        toggleMonth(newKey);
                      }
                    }}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="" disabled>
                      {selectedMonthKeys.length > 1 
                        ? `Add / toggle another month (${selectedMonthKeys.length} selected)...`
                        : 'Select month...'}
                    </option>

                    {/* Overdue months */}
                    {periodData?.options.filter(o => o.category === 'overdue').length ? (
                      <optgroup label="⚠️ Overdue Months">
                        {periodData.options.filter(o => o.category === 'overdue').map(o => (
                          <option key={o.monthKey} value={o.monthKey}>
                            {selectedMonthKeys.includes(o.monthKey) ? '✓ ' : ''}{o.monthLabel} (৳{o.amountDue.toLocaleString()} Due)
                          </option>
                        ))}
                      </optgroup>
                    ) : null}

                    {/* Current calendar month */}
                    {periodData?.options.filter(o => o.isCurrent).map(o => (
                      <optgroup key="current-group" label="📅 Current Month">
                        <option 
                          key={o.monthKey} 
                          value={o.monthKey} 
                          disabled={!o.canSelect}
                        >
                          {selectedMonthKeys.includes(o.monthKey) ? '✓ ' : ''}{o.monthLabel} {o.isPaid ? '— Paid ✓' : o.isPendingApproval ? '— Under Review ⏳' : `(৳${o.amountDue.toLocaleString()} Due)`}
                        </option>
                      </optgroup>
                    ))}

                    {/* Advance / Future months */}
                    {periodData?.options.filter(o => o.isFuture && !o.isPaid && !o.isPendingApproval).length ? (
                      <optgroup label="⏩ Advance Payment">
                        {periodData.options.filter(o => o.isFuture && !o.isPaid && !o.isPendingApproval).map(o => (
                          <option key={o.monthKey} value={o.monthKey}>
                            {selectedMonthKeys.includes(o.monthKey) ? '✓ ' : ''}{o.monthLabel} (৳{o.amountExpected.toLocaleString()})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}

                    {/* Settled / Already paid months */}
                    {periodData?.options.filter(o => o.isPaid && !o.isCurrent).length ? (
                      <optgroup label="✓ Settled Months">
                        {periodData.options.filter(o => o.isPaid && !o.isCurrent).map(o => (
                          <option key={o.monthKey} value={o.monthKey} disabled>
                            {o.monthLabel} — Paid ✓
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>

                  {/* Selected Month Badges with Remove Option */}
                  {selectedMonthKeys.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="text-[10px] font-medium theme-text-muted">Selected ({selectedMonthKeys.length}):</span>
                      {selectedMonthKeys.map(mk => {
                        const opt = periodData?.options.find(o => o.monthKey === mk);
                        const label = opt ? opt.monthLabel : mk;
                        return (
                          <span
                            key={mk}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          >
                            <span>{label}</span>
                            {selectedMonthKeys.length > 1 && (
                              <button
                                type="button"
                                onClick={() => toggleMonth(mk)}
                                className="hover:text-rose-500 text-[10px] ml-0.5 cursor-pointer font-bold leading-none"
                                title={`Remove ${label}`}
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Interactive Multi-Month Checkbox Grid */}
                  <div className="mt-1.5 p-2 rounded-xl border theme-border theme-card-subtle space-y-1">
                    <div className="text-[10px] font-medium theme-text-muted flex items-center justify-between">
                      <span>Tap to toggle months:</span>
                      <span className="font-mono text-[10px]">{currentMemberUser.units} {currentMemberUser.units === 1 ? 'unit' : 'units'} (৳{monthlyRate.toLocaleString()}/mo)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-32 sm:max-h-36 overflow-y-auto pr-1">
                      {periodData?.options.map(opt => {
                        const isSelected = selectedMonthKeys.includes(opt.monthKey);
                        const monthDue = opt.amountDue > 0 ? opt.amountDue : monthlyRate;
                        return (
                          <button
                            key={opt.monthKey}
                            type="button"
                            disabled={!opt.canSelect}
                            onClick={() => toggleMonth(opt.monthKey)}
                            className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                              !opt.canSelect
                                ? 'opacity-50 cursor-not-allowed bg-slate-500/5 border-slate-500/15'
                                : isSelected
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                                : 'hover:bg-slate-500/10 border-slate-500/20 theme-text-main'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!opt.canSelect}
                                onChange={() => {}}
                                className="rounded text-emerald-600 focus:ring-0 pointer-events-none w-3.5 h-3.5"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-[11px] truncate">{opt.monthLabel}</div>
                                <div className="text-[9px]">
                                  {opt.category === 'overdue' && <span className="text-amber-500 font-medium">Overdue</span>}
                                  {opt.isCurrent && <span className="text-emerald-500 font-medium">Current</span>}
                                  {opt.isFuture && !opt.isPaid && <span className="text-sky-400 font-medium">Advance</span>}
                                  {opt.isPaid && <span className="text-emerald-400 font-medium">Settled ✓</span>}
                                  {opt.isPendingApproval && <span className="text-amber-400 font-medium">Review ⏳</span>}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[11px] shrink-0 tabular-nums ml-1">
                              ৳{monthDue.toLocaleString()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected Month Status & Breakdown Badge */}
                {(() => {
                  if (selectedMonthKeys.length === 0) return null;

                  if (selectedMonthKeys.length === 1) {
                    const sel = periodData?.options.find(o => o.monthKey === selectedMonthKeys[0]);
                    if (!sel) return null;

                    return (
                      <div className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between ${
                        sel.category === 'overdue'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                          : sel.isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                          : sel.isFuture && !sel.isPaid
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200'
                          : 'bg-slate-500/10 border-slate-500/25 theme-text-muted'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold theme-text-main text-xs">{sel.monthLabel}</span>
                          {sel.category === 'overdue' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-500">
                              Overdue
                            </span>
                          )}
                          {sel.isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
                              Current
                            </span>
                          )}
                          {sel.isFuture && !sel.isPaid && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-400">
                              Advance
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-xs theme-text-main tabular-nums ml-2">
                          ৳{sel.amountExpected.toLocaleString()}
                        </span>
                      </div>
                    );
                  }

                  // Multiple months selected breakdown
                  const totalExpected = selectedMonthKeys.reduce((sum, mk) => {
                    const opt = periodData?.options.find(o => o.monthKey === mk);
                    return sum + (opt && opt.amountDue > 0 ? opt.amountDue : monthlyRate);
                  }, 0);

                  return (
                    <div className="px-3 py-2 rounded-xl border text-xs flex items-center justify-between bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold theme-text-main text-xs">
                          {selectedMonthKeys.length} Months Selected
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
                          Combined Notice
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs theme-text-main tabular-nums ml-2">
                        Total: ৳{totalExpected.toLocaleString()}
                      </span>
                    </div>
                  );
                })()}

                {/* 2-Column Responsive Grid: Date & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      Actual Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      max={getCurrentDateString()}
                      className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      Amount Paid (BDT)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      min={100}
                      step={100}
                      className="theme-input w-full px-3 py-2 rounded-xl font-mono text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* 2-Column Responsive Grid: Method & Trx ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="theme-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      <option value="Bkash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="CellFin">CellFin</option>
                      <option value="IBBL">IBBL (Islami Bank)</option>
                      <option value="UCB">UCB</option>
                      <option value="PBL">PBL (Pubali Bank)</option>
                      <option value="IIBL">IIBL</option>
                      <option value="CityTouch">CityTouch</option>
                      <option value="Club AC">Club AC</option>
                      <option value="Cash">Cash in Hand</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      Transaction ID / Reference
                    </label>
                    <input
                      type="text"
                      value={trxId}
                      onChange={e => setTrxId(e.target.value)}
                      placeholder="e.g. BK9X2491LA"
                      className="theme-input w-full px-3 py-2 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block theme-text-muted mb-1 font-medium">
                    Notes for Treasurer (Optional)
                  </label>
                  <textarea
                    rows={1}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Sent from personal bKash"
                    className="theme-input w-full px-3 py-1.5 rounded-xl text-xs resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2.5 border-t theme-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                  >
                    Cancel
                  </button>
                  {(() => {
                    const allValid = selectedMonthKeys.length > 0 && selectedMonthKeys.every(mk => {
                      const sel = periodData?.options.find(o => o.monthKey === mk);
                      return sel ? sel.canSelect : true;
                    });
                    const canSubmit = allValid && amount > 0;

                    return (
                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer ${
                          canSubmit
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        Submit Notice ({selectedMonthKeys.length} {selectedMonthKeys.length === 1 ? 'Month' : 'Months'} · ৳{amount.toLocaleString()})
                      </button>
                    );
                  })()}
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
