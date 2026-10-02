export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'N/A' | '-';

export type PaymentMethod = 
  | 'CellFin' 
  | 'Bkash' 
  | 'IBBL' 
  | 'IIBL' 
  | 'UCB' 
  | 'PBL' 
  | 'CityTouch' 
  | 'Club AC' 
  | 'Cash' 
  | 'Nagad' 
  | 'Other';

export interface Member {
  id: string;
  name: string;
  units: number;
  contactNumber: string;
  bloodGroup: BloodGroup;
  permanentAddress: string;
  photoUrl?: string;
  status: 'Active' | 'Inactive';
  monthsPending: number;
  totalDueAmount: number;
  registrationFeePaid?: number;
  registrationDate?: string;
  inactiveDate?: string;
  durationActiveMonths?: number;
  tenureText?: string;
  leaveReason?: string;
  notes?: string;
}

export interface MemberFinancials {
  monthlyPaid: number;
  totalPaid: number;
  totalDue: number;
  paidMonthsCount: number;
}

export type MonthKey = string; // Formatted as 'YYYY-MM', supports continuous monthly expansion (e.g. 2025-10, 2026-09, 2026-10, 2026-11, etc.)

export interface MonthlyPayment {
  id: string;
  memberId: string;
  memberName: string;
  monthKey: MonthKey;
  monthLabel: string;
  units: number;
  amountExpected: number;
  amountPaid: number;
  paymentDate?: string; // Actual date member made/submitted the payment (YYYY-MM-DD)
  payment_date?: string; // Database/alias field for actual payment date
  processedAt?: string; // Date/time admin processed/approved the record (ISO timestamp)
  processed_at?: string; // Database/alias field for admin processing timestamp
  paymentMethod?: PaymentMethod;
  status: 'Paid' | 'Due' | 'Partial' | 'Waived';
  trxId?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface BusinessInvestment {
  id: string;
  title: string;
  principalAmount: number; // e.g. 100,000 BDT
  sourceFund?: string; // e.g. "Monie Club Treasury"
  startDate: string; // e.g. "2026-04-15"
  maturityDate: string; // e.g. "2026-10-31"
  concludedDate?: string; // e.g. "2026-10-31"
  durationMonths: number; // 6 months
  profitMode?: 'range' | 'fixed'; // Dynamic Range / ROI Mode vs Fixed
  minRoiPercent?: number; // e.g. 10 (% per duration)
  maxRoiPercent?: number; // e.g. 12.5 (% per duration)
  minProfit?: number; // e.g. 10,000 BDT
  maxProfit?: number; // e.g. 12,500 BDT
  expectedProfit: number; // Midpoint or base expected profit in BDT
  actualProfit?: number; // Realized profit upon conclusion in BDT
  totalExpectedReturn: number; // Principal + Expected Profit
  status: 'Active' | 'Inactive' | 'Completed' | 'Pending Settlement' | 'Disbursed';
  partnerOrVenture: string; // e.g. "Commercial Trading & Commodity Supply"
  contactPerson?: string;
  description: string;
  dividendPolicy?: 'Distribute to Members per Unit' | 'Reinvest into Club Fund' | 'Split 50/50';
  notes?: string;
  milestones?: {
    id: string;
    title: string;
    date: string;
    completed: boolean;
    notes?: string;
  }[];
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: 'Banking & Accounts' | 'Legal & Documentation' | 'Courier & Logistics' | 'Administrative' | 'Event & Meeting' | 'Other';
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  paidBy: string;
  receiptNo?: string;
  notes?: string;
}

export interface FeeCollection {
  id: string;
  memberId: string;
  memberName: string;
  units: number;
  feeAmount: number;
  date?: string;
  status: 'Paid' | 'Unpaid';
  purpose: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  receiptNo?: string;
}

export type UITheme = 'light' | 'dark' | 'warm' | 'midnight';
export type AppFont = 'inter' | 'outfit' | 'system';

export interface BankProfitRecord {
  id: string;
  amount: number; // Confirmed additional club income in BDT
  incomeType?: 'Bank Profit / Interest' | 'Venture Profit' | 'Investment Return' | 'Other Income'; // Legacy records without this field are bank profit
  date: string; // Date profit was credited (YYYY-MM-DD)
  bankName?: string; // e.g. "Club Central Account", "IBBL", "UCB"
  description?: string; // e.g. "Half-yearly bank interest/profit credit"
  recordedBy?: string; // Admin who entered it
  receiptOrVoucher?: string;
  notes?: string;
  createdAt: string;
}

export interface ClubSummary {
  totalClubFunds: number; // e.g. 381,000 (editable)
  investedFunds: number; // e.g. 200,000 (editable)
  liquidReserves: number; // calculated: totalClubFunds - investedFunds
  expectedVentureProfit: number; // e.g. 17,000 (editable)
  totalDues: number; // 39,000
  activeMembersCount: number; // 18
  totalActiveUnits: number; // 35
  totalFeeCollected: number; // 2,560
  totalExpenses: number; // 1,729
  feeBalance: number; // 831
  totalBankProfits: number; // Profit received from bank added to total cash
  totalMemberContributions: number;
  totalAdditionalIncome: number;
  manualFundsAdjustment: number;
}

export type AdminRole = 'Super Admin' | 'Admin';
export type AdminDesignation = 'Treasurer' | 'President' | 'Secretary' | 'Admin' | 'Custom';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  designation: AdminDesignation;
  role: AdminRole; // Super Admin has editing power; View-Only Admin can only view
  canEdit: boolean;
  phone?: string;
  createdAt?: string;
}

export interface PendingPaymentClaim {
  id: string;
  memberId: string;
  memberName: string;
  memberMobile: string;
  monthKey: MonthKey;
  monthKeys?: MonthKey[];
  monthLabel: string;
  monthLabels?: string[];
  units: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string; // Actual date payment was made by the member (YYYY-MM-DD)
  payment_date?: string; // Alias
  trxId?: string;
  notes?: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  processedAt?: string; // Date/time admin reviewed/processed this claim
  processed_at?: string; // Alias
  rejectionReason?: string;
}
