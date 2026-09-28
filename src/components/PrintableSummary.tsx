import React from 'react';
import { useClub } from '../context/ClubContext';

export const PrintableSummary: React.FC = () => {
  const { summary, investment, members, expenses, getMemberFinancials } = useClub();
  const activeMembers = members.filter(m => m.status === 'Active');
  const overdueMembers = activeMembers.filter(m => m.monthsPending > 0);

  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans max-w-4xl mx-auto">
      {/* Club Official Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase">Monie Club</h1>
        <p className="text-sm font-medium mt-1">Padua, Lohagara, Chattogram, Bangladesh</p>
        <p className="text-xs text-gray-600 mt-0.5">Official Executive Treasury & Investment Statement</p>
        <div className="mt-2 text-xs font-mono font-bold">
          Fiscal Session: October 2025 – September 2026 | Generated: {new Date().toLocaleDateString('en-GB')}
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
              <td className="p-2 font-bold bg-gray-100 w-1/2">Total Club Central Funds</td>
              <td className="p-2 font-mono font-bold text-base">৳{summary.totalClubFunds.toLocaleString()} BDT</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Active Capital Deployed in Business Venture (6 Mo)</td>
              <td className="p-2 font-mono font-semibold">৳{summary.investedFunds.toLocaleString()} BDT (2.00 Lakh)</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Liquid Cash & Bank Reserves</td>
              <td className="p-2 font-mono font-semibold">৳{summary.liquidReserves.toLocaleString()} BDT (1.81 Lakh)</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Projected Net Venture Profit (Concludes October 2026)</td>
              <td className="p-2 font-mono font-bold text-green-700">+৳{summary.expectedVentureProfit.toLocaleString()} BDT</td>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50">
              <td className="p-2 font-bold">Total Expected Treasury Value Upon October Settlement</td>
              <td className="p-2 font-mono font-bold text-base">৳{(summary.totalClubFunds + summary.expectedVentureProfit).toLocaleString()} BDT</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold text-amber-800">Total Uncollected Member Dues</td>
              <td className="p-2 font-mono font-bold text-amber-800">৳{summary.totalDues.toLocaleString()} BDT (13 Members)</td>
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
            <span>6 Months (Concludes October 2026)</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Earned Net Profit:</span>
            <span className="font-mono font-bold text-green-700">৳{investment.expectedProfit.toLocaleString()} BDT</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Total Payout Upon Liquidation:</span>
            <span className="font-mono font-bold">৳{investment.totalExpectedReturn.toLocaleString()} BDT</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Dividend per Share Unit (35 Units):</span>
            <span className="font-mono font-semibold">~৳{(investment.expectedProfit / summary.totalActiveUnits).toFixed(1)} BDT / Unit</span>
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
