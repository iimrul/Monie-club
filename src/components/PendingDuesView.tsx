import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { Member } from '../types';
import { getMemberDuePayments, OFFICIAL_CLUB_NAME } from '../services/paymentDueManager';

export const PendingDuesView: React.FC = () => {
  const { members, monthlyPayments, summary } = useClub();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const overdueMembers = members
    .filter(m => m.status === 'Active' && m.monthsPending > 0)
    .sort((a, b) => b.monthsPending - a.monthsPending || b.totalDueAmount - a.totalDueAmount);

  const filtered = overdueMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.contactNumber.includes(searchQuery)
  );

  const handleCopyReminder = (member: Member) => {
    const text = `আসসালামু আলাইকুম ${member.name} ভাই, ${OFFICIAL_CLUB_NAME}-এর ${member.monthsPending} মাসের বকেয়া সাবস্ক্রিপশন বাবদ ৳${member.totalDueAmount.toLocaleString()} টাকা পরিশোধের জন্য বিনীত অনুরোধ করা যাচ্ছে। ধন্যবাদ।`;
    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="screen-section space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b theme-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight theme-text-main">
            Pending Dues Tracker
          </h1>
          <p className="text-xs theme-text-muted mt-0.5">
            Total ৳{summary.totalDues.toLocaleString()} pending across {overdueMembers.length} active members
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter by name or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="theme-input px-3 py-1.5 rounded text-xs max-w-xs focus:outline-none"
        />
      </div>

      {/* Dues List */}
      <div className="theme-card rounded-lg divide-y theme-border text-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center theme-text-muted">
            No pending dues found matching search.
          </div>
        ) : (
          filtered.map(m => {
            const memberDueSlots = getMemberDuePayments(m.id, monthlyPayments);
            const isCopied = copiedId === m.id;

            return (
              <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                
                {/* Member Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm theme-text-main">{m.name}</span>
                    <span className="text-[11px] theme-text-muted font-mono">({m.units} {m.units === 1 ? 'unit' : 'units'})</span>
                  </div>
                  <div className="text-[11px] theme-text-muted mt-0.5 truncate">
                    {m.contactNumber} · {m.permanentAddress}
                  </div>
                </div>

                {/* Due Months Badges (Read-Only) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {memberDueSlots.map(p => (
                    <span
                      key={p.id}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium"
                      title={`${m.name}: ${p.monthLabel} is due (৳${p.amountExpected.toLocaleString()})`}
                    >
                      {p.monthLabel.split(' ')[0].slice(0, 3)}-{p.monthKey.slice(2, 4)} Due
                    </span>
                  ))}
                </div>

                {/* Right: Total Due & Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 theme-border">
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                      ৳{m.totalDueAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] theme-text-muted block">
                      {m.monthsPending} {m.monthsPending === 1 ? 'month' : 'months'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyReminder(m)}
                      className="theme-input px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 hover:border-emerald-500"
                      title="Copy SMS / WhatsApp reminder text"
                    >
                      <span>💬</span>
                      <span>{isCopied ? 'Copied ✓' : 'Copy SMS'}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
