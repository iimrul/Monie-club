import { DateField } from './DateField';
import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { BusinessInvestment } from '../types';
import { getActiveVentureProfitProjection, getVentureProfitProjection } from '../services/treasuryCalculations';

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
    profitMode: 'range' | 'fixed';
    minRoiPercent: number;
    maxRoiPercent: number;
    minProfit: number;
    maxProfit: number;
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
    principalAmount: 100000,
    profitMode: 'range',
    minRoiPercent: 10,
    maxRoiPercent: 12.5,
    minProfit: 10000,
    maxProfit: 12500,
    expectedProfit: 12500,
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

  // Total active deployment metrics (supports Dynamic Range & Fixed)
  const totalActivePrincipal = useMemo(() => {
    return activeVentures.reduce((sum, i) => sum + i.principalAmount, 0);
  }, [activeVentures]);

  const activeProjection = useMemo(() => getActiveVentureProfitProjection(activeVentures), [activeVentures]);
  const totalActiveMinProfit = activeProjection.minProfit;
  const totalActiveMaxProfit = activeProjection.maxProfit;

  const hasActiveProfitRange = totalActiveMinProfit !== totalActiveMaxProfit;

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

  const inspectedIsConcluded = inspectedVenture?.status === 'Inactive' && inspectedVenture?.actualProfit !== undefined;
  const inspectedIsRange = !inspectedIsConcluded && inspectedVenture && (inspectedVenture.profitMode === 'range' || (inspectedVenture.minRoiPercent !== undefined && inspectedVenture.maxRoiPercent !== undefined));
  const inspectedProjection = inspectedVenture ? getVentureProfitProjection(inspectedVenture) : null;

  const inspectedMinProfit = inspectedVenture
    ? (inspectedIsConcluded 
        ? inspectedVenture.actualProfit! 
        : inspectedProjection!.minProfit)
    : 0;

  const inspectedMaxProfit = inspectedVenture
    ? (inspectedIsConcluded 
        ? inspectedVenture.actualProfit! 
        : inspectedProjection!.maxProfit)
    : 0;

  const distributableMin = payoutOption === 'reinvest' 
    ? 0 
    : payoutOption === 'split' 
      ? inspectedMinProfit * 0.5 
      : inspectedMinProfit;

  const distributableMax = payoutOption === 'reinvest' 
    ? 0 
    : payoutOption === 'split' 
      ? inspectedMaxProfit * 0.5 
      : inspectedMaxProfit;

  const perUnitMin = totalActiveUnits > 0 ? (distributableMin / totalActiveUnits) : 0;
  const perUnitMax = totalActiveUnits > 0 ? (distributableMax / totalActiveUnits) : 0;
  const retainedClubMin = inspectedMinProfit - distributableMin;
  const retainedClubMax = inspectedMaxProfit - distributableMax;

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
      profitMode: 'range',
      minRoiPercent: 10,
      maxRoiPercent: 12.5,
      minProfit: 10000,
      maxProfit: 12500,
      expectedProfit: 12500,
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
    const p = v.principalAmount || 100000;
    const isRange = v.profitMode === 'range' || (v.minRoiPercent !== undefined && v.maxRoiPercent !== undefined);
    const minRoi = v.minRoiPercent ?? (v.expectedProfit && p ? Number(((v.expectedProfit / p) * 100).toFixed(1)) : 10);
    const maxRoi = v.maxRoiPercent ?? (v.expectedProfit && p ? Number(((v.expectedProfit / p) * 100).toFixed(1)) : 12.5);
    const minProf = v.minProfit ?? Math.round((p * minRoi) / 100);
    const maxProf = v.maxProfit ?? Math.round((p * maxRoi) / 100);

    setVentureForm({
      title: v.title,
      partnerOrVenture: v.partnerOrVenture || '',
      principalAmount: p,
      profitMode: isRange ? 'range' : 'fixed',
      minRoiPercent: minRoi,
      maxRoiPercent: maxRoi,
      minProfit: minProf,
      maxProfit: maxProf,
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

  const handlePrincipalOrRoiChange = (updates: {
    principal?: number;
    profitMode?: 'range' | 'fixed';
    minRoi?: number;
    maxRoi?: number;
    fixedProfit?: number;
  }) => {
    setVentureForm(prev => {
      const principal = updates.principal !== undefined ? updates.principal : prev.principalAmount;
      const profitMode = updates.profitMode !== undefined ? updates.profitMode : prev.profitMode;
      const minRoi = updates.minRoi !== undefined ? updates.minRoi : prev.minRoiPercent;
      const maxRoi = updates.maxRoi !== undefined ? updates.maxRoi : prev.maxRoiPercent;
      const minProfit = Math.round((principal * minRoi) / 100);
      const maxProfit = Math.round((principal * maxRoi) / 100);
      const expectedProfit = profitMode === 'range'
        ? maxProfit
        : (updates.fixedProfit !== undefined ? updates.fixedProfit : prev.expectedProfit);

      return {
        ...prev,
        principalAmount: principal,
        profitMode,
        minRoiPercent: minRoi,
        maxRoiPercent: maxRoi,
        minProfit,
        maxProfit,
        expectedProfit,
      };
    });
  };

  const handleSaveVenture = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = Number(ventureForm.principalAmount) || 0;
    const isRange = ventureForm.profitMode === 'range';
    const minRoi = isRange ? Number(ventureForm.minRoiPercent) || 0 : undefined;
    const maxRoi = isRange ? Number(ventureForm.maxRoiPercent) || 0 : undefined;
    const minProfit = isRange ? Math.round((principal * (minRoi || 0)) / 100) : Number(ventureForm.expectedProfit) || 0;
    const maxProfit = isRange ? Math.round((principal * (maxRoi || 0)) / 100) : Number(ventureForm.expectedProfit) || 0;
    const expectedProfit = isRange ? maxProfit : (Number(ventureForm.expectedProfit) || 0);

    const payload: Omit<BusinessInvestment, 'id'> = {
      title: ventureForm.title.trim() || 'Business Venture',
      partnerOrVenture: ventureForm.partnerOrVenture.trim() || 'Commercial Partner',
      principalAmount: principal,
      profitMode: ventureForm.profitMode,
      minRoiPercent: minRoi,
      maxRoiPercent: maxRoi,
      minProfit,
      maxProfit,
      expectedProfit,
      totalExpectedReturn: principal + expectedProfit,
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
    const isRange = v.profitMode === 'range' || (v.minRoiPercent !== undefined && v.maxRoiPercent !== undefined);
    const suggestedProfit = isRange && v.maxProfit ? v.maxProfit : v.expectedProfit;

    setConcludingVenture(v);
    setConcludeData({
      concludedDate: new Date().toISOString().split('T')[0],
      actualProfit: suggestedProfit,
      notes: `Successfully concluded. Principal ৳${v.principalAmount.toLocaleString()} & actual profit settled.`,
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
    <div className="screen-section space-y-5">
      
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
            {hasActiveProfitRange
              ? `+৳${totalActiveMinProfit.toLocaleString()} – ৳${totalActiveMaxProfit.toLocaleString()}`
              : `+৳${totalActiveMaxProfit.toLocaleString()}`}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {hasActiveProfitRange ? 'Expected Range' : 'Expected'}
          </div>
        </div>

        {/* Total Active Return */}
        <div className="theme-card p-3.5 rounded-xl border theme-border">
          <div className="theme-text-muted">Total Return</div>
          <div className="text-xl font-bold font-mono theme-text-main mt-1 tabular-nums">
            {hasActiveProfitRange
              ? `৳${(totalActivePrincipal + totalActiveMinProfit).toLocaleString()} – ৳${(totalActivePrincipal + totalActiveMaxProfit).toLocaleString()}`
              : `৳${(totalActivePrincipal + totalActiveMaxProfit).toLocaleString()}`}
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
            const projection = getVentureProfitProjection(v);

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
                      {isActive ? 'Target Profit' : 'Realized Profit'}
                    </span>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {isActive ? (
                        projection.hasRange ? (
                          <>
                            +৳{projection.minProfit.toLocaleString()} – ৳{projection.maxProfit.toLocaleString()}
                            <span className="block text-[10px] text-emerald-500/80 font-sans font-normal">
                              {projection.minRoiPercent}% – {projection.maxRoiPercent}% ROI · Estimated
                            </span>
                          </>
                        ) : (
                          <>
                            +৳{projection.maxProfit.toLocaleString()}
                            <span className="block text-[10px] theme-text-muted font-sans font-normal">
                              {v.principalAmount > 0 ? `${projection.maxRoiPercent}% ROI · Estimated` : 'Fixed'}
                            </span>
                          </>
                        )
                      ) : (
                        <>
                          +৳{(v.actualProfit !== undefined ? v.actualProfit : v.expectedProfit).toLocaleString()}
                          <span className="block text-[10px] text-slate-400 font-sans font-normal">Settled</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Total Return</span>
                    <span className="text-base font-bold theme-text-main tabular-nums">
                      {isActive && projection.hasRange ? (
                        `৳${(v.principalAmount + projection.minProfit).toLocaleString()} – ৳${(v.principalAmount + projection.maxProfit).toLocaleString()}`
                      ) : (
                        `৳${(v.principalAmount + (isActive ? projection.maxProfit : (v.actualProfit !== undefined ? v.actualProfit : v.expectedProfit))).toLocaleString()}`
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Timeline</span>
                    <div className="text-xs font-semibold theme-text-main mt-0.5">
                      {isActive ? (
                        <span>Matures {v.maturityDate || `${v.durationMonths || 6} Months`}</span>
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
                {inspectedIsRange && distributableMin !== distributableMax
                  ? `৳${distributableMin.toLocaleString()} – ৳${distributableMax.toLocaleString()}`
                  : `৳${distributableMax.toLocaleString()}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] theme-text-muted block font-sans">Per Unit</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                {inspectedIsRange && perUnitMin !== perUnitMax
                  ? `~৳${perUnitMin.toFixed(0)} – ৳${perUnitMax.toFixed(0)}`
                  : `৳${perUnitMax.toFixed(1)}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] theme-text-muted block font-sans">Club Retained</span>
              <span className="text-base font-bold theme-text-main tabular-nums">
                {inspectedIsRange && retainedClubMin !== retainedClubMax
                  ? `৳${retainedClubMin.toLocaleString()} – ৳${retainedClubMax.toLocaleString()}`
                  : `৳${retainedClubMax.toLocaleString()}`}
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
                  const capitalEquity = (m.units / totalActiveUnits) * inspectedVenture.principalAmount;

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
                        {inspectedIsRange && perUnitMin !== perUnitMax ? (
                          `৳${Math.round(m.units * perUnitMin).toLocaleString()} – ৳${Math.round(m.units * perUnitMax).toLocaleString()}`
                        ) : (
                          `৳${(m.units * perUnitMax).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`
                        )}
                      </td>
                      <td className="py-2 px-3 text-right theme-text-main tabular-nums">
                        {inspectedIsRange && perUnitMin !== perUnitMax ? (
                          `৳${Math.round(capitalEquity + m.units * perUnitMin).toLocaleString()} – ৳${Math.round(capitalEquity + m.units * perUnitMax).toLocaleString()}`
                        ) : (
                          `৳${(capitalEquity + m.units * perUnitMax).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        )}
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
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {inspectedIsRange && distributableMin !== distributableMax
                      ? `৳${distributableMin.toLocaleString()} – ৳${distributableMax.toLocaleString()}`
                      : `৳${distributableMax.toLocaleString()}`}
                  </td>
                  <td className="py-2.5 px-3 text-right theme-text-main tabular-nums">
                    {inspectedIsRange && distributableMin !== distributableMax
                      ? `৳${(inspectedVenture.principalAmount + distributableMin).toLocaleString()} – ৳${(inspectedVenture.principalAmount + distributableMax).toLocaleString()}`
                      : `৳${(inspectedVenture.principalAmount + distributableMax).toLocaleString()}`}
                  </td>
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

              {/* Financial Capital */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Principal Capital (BDT)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={ventureForm.principalAmount || ''}
                  onChange={e => handlePrincipalOrRoiChange({ principal: Number(e.target.value) })}
                  className="theme-input w-full px-3 py-1.5 rounded-lg font-mono font-bold"
                  required
                />
              </div>

              {/* Profit / Return Mode Toggle */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Return / Profit Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrincipalOrRoiChange({ profitMode: 'range' })}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                      ventureForm.profitMode === 'range'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    % ROI Range (Dynamic)
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrincipalOrRoiChange({ profitMode: 'fixed' })}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                      ventureForm.profitMode === 'fixed'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    Fixed Profit (৳)
                  </button>
                </div>
              </div>

              {/* Return Calculation Inputs */}
              {ventureForm.profitMode === 'range' ? (
                <div className="space-y-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border theme-border">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="theme-text-muted block mb-1">Min ROI (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={ventureForm.minRoiPercent ?? ''}
                        onChange={e => handlePrincipalOrRoiChange({ minRoi: Number(e.target.value) })}
                        className="theme-input w-full px-2.5 py-1.5 rounded-lg font-mono text-center font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="theme-text-muted block mb-1">Max ROI (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={ventureForm.maxRoiPercent ?? ''}
                        onChange={e => handlePrincipalOrRoiChange({ maxRoi: Number(e.target.value) })}
                        className="theme-input w-full px-2.5 py-1.5 rounded-lg font-mono text-center font-bold"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-1 border-t theme-border">
                    <span className="text-[11px] theme-text-muted font-sans">Projected Profit:</span>
                    <span className="font-bold text-emerald-500">
                      +৳{ventureForm.minProfit.toLocaleString()} – ৳{ventureForm.maxProfit.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] theme-text-muted font-mono text-right">
                    ~৳{Math.round((ventureForm.minRoiPercent || 0) * 1000).toLocaleString()} – ৳{Math.round((ventureForm.maxRoiPercent || 0) * 1000).toLocaleString()} / lakh
                  </div>
                </div>
              ) : (
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Expected Profit (BDT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={ventureForm.expectedProfit || ''}
                      onChange={e => handlePrincipalOrRoiChange({ fixedProfit: Number(e.target.value) })}
                      className="theme-input w-full px-3 py-1.5 rounded-lg font-mono font-bold text-emerald-500"
                      required
                    />
                    {ventureForm.principalAmount > 0 && ventureForm.expectedProfit > 0 && (
                      <span className="absolute right-3 top-1.5 text-[11px] font-mono text-emerald-400">
                        {((ventureForm.expectedProfit / ventureForm.principalAmount) * 100).toFixed(1)}% ROI
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Dates & Duration */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="theme-text-muted block mb-1">Start Date</label>
                  <DateField
                    label="Start date"
                    value={ventureForm.startDate}
                    onChange={value => setVentureForm(p => ({ ...p, startDate: value }))}
                    className="theme-input w-full px-2.5 py-1.5 rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1">Maturity Date</label>
                  <DateField
                    label="Maturity date"
                    value={ventureForm.maturityDate}
                    onChange={value => setVentureForm(p => ({ ...p, maturityDate: value }))}
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
                <DateField
                  label="Settlement date"
                  value={concludeData.concludedDate}
                  onChange={value => setConcludeData(p => ({ ...p, concludedDate: value }))}
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
                  Original target was {concludingVenture.profitMode === 'range' && concludingVenture.minProfit && concludingVenture.maxProfit && (concludingVenture.minProfit !== concludingVenture.maxProfit)
                    ? `৳${concludingVenture.minProfit.toLocaleString()} – ৳${concludingVenture.maxProfit.toLocaleString()} (${concludingVenture.minRoiPercent}% – ${concludingVenture.maxRoiPercent}% ROI)`
                    : `৳${concludingVenture.expectedProfit.toLocaleString()}`}.
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
