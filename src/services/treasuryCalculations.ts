import { BankProfitRecord, BusinessInvestment, MonthKey, MonthlyPayment } from '../types';

/** Read-only estimates. ROI percentages take priority over cached profit amounts. */
export function getVentureProfitProjection(venture: BusinessInvestment) {
  const principal = Number(venture.principalAmount) || 0;
  const expected = Number(venture.expectedProfit) || 0;
  const roiMin = venture.minRoiPercent;
  const roiMax = venture.maxRoiPercent;
  const usesRoi = venture.profitMode !== 'fixed' &&
    (Number.isFinite(roiMin) || Number.isFinite(roiMax));
  let minProfit = expected;
  let maxProfit = expected;

  if (usesRoi) {
    minProfit = principal * (Number.isFinite(roiMin) ? roiMin! : roiMax!) / 100;
    maxProfit = principal * (Number.isFinite(roiMax) ? roiMax! : roiMin!) / 100;
  } else if (venture.profitMode === 'range') {
    // Old records may contain only the monetary range; keep those compatible.
    minProfit = venture.minProfit ?? expected;
    maxProfit = venture.maxProfit ?? expected;
  }

  const min = Math.round(Math.min(minProfit, maxProfit));
  const max = Math.round(Math.max(minProfit, maxProfit));
  return {
    minProfit: min,
    maxProfit: max,
    minRoiPercent: principal > 0 ? min / principal * 100 : 0,
    maxRoiPercent: principal > 0 ? max / principal * 100 : 0,
    hasRange: min !== max,
    usesRoi,
  };
}

export function getActiveVentureProfitProjection(ventures: BusinessInvestment[]) {
  const totals = ventures.filter(v => v.status === 'Active').reduce((sum, venture) => {
    const projection = getVentureProfitProjection(venture);
    return { minProfit: sum.minProfit + projection.minProfit, maxProfit: sum.maxProfit + projection.maxProfit };
  }, { minProfit: 0, maxProfit: 0 });
  return { ...totals, hasRange: totals.minProfit !== totals.maxProfit };
}

/** The shared source for subscription collection, confirmed income, and cash allocation. */
export function calculateTreasuryTotals(
  payments: MonthlyPayment[],
  activeMonths: MonthKey[],
  income: BankProfitRecord[],
  adjustment = 0,
  investedFunds = 0
) {
  const monthKeys = new Set(activeMonths);
  const totalMemberContributions = payments
    .filter(p => monthKeys.has(p.monthKey))
    .reduce((sum, p) => sum + (p.status === 'Paid' && Number(p.amountPaid) <= 0
      ? Number(p.amountExpected) || 0
      : Number(p.amountPaid) || 0), 0);
  const totalAdditionalIncome = income.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const totalClubFunds = totalMemberContributions + totalAdditionalIncome + adjustment;
  return {
    totalMemberContributions,
    totalAdditionalIncome,
    totalClubFunds,
    liquidReserves: Math.max(0, totalClubFunds - investedFunds),
  };
}
