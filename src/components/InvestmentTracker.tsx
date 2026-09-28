import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { BusinessInvestment } from '../types';

export const InvestmentTracker: React.FC = () => {
  const { 
    investments, 
    addInvestment, 
    updateInvestment, 
    deleteInvestment, 
    concludeInvestment, 
    reactivateInvestment, 
    members, 
    summary,
    currentAdminUser,
    setPortalMode
  } = useClub();

  const isAdmin = Boolean(currentAdminUser);
  
  // Filter stage: 'Active' | 'Inactive' | 'All'
  const [stageFilter, setStageFilter] = useState<'Active' | 'Inactive' | 'All'>('Active');
  
  // Selected venture for dividend calculation
  const [selectedVentureId, setSelectedVentureId] = useState<string>(() => {
    const active = investments.find(i => i.status === 'Active');
    return active ? active.id : (investments[0]?.id || '');
  });

  // Distribution policy for dividend calculation
  const [payoutOption, setPayoutOption] = useState<'perUnit' | 'split' | 'reinvest'>('perUnit');

  // Modal State: Add or Edit Venture
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVentureId, setEditingVentureId] = useState<string | null>(null);
  const [ventureForm, setVentureForm] = useState<{
    title: string;
    partnerOrVenture: string;
    principalAmount: number;
    expectedProfit: number;
    startDate: string;
    maturityDate: string;
    durationMonths: number;
    status: 'Active' | 'Inactive';
    description: string;
    dividendPolicy: 'Distribute to Members per Unit' | 'Reinvest into Club Fund' | 'Split 50/50';
    notes: string;
  }>({
    title: '',
    partnerOrVenture: '',
    principalAmount: 200000,
    expectedProfit: 17000,
    startDate: new Date().toISOString().split('T')[0],
    maturityDate: '2026-10-31',
    durationMonths: 6,
    status: 'Active',
    description: '',
    dividendPolicy: 'Distribute to Members per Unit',
    notes: '',
  });

  // Modal State: Conclude Venture
  const [concludingVenture, setConcludingVenture] = useState<BusinessInvestment | null>(null);
  const [concludeData, setConcludeData] = useState<{
    concludedDate: string;
    actualProfit: number;
    notes: string;
  }>({
    concludedDate: new Date().toISOString().split('T')[0],
    actualProfit: 0,
    notes: '',
  });

  // Delete Confirmation State
  const [deletingVentureId, setDeletingVentureId] = useState<string | null>(null);

  // Active vs Inactive venture groups
  const activeVentures = useMemo(() => investments.filter(i => i.status === 'Active'), [investments]);
  const inactiveVentures = useMemo(() => investments.filter(i => i.status === 'Inactive'), [investments]);

  // Total active deployment metrics
  const totalActivePrincipal = useMemo(() => {
    return activeVentures.reduce((sum, i) => sum + i.principalAmount, 0);
  }, [activeVentures]);

  const totalActiveProfit = useMemo(() => {
    return activeVentures.reduce((sum, i) => sum + i.expectedProfit, 0);
  }, [activeVentures]);

  const totalActiveReturn = totalActivePrincipal + totalActiveProfit;

  // Total concluded return recovered
  const totalConcludedReturn = useMemo(() => {
    return inactiveVentures.reduce((sum, i) => {
      const profit = i.actualProfit !== undefined ? i.actualProfit : i.expectedProfit;
      return sum + i.principalAmount + profit;
    }, 0);
  }, [inactiveVentures]);

  // Filtered list based on selected stage tab
  const filteredVentures = useMemo(() => {
    if (stageFilter === 'Active') return activeVentures;
    if (stageFilter === 'Inactive') return inactiveVentures;
    return investments;
  }, [stageFilter, activeVentures, inactiveVentures, investments]);

  // Currently inspected venture for member dividend payout simulation
  const inspectedVenture = useMemo(() => {
    const found = investments.find(i => i.id === selectedVentureId);
    return found || activeVentures[0] || investments[0] || null;
  }, [investments, selectedVentureId, activeVentures]);

  // Dividend math for inspected venture
  const activeMembers = useMemo(() => members.filter(m => m.status === 'Active'), [members]);
  const totalActiveUnits = summary.totalActiveUnits || 44;

  const currentProfitBase = inspectedVenture 
    ? (inspectedVenture.status === 'Inactive' && inspectedVenture.actualProfit !== undefined 
        ? inspectedVenture.actualProfit 
        : inspectedVenture.expectedProfit) 
    : 0;

  const distributable = payoutOption === 'reinvest' 
    ? 0 
    : payoutOption === 'split' 
      ? currentProfitBase * 0.5 
      : currentProfitBase;

  const perUnitShare = totalActiveUnits > 0 ? (distributable / totalActiveUnits) : 0;
  const retainedClub = currentProfitBase - distributable;

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleOpenAddVenture = () => {
    if (!currentAdminUser) {
      if (confirm('Admin Sign-In Required: All admins can create and manage business ventures. Would you like to sign in as an Admin now?')) {
        setPortalMode('admin');
      }
      return;
    }
    setEditingVentureId(null);
    setVentureForm({
      title: '',
      partnerOrVenture: '',
      principalAmount: 100000,
      expectedProfit: 10000,
      startDate: new Date().toISOString().split('T')[0],
      maturityDate: '',
      durationMonths: 6,
      status: 'Active',
      description: '',
      dividendPolicy: 'Distribute to Members per Unit',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditVenture = (v: BusinessInvestment) => {
    if (!currentAdminUser) {
      if (confirm('Admin Sign-In Required: All admins can create and manage business ventures. Would you like to sign in as an Admin now?')) {
        setPortalMode('admin');
      }
      return;
    }
    setEditingVentureId(v.id);
    setVentureForm({
      title: v.title,
      partnerOrVenture: v.partnerOrVenture || '',
      principalAmount: v.principalAmount,
      expectedProfit: v.expectedProfit,
      startDate: v.startDate,
      maturityDate: v.maturityDate || '',
      durationMonths: v.durationMonths || 6,
      status: v.status === 'Inactive' ? 'Inactive' : 'Active',
      description: v.description || '',
      dividendPolicy: v.dividendPolicy || 'Distribute to Members per Unit',
      notes: v.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveVenture = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: ventureForm.title.trim() || 'Business Venture',
      partnerOrVenture: ventureForm.partnerOrVenture.trim() || 'Commercial Partner',
      principalAmount: Number(ventureForm.principalAmount) || 0,
      expectedProfit: Number(ventureForm.expectedProfit) || 0,
      totalExpectedReturn: (Number(ventureForm.principalAmount) || 0) + (Number(ventureForm.expectedProfit) || 0),
      startDate: ventureForm.startDate || new Date().toISOString().split('T')[0],
      maturityDate: ventureForm.maturityDate || '',
      durationMonths: Number(ventureForm.durationMonths) || 6,
      status: ventureForm.status,
      description: ventureForm.description,
      dividendPolicy: ventureForm.dividendPolicy,
      notes: ventureForm.notes,
    };

    if (editingVentureId) {
      updateInvestment(editingVentureId, payload);
    } else {
      addInvestment(payload);
    }
    setIsModalOpen(false);
  };

  const handleOpenConcludeModal = (v: BusinessInvestment) => {
    setConcludingVenture(v);
    setConcludeData({
      concludedDate: new Date().toISOString().split('T')[0],
      actualProfit: v.expectedProfit,
      notes: `Successfully concluded. Principal ৳${v.principalAmount.toLocaleString()} & ৳${v.expectedProfit.toLocaleString()} profit returned.`,
    });
  };

  const handleConfirmConclude = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concludingVenture) return;

    concludeInvestment(concludingVenture.id, {
      actualProfit: Number(concludeData.actualProfit) || 0,
      concludedDate: concludeData.concludedDate,
      notes: concludeData.notes,
    });

    setConcludingVenture(null);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b theme-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main">
            Business Venture Portfolio
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Active investments and concluded historical ventures with dividend distributions
          </p>
        </div>

        <button
          onClick={handleOpenAddVenture}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <span>+</span> Add New Venture
        </button>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Active Capital */}
        <div 
          onClick={() => setStageFilter('Active')}
          className={`theme-card p-3.5 rounded-xl border transition-all cursor-pointer ${
            stageFilter === 'Active' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'theme-border hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted">Active Capital</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1 tabular-nums">
            ৳{totalActivePrincipal.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {activeVentures.length} Active
          </div>
        </div>

        {/* Target Profit */}
        <div className="theme-card p-3.5 rounded-xl border theme-border">
          <div className="theme-text-muted">Target Profit</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            +৳{totalActiveProfit.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            Expected
          </div>
        </div>

        {/* Total Active Return */}
        <div className="theme-card p-3.5 rounded-xl border theme-border">
          <div className="theme-text-muted">Total Return</div>
          <div className="text-xl font-bold font-mono theme-text-main mt-1 tabular-nums">
            ৳{totalActiveReturn.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            Principal + Profit
          </div>
        </div>

        {/* Inactive / Concluded */}
        <div 
          onClick={() => setStageFilter('Inactive')}
          className={`theme-card p-3.5 rounded-xl border transition-all cursor-pointer ${
            stageFilter === 'Inactive' ? 'border-slate-400 ring-1 ring-slate-400/30' : 'theme-border hover:border-slate-400/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted">Concluded</span>
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          </div>
          <div className="text-xl font-bold font-mono theme-text-main mt-1 tabular-nums">
            {inactiveVentures.length} Concluded
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            Settled
          </div>
        </div>
      </div>

      {/* Segmented Stage Switcher: Active vs Inactive vs All */}
      <div className="flex items-center justify-between p-1 bg-black/10 dark:bg-white/5 rounded-xl border theme-border text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStageFilter('Active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              stageFilter === 'Active'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Active ({activeVentures.length})</span>
          </button>

          <button
            onClick={() => setStageFilter('Inactive')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              stageFilter === 'Inactive'
                ? 'bg-slate-700 text-white shadow-xs font-semibold'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Inactive ({inactiveVentures.length})</span>
          </button>

          <button
            onClick={() => setStageFilter('All')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              stageFilter === 'All'
                ? 'bg-slate-600 text-white shadow-xs font-semibold'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            All ({investments.length})
          </button>
        </div>
      </div>

      {/* Ventures Cards Grid */}
      <div className="space-y-3.5">
        {filteredVentures.length === 0 ? (
          <div className="theme-card p-10 rounded-xl text-center border theme-border">
            <p className="text-sm theme-text-muted">
              No ventures currently in <strong>{stageFilter}</strong> stage.
            </p>
            {stageFilter === 'Active' && (
              <button
                onClick={handleOpenAddVenture}
                className="mt-3 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-xs inline-flex items-center gap-1"
              >
                <span>+</span> Add Venture
              </button>
            )}
          </div>
        ) : (
          filteredVentures.map(v => {
            const isActive = v.status === 'Active';
            const isSelected = inspectedVenture?.id === v.id;

            return (
              <div 
                key={v.id} 
                className={`theme-card rounded-xl p-4 sm:p-5 border transition-all ${
                  isSelected ? 'border-emerald-500/60 ring-1 ring-emerald-500/20 shadow-sm' : 'theme-border'
                }`}
              >
                {/* Venture Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b theme-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold theme-text-main">
                        {v.title}
                      </h3>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/25">
                          Concluded
                        </span>
                      )}
                    </div>
                    <div className="text-xs theme-text-muted mt-0.5">
                      {v.partnerOrVenture}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => setSelectedVentureId(v.id)}
                      className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-600 text-white font-medium shadow-xs' 
                          : 'theme-input theme-text-muted hover:theme-text-main'
                      }`}
                    >
                      Payout
                    </button>

                    {isActive ? (
                      <button
                        onClick={() => handleOpenConcludeModal(v)}
                        className="px-2.5 py-1 text-xs rounded font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        Conclude
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivateInvestment(v.id)}
                        className="px-2.5 py-1 text-xs rounded font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditVenture(v)}
                      className="theme-input px-2.5 py-1 text-xs rounded hover:theme-text-main cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => setDeletingVentureId(v.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs px-1 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Venture Metrics in 4 Clean Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b theme-border text-xs font-mono">
                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Principal</span>
                    <span className="text-base font-bold theme-text-main tabular-nums">
                      ৳{v.principalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">
                      {isActive ? 'Target Profit' : 'Profit'}
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +৳{(isActive ? v.expectedProfit : (v.actualProfit !== undefined ? v.actualProfit : v.expectedProfit)).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Total Return</span>
                    <span className="text-base font-bold theme-text-main tabular-nums">
                      ৳{(v.principalAmount + (isActive ? v.expectedProfit : (v.actualProfit !== undefined ? v.actualProfit : v.expectedProfit))).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Timeline</span>
                    <div className="text-xs font-semibold theme-text-main mt-0.5">
                      {isActive ? (
                        <span>Matures {v.maturityDate || 'Oct 2026'}</span>
                      ) : (
                        <span className="text-amber-400">Concluded {v.concludedDate || v.maturityDate || 'Settled'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description & Conclusion Notes */}
                {(v.description || v.notes) && (
                  <div className="pt-2.5 text-xs theme-text-muted space-y-1">
                    {v.description && <p>{v.description}</p>}
                    {v.notes && (
                      <p className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                        {v.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Member Payout Distribution Table (For Selected Venture) */}
      {inspectedVenture && (
        <div className="theme-card p-4 sm:p-5 rounded-xl border theme-border space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b theme-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold theme-text-main">
                Dividend Distribution
              </h2>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {inspectedVenture.title}
              </span>
            </div>

            {/* Distribution Policy Buttons */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setPayoutOption('perUnit')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  payoutOption === 'perUnit'
                    ? 'bg-emerald-600 text-white font-medium shadow-xs'
                    : 'theme-input theme-text-muted'
                }`}
              >
                100% Payout
              </button>
              <button
                onClick={() => setPayoutOption('split')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  payoutOption === 'split'
                    ? 'bg-emerald-600 text-white font-medium shadow-xs'
                    : 'theme-input theme-text-muted'
                }`}
              >
                50/50 Split
              </button>
              <button
                onClick={() => setPayoutOption('reinvest')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  payoutOption === 'reinvest'
                    ? 'bg-emerald-600 text-white font-medium shadow-xs'
                    : 'theme-input theme-text-muted'
                }`}
              >
                Reinvest
              </button>
            </div>
          </div>

          {/* Quick Metrics for the Inspected Venture Payout */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-black/5 dark:bg-white/5 border theme-border text-xs font-mono">
            <div>
              <span className="text-[10px] theme-text-muted block font-sans">Distributable</span>
              <span className="text-base font-bold text-emerald-500 tabular-nums">
                ৳{distributable.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] theme-text-muted block font-sans">Per Unit</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                ৳{perUnitShare.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-[10px] theme-text-muted block font-sans">Club Retained</span>
              <span className="text-base font-bold theme-text-main tabular-nums">
                ৳{retainedClub.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Clean Payout Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-center">Units</th>
                  <th className="py-2.5 px-3 text-center">Share</th>
                  <th className="py-2.5 px-3 text-right">Dividend</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border font-mono">
                {activeMembers.map(m => {
                  const sharePercent = ((m.units / totalActiveUnits) * 100).toFixed(1);
                  const dividend = m.units * perUnitShare;
                  const capitalEquity = (m.units / totalActiveUnits) * inspectedVenture.principalAmount;
                  const totalReturn = capitalEquity + dividend;

                  return (
                    <tr key={m.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium theme-text-main">
                        {m.name}
                      </td>
                      <td className="py-2 px-3 text-center theme-text-main font-semibold tabular-nums">
                        {m.units}
                      </td>
                      <td className="py-2 px-3 text-center theme-text-muted tabular-nums">
                        {sharePercent}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ৳{dividend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-2 px-3 text-right theme-text-main tabular-nums">
                        ৳{totalReturn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="theme-card-subtle font-bold border-t theme-border font-mono text-xs">
                <tr>
                  <td className="py-2.5 px-3 theme-text-main font-sans">Total ({activeMembers.length})</td>
                  <td className="py-2.5 px-3 text-center">{totalActiveUnits}</td>
                  <td className="py-2.5 px-3 text-center theme-text-muted">100%</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">৳{distributable.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right theme-text-main tabular-nums">৳{(inspectedVenture.principalAmount + distributable).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT VENTURE */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card rounded-2xl w-full max-w-lg p-5 shadow-2xl relative border theme-border animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h3 className="text-sm font-bold theme-text-main">
                {editingVentureId ? 'Edit Venture Details' : 'Add New Business Venture'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="theme-input px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVenture} className="mt-4 space-y-3.5 text-xs">
              
              {/* Title & Partner */}
              <div className="space-y-2.5">
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Venture Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Seasonal Agro Trade Venture 2026"
                    value={ventureForm.title}
                    onChange={e => setVentureForm(p => ({ ...p, title: e.target.value }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1">Business Partner / Trade Sector</label>
                  <input
                    type="text"
                    placeholder="e.g. Chittagong Wholesale Grain & Commodity Supply"
                    value={ventureForm.partnerOrVenture}
                    onChange={e => setVentureForm(p => ({ ...p, partnerOrVenture: e.target.value }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg"
                    required
                  />
                </div>
              </div>

              {/* Financial Capital & Projected Profit */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Principal Capital (BDT)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={ventureForm.principalAmount || ''}
                    onChange={e => setVentureForm(p => ({ ...p, principalAmount: Number(e.target.value) }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Expected Profit (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={ventureForm.expectedProfit || ''}
                    onChange={e => setVentureForm(p => ({ ...p, expectedProfit: Number(e.target.value) }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg font-mono font-bold text-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="theme-text-muted block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={ventureForm.startDate}
                    onChange={e => setVentureForm(p => ({ ...p, startDate: e.target.value }))}
                    className="theme-input w-full px-2.5 py-1.5 rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1">Maturity Date</label>
                  <input
                    type="date"
                    value={ventureForm.maturityDate}
                    onChange={e => setVentureForm(p => ({ ...p, maturityDate: e.target.value }))}
                    className="theme-input w-full px-2.5 py-1.5 rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={ventureForm.durationMonths || ''}
                    onChange={e => setVentureForm(p => ({ ...p, durationMonths: Number(e.target.value) }))}
                    className="theme-input w-full px-2.5 py-1.5 rounded-lg font-mono text-center"
                  />
                </div>
              </div>

              {/* Status: Active vs Inactive */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Venture Stage</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVentureForm(p => ({ ...p, status: 'Active' }))}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
                      ventureForm.status === 'Active'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    ● Active Stage
                  </button>

                  <button
                    type="button"
                    onClick={() => setVentureForm(p => ({ ...p, status: 'Inactive' }))}
                    className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
                      ventureForm.status === 'Inactive'
                        ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    ⏳ Inactive / Concluded
                  </button>
                </div>
              </div>

              {/* Description & Notes */}
              <div>
                <label className="theme-text-muted block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Terms, commodity details, or settlement notes..."
                  value={ventureForm.description}
                  onChange={e => setVentureForm(p => ({ ...p, description: e.target.value }))}
                  className="theme-input w-full px-3 py-1.5 rounded-lg resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  {editingVentureId ? 'Save Changes' : 'Create Venture'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONCLUDE VENTURE (Moves to Inactive Stage) */}
      {/* ========================================================================= */}
      {concludingVenture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="theme-card rounded-2xl w-full max-w-md p-5 shadow-2xl relative border border-amber-500/30 animate-fade-in">
            <h3 className="text-sm font-bold theme-text-main pb-2 border-b theme-border flex items-center gap-2">
              <span className="text-amber-400">⏳ Conclude Investment Venture</span>
            </h3>

            <p className="text-xs theme-text-muted mt-2.5">
              Conclude <strong>"{concludingVenture.title}"</strong> and move it to the <strong>Inactive</strong> stage.
              The deployed principal capital (৳{concludingVenture.principalAmount.toLocaleString()}) will be settled and credited back into the central club reserves.
            </p>

            <form onSubmit={handleConfirmConclude} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Conclusion / Settlement Date</label>
                <input
                  type="date"
                  value={concludeData.concludedDate}
                  onChange={e => setConcludeData(p => ({ ...p, concludedDate: e.target.value }))}
                  className="theme-input w-full px-3 py-1.5 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="theme-text-muted block mb-1 font-medium">Actual Realized Profit (BDT)</label>
                <input
                  type="number"
                  min="0"
                  value={concludeData.actualProfit}
                  onChange={e => setConcludeData(p => ({ ...p, actualProfit: Number(e.target.value) }))}
                  className="theme-input w-full px-3 py-1.5 rounded-lg font-mono font-bold text-emerald-500 text-base"
                  required
                />
                <span className="text-[10px] theme-text-muted mt-0.5 block">
                  Original target was ৳{concludingVenture.expectedProfit.toLocaleString()}.
                </span>
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Conclusion Settlement Notes</label>
                <input
                  type="text"
                  value={concludeData.notes}
                  onChange={e => setConcludeData(p => ({ ...p, notes: e.target.value }))}
                  className="theme-input w-full px-3 py-1.5 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setConcludingVenture(null)}
                  className="px-3 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  Conclude & Move to Inactive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingVentureId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="theme-card rounded-2xl w-full max-w-sm p-5 shadow-2xl relative border border-rose-500/40 animate-fade-in text-xs">
            <h3 className="text-base font-bold text-rose-400">
              Delete Venture Record
            </h3>
            <p className="theme-text-muted mt-1">
              Are you sure you want to permanently remove this venture from your portfolio?
            </p>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t theme-border">
              <button
                type="button"
                onClick={() => setDeletingVentureId(null)}
                className="px-3 py-1.5 theme-text-muted hover:theme-text-main cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInvestment(deletingVentureId);
                  setDeletingVentureId(null);
                }}
                className="px-4 py-1.5 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
