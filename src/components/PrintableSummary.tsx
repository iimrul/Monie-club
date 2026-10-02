import React from 'react';
import { useClub } from '../context/ClubContext';
import { formatLedgerPeriod } from '../services/paymentDueManager';
import { getActiveVentureProfitProjection, getVentureProfitProjection } from '../services/treasuryCalculations';

export const PrintableSummary: React.FC = () => {
  const { summary, investment, investments, members, expenses, getMemberFinancials, months } = useClub();
  const activeMembers = members.filter(m => m.status === 'Active');
  const overdueMembers = activeMembers.filter(m => m.monthsPending > 0);
  const projection = getActiveVentureProfitProjection(investments);
  const ventureProjection = getVentureProfitProjection(investment);
  const minProfit = investment.status !== 'Active' && investment.actualProfit !== undefined ? investment.actualProfit : ventureProjection.minProfit;
  const maxProfit = investment.status !== 'Active' && investment.actualProfit !== undefined ? investment.actualProfit : ventureProjection.maxProfit;
  const moneyRange = (min: number, max: number) => min === max ? `৳${min.toLocaleString()}` : `৳${min.toLocaleString()} – ৳${max.toLocaleString()}`;

  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans max-w-4xl mx-auto">
      {/* Club Official Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase">Monie Club</h1>
        <p className="text-sm font-medium mt-1">Padua, Lohagara, Chattogram, Bangladesh</p>
        <p className="text-xs text-gray-600 mt-0.5">Official Executive Treasury & Investment Statement</p>
        <div className="mt-2 text-xs font-mono font-bold">
          Ledger: {formatLedgerPeriod(months)} | Generated: {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* Primary Financial Position */}
      <div className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-3">
          1. Treasury & Fund Allocation Summary
        </h2>
        <table className="w-full text-sm border-collapse border border-gray-400">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-bold bg-gray-100 w-1/2">Total Treasury</td>
              <td className="p-2 font-mono font-bold text-base">৳{summary.totalClubFunds.toLocaleString()} BDT</td>
            </tr>
            <tr className="border-b border-gray-300"><td className="p-2 font-semibold">Additional Profit / Income</td><td className="p-2 font-mono">৳{summary.totalAdditionalIncome.toLocaleString()} BDT</td></tr>
            {summary.manualFundsAdjustment !== 0 && <tr className="border-b border-gray-300"><td className="p-2 font-semibold">Manual Treasury Adjustment</td><td className="p-2 font-mono">৳{summary.manualFundsAdjustment.toLocaleString()} BDT</td></tr>}
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Active Capital Deployed in Business Venture (6 Mo)</td>
              <td className="p-2 font-mono font-semibold">৳{summary.investedFunds.toLocaleString()} BDT</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Liquid Cash & Bank Reserves</td>
              <td className="p-2 font-mono font-semibold">৳{summary.liquidReserves.toLocaleString()} BDT</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Projected Venture Profit (ROI Estimate)</td>
              <td className="p-2 font-mono font-bold text-green-700">+{moneyRange(projection.minProfit, projection.maxProfit)} BDT</td>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50">
              <td className="p-2 font-bold">Estimated Treasury Upon Venture Settlement</td>
              <td className="p-2 font-mono font-bold text-base">{moneyRange(summary.totalClubFunds + projection.minProfit, summary.totalClubFunds + projection.maxProfit)} BDT</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold text-amber-800">Total Uncollected Member Dues</td>
              <td className="p-2 font-mono font-bold text-amber-800">৳{summary.totalDues.toLocaleString()} BDT ({overdueMembers.length} Members)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2 Lakh Business Venture Section */}
      <div className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-3">
          2. Commercial Business Venture Specifics
        </h2>
        <div className="border border-gray-400 p-3 rounded text-sm space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold">Venture Designation:</span>
            <span>{investment.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Principal Investment:</span>
            <span className="font-mono font-bold">৳{investment.principalAmount.toLocaleString()} BDT</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Duration & Maturity:</span>
            <span>{investment.durationMonths} Months · {investment.maturityDate || 'Maturity not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">{investment.status === 'Active' ? 'Estimated Net Profit:' : 'Venture Net Profit:'}</span>
            <span className="font-mono font-bold text-green-700">{moneyRange(minProfit, maxProfit)} BDT</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Total Payout Upon Liquidation:</span>
            <span className="font-mono font-bold">{moneyRange(investment.principalAmount + minProfit, investment.principalAmount + maxProfit)} BDT</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Estimated Dividend per Unit ({summary.totalActiveUnits} Units):</span>
            <span className="font-mono font-semibold">{moneyRange(summary.totalActiveUnits > 0 ? Math.round(minProfit / summary.totalActiveUnits) : 0, summary.totalActiveUnits > 0 ? Math.round(maxProfit / summary.totalActiveUnits) : 0)} BDT / Unit</span>
          </div>
        </div>
      </div>

      {/* Member Money in Club & Outstanding Dues Breakdown */}
      <div className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-3">
          3. Member Capital in Club & Outstanding Dues
        </h2>
        <table className="w-full text-xs border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 p-1.5 text-left">Member Name</th>
              <th className="border border-gray-400 p-1.5 text-center">Units</th>
              <th className="border border-gray-400 p-1.5 text-right">Money in Club (Paid)</th>
              <th className="border border-gray-400 p-1.5 text-right">Dues Status</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map(m => {
              const fin = getMemberFinancials(m.id);
              return (
                <tr key={m.id} className="border-b border-gray-300">
                  <td className="p-1.5 border border-gray-300 font-semibold">{m.name}</td>
                  <td className="p-1.5 border border-gray-300 text-center">{m.units}</td>
                  <td className="p-1.5 border border-gray-300 text-right font-mono font-bold">৳{fin.totalPaid.toLocaleString()}</td>
                  <td className="p-1.5 border border-gray-300 text-right font-mono">
                    {m.totalDueAmount > 0 ? (
                      <span className="text-red-700 font-bold">৳{m.totalDueAmount.toLocaleString()} ({m.monthsPending} mo due)</span>
                    ) : (
                      <span className="text-green-700">৳0 (Cleared)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="mt-16 pt-8 border-t border-gray-400 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-t border-gray-800 w-36 mx-auto mb-1"></div>
          <p className="font-bold text-gray-900">Imrul Kaesh Chowdhury</p>
          <p className="text-gray-600 font-medium">Treasurer</p>
          <p className="text-gray-500 text-[10px]">Monie Club</p>
        </div>
        <div>
          <div className="border-t border-gray-800 w-36 mx-auto mb-1"></div>
          <p className="font-bold text-gray-900">Omor Faruk Tawhid</p>
          <p className="text-gray-600 font-medium">General Secretary</p>
          <p className="text-gray-500 text-[10px]">Monie Club</p>
        </div>
        <div>
          <div className="border-t border-gray-800 w-36 mx-auto mb-1"></div>
          <p className="font-bold text-gray-900">Md Junayed</p>
          <p className="text-gray-600 font-medium">President</p>
          <p className="text-gray-500 text-[10px]">Monie Club</p>
        </div>
      </div>
    </div>
  );
};
