import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { ActiveTab } from './Header';

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
    deleteBankProfit
  } = useClub();

  const isSuperAdmin = currentAdminUser?.role === 'Super Admin' && currentAdminUser?.canEdit;

  // Inline edit state for Treasury numbers
  const [isEditingTreasury, setIsEditingTreasury] = useState(false);
  const [fundsInput, setFundsInput] = useState(summary.totalClubFunds);
  const [ventureInput, setVentureInput] = useState(investment.principalAmount);
  const [profitInput, setProfitInput] = useState(investment.expectedProfit);

  // Bank profit modal state
  const [isAddBankProfitModalOpen, setIsAddBankProfitModalOpen] = useState(false);
  const [bankProfitAmount, setBankProfitAmount] = useState<number | ''>('');
  const [bankProfitDate, setBankProfitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bankProfitAccount, setBankProfitAccount] = useState<string>('Club Central Account (IBBL)');
  const [bankProfitDesc, setBankProfitDesc] = useState<string>('Half-yearly savings account bank profit / interest credit');
  const [bankProfitVoucher, setBankProfitVoucher] = useState<string>('');
  const [bankProfitNotes, setBankProfitNotes] = useState<string>('');
  const [bankProfitSuccessMsg, setBankProfitSuccessMsg] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleCreateBankProfit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankProfitAmount || Number(bankProfitAmount) <= 0) {
      setBankProfitSuccessMsg('Please enter a valid profit amount in BDT.');
      setTimeout(() => setBankProfitSuccessMsg(null), 4000);
      return;
    }

    addBankProfit({
      amount: Number(bankProfitAmount),
      date: bankProfitDate || new Date().toISOString().split('T')[0],
      bankName: bankProfitAccount,
      description: bankProfitDesc,
      receiptOrVoucher: bankProfitVoucher || undefined,
      notes: bankProfitNotes || undefined,
      recordedBy: currentAdminUser ? `${currentAdminUser.name} (${currentAdminUser.designation})` : 'Imrul Kaesh Chowdhury (Treasurer)',
    });

    setBankProfitSuccessMsg(`৳${Number(bankProfitAmount).toLocaleString()} Profit successfully added to the Club's Total Cash Amount!`);
    setTimeout(() => setBankProfitSuccessMsg(null), 5000);
    setIsAddBankProfitModalOpen(false);
    setBankProfitAmount('');
    setBankProfitVoucher('');
    setBankProfitNotes('');
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

  const perUnitProfit = summary.totalActiveUnits > 0 
    ? (investment.expectedProfit / summary.totalActiveUnits).toFixed(0) 
    : '0';

  const ventureRoi = investment.principalAmount > 0
    ? ((investment.expectedProfit / investment.principalAmount) * 100).toFixed(1)
    : '0';

  // Active venture milestone progress
  const completedMilestones = investment.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = investment.milestones?.length || 0;

  return (
    <div className="space-y-6">

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        
        {/* Card 1: Total Treasury */}
        <div className="theme-card p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Total Treasury</span>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setFundsInput(summary.totalClubFunds);
                  setVentureInput(investment.principalAmount);
                  setProfitInput(investment.expectedProfit);
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
            Liquid reserves & ventures
          </div>
        </div>

        {/* Card 2: Deployed Venture Capital */}
        <div 
          onClick={() => setActiveTab('investment')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Venture Capital</span>
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
            +৳{summary.expectedVentureProfit.toLocaleString()} return
          </div>
        </div>

        {/* Card 3: Liquid Reserves */}
        <div className="theme-card p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Liquid Reserves</span>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-mono">
              {liquidPercent}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono theme-text-main tracking-tight tabular-nums">
              ৳{summary.liquidReserves.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            Bank & cash holdings
          </div>
        </div>

        {/* Card 4: Profits (Direct Cash Increase) */}
        <div className="theme-card p-4 rounded-xl flex flex-col justify-between border-emerald-500/30">
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Profits</span>
            <button
              onClick={() => setIsAddBankProfitModalOpen(true)}
              className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer"
              title="Add profit to increase total cash"
            >
              + Add
            </button>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight tabular-nums">
              ৳{summary.totalBankProfits.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-emerald-500/80">
            Added to total club cash
          </div>
        </div>

        {/* Card 5: Outstanding Dues */}
        <div 
          onClick={() => setActiveTab('dues')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Pending Dues</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              {overdueMembers.length} overdue
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

        {/* Card 6: Registered Members */}
        <div 
          onClick={() => setActiveTab('members')}
          className="theme-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Members</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              {summary.totalActiveUnits} Units
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono theme-text-main tracking-tight tabular-nums">
              {summary.activeMembersCount} <span className="text-xs font-normal theme-text-muted">Active</span>
            </div>
          </div>
          <div className="text-[11px] theme-text-muted">
            {members.length} registered total
          </div>
        </div>

      </div>

      {/* Capital Allocation & Liquidity Ratio Bar */}
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

      {/* Profits & Inflow Section */}
      <div className="theme-card p-4 rounded-xl text-xs space-y-3 border theme-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b theme-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h2 className="text-sm font-bold theme-text-main">
                Profits
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                ৳{summary.totalBankProfits.toLocaleString()} Realized
              </span>
            </div>
            <p className="text-[11px] theme-text-muted mt-0.5">
              Profits & dividends earned, directly increasing total club cash reserves.
            </p>
          </div>

          <button
            onClick={() => setIsAddBankProfitModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <span>+</span>
            <span>Record Profit</span>
          </button>
        </div>

        {/* Profit entries list */}
        {bankProfits.length === 0 ? (
          <div className="py-4 text-center text-xs theme-text-muted">
            No profit records yet. Click &ldquo;+ Record Profit&rdquo; to input profits received.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Source / Account</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Profit Amount</th>
                  <th className="py-2 px-3 text-right">Recorded By</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {bankProfits.map(bp => (
                  <tr key={bp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{bp.date}</td>
                    <td className="py-2 px-3 font-medium theme-text-main whitespace-nowrap">{bp.bankName || 'Club Account'}</td>
                    <td className="py-2 px-3 theme-text-muted truncate max-w-xs">{bp.description || 'Profit credit'}</td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-400 text-right tabular-nums whitespace-nowrap">
                      +৳{bp.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 theme-text-muted text-[11px] text-right whitespace-nowrap">{bp.recordedBy || 'Treasurer'}</td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          deleteBankProfit(bp.id);
                          setBankProfitSuccessMsg(`৳${bp.amount.toLocaleString()} profit entry removed successfully.`);
                          setTimeout(() => setBankProfitSuccessMsg(null), 4000);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/25 cursor-pointer transition-colors shadow-xs"
                        title="Delete this profit entry"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Layout: Active Venture & Collection Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left Column: Business Venture Spotlight */}
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
                  {investment.title || investment.partnerOrVenture}
                </div>
                <div className="text-xs theme-text-muted mt-0.5">
                  Partner: <span className="theme-text-main font-medium">{investment.partnerOrVenture}</span>
                  {investment.contactPerson && <span> · Contact: {investment.contactPerson}</span>}
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
                  ৳{investment.principalAmount.toLocaleString()}
                </span>
              </div>

              <div className="theme-card-subtle p-3 rounded-lg">
                <span className="theme-text-muted block text-[11px]">Expected Gain</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                  +৳{investment.expectedProfit.toLocaleString()}
                </span>
              </div>

              <div className="theme-card-subtle p-3 rounded-lg">
                <span className="theme-text-muted block text-[11px]">Maturity Return</span>
                <span className="text-base font-bold font-mono theme-text-main mt-0.5 block tabular-nums">
                  ৳{investment.totalExpectedReturn.toLocaleString()}
                </span>
              </div>

              <div className="theme-card-subtle p-3 rounded-lg">
                <span className="theme-text-muted block text-[11px]">Projected per Unit</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                  ~৳{perUnitProfit} / unit
                </span>
              </div>
            </div>
          </div>

          {/* Footer note on dividend policy & milestones */}
          <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-muted">
            <span>Dividend Policy: <strong className="theme-text-main font-medium">{investment.dividendPolicy || 'Distribute to Members'}</strong></span>
            {totalMilestones > 0 && (
              <span className="font-mono">{completedMilestones}/{totalMilestones} milestones</span>
            )}
          </div>
        </div>

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
          <div className="theme-card rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative border theme-border">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <div>
                <h3 className="text-sm font-bold theme-text-main flex items-center gap-2">
                  <span>Record Profit</span>
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
                  Profit Amount (BDT) *
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Credited Date *</label>
                  <input
                    type="date"
                    value={bankProfitDate}
                    onChange={e => setBankProfitDate(e.target.value)}
                    className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Profit Source</label>
                  <select
                    value={bankProfitAccount}
                    onChange={e => setBankProfitAccount(e.target.value)}
                    className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Club Central Account (IBBL)">Club Central (IBBL)</option>
                    <option value="Club Reserve Account (UCB)">Club Reserve (UCB)</option>
                    <option value="Term Deposit / FDR Account">Term Deposit / FDR</option>
                    <option value="Venture Operational Account">Venture Account</option>
                    <option value="Islami Bank Bangladesh Ltd">Islami Bank (General)</option>
                    <option value="Other Profit Source">Other Source</option>
                  </select>
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
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-xs transition-colors"
                >
                  Add Profit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

