import { Member, MonthlyPayment, MonthKey, PendingPaymentClaim } from '../types';

export const OFFICIAL_CLUB_NAME = 'Monie Club';

export interface MonthInfo {
  key: MonthKey;
  label: string;
  yearMonth: string;
}

/**
 * Returns the current runtime Date object.
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Dynamically computes the current year-month key in 'YYYY-MM' format based on actual calendar date.
 * E.g. '2026-09' or '2027-01'. Works seamlessly across year boundaries.
 */
export function getCurrentMonthKey(asOfDate?: Date): MonthKey {
  const d = asOfDate || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns today's actual date string in 'YYYY-MM-DD' format.
 */
export function getCurrentDateString(asOfDate?: Date): string {
  const d = asOfDate || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats any 'YYYY-MM' key into human-readable label and short yearMonth string.
 */
export function formatMonthKey(key: MonthKey): MonthInfo {
  const [yearStr, monthStr] = key.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const shortMonth = date.toLocaleString('en-US', { month: 'short' });
  const shortYear = String(year).slice(-2);
  return {
    key,
    label,
    yearMonth: `${shortMonth}-${shortYear}`,
  };
}

/**
 * Compares two 'YYYY-MM' keys chronologically.
 */
export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a.localeCompare(b);
}

/**
 * Checks whether a given monthKey is strictly in the future relative to the current calendar month.
 */
export function isFutureMonth(key: MonthKey, asOfDate?: Date): boolean {
  const currentKey = getCurrentMonthKey(asOfDate);
  return key > currentKey;
}

/**
 * Checks whether a given monthKey is the active current calendar month.
 */
export function isCurrentMonth(key: MonthKey, asOfDate?: Date): boolean {
  const currentKey = getCurrentMonthKey(asOfDate);
  return key === currentKey;
}

/**
 * Checks whether a given monthKey is strictly in the past relative to the current calendar month.
 */
export function isPastMonth(key: MonthKey, asOfDate?: Date): boolean {
  const currentKey = getCurrentMonthKey(asOfDate);
  return key < currentKey;
}

/**
 * Computes next calendar month key. E.g. '2026-12' -> '2027-01'.
 */
export function getNextMonthKey(key: MonthKey): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  const nextYear = nextDate.getFullYear();
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

/**
 * Computes previous calendar month key. E.g. '2027-01' -> '2026-12'.
 */
export function getPrevMonthKey(key: MonthKey): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
}

/**
 * Determines a member's effective start month key (e.g. from registrationDate or club inception).
 */
export function getMemberStartMonthKey(member: Member, firstConfiguredMonthKey = '2025-10'): MonthKey {
  if (member.registrationDate) {
    const regMonth = member.registrationDate.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(regMonth)) {
      return regMonth < firstConfiguredMonthKey ? firstConfiguredMonthKey : regMonth;
    }
  }
  return firstConfiguredMonthKey;
}

/**
 * Checks whether a payment is fully settled/paid.
 */
export function isPaymentPaid(payment?: MonthlyPayment): boolean {
  if (!payment) return false;
  return payment.status === 'Paid' || payment.amountPaid >= payment.amountExpected;
}

/**
 * Single source of truth for Member Due Calculation.
 *
 * Rules:
 * 1. Due cutoff is STRICTLY the current calendar month (getCurrentMonthKey()).
 * 2. Unpaid months up to and including the current month are considered DUE.
 * 3. Future months (monthKey > currentMonthKey) NEVER generate dues, even if records exist in the ledger.
 * 4. Paid months are excluded from outstanding dues.
 * 5. Cumulative Due = Sum of all unpaid dues from applicable start through current month.
 */
export interface MemberDueCalculation {
  monthsPending: number;
  totalDueAmount: number;
  dueMonths: MonthKey[];
  duePayments: MonthlyPayment[];
  currentMonthStatus: 'paid' | 'due' | 'future';
  advancePaidMonths: MonthKey[];
}

export function calculateMemberDues(
  member: Member,
  payments: MonthlyPayment[],
  asOfDate?: Date
): MemberDueCalculation {
  if (member.status === 'Inactive') {
    return {
      monthsPending: 0,
      totalDueAmount: 0,
      dueMonths: [],
      duePayments: [],
      currentMonthStatus: 'paid',
      advancePaidMonths: [],
    };
  }

  const currentKey = getCurrentMonthKey(asOfDate);
  const memberPayments = payments.filter(p => p.memberId === member.id);

  const duePayments: MonthlyPayment[] = [];
  const dueMonths: MonthKey[] = [];
  const advancePaidMonths: MonthKey[] = [];
  let currentMonthStatus: 'paid' | 'due' | 'future' = 'due';

  memberPayments.forEach(p => {
    const isPaid = isPaymentPaid(p);

    if (p.monthKey > currentKey) {
      // Future month: if paid, track as advance payment; NEVER treat as due!
      if (isPaid) {
        advancePaidMonths.push(p.monthKey);
      }
    } else {
      // Past or Current month
      if (p.monthKey === currentKey) {
        currentMonthStatus = isPaid ? 'paid' : 'due';
      }

      if (!isPaid && p.status !== 'Waived') {
        duePayments.push(p);
        dueMonths.push(p.monthKey);
      }
    }
  });

  // Sort due months chronologically (earliest overdue first)
  dueMonths.sort(compareMonthKeys);
  duePayments.sort((a, b) => compareMonthKeys(a.monthKey, b.monthKey));

  const totalDueAmount = duePayments.reduce((sum, p) => {
    const remaining = Math.max(0, p.amountExpected - p.amountPaid);
    return sum + remaining;
  }, 0);

  return {
    monthsPending: duePayments.length,
    totalDueAmount,
    dueMonths,
    duePayments,
    currentMonthStatus,
    advancePaidMonths,
  };
}

/**
 * Calculates total club dues across all active members using the exact same calendar cutoff.
 */
export function calculateClubTotalDues(
  members: Member[],
  payments: MonthlyPayment[],
  asOfDate?: Date
): { totalDues: number; overdueMembersCount: number } {
  const activeMembers = members.filter(m => m.status === 'Active');
  let totalDues = 0;
  let overdueMembersCount = 0;

  activeMembers.forEach(member => {
    const dues = calculateMemberDues(member, payments, asOfDate);
    if (dues.totalDueAmount > 0) {
      totalDues += dues.totalDueAmount;
      overdueMembersCount += 1;
    }
  });

  return { totalDues, overdueMembersCount };
}

/**
 * Filter payments that are currently due for a member.
 */
export function getMemberDuePayments(
  memberId: string,
  payments: MonthlyPayment[],
  asOfDate?: Date
): MonthlyPayment[] {
  const currentKey = getCurrentMonthKey(asOfDate);
  return payments
    .filter(p => p.memberId === memberId && p.monthKey <= currentKey && !isPaymentPaid(p) && p.status !== 'Waived')
    .sort((a, b) => compareMonthKeys(a.monthKey, b.monthKey));
}

/**
 * Payment period representation for the dynamic "Submit Payment Notice" selector.
 */
export type PeriodCategory = 'overdue' | 'current_due' | 'current_paid' | 'advance' | 'paid' | 'pending_approval';

export interface PaymentPeriodOption {
  monthKey: MonthKey;
  monthLabel: string;
  yearMonth: string;
  category: PeriodCategory;
  categoryLabel: string;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  isPaid: boolean;
  isPendingApproval: boolean;
  amountExpected: number;
  amountPaid: number;
  amountDue: number;
  canSelect: boolean;
  disabledReason?: string;
  pendingClaim?: PendingPaymentClaim;
  existingPayment?: MonthlyPayment;
}

export interface PaymentPeriodSelectorData {
  options: PaymentPeriodOption[];
  recommendedMonthKey: MonthKey;
  totalOutstandingDue: number;
  overdueCount: number;
  hasCurrentMonthDue: boolean;
  activeClaimsCount: number;
}

/**
 * Generates a dynamic, data-driven list of payment periods for a member.
 * Inspects real ledger records, actual calendar cutoff, and pending notices.
 */
export function getMemberPaymentPeriodOptions(
  member: Member,
  configuredMonths: MonthInfo[],
  payments: MonthlyPayment[],
  pendingClaims: PendingPaymentClaim[],
  asOfDate?: Date
): PaymentPeriodSelectorData {
  const currentKey = getCurrentMonthKey(asOfDate);
  const memberPayments = payments.filter(p => p.memberId === member.id);
  const memberClaims = pendingClaims.filter(c => c.memberId === member.id && c.status === 'Pending');

  // Build a map strictly of months configured in the ledger:
  const monthMap = new Map<MonthKey, MonthInfo>();
  configuredMonths.forEach(m => monthMap.set(m.key, m));

  const sortedMonthKeys = Array.from(monthMap.keys()).sort(compareMonthKeys);

  const options: PaymentPeriodOption[] = [];
  let recommendedMonthKey: MonthKey = currentKey;
  let recommendedFound = false;

  sortedMonthKeys.forEach(mKey => {
    const monthInfo = monthMap.get(mKey) || formatMonthKey(mKey);
    const payment = memberPayments.find(p => p.monthKey === mKey);
    const pendingClaim = memberClaims.find(c => 
      (c.monthKeys && c.monthKeys.length > 0 ? c.monthKeys.includes(mKey) : c.monthKey === mKey)
    );

    const isPaid = isPaymentPaid(payment);
    const isPending = !!pendingClaim;
    const isCurrent = mKey === currentKey;
    const isPast = mKey < currentKey;
    const isFuture = mKey > currentKey;

    const amountExpected = payment ? payment.amountExpected : member.units * 1000;
    const amountPaid = payment ? payment.amountPaid : 0;
    const amountDue = isPaid ? 0 : Math.max(0, amountExpected - amountPaid);

    let category: PeriodCategory;
    let categoryLabel: string;
    let canSelect = true;
    let disabledReason: string | undefined;

    if (isPending) {
      category = 'pending_approval';
      categoryLabel = 'Notice Under Review';
      canSelect = false;
      disabledReason = 'A payment notice is currently pending verification by the Treasurer.';
    } else if (isPaid) {
      if (isCurrent) {
        category = 'current_paid';
        categoryLabel = 'Current Month (Settled)';
      } else {
        category = 'paid';
        categoryLabel = isFuture ? 'Advance Paid' : 'Fully Paid';
      }
      canSelect = false;
      disabledReason = 'This month is already settled. Duplicate payments cannot be submitted.';
    } else if (isPast) {
      category = 'overdue';
      categoryLabel = `Overdue (৳${amountDue.toLocaleString()} Due)`;
      canSelect = true;
    } else if (isCurrent) {
      category = 'current_due';
      categoryLabel = `Current Month (৳${amountDue.toLocaleString()} Due)`;
      canSelect = true;
    } else {
      category = 'advance';
      categoryLabel = `Advance Payment (৳${amountExpected.toLocaleString()})`;
      canSelect = true;
    }

    // Set recommended month: first unpaid past month, or current month if unpaid, or first future
    if (!recommendedFound && canSelect) {
      recommendedMonthKey = mKey;
      recommendedFound = true;
    }

    options.push({
      monthKey: mKey,
      monthLabel: monthInfo.label,
      yearMonth: monthInfo.yearMonth,
      category,
      categoryLabel,
      isCurrent,
      isPast,
      isFuture,
      isPaid,
      isPendingApproval: isPending,
      amountExpected,
      amountPaid,
      amountDue,
      canSelect,
      disabledReason,
      pendingClaim,
      existingPayment: payment,
    });
  });

  const memberDues = calculateMemberDues(member, payments, asOfDate);

  return {
    options,
    recommendedMonthKey: recommendedFound ? recommendedMonthKey : currentKey,
    totalOutstandingDue: memberDues.totalDueAmount,
    overdueCount: memberDues.monthsPending,
    hasCurrentMonthDue: memberDues.currentMonthStatus === 'due',
    activeClaimsCount: memberClaims.length,
  };
}
