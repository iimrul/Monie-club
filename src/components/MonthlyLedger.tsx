import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { MonthlyPayment, MonthKey, PaymentMethod } from '../types';
import { MonthInfo } from '../context/ClubContext';
import { 
  getCurrentMonthKey, 
  getCurrentDateString,
  isFutureMonth,
  formatMonthKey 
} from '../services/paymentDueManager';
import { RecordPaymentModal } from './RecordPaymentModal';

type PeriodType = 'monthly' | '3month' | '6month' | 'yearly';

interface PeriodBlock {
  id: string;
  label: string;
  sublabel: string;
  monthKeys: MonthKey[];
  year: string;
}

export const MonthlyLedger: React.FC = () => {
  const { 
    monthlyPayments, 
    members, 
    months,
    addMonth,
    deleteMonth,
    recordPayment,
    currentAdminUser,
  } = useClub();

  const isSuperAdmin = currentAdminUser?.role === 'Super Admin' && currentAdminUser?.canEdit;
  const canEdit = isSuperAdmin || (currentAdminUser && currentAdminUser.canEdit);

  // Period filter: monthly / 3month / 6month / yearly
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');

  // Year filter: 'all' | '2025' | '2026' | '2027' ...
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // View mode: 'cards' / 'table' / 'matrix'
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'matrix'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Due'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected identifiers: default to the current calendar month dynamically
  const [selectedMonthKey, setSelectedMonthKey] = useState<MonthKey>(() => {
    const cur = getCurrentMonthKey();
    const match = months.find(m => m.key === cur);
    return match ? match.key : (months[0]?.key || '2026-09');
  });
  const [selected3MonthId, setSelected3MonthId] = useState<string>('');
  const [selected6MonthId, setSelected6MonthId] = useState<string>('');

  // Read-only inspection modal
  const [viewingPayment, setViewingPayment] = useState<MonthlyPayment | null>(null);

  // Edit payment modal (for taking exact Date input from sheet)
  const [editingPayment, setEditingPayment] = useState<MonthlyPayment | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Club AC');
  const [editStatus, setEditStatus] = useState<'Paid' | 'Due' | 'Partial' | 'Waived'>('Paid');
  const [editTrxId, setEditTrxId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Add month modal state
  const nextSuggestedMonthKey = useMemo(() => {
    const lastMonth = months[months.length - 1];
    if (lastMonth) {
      const [yearStr, monthStr] = lastMonth.key.split('-');
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) + 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    return '2027-01';
  }, [months]);

  const [isAddMonthModalOpen, setIsAddMonthModalOpen] = useState(false);
  const [addYear, setAddYear] = useState<string>(() => nextSuggestedMonthKey.split('-')[0]);
  const [addMonthNum, setAddMonthNum] = useState<string>(() => nextSuggestedMonthKey.split('-')[1]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [monthSuccessMessage, setMonthSuccessMessage] = useState<string | null>(null);
  const [monthToDelete, setMonthToDelete] = useState<MonthInfo | null>(null);

  // Stats for the month pending deletion
  const monthToDeleteStats = useMemo(() => {
    if (!monthToDelete) return null;
    const payments = monthlyPayments.filter(p => p.monthKey === monthToDelete.key);
    const collected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amountPaid, 0);
    const expected = payments.reduce((s, p) => s + p.amountExpected, 0);
    const paidCount = payments.filter(p => p.status === 'Paid').length;
    const dueCount = payments.filter(p => p.status === 'Due').length;
    return { paymentsCount: payments.length, collected, expected, paidCount, dueCount };
  }, [monthToDelete, monthlyPayments]);

  // Active members only for monthly subscription calculations
  const activeMembers = useMemo(() => members.filter(m => m.status === 'Active'), [members]);

  // Extract unique years from months list
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    months.forEach(m => {
      const yr = m.key.split('-')[0];
      years.add(yr);
    });
    return Array.from(years).sort();
  }, [months]);

  // Build 3-Month blocks (Quarterly)
  const threeMonthBlocks = useMemo<PeriodBlock[]>(() => {
    const blocks: PeriodBlock[] = [];
    const quarterConfigs = [
      { q: 'Q1', name: 'Jan – Mar', months: ['01', '02', '03'] },
      { q: 'Q2', name: 'Apr – Jun', months: ['04', '05', '06'] },
      { q: 'Q3', name: 'Jul – Sep', months: ['07', '08', '09'] },
      { q: 'Q4', name: 'Oct – Dec', months: ['10', '11', '12'] },
    ];

    availableYears.forEach(year => {
      quarterConfigs.forEach(qc => {
        const targetKeys = qc.months.map(m => `${year}-${m}`);
        const existingKeys = targetKeys.filter(k => months.some(m => m.key === k));
        if (existingKeys.length > 0) {
          blocks.push({
            id: `${year}-${qc.q}`,
            label: `${qc.name} ${year}`,
            sublabel: `${qc.q} (${existingKeys.length} mo)`,
            monthKeys: existingKeys,
            year,
          });
        }
      });
    });

    return blocks;
  }, [availableYears, months]);

  // Build 6-Month blocks (Semi-Annual)
  const sixMonthBlocks = useMemo<PeriodBlock[]>(() => {
    const blocks: PeriodBlock[] = [];
    const customCycles = [
      { id: 'cycle-1', label: 'Oct 2025 – Mar 2026', sublabel: '6-Mo Session H1', months: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], year: '2026' },
      { id: 'cycle-2', label: 'Apr 2026 – Sep 2026', sublabel: '6-Mo Venture Period', months: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'], year: '2026' },
      { id: 'cycle-3', label: 'Oct 2026 – Dec 2026', sublabel: '6-Mo Session H3', months: ['2026-10', '2026-11', '2026-12'], year: '2026' },
    ];

    customCycles.forEach(c => {
      const existingKeys = c.months.filter(k => months.some(m => m.key === k));
      if (existingKeys.length > 0) {
        blocks.push({
          id: c.id,
          label: c.label,
          sublabel: c.sublabel,
          monthKeys: existingKeys,
          year: c.year,
        });
      }
    });

    return blocks;
  }, [months]);

  // Filter months by selectedYear
  const filteredMonths = useMemo(() => {
    if (selectedYear === 'all') return months;
    return months.filter(m => m.key.startsWith(selectedYear));
  }, [months, selectedYear]);

  // Active Month Keys based on periodType
  const activeMonthKeys = useMemo<MonthKey[]>(() => {
    if (periodType === 'monthly') {
      const exists = filteredMonths.some(m => m.key === selectedMonthKey);
      if (!exists && filteredMonths.length > 0) {
        return [filteredMonths[filteredMonths.length - 1].key];
      }
      return [selectedMonthKey];
    }

    if (periodType === '3month') {
      const block = threeMonthBlocks.find(b => b.id === selected3MonthId) || threeMonthBlocks[0];
      return block ? block.monthKeys : [];
    }

    if (periodType === '6month') {
      const block = sixMonthBlocks.find(b => b.id === selected6MonthId) || sixMonthBlocks[0];
      return block ? block.monthKeys : [];
    }

    if (periodType === 'yearly') {
      return filteredMonths.map(m => m.key);
    }

    return [selectedMonthKey];
  }, [periodType, selectedMonthKey, filteredMonths, threeMonthBlocks, selected3MonthId, sixMonthBlocks, selected6MonthId]);

  // Payments matching active keys
  const activePayments = useMemo(() => {
    return monthlyPayments.filter(p => activeMonthKeys.includes(p.monthKey));
  }, [monthlyPayments, activeMonthKeys]);

  // Aggregate Metrics for current period
  const totalExpected = useMemo(() => {
    return activePayments.reduce((sum, p) => sum + p.amountExpected, 0);
  }, [activePayments]);

  const totalCollected = useMemo(() => {
    return activePayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [activePayments]);

  const totalDue = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const currentMonthIdx = filteredMonths.findIndex(m => m.key === selectedMonthKey);
  const currentMonthConfig = filteredMonths[currentMonthIdx] || filteredMonths[0] || months[0];
  const hasPrevMonth = currentMonthIdx > 0;
  const hasNextMonth = currentMonthIdx >= 0 && currentMonthIdx < filteredMonths.length - 1;

  const active3MonthBlock = threeMonthBlocks.find(b => b.id === selected3MonthId) || threeMonthBlocks[0];
  const active6MonthBlock = sixMonthBlocks.find(b => b.id === selected6MonthId) || sixMonthBlocks[0];

  const handlePrevMonth = () => {
    if (hasPrevMonth) {
      setSelectedMonthKey(filteredMonths[currentMonthIdx - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (hasNextMonth) {
      setSelectedMonthKey(filteredMonths[currentMonthIdx + 1].key);
    }
  };

  // Filter members based on search and status
  const filteredMemberList = useMemo(() => {
    return activeMembers.filter(member => {
      const matchesSearch = searchQuery === '' || 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        member.contactNumber.includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter !== 'all') {
        const memberPayments = activePayments.filter(p => p.memberId === member.id);
        const hasDue = memberPayments.some(p => p.status === 'Due');
        if (statusFilter === 'Due' && !hasDue) return false;
        if (statusFilter === 'Paid' && hasDue) return false;
      }

      return true;
    });
  }, [activeMembers, searchQuery, statusFilter, activePayments]);

  const handleOpenEditPayment = (p: MonthlyPayment) => {
    setEditingPayment(p);
    setEditAmountPaid(p.amountPaid);
    // Take exact paymentDate or payment_date, fallback to month default or today
    setEditPaymentDate(p.paymentDate || p.payment_date || `${p.monthKey}-10`);
    setEditPaymentMethod(p.paymentMethod || 'Club AC');
    setEditStatus(p.status || (p.amountPaid > 0 ? 'Paid' : 'Due'));
    setEditTrxId(p.trxId || '');
    setEditNotes(p.notes || '');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const finalAmount = editStatus === 'Paid' 
      ? (Number(editAmountPaid) > 0 ? Number(editAmountPaid) : editingPayment.amountExpected)
      : editStatus === 'Due' 
      ? 0 
      : Number(editAmountPaid) || 0;

    recordPayment(editingPayment.id, {
      amountPaid: finalAmount,
      paymentDate: editPaymentDate || getCurrentDateString(),
      paymentMethod: editPaymentMethod,
      status: editStatus,
      memberId: editingPayment.memberId,
      memberName: editingPayment.memberName,
      monthKey: editingPayment.monthKey,
      notes: editNotes || (editTrxId ? `Trx: ${editTrxId}` : undefined),
    });

    setMonthSuccessMessage(`Saved contribution record for ${editingPayment.memberName} (${editingPayment.monthLabel}) with exact date ${editPaymentDate}.`);
    setTimeout(() => setMonthSuccessMessage(null), 4000);
    setEditingPayment(null);
    setViewingPayment(null);
  };

  const handleAddMonthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetKey = `${addYear}-${addMonthNum}`;
    if (months.some(m => m.key === targetKey)) {
      setMonthSuccessMessage(`Month ${targetKey} is already present in the ledger.`);
      setTimeout(() => setMonthSuccessMessage(null), 4000);
      return;
    }

    addMonth(targetKey);
    setSelectedMonthKey(targetKey);
    setSelectedYear('all');
    setPeriodType('monthly');
    setIsAddMonthModalOpen(false);
    setMonthSuccessMessage(`Month ${targetKey} added to the ledger successfully! 18 active member payment slots created.`);
    setTimeout(() => setMonthSuccessMessage(null), 5000);
  };

  const handleInitiateDeleteMonth = (m: MonthInfo) => {
    setMonthToDelete(m);
  };

  const handleConfirmDeleteMonth = () => {
    if (!monthToDelete) return;
    if (months.length <= 1) {
      setMonthSuccessMessage('Cannot delete the only remaining month in the ledger.');
      setTimeout(() => setMonthSuccessMessage(null), 4000);
      setMonthToDelete(null);
      return;
    }

    const targetKey = monthToDelete.key;
    deleteMonth(targetKey);

    const remaining = months.filter(m => m.key !== targetKey);
    if (remaining.length > 0 && selectedMonthKey === targetKey) {
      setSelectedMonthKey(remaining[remaining.length - 1].key);
    }

    setMonthSuccessMessage(`Month ${monthToDelete.label} (${monthToDelete.yearMonth}) deleted from the ledger.`);
    setTimeout(() => setMonthSuccessMessage(null), 4000);
    setMonthToDelete(null);
  };

  return (
    <div className="space-y-4">

      {/* Success Notification Banner */}
      {monthSuccessMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{monthSuccessMessage}</span>
          </div>
          <button
            onClick={() => setMonthSuccessMessage(null)}
            className="text-[11px] opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b theme-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main flex items-center gap-2">
            <span>Monthly Contribution Ledger</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              {months.length} Months
            </span>
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Member monthly contributions and payment tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Quick Record Payment */}
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Record payment"
          >
            <span>+</span>
            <span>Record Payment</span>
          </button>

          {/* Add Extra Month Button (Super Admin / Admin) */}
          <button
            onClick={() => {
              setAddYear(nextSuggestedMonthKey.split('-')[0]);
              setAddMonthNum(nextSuggestedMonthKey.split('-')[1]);
              setIsAddMonthModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold theme-input theme-text-main hover:bg-black/5 dark:hover:bg-white/5 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Add month to ledger"
          >
            <span className="text-emerald-500 font-bold">+</span>
            <span>Add Month</span>
          </button>

          {/* Delete Month Button with Warning */}
          <button
            onClick={() => {
              const current = months.find(m => m.key === selectedMonthKey) || months[months.length - 1];
              if (current) handleInitiateDeleteMonth(current);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold theme-input text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Delete a specific month from ledger"
          >
            <span>🗑️</span>
            <span>Delete Month</span>
          </button>

          {/* Master Matrix toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'matrix' ? 'table' : 'matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-input theme-text-muted hover:theme-text-main'
            }`}
          >
            {viewMode === 'matrix' ? 'Single Month View' : 'Master Matrix View'}
          </button>
        </div>
      </div>

      {/* Metric Cards for Selected Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Expected */}
        <div className="theme-card p-3 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Target Contribution</div>
          <div className="text-lg font-bold font-mono text-emerald-500 mt-0.5 tabular-nums">
            ৳{totalExpected.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            35 Share Units
          </div>
        </div>

        {/* Collected */}
        <div className="theme-card p-3 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Collected Funds</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">
            ৳{totalCollected.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">
            {collectionRate}% Realized
          </div>
        </div>

        {/* Outstanding Due */}
        <div className="theme-card p-3 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Pending Period Dues</div>
          <div className="text-lg font-bold font-mono text-amber-500 mt-0.5 tabular-nums">
            ৳{totalDue.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            Pending Collection
          </div>
        </div>

        {/* Active Members */}
        <div className="theme-card p-3 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Shareholder Members</div>
          <div className="text-lg font-bold font-mono theme-text-main mt-0.5 tabular-nums">
            {activeMembers.length}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            All Active
          </div>
        </div>
      </div>

      {/* Period Type Navigation & Filters */}
      <div className="theme-card p-3 rounded-xl border theme-border space-y-3">
        {/* Row 1: Period Mode Buttons + Year Dropdown + Search & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setPeriodType('monthly')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                periodType === 'monthly'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'theme-input theme-text-muted hover:theme-text-main'
              }`}
            >
              Single Month
            </button>
            <button
              onClick={() => {
                setPeriodType('3month');
                if (!selected3MonthId && threeMonthBlocks.length > 0) {
                  setSelected3MonthId(threeMonthBlocks[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                periodType === '3month'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'theme-input theme-text-muted hover:theme-text-main'
              }`}
            >
              Quarterly (3-Mo)
            </button>
            <button
              onClick={() => {
                setPeriodType('6month');
                if (!selected6MonthId && sixMonthBlocks.length > 0) {
                  setSelected6MonthId(sixMonthBlocks[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                periodType === '6month'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'theme-input theme-text-muted hover:theme-text-main'
              }`}
            >
              Semi-Annual (6-Mo)
            </button>
            <button
              onClick={() => setPeriodType('yearly')}
              className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                periodType === 'yearly'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'theme-input theme-text-muted hover:theme-text-main'
              }`}
            >
              Full Year
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="theme-text-muted">Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="theme-input px-2.5 py-1 rounded-lg focus:outline-none"
            >
              <option value="all">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search member..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="theme-input px-3 py-1.5 rounded-lg text-xs focus:outline-none flex-1 sm:w-44"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="theme-input px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="Paid">Only Paid</option>
              <option value="Due">Only Due</option>
            </select>
          </div>
        </div>

        {/* Multi-Month Block Selectors (Quarterly / Semi-Annual) */}
        {periodType === '3month' && (
          <div className="pt-2 border-t theme-border flex items-center gap-2 text-xs">
            <span className="theme-text-muted font-medium">Select Quarter:</span>
            <select
              value={active3MonthBlock?.id || ''}
              onChange={e => setSelected3MonthId(e.target.value)}
              className="theme-input px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
            >
              {threeMonthBlocks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label} — {b.sublabel}
                </option>
              ))}
            </select>
          </div>
        )}

        {periodType === '6month' && (
          <div className="pt-2 border-t theme-border flex items-center gap-2 text-xs">
            <span className="theme-text-muted font-medium">Select 6-Month Cycle:</span>
            <select
              value={active6MonthBlock?.id || ''}
              onChange={e => setSelected6MonthId(e.target.value)}
              className="theme-input px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
            >
              {sixMonthBlocks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.sublabel})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Single Month Scrollable Ribbon (Clean, Visible, 1-Tap) */}
        {periodType === 'monthly' && (
          <div className="pt-2 border-t theme-border">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {filteredMonths.map(m => {
                const isSelected = selectedMonthKey === m.key;
                const monthPayments = monthlyPayments.filter(p => p.monthKey === m.key);
                const totalCollected = monthPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amountPaid, 0);
                const hasDue = monthPayments.some(p => p.status === 'Due');

                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      setSelectedMonthKey(m.key);
                      const yr = m.key.split('-')[0];
                      if (selectedYear !== 'all' && selectedYear !== yr) {
                        setSelectedYear('all');
                      }
                    }}
                    className={`group px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'theme-card border theme-border hover:border-emerald-500/50 theme-text-main'
                    }`}
                    title={`${m.label} (${m.yearMonth}): ৳${totalCollected.toLocaleString()} collected`}
                  >
                    <span>{m.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      totalCollected >= 35000 && !hasDue
                        ? 'bg-emerald-400' 
                        : hasDue ? 'bg-amber-400' : 'bg-slate-400'
                    }`} />
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateDeleteMonth(m);
                      }}
                      className={`ml-1 text-[11px] p-0.5 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'text-white/80 hover:text-white hover:bg-black/20'
                          : 'opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 hover:bg-rose-500/15'
                      }`}
                      title={`Delete month ${m.label}`}
                    >
                      🗑️
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MATRIX VIEW */}
      {viewMode === 'matrix' ? (
        <div className="theme-card rounded-xl border theme-border overflow-hidden">
          <div className="p-3 bg-black/5 dark:bg-white/5 border-b theme-border flex items-center justify-between">
            <span className="text-xs font-bold theme-text-main">
              Subscription Matrix ({months.length} Months)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 z-10 theme-card-subtle">Member</th>
                  <th className="py-2.5 px-2 text-center">U</th>
                  {months.map(m => (
                    <th key={m.key} className="py-2.5 px-1 text-center font-mono min-w-[58px]">
                      <div className="flex items-center justify-center gap-0.5">
                        <span>{m.yearMonth}</span>
                        <button
                          type="button"
                          onClick={() => handleInitiateDeleteMonth(m)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 opacity-60 hover:opacity-100 p-0.5 rounded cursor-pointer transition-opacity"
                          title={`Delete month ${m.label}`}
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right sticky right-0 z-10 theme-card-subtle">Total Due</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border font-mono">
                {filteredMemberList.map(member => {
                  return (
                    <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium theme-text-main sticky left-0 z-10 theme-card truncate max-w-[140px]">
                        {member.name}
                      </td>
                      <td className="py-2 px-2 text-center theme-text-muted">{member.units}</td>
                      
                      {months.map(m => {
                        const p = monthlyPayments.find(pay => pay.memberId === member.id && pay.monthKey === m.key);
                        const isPaid = p?.status === 'Paid';
                        const isFuture = isFutureMonth(m.key);

                        let badgeText = 'D';
                        let badgeClass = 'bg-amber-500/20 text-amber-400';
                        let statusText = 'Due';

                        if (isPaid) {
                          badgeText = isFuture ? 'A' : 'P';
                          badgeClass = isFuture ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400';
                          statusText = isFuture ? 'Advance Paid' : 'Paid';
                        }

                        return (
                          <td 
                            key={m.key}
                            onClick={() => p && setViewingPayment(p)}
                            className="py-1 px-1 text-center cursor-pointer hover:opacity-75 transition-opacity"
                            title={`${member.name} - ${m.label}: ${statusText} (Click for details)`}
                          >
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                              {badgeText}
                            </span>
                          </td>
                        );
                      })}

                      <td className="py-2 px-3 text-right font-bold sticky right-0 z-10 theme-card tabular-nums">
                        {member.totalDueAmount > 0 ? (
                          <span className="text-amber-400">৳{member.totalDueAmount.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-400">৳0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : periodType === 'monthly' ? (
        /* SINGLE MONTH VIEW */
        <div className="theme-card rounded-xl overflow-hidden border theme-border shadow-xs">
          {/* Active Month Header with Delete Month Action */}
          <div className="p-3 bg-black/5 dark:bg-white/5 border-b theme-border flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold theme-text-main">
                {currentMonthConfig?.label} ({currentMonthConfig?.yearMonth})
              </span>
              <span className="text-[11px] theme-text-muted">
                · {activePayments.filter(p => p.status === 'Paid').length} Paid / {activePayments.filter(p => p.status === 'Due').length} Due
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentMonthConfig && (
                <button
                  type="button"
                  onClick={() => handleInitiateDeleteMonth(currentMonthConfig)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/25 cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                  title={`Delete ${currentMonthConfig.label} from ledger`}
                >
                  <span>🗑️</span>
                  <span>Delete Month</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-2 text-center">Units</th>
                  <th className="py-2.5 px-3 text-right">Expected</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border font-mono">
                {filteredMemberList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center theme-text-muted font-sans">
                      No members matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredMemberList.map(member => {
                    const existingP = activePayments.find(pay => pay.memberId === member.id);
                    const p: MonthlyPayment = existingP || {
                      id: `p-${member.id}-${selectedMonthKey}`,
                      memberId: member.id,
                      memberName: member.name,
                      monthKey: selectedMonthKey,
                      monthLabel: currentMonthConfig.label,
                      units: member.units,
                      amountExpected: member.units * 1000,
                      amountPaid: 0,
                      status: 'Due',
                    };
                    const isPaid = p.status === 'Paid';

                    return (
                      <tr 
                        key={p.id} 
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setViewingPayment(p)}
                      >
                        <td className="py-2.5 px-3 font-sans font-medium theme-text-main">
                          <div>{p.memberName}</div>
                          <div className="text-[11px] theme-text-muted font-mono">{member.contactNumber}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center theme-text-muted">{p.units}</td>
                        <td className="py-2.5 px-3 text-right theme-text-muted tabular-nums">৳{p.amountExpected.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                          <span className={isPaid ? 'text-emerald-400' : 'theme-text-muted'}>
                            ৳{p.amountPaid.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isPaid ? 'Paid ✓' : 'Due'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] theme-text-main">
                          {p.paymentDate || p.payment_date || '—'}
                        </td>
                        <td className="py-2.5 px-3 theme-text-muted text-[11px]">{p.paymentMethod || '—'}</td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditPayment(p);
                            }}
                            className="theme-input px-2.5 py-1 rounded text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                            title="Edit payment details"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MULTI-MONTH VIEW: 3-MONTH, 6-MONTH, OR YEARLY */
        <div className="theme-card rounded-xl overflow-hidden border theme-border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-2 text-center">Units</th>
                  <th className="py-2.5 px-3 text-right">Period Target</th>
                  <th className="py-2.5 px-3 text-right">Collected</th>
                  <th className="py-2.5 px-3 text-right">Pending Due</th>
                  {activeMonthKeys.map(key => {
                    const m = months.find(item => item.key === key);
                    return (
                      <th key={key} className="py-2.5 px-1 text-center font-mono min-w-[50px]">
                        {m?.yearMonth || key}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y theme-border font-mono">
                {filteredMemberList.map(member => {
                  const memberPayments = activePayments.filter(p => p.memberId === member.id);
                  const expected = memberPayments.reduce((s, p) => s + p.amountExpected, 0);
                  const collected = memberPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amountPaid, 0);
                  const due = Math.max(0, expected - collected);

                  return (
                    <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium theme-text-main">
                        {member.name}
                      </td>
                      <td className="py-2.5 px-2 text-center theme-text-muted">{member.units}</td>
                      <td className="py-2.5 px-3 text-right theme-text-muted tabular-nums">৳{expected.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400 tabular-nums">৳{collected.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {due > 0 ? (
                          <span className="text-amber-400">৳{due.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-400">৳0</span>
                        )}
                      </td>

                      {activeMonthKeys.map(key => {
                        const p = memberPayments.find(pay => pay.monthKey === key);
                        const isPaid = p?.status === 'Paid';

                        return (
                          <td 
                            key={key}
                            onClick={() => p && setViewingPayment(p)}
                            className="py-1 px-1 text-center cursor-pointer hover:opacity-75 transition-opacity"
                            title={`${member.name} - ${key}: ${isPaid ? 'Paid' : 'Due'}`}
                          >
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isPaid 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {isPaid ? '✓' : '•'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Read-Only Payment Details Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card rounded-2xl w-full max-w-sm p-5 shadow-2xl relative border theme-border animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div>
                <h3 className="text-sm font-bold theme-text-main">
                  Monthly Contribution Details
                </h3>
                <p className="text-xs text-emerald-400 mt-0.5 font-medium">
                  {viewingPayment.monthLabel}
                </p>
              </div>
              <button
                onClick={() => setViewingPayment(null)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="theme-card-subtle p-3 rounded-xl space-y-2 border theme-border font-mono">
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Member Name:</span>
                  <span className="font-bold theme-text-main font-sans">{viewingPayment.memberName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Share Units:</span>
                  <span className="theme-text-main">{viewingPayment.units} Units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Target Contribution:</span>
                  <span className="theme-text-main">৳{viewingPayment.amountExpected.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Amount Paid:</span>
                  <span className="font-bold text-emerald-400">৳{viewingPayment.amountPaid.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted font-sans">Payment Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    viewingPayment.status === 'Paid'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {viewingPayment.status === 'Paid' ? 'Paid ✓' : 'Due / Pending'}
                  </span>
                </div>
                {(viewingPayment.paymentDate || viewingPayment.payment_date) && (
                  <div className="flex justify-between items-center">
                    <span className="theme-text-muted font-sans">Payment Date:</span>
                    <span className="theme-text-main font-mono">{viewingPayment.paymentDate || viewingPayment.payment_date}</span>
                  </div>
                )}
                {(viewingPayment.processedAt || viewingPayment.processed_at) && (
                  <div className="flex justify-between items-center">
                    <span className="theme-text-muted font-sans">Admin Processed:</span>
                    <span className="theme-text-muted text-[11px] font-mono">
                      {new Date(viewingPayment.processedAt || viewingPayment.processed_at!).toLocaleString()}
                    </span>
                  </div>
                )}
                {viewingPayment.paymentMethod && (
                  <div className="flex justify-between items-center">
                    <span className="theme-text-muted font-sans">Payment Channel:</span>
                    <span className="theme-text-main">{viewingPayment.paymentMethod}</span>
                  </div>
                )}
                {viewingPayment.receiptNumber && (
                  <div className="flex justify-between items-center">
                    <span className="theme-text-muted font-sans">Receipt Ref:</span>
                    <span className="theme-text-muted">{viewingPayment.receiptNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingPayment;
                    setViewingPayment(null);
                    handleOpenEditPayment(target);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPayment(null)}
                  className="px-4 py-1.5 text-xs font-semibold theme-input rounded-lg hover:theme-text-main cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Record Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="theme-card rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative border theme-border">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div>
                <h3 className="text-sm font-bold theme-text-main">
                  Edit Contribution Record
                </h3>
                <p className="text-xs text-emerald-400 mt-0.5 font-medium">
                  {editingPayment.monthLabel} · {editingPayment.memberName}
                </p>
              </div>
              <button
                onClick={() => setEditingPayment(null)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-4 space-y-3.5 text-xs">
              {/* Member overview */}
              <div className="theme-card-subtle p-3 rounded-xl border theme-border flex items-center justify-between">
                <div>
                  <span className="theme-text-muted">Member Units:</span>
                  <span className="font-bold theme-text-main ml-1.5">{editingPayment.units} Units</span>
                </div>
                <div>
                  <span className="theme-text-muted">Expected:</span>
                  <span className="font-bold font-mono text-emerald-400 ml-1.5">৳{editingPayment.amountExpected.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Date Input */}
              <div>
                <label className="theme-text-main font-semibold flex items-center gap-1 mb-1">
                  <span>Payment Date</span>
                  <span className="text-amber-500">*</span>
                </label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={e => setEditPaymentDate(e.target.value)}
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Amount Paid & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Amount Paid (৳ BDT)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editAmountPaid}
                    onChange={e => setEditAmountPaid(Number(e.target.value))}
                    className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Payment Status</label>
                  <select
                    value={editStatus}
                    onChange={e => {
                      const newStatus = e.target.value as any;
                      setEditStatus(newStatus);
                      if (newStatus === 'Paid' && (!editAmountPaid || editAmountPaid === 0)) {
                        setEditAmountPaid(editingPayment.amountExpected);
                      } else if (newStatus === 'Due') {
                        setEditAmountPaid(0);
                      }
                    }}
                    className="theme-input w-full px-3 py-2 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Due">Due</option>
                    <option value="Partial">Partial</option>
                    <option value="Waived">Waived</option>
                  </select>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Payment Channel / Bank</label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as any)}
                  className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Club AC">Club AC (Bank Account)</option>
                  <option value="Bkash">bKash</option>
                  <option value="CellFin">CellFin</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Nagad">Nagad</option>
                  <option value="IBBL">IBBL</option>
                  <option value="IIBL">IIBL</option>
                  <option value="UCB">UCB</option>
                  <option value="PBL">PBL</option>
                  <option value="CityTouch">CityTouch</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Trx ID & Receipt */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Transaction / Voucher Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TR-20260901 or Bank Deposit Slip #"
                  value={editTrxId}
                  onChange={e => setEditTrxId(e.target.value)}
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Notes / Ledger Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via online deposit"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3.5 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-xs transition-colors"
                >
                  Save to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Extra Month Modal (Super Admin) */}
      {isAddMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="theme-card rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative border theme-border">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div>
                <h3 className="text-sm font-bold theme-text-main flex items-center gap-2">
                  <span>Add Extra Month to Ledger</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Super Admin
                  </span>
                </h3>
                <p className="text-xs theme-text-muted mt-0.5">
                  Expand monthly contribution ledger for the club
                </p>
              </div>
              <button
                onClick={() => setIsAddMonthModalOpen(false)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMonthSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Select Year</label>
                  <select
                    value={addYear}
                    onChange={e => setAddYear(e.target.value)}
                    className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                    <option value="2030">2030</option>
                  </select>
                </div>

                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Select Month</label>
                  <select
                    value={addMonthNum}
                    onChange={e => setAddMonthNum(e.target.value)}
                    className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="01">01 - January</option>
                    <option value="02">02 - February</option>
                    <option value="03">03 - March</option>
                    <option value="04">04 - April</option>
                    <option value="05">05 - May</option>
                    <option value="06">06 - June</option>
                    <option value="07">07 - July</option>
                    <option value="08">08 - August</option>
                    <option value="09">09 - September</option>
                    <option value="10">10 - October</option>
                    <option value="11">11 - November</option>
                    <option value="12">12 - December</option>
                  </select>
                </div>
              </div>

              {/* Month Preview Card */}
              <div className="theme-card-subtle p-3 rounded-xl border theme-border space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="theme-text-muted">Target Month Key:</span>
                  <span className="font-bold theme-text-main font-mono">{addYear}-{addMonthNum}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="theme-text-muted">Active Member Slots:</span>
                  <span className="theme-text-main font-mono">18 Active (35 Units)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="theme-text-muted">Target Contribution:</span>
                  <span className="font-bold text-emerald-400 font-mono">৳35,000 BDT</span>
                </div>
              </div>

              {months.some(m => m.key === `${addYear}-${addMonthNum}`) && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px]">
                  ⚠️ This month is already configured in the ledger.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsAddMonthModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={months.some(m => m.key === `${addYear}-${addMonthNum}`)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                >
                  Add Month Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Month Warning & Confirmation Modal */}
      {monthToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="theme-card rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative border border-rose-500/30">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 text-lg font-bold shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-rose-500">
                    Delete Month Confirmation
                  </h3>
                  <p className="text-xs theme-text-muted mt-0.5">
                    Permanent removal of monthly ledger period
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMonthToDelete(null)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
                title="Cancel"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              {/* Select or switch specific month dropdown */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">
                  Select Specific Month to Delete:
                </label>
                <select
                  value={monthToDelete.key}
                  onChange={(e) => {
                    const found = months.find(m => m.key === e.target.value);
                    if (found) setMonthToDelete(found);
                  }}
                  className="theme-input w-full px-3 py-2 rounded-lg text-xs font-medium focus:ring-1 focus:ring-rose-500 font-mono"
                >
                  {months.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.yearMonth})
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Impact Stats Card */}
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <div className="flex justify-between items-center font-mono">
                  <span className="theme-text-muted">Target Month:</span>
                  <span className="font-bold theme-text-main text-sm font-sans">
                    {monthToDelete.label} ({monthToDelete.yearMonth})
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="theme-text-muted">Payment Records to Remove:</span>
                  <span className="font-semibold text-rose-400">
                    {monthToDeleteStats?.paymentsCount ?? 0} member records
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="theme-text-muted">Collected in this Month:</span>
                  <span className="font-bold text-emerald-400">
                    ৳{(monthToDeleteStats?.collected ?? 0).toLocaleString()} BDT
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="theme-text-muted">Status Breakdown:</span>
                  <span className="theme-text-muted">
                    {monthToDeleteStats?.paidCount ?? 0} Paid · {monthToDeleteStats?.dueCount ?? 0} Due
                  </span>
                </div>
              </div>

              {/* Warning Alert Banner */}
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex gap-2.5 items-start">
                <span className="text-base shrink-0 leading-none">⚠️</span>
                <div className="space-y-1">
                  <div className="font-bold">Are you absolutely sure?</div>
                  <div className="text-[11px] leading-relaxed text-rose-400">
                    This action will permanently delete this month ({monthToDelete.label}) and all its associated member contribution entries from the ledger. This action cannot be undone.
                  </div>
                </div>
              </div>

              {months.length <= 1 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px]">
                  Cannot delete the only remaining month in the ledger.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setMonthToDelete(null)}
                  className="px-4 py-2 text-xs font-medium theme-input theme-text-main rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMonth}
                  disabled={months.length <= 1}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>Yes, Delete Month</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        prefill={{ monthKey: selectedMonthKey }}
      />

    </div>
  );
};
