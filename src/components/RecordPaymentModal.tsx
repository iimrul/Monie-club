import React, { useState, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { MonthKey, PaymentMethod } from '../types';
import { 
  getMemberDuePayments, 
  getCurrentDateString, 
  getCurrentMonthKey 
} from '../services/paymentDueManager';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill?: {
    memberId?: string;
    monthKey?: MonthKey;
  };
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  prefill,
}) => {
  const { 
    members, 
    months, 
    monthlyPayments, 
    recordPayment, 
    batchCollectMemberDues, 
    quickAdvancePayMember, 
    addMonth 
  } = useClub();
  
  const activeMembers = members.filter(m => m.status === 'Active');
  
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    prefill?.memberId || (activeMembers[0]?.id || '')
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<MonthKey>(
    prefill?.monthKey || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Club AC');
  const [paymentDate, setPaymentDate] = useState<string>(
    getCurrentDateString()
  );
  const [trxId, setTrxId] = useState('');

  // Auto-detect next unpaid due month when member changes
  useEffect(() => {
    if (prefill?.memberId) {
      setSelectedMemberId(prefill.memberId);
    }
  }, [prefill?.memberId]);

  useEffect(() => {
    if (prefill?.monthKey) {
      setSelectedMonthKey(prefill.monthKey);
      return;
    }
    if (!selectedMemberId) return;

    // Find first unpaid due month up to current calendar month
    const memberDueSlots = getMemberDuePayments(selectedMemberId, monthlyPayments);
    if (memberDueSlots.length > 0) {
      setSelectedMonthKey(memberDueSlots[0].monthKey);
    } else {
      // Default to current month or last configured month
      const currentKey = getCurrentMonthKey();
      const hasCurrent = months.some(m => m.key === currentKey);
      if (hasCurrent) {
        setSelectedMonthKey(currentKey);
      } else {
        const last = months[months.length - 1];
        if (last) setSelectedMonthKey(last.key);
      }
    }
  }, [selectedMemberId, prefill?.monthKey, monthlyPayments, months]);

  if (!isOpen) return null;

  const currentMember = activeMembers.find(m => m.id === selectedMemberId) || activeMembers[0];
  const calculatedAmount = currentMember ? currentMember.units * 1000 : 1000;

  const existingPayment = monthlyPayments.find(
    p => p.memberId === selectedMemberId && p.monthKey === selectedMonthKey
  );

  const pendingPaymentsForMember = getMemberDuePayments(selectedMemberId, monthlyPayments);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingPayment && !months.some(m => m.key === selectedMonthKey)) {
      addMonth(selectedMonthKey);
    }

    const paymentId = existingPayment?.id || `p-${selectedMemberId}-${selectedMonthKey}`;
    recordPayment(paymentId, {
      amountPaid: calculatedAmount,
      paymentDate,
      paymentMethod,
      status: 'Paid',
      notes: trxId ? `Trx: ${trxId}` : undefined,
      memberId: selectedMemberId,
      memberName: currentMember?.name,
      monthKey: selectedMonthKey,
    });

    onClose();
  };

  const handleClearAllDues = () => {
    if (!selectedMemberId) return;
    batchCollectMemberDues(selectedMemberId, paymentMethod);
    onClose();
  };

  const handleAdvancePay = (monthsCount: number) => {
    if (!selectedMemberId) return;
    quickAdvancePayMember(selectedMemberId, monthsCount, paymentMethod);
    onClose();
  };

  const methodsList: PaymentMethod[] = ['Club AC', 'Bkash', 'CellFin', 'Cash', 'Nagad', 'IBBL'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="theme-card rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b theme-border">
          <div>
            <h3 className="text-base font-bold theme-text-main">
              Record Member Contribution
            </h3>
            <p className="text-xs theme-text-muted mt-0.5">
              1-tap monthly collection with minimal inputs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="theme-input px-2.5 py-1 rounded-md text-xs cursor-pointer hover:opacity-80"
          >
            ✕
          </button>
        </div>

        {/* Member Quick Selector */}
        <div className="mt-4 space-y-3.5 text-xs">
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="theme-text-muted font-medium">Select Member</label>
              {currentMember && currentMember.totalDueAmount > 0 ? (
                <span className="text-[11px] font-mono text-amber-500 font-semibold">
                  ৳{currentMember.totalDueAmount.toLocaleString()} due ({currentMember.monthsPending} mo)
                </span>
              ) : (
                <span className="text-[11px] text-emerald-500 font-medium">
                  ✓ All dues cleared
                </span>
              )}
            </div>

            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="theme-input w-full px-3 py-2 rounded-lg text-sm"
              required
            >
              {activeMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.units} {m.units === 1 ? 'unit' : 'units'} · ৳{(m.units * 1000).toLocaleString()}/mo)
                  {m.monthsPending > 0 ? ` — ৳${m.totalDueAmount.toLocaleString()} Due` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons for the Treasurer */}
          {currentMember && (
            <div className="theme-card-subtle p-3 rounded-xl space-y-2 border theme-border">
              <span className="text-[11px] font-semibold theme-text-muted uppercase tracking-wider block">
                Treasurer 1-Tap Shortcuts
              </span>

              <div className="grid grid-cols-2 gap-2">
                {pendingPaymentsForMember.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearAllDues}
                    className="w-full py-2 px-2.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer text-center shadow-xs"
                  >
                    Clear All Dues (৳{currentMember.totalDueAmount.toLocaleString()})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdvancePay(1)}
                    className="w-full py-2 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors cursor-pointer text-center"
                  >
                    + Pay Next Month (Advance)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleAdvancePay(3)}
                  className="w-full py-2 px-2.5 rounded-lg text-xs font-semibold theme-input hover:theme-text-main transition-colors cursor-pointer text-center"
                >
                  Pay 3 Months (৳{(currentMember.units * 3000).toLocaleString()})
                </button>
              </div>
            </div>
          )}

          {/* Detailed Single Month Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="theme-text-muted">Target Month</label>
                  <button
                    type="button"
                    onClick={() => addMonth()}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                    title="Add future month"
                  >
                    + Add Next Month
                  </button>
                </div>
                <select
                  value={selectedMonthKey}
                  onChange={e => setSelectedMonthKey(e.target.value as MonthKey)}
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs"
                  required
                >
                  {months.map(m => {
                    const isDue = monthlyPayments.some(
                      p => p.memberId === selectedMemberId && p.monthKey === m.key && p.status === 'Due'
                    );
                    return (
                      <option key={m.key} value={m.key}>
                        {m.label} ({m.yearMonth}) {isDue ? '• DUE' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="theme-text-muted block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="theme-input w-full px-3 py-2 rounded-lg font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Fee summary */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg theme-card-subtle border theme-border">
              <span className="theme-text-muted">Expected Fee ({currentMember?.units || 1} units)</span>
              <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
                ৳{calculatedAmount.toLocaleString()}
              </span>
            </div>

            {/* 1-Tap Method Pills */}
            <div>
              <label className="theme-text-muted block mb-1.5 font-medium">Payment Method</label>
              <div className="grid grid-cols-3 gap-1.5">
                {methodsList.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center ${
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'theme-input theme-text-muted hover:theme-text-main'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="theme-text-muted block mb-1">Receipt / Trx ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 9K20AB87XZ"
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                className="theme-input w-full px-3 py-1.5 rounded-lg font-mono text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs theme-text-muted hover:theme-text-main cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Confirm Payment
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
