import { DateField } from './DateField';
import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { ActiveTab } from './Header';
import { BankProfitRecord } from '../types';
import { formatLedgerPeriod, getCurrentDateString } from '../services/paymentDueManager';
import { getActiveVentureProfitProjection } from '../services/treasuryCalculations';

interface DashboardOverviewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenRecordModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  setActiveTab,
  onOpenRecordModal,
}) => {
  const { 
    summary, 
    investment,
    investments, 
    members, 
    setTotalClubFunds, 
    updateInvestment, 
    batchCollectMemberDues,
    currentAdminUser,
    bankProfits,
    addBankProfit,
    deleteBankProfit,
    updateBankProfit,
    months
  } = useClub();

  const isSuperAdmin = currentAdminUser?.role === 'Super Admin' && currentAdminUser?.canEdit;

  const activeInvestments = useMemo(() => investments.filter(i => i.status === 'Active'), [investments]);
  const primaryActiveVenture = activeInvestments[0] || investment;
  const ventureProjection = useMemo(() => getActiveVentureProfitProjection(activeInvestments), [activeInvestments]);
  const projectedProfitLabel = ventureProjection.hasRange
    ? `৳${ventureProjection.minProfit.toLocaleString()} – ৳${ventureProjection.maxProfit.toLocaleString()}`
    : `৳${ventureProjection.maxProfit.toLocaleString()}`;

  // Inline edit state for Treasury numbers
  const [isEditingTreasury, setIsEditingTreasury] = useState(false);
  const [fundsInput, setFundsInput] = useState(summary.totalClubFunds);
  const [ventureInput, setVentureInput] = useState(summary.investedFunds);
  const [profitInput, setProfitInput] = useState(summary.expectedVentureProfit);

  // Bank profit modal state
  const [isAddBankProfitModalOpen, setIsAddBankProfitModalOpen] = useState(false);
  const [bankProfitAmount, setBankProfitAmount] = useState<number | ''>('');
  const [bankProfitDate, setBankProfitDate] = useState<string>(getCurrentDateString);
  const [bankProfitAccount, setBankProfitAccount] = useState<string>('');
  const [bankProfitDesc, setBankProfitDesc] = useState<string>('');
  const [bankProfitVoucher, setBankProfitVoucher] = useState<string>('');
  const [incomeType, setIncomeType] = useState<NonNullable<BankProfitRecord['incomeType']>>('Bank Profit / Interest');
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [entryId, setEntryId] = useState(() => `income-${crypto.randomUUID()}`);
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  const [bankProfitNotes, setBankProfitNotes] = useState<string>('');
  const [bankProfitSuccessMsg, setBankProfitSuccessMsg] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleCreateBankProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingIncome) return;
    if (!bankProfitAmount || Number(bankProfitAmount) <= 0) {
      setBankProfitSuccessMsg('Please enter a valid profit amount in BDT.');
      setTimeout(() => setBankProfitSuccessMsg(null), 4000);
      return;
    }

    setIsSavingIncome(true);
    const data = {
      amount: Number(bankProfitAmount),
      date: bankProfitDate || getCurrentDateString(),
      incomeType,
      bankName: bankProfitAccount || undefined,
      description: bankProfitDesc,
      receiptOrVoucher: bankProfitVoucher || undefined,
      notes: bankProfitNotes || undefined,
      recordedBy: currentAdminUser ? `${currentAdminUser.name} (${currentAdminUser.designation})` : 'Imrul Kaesh Chowdhury (Treasurer)',
    };
    const saved = editingIncomeId ? await updateBankProfit(editingIncomeId, data) : await addBankProfit(data, entryId);
    setIsSavingIncome(false);
    if (!saved) { setBankProfitSuccessMsg('Unable to save to Firestore. Please retry.'); return; }

    setBankProfitSuccessMsg(`৳${Number(bankProfitAmount).toLocaleString()} income ${editingIncomeId ? 'updated' : 'recorded'} in the Club Fund.`);
    setTimeout(() => setBankProfitSuccessMsg(null), 5000);
    setIsAddBankProfitModalOpen(false);
    setBankProfitAmount('');
    setBankProfitVoucher('');
    setBankProfitNotes('');
    setEditingIncomeId(null);
    setEntryId(`income-${crypto.randomUUID()}`);
  };

  const openIncomeEditor = (entry?: BankProfitRecord) => {
    setEditingIncomeId(entry?.id || null);
    if (!entry) setEntryId(`income-${crypto.randomUUID()}`);
    setBankProfitAmount(entry?.amount ?? '');
    setBankProfitDate(entry?.date || getCurrentDateString());
    setIncomeType(entry?.incomeType || 'Bank Profit / Interest');
    setBankProfitAccount(entry?.bankName || '');
    setBankProfitDesc(entry?.description || '');
    setBankProfitVoucher(entry?.receiptOrVoucher || '');
    setBankProfitNotes(entry?.notes || '');
    setIsAddBankProfitModalOpen(true);
  };

  const handleSaveTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    setTotalClubFunds(Number(fundsInput) || summary.totalClubFunds);
    updateInvestment({
      principalAmount: Number(ventureInput) || investment.principalAmount,
      expectedProfit: Number(profitInput) || investment.expectedProfit,
    });
    setIsEditingTreasury(false);
  };

  // Top overdue members
  const overdueMembers = [...members]
    .filter(m => m.status === 'Active' && m.monthsPending > 0)
    .sort((a, b) => b.monthsPending - a.monthsPending || b.totalDueAmount - a.totalDueAmount)
    .slice(0, 5);

  const investedPercent = summary.totalClubFunds > 0 
    ? ((summary.investedFunds / summary.totalClubFunds) * 100).toFixed(1) 
    : '0';
  const liquidPercent = summary.totalClubFunds > 0 
    ? ((summary.liquidReserves / summary.totalClubFunds) * 100).toFixed(1) 
    : '0';

  const perUnitMinProfit = summary.totalActiveUnits > 0 ? Math.round(ventureProjection.minProfit / summary.totalActiveUnits) : 0;
  const perUnitMaxProfit = summary.totalActiveUnits > 0 ? Math.round(ventureProjection.maxProfit / summary.totalActiveUnits) : 0;

  // Active venture milestone progress
  const completedMilestones = investment.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = investment.milestones?.length || 0;

  return (
    <div className="admin-overview space-y-6">

      <div className="page-heading flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight theme-text-main">Club Overview</h1><p className="text-sm theme-text-muted mt-1">Treasury, collections, and active ventures.</p></div>
        <p className="period-badge text-xs theme-text-muted">{formatLedgerPeriod(months)}</p>
      </div>

      {/* Bank Profit Success Notification */}
      {bankProfitSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">✓</span>
            <span className="font-medium">{bankProfitSuccessMsg}</span>
          </div>
          <button
            onClick={() => setBankProfitSuccessMsg(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline Treasury Values Editor */}
      {isEditingTreasury && (
        <form onSubmit={handleSaveTreasury} className="theme-card p-4 rounded-xl space-y-3.5 border theme-border shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold theme-text-main">
              Manual Treasury Calibration
            </span>
            <span className="text-[11px] theme-text-muted">
              Syncs with investment tracker and reserve pools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="theme-text-muted block mb-1">Total Club Funds (BDT)</label>
              <input
                type="number"
                value={fundsInput}
                onChange={e => setFundsInput(Number(e.target.value))}
                className="theme-input w-full px-3 py-1.5 rounded font-mono"
                required
              />
            </div>
            <div>
              <label className="theme-text-muted block mb-1">Active Venture Capital (BDT)</label>
              <input
                type="number"
                value={ventureInput}
                onChange={e => setVentureInput(Number(e.target.value))}
                className="theme-input w-full px-3 py-1.5 rounded font-mono"
                required
              />
            </div>
            <div>
              <label className="theme-text-muted block mb-1">Expected Venture Profit (BDT)</label>
              <input
                type="number"
                value={profitInput}
                onChange={e => setProfitInput(Number(e.target.value))}
                className="theme-input w-full px-3 py-1.5 rounded font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingTreasury(false)}
              className="px-3 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md cursor-pointer"
            >
              Save Balances
            </button>
          </div>
        </form>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="overview-metrics grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Card 1: Total Treasury */}
        <div className="treasury-highlight theme-card p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="metric-title">Total Treasury</span>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setFundsInput(summary.totalClubFunds);
                  setVentureInput(summary.investedFunds);
                  setProfitInput(summary.expectedVentureProfit);
                  setIsEditingTreasury(!isEditingTreasury);
                }}
                className="text-[11px] theme-text-muted hover:theme-text-main cursor-pointer"
              >
                {isEditingTreasury ? 'Close' : 'Edit'}
              </button>
            )}
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono theme-text-main tracking-tight tabular-nums">
              ৳{summary.totalClubFunds.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            Includes confirmed profit and income
          </div>
        </div>

        {/* Available cash from the existing treasury summary */}
        <div className="theme-card p-4 rounded-xl flex flex-col justify-between">
          <span className="metric-title">Liquid Reserves</span>
          <strong className="text-2xl font-bold font-mono theme-text-main my-2 tabular-nums">৳{summary.liquidReserves.toLocaleString()}</strong>
          <span className="text-[11px] theme-text-muted">Available after venture deployment</span>
        </div>

        {/* Realized additional income is included once in total club funds. */}
        <div className="theme-card p-4 rounded-xl flex flex-col justify-between border-emerald-500/30">
            <div className="flex items-center justify-between text-xs">
              <span className="metric-title">Profit / Other Income</span>
              {isSuperAdmin && <button
                onClick={() => openIncomeEditor()}
                className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                title="Add profit to increase total cash"
              >
                + Add
              </button>}
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight tabular-nums">
                ৳{summary.totalAdditionalIncome.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-emerald-500/80">
              Added to total club cash
            </div>
          </div>

        {/* Card: Deployed Venture Capital (Only shown when active investments exist) */}
        {activeInvestments.length > 0 && (
          <div
            onClick={() => setActiveTab('investment')}
            className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="metric-title">Venture Capital</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                {investedPercent}%
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                ৳{summary.investedFunds.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] theme-text-muted">
              {projectedProfitLabel} estimated profit
            </div>
          </div>
        )}

        {/* Card 2: Outstanding Dues */}
        <div 
          onClick={() => setActiveTab('dues')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="metric-title">Total Pending Dues</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              {members.filter(m => m.status === 'Active' && m.totalDueAmount > 0).length} members
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              ৳{summary.totalDues.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            Unpaid subscription dues
          </div>
        </div>

        {/* Card 3: Registered Members */}
        <div 
          onClick={() => setActiveTab('members')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="metric-title">Active Members</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              {summary.totalActiveUnits} Units
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono theme-text-main tracking-tight tabular-nums">
              {summary.activeMembersCount} <span className="text-xs font-normal theme-text-muted">Members</span>
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            {members.length} registered total
          </div>
        </div>

        {/* Card 4: Registration Fees Collected */}
        <div 
          onClick={() => setActiveTab('expenses')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="metric-title">Registration Fees</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              Pool
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-500 tracking-tight tabular-nums">
              ৳{summary.totalFeeCollected.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            Member admission fund
          </div>
        </div>

        {/* Card 5: Operational Costs */}
        <div 
          onClick={() => setActiveTab('expenses')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-rose-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="metric-title">Operating Costs</span>
            <span className="text-[10px] text-rose-500 font-mono">
              Spent
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-rose-500 tracking-tight tabular-nums">
              ৳{summary.totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            Bank, courier & stationery
          </div>
        </div>

        {summary.manualFundsAdjustment !== 0 && <div className="theme-card p-4 rounded-xl flex flex-col justify-between"><span className="theme-text-muted font-medium text-xs">Manual Treasury Adjustment</span><strong className="text-xl font-mono theme-text-main my-2">৳{summary.manualFundsAdjustment.toLocaleString()}</strong><span className="text-[11px] theme-text-muted">Included in total club funds</span></div>}

      </div>

      {/* Capital Allocation & Liquidity Ratio Bar (Strictly conditional: only shown when ventures are deployed) */}
      {activeInvestments.length > 0 && (
        <div className="theme-card p-4 rounded-xl text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-semibold theme-text-main">
              Capital Allocation & Liquidity Ratio
            </span>
            <span className="font-mono text-[11px] theme-text-muted">
              ৳{summary.totalClubFunds.toLocaleString()} Net Position
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2.5 overflow-hidden flex p-0.5">
            <div 
              style={{ width: `${investedPercent}%` }} 
              className="bg-emerald-500 h-full rounded-l-full transition-all duration-300"
              title={`Invested: ৳${summary.investedFunds.toLocaleString()} (${investedPercent}%)`}
            />
            <div 
              style={{ width: `${liquidPercent}%` }} 
              className="bg-sky-500 h-full rounded-r-full transition-all duration-300"
              title={`Liquid: ৳${summary.liquidReserves.toLocaleString()} (${liquidPercent}%)`}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-[11px] theme-text-muted">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Venture Capital: <strong className="font-mono theme-text-main">৳{summary.investedFunds.toLocaleString()}</strong> ({investedPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span>Liquid Reserves: <strong className="font-mono theme-text-main">৳{summary.liquidReserves.toLocaleString()}</strong> ({liquidPercent}%)</span>
              </div>
            </div>

            <div className="font-mono">
              Monthly Inflow: ৳{(summary.totalActiveUnits * 1000).toLocaleString()}/mo
            </div>
          </div>
        </div>
      )}

      {/* Club income history remains visible when empty so admins can add the first entry. */}
      <div className="theme-card p-4 rounded-xl text-xs space-y-3 border theme-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h2 className="text-sm font-bold theme-text-main">
                  Club Income / Profit
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  ৳{summary.totalAdditionalIncome.toLocaleString()} Realized
                </span>
              </div>
              <p className="text-[11px] theme-text-muted mt-0.5">
                Profits & dividends earned, directly increasing total club cash reserves.
              </p>
            </div>

            {isSuperAdmin && <button
              onClick={() => openIncomeEditor()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <span>+</span>
              <span>Record Income</span>
            </button>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Source / Account</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Profit Amount</th>
                  <th className="py-2 px-3 text-right">Recorded By</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {[...bankProfits].sort((a, b) => b.date.localeCompare(a.date)).map(bp => (
                  <tr key={bp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{bp.date}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{bp.incomeType || 'Bank Profit / Interest'}</td>
                    <td className="py-2 px-3 font-medium theme-text-main whitespace-nowrap">{bp.bankName || '—'}</td>
                    <td className="py-2 px-3 theme-text-muted truncate max-w-xs">{bp.description || 'Profit credit'}</td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-400 text-right tabular-nums whitespace-nowrap">
                      +৳{bp.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 theme-text-muted text-[11px] text-right whitespace-nowrap">{bp.recordedBy || 'Treasurer'}</td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {isSuperAdmin && <><button type="button" onClick={() => openIncomeEditor(bp)} className="px-2 py-1 text-emerald-600 hover:underline">Edit</button><button
                        type="button"
                        onClick={() => {
                          if (confirmingDeleteId !== bp.id) { setConfirmingDeleteId(bp.id); return; }
                          void deleteBankProfit(bp.id).then(ok => setBankProfitSuccessMsg(ok ? 'Income entry deleted.' : 'Could not delete income entry. Please retry.'));
                          setConfirmingDeleteId(null);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/25 cursor-pointer transition-colors shadow-xs"
                        title="Delete this profit entry"
                      >
                        {confirmingDeleteId === bp.id ? 'Confirm delete' : 'Delete'}
                      </button></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bankProfits.length && <p className="p-4 theme-text-muted">No income entries yet.</p>}
          </div>
        </div>

      {/* Two Column / Full Width Layout: Active Venture (Only if active) & Collection Queue */}
      <div className={`grid grid-cols-1 ${activeInvestments.length > 0 ? 'lg:grid-cols-2' : ''} gap-4`}>

        {/* Left Column: Business Venture Spotlight (Strictly conditional: hidden if zero active ventures) */}
        {activeInvestments.length > 0 && (
          <div className="theme-card p-5 rounded-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b theme-border">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h2 className="text-sm font-bold theme-text-main">
                    Active Venture Portfolio
                  </h2>
                  {investments.length > 1 && (
                    <span className="text-[11px] theme-text-muted">({investments.length} total)</span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('investment')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View Venture</span>
                  <span>→</span>
                </button>
              </div>

              {/* Venture Partner Header */}
              <div className="mt-3.5 mb-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm theme-text-main">
                    {activeInvestments.length === 1 
                      ? (primaryActiveVenture.title || primaryActiveVenture.partnerOrVenture)
                      : `${activeInvestments.length} Active Business Ventures`}
                  </div>
                  <div className="text-xs theme-text-muted mt-0.5">
                    {activeInvestments.length === 1 ? (
                      <>Partner: <span className="theme-text-main font-medium">{primaryActiveVenture.partnerOrVenture}</span></>
                    ) : (
                      <span>Combined deployment managed via Investment Portfolio</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>

              {/* 4 Financial Metric Tiles */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="theme-card-subtle p-3 rounded-lg">
                  <span className="theme-text-muted block text-[11px]">Principal Deployed</span>
                  <span className="text-lg font-bold font-mono theme-text-main mt-0.5 block tabular-nums">
                    ৳{summary.investedFunds.toLocaleString()}
                  </span>
                </div>

                <div className="theme-card-subtle p-3 rounded-lg">
                  <span className="theme-text-muted block text-[11px]">Projected Venture Profit</span>
                  <span className="financial-range text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                    +{projectedProfitLabel}
                  </span>
                  <span className="text-[10px] theme-text-muted block">Estimated from configured ROI</span>
                </div>

                <div className="theme-card-subtle p-3 rounded-lg">
                  <span className="theme-text-muted block text-[11px]">Maturity Return</span>
                  <span className="text-base font-bold font-mono theme-text-main mt-0.5 block tabular-nums">
                    {ventureProjection.hasRange
                      ? `৳${(summary.investedFunds + ventureProjection.minProfit).toLocaleString()} – ৳${(summary.investedFunds + ventureProjection.maxProfit).toLocaleString()}`
                      : `৳${(summary.investedFunds + ventureProjection.maxProfit).toLocaleString()}`}
                  </span>
                </div>

                <div className="theme-card-subtle p-3 rounded-lg">
                  <span className="theme-text-muted block text-[11px]">Projected per Unit</span>
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                    {ventureProjection.hasRange
                      ? `৳${perUnitMinProfit.toLocaleString()} – ৳${perUnitMaxProfit.toLocaleString()} / unit`
                      : `৳${perUnitMaxProfit.toLocaleString()} / unit`}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer note on dividend policy & milestones */}
            <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-muted">
              <span>Dividend Policy: <strong className="theme-text-main font-medium">{primaryActiveVenture.dividendPolicy || 'Distribute to Members'}</strong></span>
              {totalMilestones > 0 && (
                <span className="font-mono">{completedMilestones}/{totalMilestones} milestones</span>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Pending Dues & Quick Collect Queue */}
        <div className="theme-card p-5 rounded-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${overdueMembers.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                <h2 className="text-sm font-bold theme-text-main">
                  Priority Dues Queue
                </h2>
                <span className="text-[11px] theme-text-muted">
                  ({overdueMembers.length} pending)
                </span>
              </div>
              <button
                onClick={() => setActiveTab('dues')}
                className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <span>→</span>
              </button>
            </div>

            {overdueMembers.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-sm font-bold">
                  ✓
                </div>
                <div className="text-xs font-semibold theme-text-main">
                  All Member Accounts Settled
                </div>
                <div className="text-[11px] theme-text-muted max-w-xs mx-auto">
                  No active member has outstanding monthly dues at this time.
                </div>
              </div>
            ) : (
              <div className="divide-y theme-border text-xs mt-1">
                {overdueMembers.map(m => {
                  const initials = m.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(part => part[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full theme-card-subtle flex items-center justify-center text-[11px] font-medium theme-text-muted shrink-0">
                          {initials}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold theme-text-main truncate">{m.name}</div>
                          <div className="text-[11px] theme-text-muted">
                            {m.units} {m.units === 1 ? 'unit' : 'units'} · {m.monthsPending} mo overdue
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          ৳{m.totalDueAmount.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {m.monthsPending} mo due
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer note with dues summary */}
          <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-muted">
            <span>Outstanding Balance: <strong className="font-mono text-amber-600 dark:text-amber-400 font-bold">৳{summary.totalDues.toLocaleString()}</strong></span>
            <button
              onClick={() => setActiveTab('dues')}
              className="hover:theme-text-main underline cursor-pointer"
            >
              Batch collect dues →
            </button>
          </div>
        </div>

      </div>

      {/* Record Profit Modal */}
      {isAddBankProfitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="theme-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative border theme-border">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div>
                <h3 className="text-sm font-bold theme-text-main flex items-center gap-2">
                  <span>{editingIncomeId ? 'Edit Income' : 'Record Income'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Increases Cash
                  </span>
                </h3>
                <p className="text-xs theme-text-muted mt-0.5">
                  Directly adds earned profit to total club funds
                </p>
              </div>
              <button
                onClick={() => setIsAddBankProfitModalOpen(false)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBankProfit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="theme-text-main font-semibold block mb-1">
                  Income Amount (BDT) *
                </label>
                <input
                  type="number"
                  value={bankProfitAmount}
                  onChange={e => setBankProfitAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 5200"
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                  required
                  min="1"
                  autoFocus
                />
                <span className="text-[10px] theme-text-muted mt-1 block">
                  This amount will increase Total Club Treasury & Liquid Reserves immediately.
                </span>
              </div>

              <div><label className="theme-text-muted block mb-1 font-medium">Income Category *</label><select value={incomeType} onChange={e => setIncomeType(e.target.value as NonNullable<BankProfitRecord['incomeType']>)} className="theme-input w-full px-3 py-2 rounded-lg" required><option>Bank Profit / Interest</option><option>Venture Profit</option><option>Investment Return</option><option>Other Income</option></select></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Credited Date *</label>
                  <DateField
                    label="Credited date"
                    value={bankProfitDate}
                    onChange={value => setBankProfitDate(value)}
                    className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Profit Source</label>
                  <input type="text" placeholder="Optional source or account"
                    value={bankProfitAccount}
                    onChange={e => setBankProfitAccount(e.target.value)}
                    className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="theme-text-muted block mb-1 font-medium">Description</label>
                <input
                  type="text"
                  value={bankProfitDesc}
                  onChange={e => setBankProfitDesc(e.target.value)}
                  placeholder="e.g. Semi-annual savings profit / dividend credit"
                  className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="theme-text-muted block mb-1 font-medium">Voucher / Statement Ref (Optional)</label>
                <input
                  type="text"
                  value={bankProfitVoucher}
                  onChange={e => setBankProfitVoucher(e.target.value)}
                  placeholder="e.g. STMT-2026-H1 or Voucher #042"
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsAddBankProfitModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingIncome}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-xs transition-colors"
                >
                  {isSavingIncome ? 'Saving…' : editingIncomeId ? 'Save Changes' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
