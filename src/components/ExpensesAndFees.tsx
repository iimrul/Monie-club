import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { Member, ExpenseRecord, PaymentMethod } from '../types';

export const ExpensesAndFees: React.FC = () => {
  const { 
    expenses, 
    feeCollections, 
    members,
    summary,
    deleteExpense,
    collectMemberFee,
    setMemberFeeStatus,
  } = useClub();

  // Tab: Fee Collection vs Operating Expenses
  const [activeTab, setActiveTab] = useState<'fees' | 'expenses'>('fees');
  
  // Filter for Fee Collection: All | Unpaid | Paid
  const [feeStatusFilter, setFeeStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Expense confirmation modal state
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Fee Modal state
  const [feeModalItem, setFeeModalItem] = useState<{
    member: Member;
    required: number;
    paid: number;
    due: number;
    isPaid: boolean;
    isPartial: boolean;
    isUnpaid: boolean;
    latestCollection: (typeof feeCollections)[0] | null;
  } | null>(null);
  const [feeStatusInput, setFeeStatusInput] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [feeAmountInput, setFeeAmountInput] = useState<number>(0);
  const [feeDateInput, setFeeDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [feeMethodInput, setFeeMethodInput] = useState<PaymentMethod>('Cash');
  const [feeNotesInput, setFeeNotesInput] = useState<string>('');

  // Mandatory rule: ৳100 per member unit
  const FEE_PER_UNIT = 100;

  // Compute fee details for each member
  const memberFeeList = useMemo(() => {
    return members.map(m => {
      const required = m.units * FEE_PER_UNIT;
      const collections = feeCollections.filter(f => f.memberId === m.id && f.status === 'Paid');
      const paid = collections.reduce((sum, f) => sum + f.feeAmount, 0);
      const due = Math.max(0, required - paid);
      const isPaid = paid >= required;
      const isPartial = paid > 0 && paid < required;
      const isUnpaid = paid === 0;

      return {
        member: m,
        required,
        paid,
        due,
        isPaid,
        isPartial,
        isUnpaid,
        latestCollection: collections[0] || null,
      };
    });
  }, [members, feeCollections]);

  // Aggregate Metrics
  const totalActiveUnits = useMemo(() => {
    return members.filter(m => m.status === 'Active').reduce((sum, m) => sum + m.units, 0);
  }, [members]);

  const totalRequiredFees = totalActiveUnits * FEE_PER_UNIT;
  const totalCollectedFees = summary.totalFeeCollected;
  const totalExpenses = summary.totalExpenses;
  const netFeeBalance = summary.feeBalance;
  const totalOutstandingDue = memberFeeList
    .filter(i => i.member.status === 'Active')
    .reduce((sum, i) => sum + i.due, 0);

  const unpaidCount = memberFeeList.filter(i => i.member.status === 'Active' && i.due > 0).length;
  const paidCount = memberFeeList.filter(i => i.member.status === 'Active' && i.due === 0).length;

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return memberFeeList.filter(({ member, isPaid, isUnpaid, isPartial }) => {
      if (feeStatusFilter === 'paid' && !isPaid) return false;
      if (feeStatusFilter === 'unpaid' && isPaid) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return member.name.toLowerCase().includes(q) || member.contactNumber.includes(q);
      }
      return true;
    });
  }, [memberFeeList, feeStatusFilter, searchQuery]);

  const handleOpenFeeModal = (item: typeof memberFeeList[0]) => {
    setFeeModalItem(item);
    const initialStatus = item.isPaid ? 'Paid' : item.isPartial ? 'Partial' : 'Unpaid';
    setFeeStatusInput(initialStatus);
    setFeeAmountInput(item.paid > 0 ? item.paid : item.required);
    setFeeDateInput(item.latestCollection?.date || new Date().toISOString().split('T')[0]);
    setFeeMethodInput(item.latestCollection?.paymentMethod || 'Cash');
    setFeeNotesInput(item.latestCollection?.notes || '');
  };

  const handleSelectStatus = (status: 'Paid' | 'Unpaid' | 'Partial') => {
    if (!feeModalItem) return;
    setFeeStatusInput(status);
    if (status === 'Unpaid') {
      setFeeAmountInput(0);
    } else if (status === 'Paid') {
      setFeeAmountInput(feeModalItem.required);
    }
  };

  const handleAmountChange = (val: number) => {
    if (!feeModalItem) return;
    const safeVal = Math.max(0, val);
    setFeeAmountInput(safeVal);
    if (safeVal === 0) {
      setFeeStatusInput('Unpaid');
    } else if (safeVal >= feeModalItem.required) {
      setFeeStatusInput('Paid');
    } else {
      setFeeStatusInput('Partial');
    }
  };

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeModalItem) return;

    const amount = Number(feeAmountInput) || 0;
    const isMarkingUnpaid = feeStatusInput === 'Unpaid' || amount === 0;

    if (isMarkingUnpaid) {
      setMemberFeeStatus(feeModalItem.member.id, 'Unpaid');
      setSuccessMessage(`Registration fee for ${feeModalItem.member.name} marked as Unpaid.`);
    } else {
      setMemberFeeStatus(feeModalItem.member.id, 'Paid', {
        feeAmount: amount,
        date: feeDateInput || new Date().toISOString().split('T')[0],
        paymentMethod: feeMethodInput,
        notes: feeNotesInput.trim() || undefined,
      });
      setSuccessMessage(`Registration fee updated to ৳${amount.toLocaleString()} for ${feeModalItem.member.name}.`);
    }

    setTimeout(() => setSuccessMessage(null), 4000);
    setFeeModalItem(null);
  };

  return (
    <div className="space-y-5">
      
      {/* Success Notification Banner (Visible across all tabs) */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">✓</span>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b theme-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main">
            Costs & Registration Fees
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Operational expenditures and member registration fee collections
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl theme-card-subtle border theme-border text-xs">
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'fees'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <span>Registration Fees</span>
            <span className="text-[10px] font-mono opacity-80">({memberFeeList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'theme-text-muted hover:theme-text-main'
            }`}
          >
            <span>Operating Expenses</span>
            <span className="text-[10px] font-mono opacity-80">({expenses.length})</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Fees Collected */}
        <div className="theme-card p-3.5 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Fees Collected</div>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1 tabular-nums">
            ৳{totalCollectedFees.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {paidCount} Paid
          </div>
        </div>

        {/* Card 2: Operating Costs */}
        <div className="theme-card p-3.5 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Operating Costs</div>
          <div className="text-xl font-bold font-mono text-rose-500 mt-1 tabular-nums">
            − ৳{totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {expenses.length} Records (৳1,729)
          </div>
        </div>

        {/* Card 3: Net Reserve */}
        <div className="theme-card p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="text-xs text-emerald-400 font-semibold">Net Admin Reserve</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            ৳{netFeeBalance.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            Fee Surplus
          </div>
        </div>

        {/* Card 4: Pending Dues */}
        <div className="theme-card p-3.5 rounded-xl border theme-border">
          <div className="text-xs theme-text-muted">Pending Registration</div>
          <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${
            totalOutstandingDue > 0 ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            ৳{totalOutstandingDue.toLocaleString()}
          </div>
          <div className="text-[11px] theme-text-muted mt-0.5">
            {unpaidCount} Members
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: FEE COLLECTION (Read-Only) */}
      {/* ========================================================================= */}
      {activeTab === 'fees' && (
        <div className="space-y-3.5">
          
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFeeStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
                  feeStatusFilter === 'all'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'theme-input theme-text-muted hover:theme-text-main'
                }`}
              >
                All ({members.length})
              </button>

              <button
                onClick={() => setFeeStatusFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors flex items-center gap-1.5 ${
                  feeStatusFilter === 'unpaid'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'theme-input theme-text-muted hover:theme-text-main'
                }`}
              >
                <span>Unpaid</span>
                {unpaidCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                    {unpaidCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFeeStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-colors ${
                  feeStatusFilter === 'paid'
                    ? 'bg-emerald-700 text-white font-semibold'
                    : 'theme-input theme-text-muted hover:theme-text-main'
                }`}
              >
                Paid ({paidCount})
              </button>
            </div>

            <div className="w-full sm:w-60">
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="theme-input w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Member Fee Table */}
          <div className="theme-card rounded-xl overflow-hidden border theme-border shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                  <tr>
                    <th className="py-2.5 px-3.5">Member Name</th>
                    <th className="py-2.5 px-3 text-center">Units</th>
                    <th className="py-2.5 px-3 text-right">Fee (৳100/u)</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3.5">Payment Date</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center theme-text-muted">
                        No members found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map(item => {
                      const { member, required, paid, due, isPaid, isPartial, latestCollection } = item;

                      return (
                        <tr key={member.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium theme-text-main">
                            <div>{member.name}</div>
                            <div className="text-[11px] theme-text-muted font-mono">{member.contactNumber}</div>
                          </td>

                          <td className="py-2.5 px-3 text-center theme-text-muted font-mono">
                            {member.units}
                          </td>

                          <td className="py-2.5 px-3 text-right theme-text-muted font-mono tabular-nums">
                            ৳{required.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-500 tabular-nums">
                            ৳{paid.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {due > 0 ? (
                              <span className="text-amber-500 font-bold">৳{due.toLocaleString()}</span>
                            ) : (
                              <span className="theme-text-muted">৳0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Paid ✓
                              </span>
                            ) : isPartial ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Partial
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                Unpaid
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3.5 text-xs theme-text-muted font-mono">
                            {latestCollection ? latestCollection.date : member.registrationDate}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenFeeModal(item)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold theme-input hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-xs"
                              title={`Edit registration fee for ${member.name}`}
                            >
                              <span>✏️</span>
                              <span>Edit</span>
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: OPERATING EXPENSES */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold theme-text-main">
              Official Operating Expenses (Total: ৳{totalExpenses.toLocaleString()})
            </h2>
            <span className="text-xs theme-text-muted font-mono">
              {expenses.length} Records Verified
            </span>
          </div>

          <div className="theme-card rounded-xl overflow-hidden border theme-border shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="theme-card-subtle theme-text-muted font-mono text-[11px] border-b theme-border">
                  <tr>
                    <th className="py-2.5 px-3">Title & Purpose</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 font-mono">Date</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Receipt / Ref</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center theme-text-muted">
                        No operating expense records found.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 theme-text-main font-medium">
                          <div>{e.title}</div>
                          {e.notes && <div className="text-[11px] theme-text-muted mt-0.5">{e.notes}</div>}
                        </td>
                        <td className="py-2.5 px-3 theme-text-muted">{e.category}</td>
                        <td className="py-2.5 px-3 font-mono theme-text-muted text-[11px]">{e.date}</td>
                        <td className="py-2.5 px-3 theme-text-muted">{e.paymentMethod}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] theme-text-muted">{e.receiptNo || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          ৳{e.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(e)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-500/25 cursor-pointer transition-colors shadow-xs"
                            title="Delete this expense record"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Warning Modal */}
      {expenseToDelete && (
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
                    Delete Expense Record?
                  </h3>
                  <p className="text-xs theme-text-muted mt-0.5">
                    Permanent removal from operating expenses
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="mt-4 space-y-3.5 text-xs">
              {/* Item Details Summary */}
              <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="theme-text-muted">Expense Item:</span>
                  <span className="font-bold theme-text-main text-right truncate max-w-[210px]">
                    {expenseToDelete.title}
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="theme-text-muted">Category:</span>
                  <span className="theme-text-main font-medium">{expenseToDelete.category}</span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="theme-text-muted">Date:</span>
                  <span className="theme-text-main">{expenseToDelete.date}</span>
                </div>
                <div className="flex justify-between items-center font-mono pt-1.5 border-t theme-border">
                  <span className="theme-text-muted">Amount to Remove:</span>
                  <span className="font-bold text-rose-500 text-sm">
                    ৳{expenseToDelete.amount.toLocaleString()} BDT
                  </span>
                </div>
              </div>

              {/* Warning Alert Banner */}
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex gap-2.5 items-start">
                <span className="text-base shrink-0 leading-none">⚠️</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-rose-500">Warning: Action Cannot Be Undone</div>
                  <div className="text-[11px] leading-relaxed">
                    Deleting this expense will reduce total operating costs by ৳{expenseToDelete.amount.toLocaleString()} and immediately increase the net admin fee reserve balance.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  className="px-4 py-2 text-xs font-medium theme-input theme-text-main rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const deletedTitle = expenseToDelete.title;
                    const deletedAmount = expenseToDelete.amount;
                    deleteExpense(expenseToDelete.id);
                    setExpenseToDelete(null);
                    setSuccessMessage(`৳${deletedAmount.toLocaleString()} expense ("${deletedTitle}") removed successfully.`);
                    setTimeout(() => setSuccessMessage(null), 4000);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>Yes, Delete Expense</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Fee Modal */}
      {feeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="theme-card rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative border border-emerald-500/30">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-lg font-bold shrink-0">
                  ✏️
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold theme-text-main">
                    Edit Registration Fee
                  </h3>
                  <p className="text-xs text-emerald-500 mt-0.5 font-medium">
                    {feeModalItem.member.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeeModalItem(null)}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="mt-4 space-y-4 text-xs">
              {/* Member Fee Summary */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="theme-text-muted">Member Units:</span>
                  <span className="font-bold theme-text-main">
                    {feeModalItem.member.units} {feeModalItem.member.units === 1 ? 'Unit' : 'Units'} (৳100/unit)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="theme-text-muted">Required Standard Fee:</span>
                  <span className="theme-text-main font-semibold">৳{feeModalItem.required.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="theme-text-muted">Currently Recorded Paid:</span>
                  <span className={`font-semibold ${feeModalItem.paid > 0 ? 'text-emerald-500' : 'theme-text-muted'}`}>
                    ৳{feeModalItem.paid.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="theme-text-main font-semibold block mb-1.5">
                  Payment Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectStatus('Paid')}
                    className={`py-2 px-2 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                      feeStatusInput === 'Paid'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                        : 'theme-card-subtle theme-border theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    ✓ Paid (৳{feeModalItem.required})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectStatus('Unpaid')}
                    className={`py-2 px-2 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                      feeStatusInput === 'Unpaid'
                        ? 'bg-rose-600 text-white border-rose-600 font-semibold shadow-xs'
                        : 'theme-card-subtle theme-border theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    ✕ Unpaid (৳0)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectStatus('Partial')}
                    className={`py-2 px-2 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                      feeStatusInput === 'Partial'
                        ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-xs'
                        : 'theme-card-subtle theme-border theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    Partial / Custom
                  </button>
                </div>
              </div>

              {/* Fee Amount to Record */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="theme-text-main font-semibold">
                    Amount Paid (৳ BDT)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAmountChange(feeModalItem.required)}
                      className="text-[10px] text-emerald-500 hover:underline cursor-pointer font-mono font-medium"
                    >
                      Set Full (৳{feeModalItem.required})
                    </button>
                    <span className="theme-text-muted text-[10px]">|</span>
                    <button
                      type="button"
                      onClick={() => handleAmountChange(0)}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer font-mono font-medium"
                    >
                      Set ৳0 (Unpaid)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={feeAmountInput}
                  onChange={e => handleAmountChange(Number(e.target.value))}
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-sm font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Payment Date */}
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Payment Date</label>
                  <input
                    type="date"
                    value={feeDateInput}
                    onChange={e => setFeeDateInput(e.target.value)}
                    className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="theme-text-muted block mb-1 font-medium">Payment Channel</label>
                  <select
                    value={feeMethodInput}
                    onChange={e => setFeeMethodInput(e.target.value as PaymentMethod)}
                    className="theme-input w-full px-3 py-2 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Club AC">Club Central AC</option>
                    <option value="Bkash">bKash</option>
                    <option value="CellFin">CellFin</option>
                    <option value="Nagad">Nagad</option>
                    <option value="IBBL">IBBL</option>
                    <option value="UCB">UCB</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="theme-text-muted block mb-1 font-medium">Notes / Receipt Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at general meeting"
                  value={feeNotesInput}
                  onChange={e => setFeeNotesInput(e.target.value)}
                  className="theme-input w-full px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setFeeModalItem(null)}
                  className="px-4 py-2 text-xs font-medium theme-input theme-text-main rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>💾</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
