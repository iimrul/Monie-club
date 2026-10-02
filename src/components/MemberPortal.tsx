import { DateField } from './DateField';
import { ClubBrand } from './ClubBrand';
import { Moon, Sun } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useClub } from '../context/ClubContext';
import { PaymentMethod, MonthKey } from '../types';
import { MemberActivityLog } from './MemberActivityLog';
import { getActiveVentureProfitProjection, getVentureProfitProjection } from '../services/treasuryCalculations';
import { 
  getMemberPaymentPeriodOptions, 
  getCurrentDateString, 
  compareMonthKeys,
  getPaymentDisplayState,
  formatLedgerPeriod,
  OFFICIAL_CLUB_NAME 
} from '../services/paymentDueManager';
import { 
  Language, 
  memberTranslations, 
  formatCurrency, 
  toBengaliNumber, 
  translateMonthLabel 
} from '../utils/memberTranslations';

export const MemberPortal: React.FC = () => {
  const { 
    currentMemberUser, 
    memberLogout, 
    monthlyPayments, 
    summary, 
    bankProfits,
    currentMonthKey,
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

  // Language state: Bangla-First UI default with persistence in localStorage
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

  const t = memberTranslations[lang];

  // Tab mode within Member Portal: 'activity' (default) | 'ledger' | 'notices' | 'treasury'
  const [portalTab, setPortalTab] = useState<'activity' | 'ledger' | 'notices' | 'treasury'>('activity');

  // Dynamic payment period data generated from actual ledger and calendar status
  const periodData = useMemo(() => {
    if (!currentMemberUser) return null;
    return getMemberPaymentPeriodOptions(currentMemberUser, months, monthlyPayments, pendingClaims);
  }, [currentMemberUser, months, monthlyPayments, pendingClaims, currentMonthKey]);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  // Support multiple months payment claim simultaneously
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<MonthKey[]>([]);
  const preferredMonthKey = useRef<MonthKey | null>(null);
  const setSelectedMonthKey = (key: MonthKey) => {
    preferredMonthKey.current = key;
    setSelectedMonthKeys([key]);
    const opt = periodData?.options.find(o => o.monthKey === key);
    if (opt) {
      setAmount(opt.amountPayable);
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
      const preferred = periodData.options.find(o => o.monthKey === preferredMonthKey.current && o.canSelect);
      const recommended = periodData.options.find(o => o.monthKey === periodData.recommendedMonthKey && o.canSelect);
      const initialKeys = preferred ? [preferred.monthKey] : overdueKeys.length > 0 ? overdueKeys : recommended ? [recommended.monthKey] : [];
      preferredMonthKey.current = null;
      setSelectedMonthKeys(initialKeys);

      const targetAmount = initialKeys.reduce((sum, mk) => {
        const opt = periodData.options.find(o => o.monthKey === mk);
        return sum + (opt?.amountPayable || 0);
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
        return sum + (o?.amountPayable || 0);
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
        return sum + (o?.amountPayable || 0);
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
  const dueMonths = myPayments.filter(p => ['Due', 'Partial'].includes(getPaymentDisplayState(p)));

  // Expenses covered by membership fees
  const operationalExpenses = expenses;
  const totalFeeCollected = summary.totalFeeCollected;
  const totalExpensesAmount = summary.totalExpenses;
  const feeBalance = summary.feeBalance;

  // Projected return for this member dynamically based on all active ventures set by Admin
  const activeVentures = useMemo(() => investments.filter(inv => inv.status === 'Active'), [investments]);
  const ventureProjection = useMemo(() => getActiveVentureProfitProjection(activeVentures), [activeVentures]);
  const perUnitMinProfit = summary.totalActiveUnits > 0 ? ventureProjection.minProfit / summary.totalActiveUnits : 0;
  const perUnitMaxProfit = summary.totalActiveUnits > 0 ? ventureProjection.maxProfit / summary.totalActiveUnits : 0;

  const myMinShareProfit = Math.round(perUnitMinProfit * currentMemberUser.units);
  const myMaxShareProfit = Math.round(perUnitMaxProfit * currentMemberUser.units);
  const hasShareRange = myMinShareProfit !== myMaxShareProfit && activeVentures.length > 0;
  const projectedProfitLabel = ventureProjection.hasRange
    ? `${formatCurrency(ventureProjection.minProfit, lang)} – ${formatCurrency(ventureProjection.maxProfit, lang)}`
    : formatCurrency(ventureProjection.maxProfit, lang);

  const handleSubmitPaymentNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonthKeys.length === 0) return;

    // Check all selected options can be submitted
    const selectedOptions = selectedMonthKeys.map(mk => periodData?.options.find(o => o.monthKey === mk));
    if (selectedOptions.some(opt => !opt || !opt.canSelect)) {
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
    <div lang={lang} className="member-portal min-h-screen flex flex-col theme-container">

      {/* Member Portal Top Navigation */}
      <header className="sticky top-0 z-40 theme-header backdrop-blur-md border-b theme-border shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 app-topbar">
          <ClubBrand subtitle={t.portalBadge} />

          <div className="app-header-controls">
            <span className="text-xs theme-text-muted hidden lg:inline mr-3">
              <strong className="theme-text-main">{currentMemberUser.name}</strong> ({lang === 'bn' ? toBengaliNumber(currentMemberUser.units) : currentMemberUser.units} {t.unitsLabel})
            </span>

            {/* Language Switcher: Bangla First */}
            <button
              onClick={toggleLanguage}
              className="header-control language-control"
              title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <span className={lang === 'bn' ? 'text-emerald-500 font-bold' : 'theme-text-muted'}>বাং</span>
              <span className="theme-text-muted text-[10px]">/</span>
              <span className={lang === 'en' ? 'text-emerald-500 font-bold' : 'theme-text-muted'}>EN</span>
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' || theme === 'midnight' ? 'light' : 'midnight')}
              className="header-control header-icon-control"
              title="Toggle theme"
              aria-label={theme === 'dark' || theme === 'midnight' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' || theme === 'midnight' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={memberLogout}
              className="header-control signout-control"
              aria-label={t.logout}
            >
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1280px] min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Member Profile Bar */}
        <div className="member-profile theme-card p-5 sm:p-7 rounded-2xl border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">

            <div>
              <p className="eyebrow mb-1">{lang === 'bn' ? 'আপনার সদস্য অ্যাকাউন্ট' : 'Your membership'}</p>
              <h1 className="text-lg font-bold theme-text-main">
                {currentMemberUser.name}
              </h1>
              <div className="text-xs theme-text-muted flex flex-wrap items-center gap-2 mt-0.5">
                <span>{lang === 'bn' ? toBengaliNumber(currentMemberUser.units) : currentMemberUser.units} {t.unitsLabel} ({formatCurrency(monthlyRate, lang)} {t.perMonth})</span>
                <span>·</span>
                <span className="font-mono">{currentMemberUser.contactNumber}</span>
                <span>·</span>
                <span>{t.bloodGroup}: {currentMemberUser.bloodGroup}</span>
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
            className="primary-action px-5 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto"
          >

            <span>{t.submitDepositNotice}</span>
          </button>
        </div>

        {/* 1. Member's Personal Financial Status Cards */}
        <div className="member-metrics grid grid-cols-2 sm:grid-cols-3 gap-4">

          <div className="theme-card p-4 rounded-xl border theme-border">
            <div className="metric-label"><span>{t.totalPaid}</span></div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {formatCurrency(totalPaid, lang)}
            </div>
            <div className="text-[11px] theme-text-muted mt-1">
              {lang === 'bn' ? 'চলতি সময় পর্যন্ত মোট জমা' : 'Deposited to date'}
            </div>
          </div>

          <div className="theme-card p-4 rounded-xl border theme-border">
            <div className="metric-label"><span>{t.totalDue}</span></div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono mt-1 tabular-nums ${
              totalDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'theme-text-main'
            }`}>
              {formatCurrency(totalDue, lang)}
            </div>
            <div className="text-[11px] theme-text-muted mt-1">
              {currentMemberUser.monthsPending === 0 
                ? t.allClear 
                : (lang === 'bn' ? `${toBengaliNumber(currentMemberUser.monthsPending)} মাসের কিস্তি বকেয়া` : `${currentMemberUser.monthsPending} month(s) pending`)}
            </div>
          </div>

          <div className="theme-card p-4 rounded-xl border theme-border">
            <div className="metric-label"><span>{t.ventureShare}</span></div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {activeVentures.length === 0 ? (
                '+৳0'
              ) : hasShareRange ? (
                `+${formatCurrency(myMinShareProfit, lang)} – ${formatCurrency(myMaxShareProfit, lang)}`
              ) : (
                `+${formatCurrency(myMaxShareProfit, lang)}`
              )}
            </div>
            <div className="text-[11px] theme-text-muted mt-1">
              {activeVentures.length === 0 
                ? t.noActiveVenture 
                : hasShareRange 
                ? (lang === 'bn' ? 'চলমান ভেঞ্চার হতে সম্ভাব্য ROI রেঞ্জ' : 'Estimated ROI range') 
                : t.dividendShareNotice}
            </div>
          </div>

        </div>

        {/* Member Portal Section Navigation Tabs */}
        <div className="portal-tabs flex items-center gap-2 p-1.5 rounded-2xl theme-card border theme-border text-xs overflow-x-auto" role="navigation" aria-label={lang === 'bn' ? 'সদস্য পোর্টাল নেভিগেশন' : 'Member portal navigation'}>
          <button
            onClick={() => setPortalTab('activity')}
            aria-current={portalTab === 'activity' ? 'page' : undefined}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              portalTab === 'activity'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t.tabActivity}
          </button>

          <button
            onClick={() => setPortalTab('ledger')}
            aria-current={portalTab === 'ledger' ? 'page' : undefined}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              portalTab === 'ledger'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t.tabLedger}
          </button>

          <button
            onClick={() => setPortalTab('notices')}
            aria-current={portalTab === 'notices' ? 'page' : undefined}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              portalTab === 'notices'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>{t.tabNotices}</span>
            {myClaims.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-emerald-500/20 text-emerald-400">
                {lang === 'bn' ? toBengaliNumber(myClaims.length) : myClaims.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setPortalTab('treasury')}
            aria-current={portalTab === 'treasury' ? 'page' : undefined}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              portalTab === 'treasury'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t.tabTreasury}
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
            lang={lang}
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
                {t.ledgerTitle}
              </h2>
              <span className="text-[11px] theme-text-muted font-mono">
                {lang === 'bn' 
                  ? `${toBengaliNumber(myPayments.filter(p => p.status === 'Paid').length)}টি পরিশোধিত (${toBengaliNumber(myPayments.length)} মাসের মধ্যে)`
                  : `${myPayments.filter(p => p.status === 'Paid').length} of ${myPayments.length} Paid`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead>
                  <tr className="border-b theme-border text-xs theme-text-muted">
                    <th className="py-2.5 font-medium">{t.monthCol}</th>
                    <th className="py-2.5 font-medium">{t.expectedCol}</th>
                    <th className="py-2.5 font-medium">{t.paidCol}</th>
                    <th className="py-2.5 font-medium">{t.statusCol}</th>
                    <th className="py-2.5 font-medium">{t.paymentDateCol}</th>
                    <th className="py-2.5 font-medium">{t.methodCol}</th>
                    <th className="py-2.5 font-medium text-right">{lang === 'bn' ? 'পদক্ষেপ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {myPayments.map(p => {
                    const displayState = getPaymentDisplayState(p);
                    const isPaid = displayState === 'Paid' || displayState === 'Advance Paid';
                    const isDue = displayState === 'Due' || displayState === 'Partial';

                    return (
                      <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 font-semibold theme-text-main">
                          {translateMonthLabel(p.monthLabel, lang)}
                        </td>
                        <td className="py-3 font-mono theme-text-muted tabular-nums">
                          {formatCurrency(p.amountExpected, lang)}
                        </td>
                        <td className="py-3 font-mono font-semibold tabular-nums theme-text-main">
                          {formatCurrency(p.amountPaid, lang)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            isPaid 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : isDue 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                              : 'bg-slate-500/15 theme-text-muted'
                          }`}>
                            {displayState === 'Advance Paid' ? (lang === 'bn' ? 'অগ্রিম পরিশোধিত' : 'Advance Paid') : isPaid ? t.paidBadge : isDue ? t.dueBadge : displayState === 'Upcoming' && lang === 'bn' ? 'আসন্ন' : displayState}
                          </span>
                        </td>
                        <td className="py-3 text-xs theme-text-muted font-mono">
                          {p.amountPaid > 0 && (p.paymentDate || p.payment_date) ? (lang === 'bn' ? toBengaliNumber(p.paymentDate || p.payment_date!) : p.paymentDate || p.payment_date) : '—'}
                        </td>
                        <td className="py-3 text-xs theme-text-muted">
                          {p.amountPaid > 0 ? p.paymentMethod || '—' : '—'}
                        </td>
                        <td className="py-3 text-right">
                          {(isDue || displayState === 'Upcoming') && periodData?.options.find(o => o.monthKey === p.monthKey)?.canSelect && (
                            <button
                              onClick={() => {
                                setSelectedMonthKey(p.monthKey);
                                setAmount(p.amountExpected);
                                setIsSubmitModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              {displayState === 'Upcoming' ? (lang === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Pay in advance') : (lang === 'bn' ? 'নোটিশ দিন' : 'Submit Notice')}
                            </button>
                          )}
                          {isPaid && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              {lang === 'bn' ? '✓ যাচাইকৃত' : '✓ Verified'}
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
                {lang === 'bn' 
                  ? `পেমেন্ট জমার নোটিশ (${toBengaliNumber(myClaims.length)})`
                  : `Payment Submission Notices (${myClaims.length})`}
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
                + {lang === 'bn' ? 'নতুন নোটিশ' : 'New Notice'}
              </button>
            </div>

            {myClaims.length === 0 ? (
              <div className="p-8 text-center theme-text-muted text-xs">
                {lang === 'bn' ? 'আপনি এখনো কোনো পেমেন্ট নোটিশ জমা দেননি।' : 'You have not submitted any payment notices yet.'}
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
                          <span className="font-semibold theme-text-main">{translateMonthLabel(claim.monthLabel, lang)}</span>
                          {claim.monthKeys && claim.monthKeys.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-600 dark:text-sky-400">
                              {lang === 'bn' ? `${toBengaliNumber(claim.monthKeys.length)} মাস` : `${claim.monthKeys.length} Months`}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            isPending 
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                              : isApproved 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            {lang === 'bn' ? (isPending ? 'যাচাইয়ের অপেক্ষায়' : isApproved ? 'অনুমোদিত' : 'প্রত্যাখ্যাত') : claim.status}
                          </span>
                        </div>
                        <div className="text-[11px] theme-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{t.paymentMethod}: {claim.paymentMethod}</span>
                          {claim.trxId && <span>· Trx ID: <strong className="font-mono">{claim.trxId}</strong></span>}
                          <span>· {lang === 'bn' ? 'জমার তারিখ:' : 'Submitted:'} {lang === 'bn' ? toBengaliNumber(new Date(claim.submittedAt).toLocaleDateString()) : new Date(claim.submittedAt).toLocaleDateString()}</span>
                        </div>
                        {isApproved && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            {lang === 'bn' ? '✓ ট্রেজারার যাচাই করে আপনার লেজারে জমা করেছেন' : '✓ Verified by Treasurer & credited to your ledger'}
                          </div>
                        )}
                        {claim.status === 'Rejected' && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                            ✕ {claim.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums self-start sm:self-auto">
                        {formatCurrency(claim.amount, lang)}
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
                  {t.treasuryTitle}
                </h2>
                <span className="text-[11px] theme-text-muted self-start sm:self-auto">{formatLedgerPeriod(months)}</span>
              </div>

              <div className="treasury-metrics grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="treasury-highlight theme-card-subtle p-5 rounded-xl border theme-border col-span-2">
                  <span className="theme-text-muted block text-xs font-medium">{t.totalClubFunds}</span>
                  <strong className="financial-value text-3xl font-mono theme-text-main block mt-2">{formatCurrency(summary.totalClubFunds, lang)}</strong>
                  <span className="text-[11px] theme-text-muted block mt-2">{lang === 'bn' ? 'নিশ্চিত আয় ও মুনাফাসহ মোট তহবিল' : 'Includes confirmed profit and income'}</span>
                </div>
                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">{lang === 'bn' ? 'অতিরিক্ত আয় / মুনাফা' : 'Additional Profit / Income'}</span>
                  <strong className="text-lg font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.totalAdditionalIncome, lang)}</strong>
                </div>
                {summary.manualFundsAdjustment !== 0 && <div className="theme-card-subtle p-3.5 rounded-xl border theme-border"><span className="theme-text-muted block text-[11px]">{lang === 'bn' ? 'ম্যানুয়াল তহবিল সমন্বয়' : 'Manual Treasury Adjustment'}</span><strong className="text-lg font-mono theme-text-main">{formatCurrency(summary.manualFundsAdjustment, lang)}</strong></div>}
                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">{t.liquidReserves}</span>
                  <span className="text-lg font-bold font-mono theme-text-main mt-0.5 block tabular-nums">
                    {formatCurrency(summary.liquidReserves, lang)}
                  </span>
                  <span className="text-[10px] theme-text-muted">{lang === 'bn' ? 'ক্লাব ব্যাংক অ্যাকাউন্টে জমা আছে' : 'Available in club bank accounts'}</span>
                </div>

                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">{t.investedFunds}</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                    {formatCurrency(summary.investedFunds, lang)}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    {activeVentures.length === 1 
                      ? `${t.partnerOrBiz}: ${activeVentures[0].partnerOrVenture}` 
                      : activeVentures.length > 1 
                      ? (lang === 'bn' ? `${toBengaliNumber(activeVentures.length)}টি প্রজেক্ট চলমান` : `${activeVentures.length} Active Projects`)
                      : t.noActiveVenture}
                  </span>
                </div>

                <div className="theme-card-subtle p-3.5 rounded-xl border theme-border">
                  <span className="theme-text-muted block text-[11px]">{t.ventureShare}</span>
                  <span className="financial-range text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                    +{projectedProfitLabel}
                  </span>
                  <span className="text-[11px] theme-text-muted block mt-1">{lang === 'bn' ? 'ROI অনুযায়ী সম্ভাব্য মুনাফা' : 'Estimated profit based on ROI'}</span>
                  <span className="text-[10px] theme-text-muted">
                    {activeVentures.length === 1 && activeVentures[0].maturityDate 
                      ? `${lang === 'bn' ? 'মেয়াদ:' : 'Maturity:'} ${lang === 'bn' ? toBengaliNumber(activeVentures[0].maturityDate) : activeVentures[0].maturityDate}`
                      : activeVentures.length > 1
                      ? (lang === 'bn' ? 'চলমান ভেঞ্চারগুলোর সম্মিলিত হিসাব' : 'Combined estimate for active ventures')
                      : (lang === 'bn' ? 'বিনিয়োগের অপেক্ষায়' : 'Awaiting deployment')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t theme-border">
                <h3 className="text-xs font-semibold theme-text-main mb-2">{lang === 'bn' ? 'অতিরিক্ত আয় ও মুনাফার ইতিহাস' : 'Profit / Income History'}</h3>
                {bankProfits.length ? <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-xs text-left"><thead className="theme-text-muted"><tr><th className="py-2">{lang === 'bn' ? 'তারিখ' : 'Date'}</th><th>{lang === 'bn' ? 'ধরন' : 'Category'}</th><th>{lang === 'bn' ? 'বিবরণ' : 'Description'}</th><th className="text-right">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th></tr></thead><tbody>{[...bankProfits].sort((a, b) => b.date.localeCompare(a.date)).map(entry => <tr key={entry.id} className="border-t theme-border"><td className="py-2 whitespace-nowrap">{entry.date}</td><td>{entry.incomeType || 'Bank Profit / Interest'}</td><td>{entry.description || entry.bankName || '—'}</td><td className="text-right font-mono">{formatCurrency(entry.amount, lang)}</td></tr>)}</tbody></table></div> : <p className="text-xs theme-text-muted">{lang === 'bn' ? 'এখনো কোনো অতিরিক্ত আয় নেই।' : 'No additional income recorded yet.'}</p>}
              </div>

              {/* Active Business Ventures List (Live sync with Admin Tracker) */}
              {activeVentures.length > 0 ? (
                <div className="space-y-2 pt-2 border-t theme-border">
                  <span className="text-[11px] font-semibold theme-text-muted block uppercase tracking-wider">
                    {t.activeVenturesTitle} ({lang === 'bn' ? toBengaliNumber(activeVentures.length) : activeVentures.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeVentures.map(v => {
                      const projection = getVentureProfitProjection(v);
                      return (
                      <div key={v.id} className="p-3 rounded-xl border theme-border theme-card-subtle flex flex-col justify-between text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold theme-text-main text-xs">{v.title}</div>
                            <div className="text-[11px] theme-text-muted">{t.partnerOrBiz}: {v.partnerOrVenture}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {lang === 'bn' ? 'চলমান' : 'Active'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 text-[11px] pt-3 border-t theme-border font-mono">
                          <span className="theme-text-muted">{lang === 'bn' ? 'বিনিয়োগ:' : 'Deployed:'} {formatCurrency(v.principalAmount, lang)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {projection.hasRange
                              ? `+${formatCurrency(projection.minProfit, lang)} – ${formatCurrency(projection.maxProfit, lang)}`
                              : `+${formatCurrency(projection.maxProfit, lang)}`}
                            <span className="block theme-text-muted font-normal mt-1">{lang === 'bn' ? toBengaliNumber(projection.minRoiPercent) : projection.minRoiPercent}%{projection.hasRange ? ` – ${lang === 'bn' ? toBengaliNumber(projection.maxRoiPercent) : projection.maxRoiPercent}%` : ''} ROI · {lang === 'bn' ? 'আনুমানিক' : 'Estimated'}</span>
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border theme-border text-center text-xs theme-text-muted">
                  {t.noActiveVenture}
                </div>
              )}
            </div>

            {/* Breakdown of Expenses Covered by Membership Fees */}
            <div className="theme-card p-5 rounded-2xl border theme-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b theme-border gap-1">
                <h2 className="text-sm font-bold theme-text-main">
                  {t.totalOperatingCosts}
                </h2>
                <div className="text-[11px] font-mono text-right">
                  <span className="theme-text-muted">{lang === 'bn' ? 'ফি ফান্ড:' : 'Fee Pool:'} </span>
                  <strong className="theme-text-main">{formatCurrency(totalFeeCollected, lang)}</strong>
                  <span className="theme-text-muted"> · {lang === 'bn' ? 'ব্যয়:' : 'Spent:'} </span>
                  <strong className="text-rose-500">{formatCurrency(totalExpensesAmount, lang)}</strong>
                  <span className="theme-text-muted"> · {lang === 'bn' ? 'উদ্বৃত্ত:' : 'Net:'} </span>
                  <strong className="text-emerald-500">{formatCurrency(feeBalance, lang)}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead>
                    <tr className="border-b theme-border text-xs theme-text-muted">
                      <th className="py-2 font-medium">{lang === 'bn' ? 'খরচের বিবরণ' : 'Expense Item'}</th>
                      <th className="py-2 font-medium">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                      <th className="py-2 font-medium">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                      <th className="py-2 font-medium text-right">{lang === 'bn' ? 'পরিমাণ' : 'Cost'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {operationalExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 font-medium theme-text-main">{exp.title}</td>
                        <td className="py-2.5 theme-text-muted">{exp.category}</td>
                        <td className="py-2.5 font-mono theme-text-muted">{lang === 'bn' ? toBengaliNumber(exp.date) : exp.date}</td>
                        <td className="py-2.5 font-mono font-semibold text-right theme-text-main tabular-nums">
                          {formatCurrency(exp.amount, lang)}
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
          {OFFICIAL_CLUB_NAME} Member Portal · Ledger {formatLedgerPeriod(months)}
        </div>
      </footer>

      {/* Submit Payment Notice Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="theme-card w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border theme-border overflow-hidden">

            <div className="p-3.5 sm:p-4 border-b theme-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm theme-text-main">
                  {t.claimModalTitle}
                </h3>
                <p className="text-[11px] theme-text-muted mt-0.5">
                  {t.claimModalSubtitle}
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
                  {t.submittedSuccess}
                </div>
                <p className="text-xs theme-text-muted">
                  {lang === 'bn' 
                    ? `আপনার জমাকৃত কিস্তির তথ্য সফলভাবে জমা হয়েছে (তারিখ: ${toBengaliNumber(paymentDate)})। ট্রেজারার ব্যাংক স্টেটমেন্ট যাচাই করে অনুমোদন করবেন।`
                    : `Your deposit details have been recorded with submission date ${paymentDate} and forwarded to the Treasurer for verification.`}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPaymentNotice} className="p-3.5 sm:p-4 space-y-3 text-xs overflow-y-auto flex-1">

                {/* 1. Dynamic Data-Driven Payment Month Selector (Single & Multiple Months) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="theme-text-muted font-medium flex items-center gap-1.5">
                      <span>{t.selectMonthsLabel}</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {periodData && periodData.overdueCount > 0 && (
                        <span className="text-[10px] text-amber-500 font-medium">
                          {lang === 'bn' ? `${toBengaliNumber(periodData.overdueCount)} মাসের কিস্তি বকেয়া` : `${periodData.overdueCount} month(s) due`}
                        </span>
                      )}
                      {periodData && periodData.options.filter(o => (o.category === 'overdue' || o.isCurrent) && o.canSelect).length > 1 && (
                        <button
                          type="button"
                          onClick={handleSelectAllDue}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
                          title={t.selectAllDue}
                        >
                          {t.selectAllDue}
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
                        ? (lang === 'bn' ? `আরও মাস যুক্ত বা পরিবর্তন করুন (${toBengaliNumber(selectedMonthKeys.length)}টি নির্বাচিত)...` : `Add / toggle another month (${selectedMonthKeys.length} selected)...`)
                        : (lang === 'bn' ? 'মাস নির্বাচন করুন...' : 'Select month...')}
                    </option>

                    {/* Overdue months */}
                    {periodData?.options.filter(o => o.category === 'overdue').length ? (
                      <optgroup label={lang === 'bn' ? '⚠️ বকেয়া কিস্তির মাস' : '⚠️ Overdue Months'}>
                        {periodData.options.filter(o => o.category === 'overdue').map(o => (
                          <option key={o.monthKey} value={o.monthKey}>
                            {selectedMonthKeys.includes(o.monthKey) ? '✓ ' : ''}{translateMonthLabel(o.monthLabel, lang)} ({formatCurrency(o.amountDue, lang)} {lang === 'bn' ? 'বকেয়া' : 'Due'})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}

                    {/* Current calendar month */}
                    {periodData?.options.filter(o => o.isCurrent).map(o => (
                      <optgroup key="current-group" label={lang === 'bn' ? 'চলতি ক্যালেন্ডার মাস' : 'Current Month'}>
                        <option 
                          key={o.monthKey} 
                          value={o.monthKey} 
                          disabled={!o.canSelect}
                        >
                          {selectedMonthKeys.includes(o.monthKey) ? '✓ ' : ''}{translateMonthLabel(o.monthLabel, lang)} {o.isPaid ? (lang === 'bn' ? '— পরিশোধিত ✓' : '— Paid ✓') : o.isPendingApproval ? (lang === 'bn' ? '— যাচাইাধীন ⏳' : '— Under Review ⏳') : `(${formatCurrency(o.amountDue, lang)} ${lang === 'bn' ? 'বকেয়া' : 'Due'})`}
                        </option>
                      </optgroup>
                    ))}

                    {/* Future installments can be paid in advance; they remain excluded from dues. */}
                    {periodData?.options.filter(o => o.isFuture && !o.isPaid && !o.isPendingApproval).length ? (
                      <optgroup label={lang === 'bn' ? '⏩ আসন্ন মাস' : '⏩ Upcoming Months'}>
                        {periodData.options.filter(o => o.isFuture && !o.isPaid && !o.isPendingApproval).map(o => (
                          <option key={o.monthKey} value={o.monthKey} disabled={!o.canSelect}>
                            {translateMonthLabel(o.monthLabel, lang)} — {lang === 'bn' ? 'অগ্রিম পেমেন্ট' : 'Advance payment'} ({formatCurrency(o.amountPayable, lang)})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}

                    {/* Settled / Already paid months */}
                    {periodData?.options.filter(o => o.isPaid && !o.isCurrent).length ? (
                      <optgroup label={lang === 'bn' ? '✓ পরিশোধিত মাসসমূহ' : '✓ Settled Months'}>
                        {periodData.options.filter(o => o.isPaid && !o.isCurrent).map(o => (
                          <option key={o.monthKey} value={o.monthKey} disabled>
                            {translateMonthLabel(o.monthLabel, lang)} {lang === 'bn' ? '— পরিশোধিত ✓' : '— Paid ✓'}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>

                  {/* Selected Month Badges with Remove Option */}
                  {selectedMonthKeys.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="text-[10px] font-medium theme-text-muted">
                        {lang === 'bn' ? `নির্বাচিত (${toBengaliNumber(selectedMonthKeys.length)}টি):` : `Selected (${selectedMonthKeys.length}):`}
                      </span>
                      {selectedMonthKeys.map(mk => {
                        const opt = periodData?.options.find(o => o.monthKey === mk);
                        const label = opt ? translateMonthLabel(opt.monthLabel, lang) : mk;
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
                      <span>{lang === 'bn' ? 'মাস সিলেক্ট / পরিবর্তন করতে ট্যাপ করুন:' : 'Tap to toggle months:'}</span>
                      <span className="font-mono text-[10px]">
                        {lang === 'bn' ? toBengaliNumber(currentMemberUser.units) : currentMemberUser.units} {t.unitsLabel} ({formatCurrency(monthlyRate, lang)} {t.perMonth})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-32 sm:max-h-36 overflow-y-auto pr-1">
                      {periodData?.options.map(opt => {
                        const isSelected = selectedMonthKeys.includes(opt.monthKey);
                        const monthDue = opt.amountPayable;
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
                                <div className="font-semibold text-[11px] truncate">{translateMonthLabel(opt.monthLabel, lang)}</div>
                                <div className="text-[9px]">
                                  {opt.category === 'overdue' && <span className="text-amber-500 font-medium">{lang === 'bn' ? 'বকেয়া' : 'Overdue'}</span>}
                                  {opt.isCurrent && <span className="text-emerald-500 font-medium">{lang === 'bn' ? 'চলতি' : 'Current'}</span>}
                                  {opt.isFuture && !opt.isPaid && <span className="text-sky-400 font-medium">{lang === 'bn' ? 'আসন্ন · অগ্রিম পেমেন্ট' : 'Upcoming · pay in advance'}</span>}
                                  {opt.isPaid && <span className="text-emerald-400 font-medium">{lang === 'bn' ? 'পরিশোধিত ✓' : 'Settled ✓'}</span>}
                                  {opt.isPendingApproval && <span className="text-amber-400 font-medium">{lang === 'bn' ? 'যাচাইাধীন ⏳' : 'Review ⏳'}</span>}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-[11px] shrink-0 tabular-nums ml-1">
                              {formatCurrency(monthDue, lang)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] theme-text-muted pt-1">{lang === 'bn' ? 'লেজারে থাকা আসন্ন মাসের কিস্তি অগ্রিম দিতে পারবেন। মাস শুরু হওয়ার আগে তা বকেয়ায় যোগ হবে না।' : 'You can pay upcoming ledger months in advance. They do not count as dues before the month begins.'}</p>
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
                          <span className="font-bold theme-text-main text-xs">{translateMonthLabel(sel.monthLabel, lang)}</span>
                          {sel.category === 'overdue' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-500">
                              {lang === 'bn' ? 'বকেয়া' : 'Overdue'}
                            </span>
                          )}
                          {sel.isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
                              {lang === 'bn' ? 'চলতি' : 'Current'}
                            </span>
                          )}
                          {sel.isFuture && !sel.isPaid && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-400">
                              {lang === 'bn' ? 'অগ্রিম' : 'Advance'}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-xs theme-text-main tabular-nums ml-2">
                          {formatCurrency(sel.amountPayable, lang)}
                        </span>
                      </div>
                    );
                  }

                  // Multiple months selected breakdown
                  const totalExpected = selectedMonthKeys.reduce((sum, mk) => {
                    const opt = periodData?.options.find(o => o.monthKey === mk);
                    return sum + (opt?.amountPayable || 0);
                  }, 0);

                  return (
                    <div className="px-3 py-2 rounded-xl border text-xs flex items-center justify-between bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold theme-text-main text-xs">
                          {lang === 'bn' ? `${toBengaliNumber(selectedMonthKeys.length)}টি মাস নির্বাচিত` : `${selectedMonthKeys.length} Months Selected`}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
                          {lang === 'bn' ? 'সম্মিলিত নোটিশ' : 'Combined Notice'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs theme-text-main tabular-nums ml-2">
                        {lang === 'bn' ? 'মোট:' : 'Total:'} {formatCurrency(totalExpected, lang)}
                      </span>
                    </div>
                  );
                })()}

                {/* 2-Column Responsive Grid: Date & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      {t.paymentDateLabel}
                    </label>
                    <DateField
                      label={t.paymentDateLabel} lang={lang}
                      value={paymentDate}
                      onChange={value => setPaymentDate(value)}
                      max={getCurrentDateString()}
                      className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      {t.amountLabel}
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
                      {t.paymentMethodLabel}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="theme-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      <option value="Bkash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ)</option>
                      <option value="CellFin">CellFin (সেলফিন)</option>
                      <option value="IBBL">IBBL (ইসলামী ব্যাংক)</option>
                      <option value="UCB">UCB</option>
                      <option value="PBL">PBL (পুবালী ব্যাংক)</option>
                      <option value="IIBL">IIBL</option>
                      <option value="CityTouch">CityTouch</option>
                      <option value="Club AC">Club AC (ক্লাব ব্যাংক একাউন্ট)</option>
                      <option value="Cash">Cash in Hand (নগদ)</option>
                      <option value="Other">Other (অন্যান্য)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block theme-text-muted mb-1 font-medium">
                      {t.trxIdLabel}
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
                    {t.notesLabel}
                  </label>
                  <textarea
                    rows={1}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: নিজের বিকাশ থেকে পাঠানো হয়েছে' : 'e.g. Sent from personal bKash'}
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
                    {t.cancelBtn}
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
                        {lang === 'bn' 
                          ? `নোটিশ জমা দিন (${toBengaliNumber(selectedMonthKeys.length)} মাস · ${formatCurrency(amount, lang)})`
                          : `Submit Notice (${selectedMonthKeys.length} ${selectedMonthKeys.length === 1 ? 'Month' : 'Months'} · ৳${amount.toLocaleString()})`}
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
