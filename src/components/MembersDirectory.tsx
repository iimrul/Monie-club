import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { Member, BloodGroup } from '../types';

export const MembersDirectory: React.FC = () => {
  const { 
    members, 
    monthlyPayments, 
    addMember, 
    updateMember, 
    deleteMember, 
    summary, 
    getMemberFinancials,
    currentAdminUser,
    setPortalMode
  } = useClub();
  
  const isAdmin = Boolean(currentAdminUser);
  
  // Status Filter: 'Active' | 'Inactive' | 'All'
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'All'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodFilter, setBloodFilter] = useState('All');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState<{
    name: string;
    units: number;
    contactNumber: string;
    bloodGroup: BloodGroup;
    permanentAddress: string;
    status: 'Active' | 'Inactive';
    registrationDate: string;
    inactiveDate: string;
    durationActiveMonths: number;
    tenureText: string;
    leaveReason: string;
  }>({
    name: '',
    units: 1,
    contactNumber: '',
    bloodGroup: 'O+',
    permanentAddress: 'Padua, Lohagara',
    status: 'Active',
    registrationDate: '2025-10-01',
    inactiveDate: '',
    durationActiveMonths: 6,
    tenureText: '',
    leaveReason: '',
  });

  // Calculate Active vs Inactive counts & totals
  const activeMembersList = useMemo(() => members.filter(m => m.status === 'Active'), [members]);
  const inactiveMembersList = useMemo(() => members.filter(m => m.status === 'Inactive'), [members]);

  const activeUnitsTotal = useMemo(() => {
    return activeMembersList.reduce((sum, m) => sum + m.units, 0);
  }, [activeMembersList]);

  const inactiveUnitsTotal = useMemo(() => {
    return inactiveMembersList.reduce((sum, m) => sum + m.units, 0);
  }, [inactiveMembersList]);

  // Filter members based on status tab, search, and blood group
  const filtered = useMemo(() => {
    return members.filter(m => {
      // 1. Status Filter
      if (statusFilter !== 'All' && m.status !== statusFilter) {
        return false;
      }

      // 2. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matches = 
          m.name.toLowerCase().includes(q) ||
          m.contactNumber.includes(q) ||
          m.permanentAddress.toLowerCase().includes(q) ||
          (m.tenureText && m.tenureText.toLowerCase().includes(q)) ||
          (m.leaveReason && m.leaveReason.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 3. Blood Group Filter
      if (bloodFilter !== 'All' && m.bloodGroup !== bloodFilter) {
        return false;
      }

      return true;
    });
  }, [members, statusFilter, searchQuery, bloodFilter]);

  // Helper to get formatted tenure text for display
  const getTenureDisplay = (m: Member) => {
    if (m.tenureText) return m.tenureText;
    if (m.durationActiveMonths) return `${m.durationActiveMonths} Months Active`;
    if (m.registrationDate && m.inactiveDate) {
      return `${m.registrationDate} to ${m.inactiveDate}`;
    }
    return m.status === 'Inactive' ? 'Former Member' : 'Active Member';
  };

  const handleOpenAdd = () => {
    if (!currentAdminUser) {
      if (confirm('Admin Sign-In Required: All admins can add and edit members. Would you like to sign in as an Admin now?')) {
        setPortalMode('admin');
      }
      return;
    }
    setEditingId(null);
    setShowDeleteConfirm(false);
    setFormData({
      name: '',
      units: 1,
      contactNumber: '',
      bloodGroup: 'O+',
      permanentAddress: 'Padua, Lohagara',
      status: 'Active',
      registrationDate: new Date().toISOString().split('T')[0],
      inactiveDate: '',
      durationActiveMonths: 0,
      tenureText: '',
      leaveReason: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    if (!currentAdminUser) {
      if (confirm('Admin Sign-In Required: All admins can add and edit members. Would you like to sign in as an Admin now?')) {
        setPortalMode('admin');
      }
      return;
    }
    setEditingId(m.id);
    setShowDeleteConfirm(false);
    setFormData({
      name: m.name,
      units: m.units,
      contactNumber: m.contactNumber,
      bloodGroup: m.bloodGroup,
      permanentAddress: m.permanentAddress,
      status: m.status,
      registrationDate: m.registrationDate || '2025-10-01',
      inactiveDate: m.inactiveDate || '',
      durationActiveMonths: m.durationActiveMonths || (m.status === 'Inactive' ? 6 : 0),
      tenureText: m.tenureText || '',
      leaveReason: m.leaveReason || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-compose tenureText if inactive and empty
    let computedTenure = formData.tenureText;
    if (formData.status === 'Inactive' && !computedTenure) {
      if (formData.durationActiveMonths) {
        computedTenure = `${formData.durationActiveMonths} Months Active`;
      }
    }

    const payload = {
      ...formData,
      tenureText: computedTenure,
    };

    if (editingId) {
      updateMember(editingId, payload);
    } else {
      addMember(payload);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b theme-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main">
            Members Directory
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Arranged by active shareholders and inactive former members with documented tenure
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <span>+</span> Add Member
        </button>
      </div>

      {/* 3 Metric Cards Distinguishing Active vs Inactive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Active Members Card */}
        <div 
          onClick={() => setStatusFilter('Active')}
          className={`theme-card p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Active' 
              ? 'border-emerald-500 ring-1 ring-emerald-500/30' 
              : 'theme-border hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Active Members</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500 mt-1 tabular-nums">
            {activeMembersList.length}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {activeUnitsTotal} Units
          </div>
        </div>

        {/* Inactive Members Card */}
        <div 
          onClick={() => setStatusFilter('Inactive')}
          className={`theme-card p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Inactive' 
              ? 'border-slate-400 ring-1 ring-slate-400/30' 
              : 'theme-border hover:border-slate-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Inactive Members</span>
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          </div>
          <div className="text-2xl font-bold font-mono theme-text-main mt-1 tabular-nums">
            {inactiveMembersList.length}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {inactiveUnitsTotal} Former Units
          </div>
        </div>

        {/* Total Registered Card */}
        <div 
          onClick={() => setStatusFilter('All')}
          className={`theme-card p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'All' 
              ? 'border-sky-500 ring-1 ring-sky-500/30' 
              : 'theme-border hover:border-sky-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="theme-text-muted font-medium">Total Registered</span>
            <span className="text-[10px] font-mono text-sky-400">All Time</span>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-500 mt-1 tabular-nums">
            {members.length}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            Full Roster
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Active / Inactive / All segmented buttons + search + blood */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/5 dark:bg-white/5 p-2 rounded-xl border theme-border">
        
        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setStatusFilter('Active')}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
              statusFilter === 'Active'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Active ({activeMembersList.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('Inactive')}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
              statusFilter === 'Inactive'
                ? 'bg-slate-700 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Inactive ({inactiveMembersList.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
              statusFilter === 'All'
                ? 'bg-slate-600 text-white font-semibold shadow-xs'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            All ({members.length})
          </button>
        </div>

        {/* Search & Blood Group */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="Search member..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="theme-input w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={bloodFilter}
            onChange={e => setBloodFilter(e.target.value)}
            className="theme-input px-2.5 py-1.5 rounded-lg text-xs"
          >
            <option value="All">All Blood</option>
            <option value="O+">O+</option>
            <option value="A+">A+</option>
            <option value="B+">B+</option>
            <option value="AB+">AB+</option>
          </select>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* VIEW A: INACTIVE / FORMER MEMBERS TABLE (With Tenure & Exit Details) */}
      {/* ========================================================================= */}
      {statusFilter === 'Inactive' ? (
        <div className="theme-card rounded-xl overflow-hidden border theme-border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2.5 px-3.5">Member</th>
                  <th className="py-2.5 px-3 text-center">Former Units</th>
                  <th className="py-2.5 px-3 text-right">Money in Club</th>
                  <th className="py-2.5 px-3">Tenure</th>
                  <th className="py-2.5 px-3 font-mono text-[11px]">Joined</th>
                  <th className="py-2.5 px-3 font-mono text-[11px]">Left</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center theme-text-muted">
                      No inactive members found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(m => {
                    const fin = getMemberFinancials(m.id);

                    return (
                      <tr key={m.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {/* Name & Contact */}
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold theme-text-main flex items-center gap-1.5">
                            <span>{m.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-500/15 text-slate-400 border border-slate-500/25">
                              Inactive
                            </span>
                          </div>
                          <div className="text-[11px] theme-text-muted font-mono mt-0.5">
                            {m.contactNumber} · {m.bloodGroup}
                          </div>
                        </td>

                        {/* Former Units */}
                        <td className="py-2.5 px-3 text-center font-mono font-semibold theme-text-main">
                          {m.units}
                        </td>

                        {/* Money in Club */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono font-bold text-slate-300 tabular-nums">
                            ৳{fin.totalPaid.toLocaleString()}
                          </div>
                          <div className="text-[10px] theme-text-muted font-mono">
                            Settled
                          </div>
                        </td>

                        {/* Tenure / How Long They Were Part of the Club */}
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                            {getTenureDisplay(m)}
                          </span>
                        </td>

                        {/* Join Date */}
                        <td className="py-2.5 px-3 font-mono theme-text-muted text-[11px]">
                          {m.registrationDate || '2025-10-01'}
                        </td>

                        {/* Departure Date */}
                        <td className="py-2.5 px-3 font-mono text-rose-400 text-[11px]">
                          {m.inactiveDate || 'Settled'}
                        </td>

                        {/* Reason / Notes */}
                        <td className="py-2.5 px-3 theme-text-muted text-[11px]">
                          <div className="theme-text-main font-medium">
                            {m.leaveReason || 'Settled'}
                          </div>
                          {m.notes && <div className="text-[10px] theme-text-muted mt-0.5">{m.notes}</div>}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedMember(m)}
                              className="theme-input px-2.5 py-1 rounded text-xs hover:theme-text-main cursor-pointer"
                            >
                              History
                            </button>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="theme-input px-2.5 py-1 rounded text-xs hover:theme-text-main cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
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
        /* ========================================================================= */
        /* VIEW B: ACTIVE MEMBERS (Or ALL Members with Clear Status Distinctions) */
        /* ========================================================================= */
        <div className="theme-card rounded-xl overflow-hidden border theme-border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                <tr>
                  <th className="py-2.5 px-3.5">Member</th>
                  <th className="py-2.5 px-2 text-center">Units</th>
                  <th className="py-2.5 px-3 text-right">Money in Club</th>
                  <th className="py-2.5 px-2 text-center">Monthly</th>
                  <th className="py-2.5 px-2 text-center">Blood</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Dues</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center theme-text-muted">
                      No members match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map(m => {
                    const isInactive = m.status === 'Inactive';
                    const fin = getMemberFinancials(m.id);

                    return (
                      <tr key={m.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {/* Name */}
                        <td className="py-2.5 px-3.5 font-semibold theme-text-main">
                          <div className="flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {isInactive && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-500/15 text-slate-400 border border-slate-500/25">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] theme-text-muted font-mono mt-0.5">
                            {isInactive ? `Tenure: ${getTenureDisplay(m)}` : `Member since ${m.registrationDate || '2025-10-01'}`}
                          </div>
                        </td>

                        {/* Units */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold theme-text-main">
                          {m.units}
                        </td>

                        {/* Money in Club */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-mono font-bold text-emerald-500 tabular-nums">
                            ৳{fin.totalPaid.toLocaleString()}
                          </span>
                        </td>

                        {/* Monthly Contribution */}
                        <td className="py-2.5 px-2 text-center font-mono theme-text-muted tabular-nums">
                          {isInactive ? (
                            <span className="text-slate-400 italic">Settled</span>
                          ) : (
                            `৳${(m.units * 1000).toLocaleString()}`
                          )}
                        </td>

                        {/* Blood */}
                        <td className="py-2.5 px-2 text-center font-mono font-semibold text-rose-400">
                          {m.bloodGroup}
                        </td>

                        {/* Contact */}
                        <td className="py-2.5 px-3 font-mono theme-text-muted">
                          {m.contactNumber}
                        </td>

                        {/* Status / Tenure */}
                        <td className="py-2.5 px-3 text-center">
                          {isInactive ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono">
                              ⏳ {getTenureDisplay(m)}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-emerald-500 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Active</span>
                            </div>
                          )}
                        </td>

                        {/* Dues */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                          {m.totalDueAmount > 0 ? (
                            <span className="text-amber-500">৳{m.totalDueAmount.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-500 font-normal">৳0</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedMember(m)}
                              className="theme-input px-2.5 py-1 rounded text-xs hover:theme-text-main cursor-pointer"
                              title="View member contribution payment history"
                            >
                              History
                            </button>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="theme-input px-2.5 py-1 rounded text-xs hover:theme-text-main cursor-pointer"
                              title="Edit member details"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MEMBER HISTORY MODAL (With Inactive Tenure Details if Inactive) */}
      {/* ========================================================================= */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card rounded-2xl w-full max-w-lg p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto border theme-border animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b theme-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold theme-text-main">{selectedMember.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                    selectedMember.status === 'Active' 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                  }`}>
                    {selectedMember.status}
                  </span>
                </div>
                <p className="text-xs theme-text-muted mt-0.5">
                  {selectedMember.units} {selectedMember.units === 1 ? 'unit' : 'units'} · Contact: {selectedMember.contactNumber} · Blood: {selectedMember.bloodGroup}
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="theme-input px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Special Member Financial Summary Strip */}
            {(() => {
              const fin = getMemberFinancials(selectedMember.id);
              return (
                <div className="my-3 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border theme-border text-xs font-mono">
                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Money in Club</span>
                    <span className="text-base font-bold text-emerald-500 tabular-nums">
                      ৳{fin.totalPaid.toLocaleString()}
                    </span>
                    <span className="text-[10px] theme-text-muted block font-sans mt-0.5">
                      {fin.paidMonthsCount} mo paid
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Monthly Rate</span>
                    <span className="text-base font-bold theme-text-main tabular-nums">
                      ৳{(selectedMember.units * 1000).toLocaleString()}
                    </span>
                    <span className="text-[10px] theme-text-muted block font-sans mt-0.5">
                      {selectedMember.units} {selectedMember.units === 1 ? 'unit' : 'units'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] theme-text-muted block font-sans">Pending Dues</span>
                    <span className={`text-base font-bold tabular-nums ${fin.totalDue > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      ৳{fin.totalDue.toLocaleString()}
                    </span>
                    <span className="text-[10px] theme-text-muted block font-sans mt-0.5">
                      {selectedMember.monthsPending > 0 ? `${selectedMember.monthsPending} mo due` : 'Cleared'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Special Inactive Tenure Callout Banner if Inactive */}
            {selectedMember.status === 'Inactive' && (
              <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-amber-400 font-bold">
                  <span>Archived Former Member</span>
                  <span className="font-mono">⏳ {getTenureDisplay(selectedMember)}</span>
                </div>
                <div className="text-[11px] theme-text-muted space-y-0.5">
                  <div>Joined: <span className="theme-text-main font-mono">{selectedMember.registrationDate || '2025-10-01'}</span></div>
                  <div>Left Club: <span className="theme-text-main font-mono">{selectedMember.inactiveDate || 'Settled'}</span></div>
                  {selectedMember.leaveReason && (
                    <div>Reason: <span className="theme-text-main italic">"{selectedMember.leaveReason}"</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Contribution History */}
            <div className="mt-3">
              <h4 className="text-xs font-semibold theme-text-main mb-2">Monthly Contribution Records</h4>
              <div className="theme-card rounded-lg overflow-hidden border theme-border">
                <table className="w-full text-left text-xs">
                  <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                    <tr>
                      <th className="py-2 px-2.5">Month</th>
                      <th className="py-2 px-2.5 text-right">Paid</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border font-mono">
                    {monthlyPayments.filter(p => p.memberId === selectedMember.id).map(p => (
                      <tr key={p.id}>
                        <td className="py-1.5 px-2.5 theme-text-main font-sans">{p.monthLabel}</td>
                        <td className="py-1.5 px-2.5 text-right tabular-nums">
                          {p.status === 'Paid' ? `৳${p.amountPaid}` : '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                            p.status === 'Paid' 
                              ? 'text-emerald-500 bg-emerald-500/10' 
                              : 'text-amber-500 bg-amber-500/10'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 theme-text-muted text-[11px]">{p.paymentMethod || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 mt-4 border-t theme-border">
              <button
                onClick={() => setSelectedMember(null)}
                className="theme-input px-3.5 py-1.5 rounded-lg text-xs hover:theme-text-main cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT MEMBER MODAL (With Inactive Dates & Tenure Configuration) */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card rounded-2xl w-full max-w-md p-5 shadow-2xl relative border theme-border animate-fade-in">
            <h3 className="text-sm font-bold theme-text-main pb-2 border-b theme-border">
              {editingId ? 'Edit Member Details' : 'Add New Member'}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              
              {/* Full Name */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="theme-input w-full px-3 py-1.5 rounded-lg"
                  required
                />
              </div>

              {/* Units & Blood */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="theme-text-muted block mb-1">Share Units (৳1,000/u)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.units}
                    onChange={e => setFormData(p => ({ ...p, units: Number(e.target.value) || 1 }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value as BloodGroup }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg font-mono"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="theme-text-muted block mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={e => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="theme-text-muted block mb-1">Permanent Address</label>
                  <input
                    type="text"
                    value={formData.permanentAddress}
                    onChange={e => setFormData(p => ({ ...p, permanentAddress: e.target.value }))}
                    className="theme-input w-full px-3 py-1.5 rounded-lg"
                    required
                  />
                </div>
              </div>

              {/* Member Status: Active vs Inactive */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Membership Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, status: 'Active' }))}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                      formData.status === 'Active'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    ✓ Active Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, status: 'Inactive' }))}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                      formData.status === 'Inactive'
                        ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    ✗ Inactive / Former
                  </button>
                </div>
              </div>

              {/* If Inactive, show tenure, departure date & reason fields */}
              {formData.status === 'Inactive' && (
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border theme-border space-y-2.5">
                  <span className="text-[11px] font-semibold text-amber-400 block">
                    Inactive Member Tenure Configuration
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="theme-text-muted block mb-1">Join Date</label>
                      <input
                        type="date"
                        value={formData.registrationDate}
                        onChange={e => setFormData(p => ({ ...p, registrationDate: e.target.value }))}
                        className="theme-input w-full px-2.5 py-1 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="theme-text-muted block mb-1">Left Date</label>
                      <input
                        type="date"
                        value={formData.inactiveDate}
                        onChange={e => setFormData(p => ({ ...p, inactiveDate: e.target.value }))}
                        className="theme-input w-full px-2.5 py-1 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="theme-text-muted block mb-1">Active Duration (Months)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={formData.durationActiveMonths || ''}
                        onChange={e => setFormData(p => ({ ...p, durationActiveMonths: Number(e.target.value) || 0 }))}
                        placeholder="e.g. 8"
                        className="theme-input w-full px-2.5 py-1 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="theme-text-muted block mb-1">Tenure Summary Label</label>
                      <input
                        type="text"
                        value={formData.tenureText}
                        onChange={e => setFormData(p => ({ ...p, tenureText: e.target.value }))}
                        placeholder="e.g. 8 Months (Oct 2025 – Jun 2026)"
                        className="theme-input w-full px-2.5 py-1 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="theme-text-muted block mb-1">Departure Reason</label>
                    <input
                      type="text"
                      value={formData.leaveReason}
                      onChange={e => setFormData(p => ({ ...p, leaveReason: e.target.value }))}
                      placeholder="e.g. Settled units & account cleared"
                      className="theme-input w-full px-2.5 py-1 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Modal Bottom Actions */}
              <div className="flex justify-between items-center pt-3 border-t theme-border">
                {editingId ? (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400 text-xs font-semibold">Delete member?</span>
                      <button
                        type="button"
                        onClick={() => {
                          deleteMember(editingId);
                          setIsFormOpen(false);
                          setShowDeleteConfirm(false);
                        }}
                        className="px-2 py-0.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-0.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-rose-400 hover:text-rose-300 text-xs hover:underline cursor-pointer"
                    >
                      Delete Member
                    </button>
                  )
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-3 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
