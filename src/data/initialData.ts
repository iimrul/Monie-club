import { Member, MonthlyPayment, BusinessInvestment, ExpenseRecord, FeeCollection, MonthKey } from '../types';

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Saiful Islam Robin',
    units: 5,
    contactNumber: '01863269888',
    bloodGroup: 'A+',
    permanentAddress: 'North padua Lohagara Chittagong',
    status: 'Active',
    monthsPending: 1,
    totalDueAmount: 5000,
    registrationFeePaid: 500,
    registrationDate: '2025-12-30',
  },
  {
    id: 'm2',
    name: 'Omor Faruk Tawhid',
    units: 3,
    contactNumber: '01585802060',
    bloodGroup: 'O+',
    permanentAddress: 'South Sadaha, Satkania, Chattogram',
    status: 'Active',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 300,
    registrationDate: '2025-12-30',
  },
  {
    id: 'm3',
    name: 'Shoaib uddin',
    units: 3,
    contactNumber: '01624447784',
    bloodGroup: 'O+',
    permanentAddress: 'Hazir para, Lohagara, Chittagong',
    status: 'Active',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 100,
    registrationDate: '2025-12-23',
  },
  {
    id: 'm4',
    name: 'Mimoun Uddin Kader Tamim',
    units: 2,
    contactNumber: '01872553338',
    bloodGroup: 'O+',
    permanentAddress: 'Boilchari, Banskhali, Chittagong',
    status: 'Active',
    monthsPending: 1,
    totalDueAmount: 2000,
    registrationFeePaid: 0,
    registrationDate: '2026-01-10',
  },
  {
    id: 'm5',
    name: 'Md Saidur Rahaman Sajib',
    units: 2,
    contactNumber: '01408386790',
    bloodGroup: 'A+',
    permanentAddress: 'Podua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 1,
    totalDueAmount: 2000,
    registrationFeePaid: 200,
    registrationDate: '2025-12-02',
  },
  {
    id: 'm6',
    name: 'Shahadat Hossen Emon',
    units: 2,
    contactNumber: '01875118294',
    bloodGroup: 'B+',
    permanentAddress: 'Padua Dargahmoda, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 1,
    totalDueAmount: 2000,
    registrationFeePaid: 200,
    registrationDate: '2025-12-10',
  },
  {
    id: 'm7',
    name: 'Imrul Kaesh Chowdhury',
    units: 2,
    contactNumber: '01822240603',
    bloodGroup: 'O+',
    permanentAddress: 'Mollik Subhan, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 1,
    totalDueAmount: 2000,
    registrationFeePaid: 200,
    registrationDate: '2026-01-19',
  },
  {
    id: 'm8',
    name: 'Jiaur Rahman Shawon',
    units: 2,
    contactNumber: '+601168433905',
    bloodGroup: 'B+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 2,
    totalDueAmount: 4000,
    registrationFeePaid: 160,
    registrationDate: '2026-01-10',
  },
  {
    id: 'm9',
    name: 'Sazzad Hossen Emon',
    units: 2,
    contactNumber: '01318786601',
    bloodGroup: 'AB+',
    permanentAddress: 'Padua (Ward 2) Lohagara Chittagong',
    status: 'Active',
    monthsPending: 3,
    totalDueAmount: 6000,
    registrationFeePaid: 200,
    registrationDate: '2026-01-15',
  },
  {
    id: 'm10',
    name: 'Tawhid',
    units: 2,
    contactNumber: '01790340793',
    bloodGroup: 'O+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 200,
    registrationDate: '2025-12-11',
  },
  {
    id: 'm11',
    name: 'Tanjimul Islam Saydi',
    units: 2,
    contactNumber: '01819334455',
    bloodGroup: 'A+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 200,
    registrationDate: '2026-01-15',
  },
  {
    id: 'm12',
    name: 'Taisir',
    units: 2,
    contactNumber: '01711223344',
    bloodGroup: 'B+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 200,
    registrationDate: '2026-01-15',
  },
  {
    id: 'm13',
    name: 'Md Junayed',
    units: 1,
    contactNumber: '01753102771',
    bloodGroup: 'O+',
    permanentAddress: 'Padua Ali Shikder Para, Lohagara, Chittagong',
    status: 'Active',
    monthsPending: 2,
    totalDueAmount: 2000,
    registrationFeePaid: 100,
    registrationDate: '2026-01-02',
  },
  {
    id: 'm14',
    name: 'Ariful Islam Arafat',
    units: 1,
    contactNumber: '+966 57 716 0390',
    bloodGroup: 'N/A',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 100,
    registrationDate: '2026-01-07',
  },
  {
    id: 'm15',
    name: 'Sana Ullah Labib',
    units: 1,
    contactNumber: '01313599780',
    bloodGroup: 'B+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 2,
    totalDueAmount: 2000,
    registrationFeePaid: 100,
    registrationDate: '2026-01-15',
  },
  {
    id: 'm16',
    name: 'Md Fahim Iqbal',
    units: 1,
    contactNumber: '01601790791',
    bloodGroup: 'A+',
    permanentAddress: 'Hoddoli para, Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 3,
    totalDueAmount: 3000,
    registrationFeePaid: 100,
    registrationDate: '2026-01-01',
  },
  {
    id: 'm17',
    name: 'Robaid Sikder',
    units: 1,
    contactNumber: '01822160849',
    bloodGroup: 'O+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 6,
    totalDueAmount: 6000,
    registrationFeePaid: 100,
    registrationDate: '2026-01-15',
  },
  {
    id: 'm18',
    name: 'Md Rohullah Mahi',
    units: 1,
    contactNumber: '01878872180',
    bloodGroup: 'O+',
    permanentAddress: 'Padua, Lohagara, Chattogram',
    status: 'Active',
    monthsPending: 2,
    totalDueAmount: 2000,
    registrationFeePaid: 100,
    registrationDate: '2025-12-09',
  },
  {
    id: 'm19',
    name: 'Abdullah Al Rafi',
    units: 2,
    contactNumber: '01887382077',
    bloodGroup: 'O+',
    permanentAddress: 'Padua, Lohagara, Chittagong',
    status: 'Inactive',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 200,
    registrationDate: '2025-10-01',
    inactiveDate: '2026-06-16',
    durationActiveMonths: 8,
    tenureText: '8 Months (Oct 2025 – Jun 2026)',
    leaveReason: 'Settled units & account cleared',
    notes: 'Formerly held 2 units. Settled in June 2026.',
  },
  {
    id: 'm20',
    name: 'Md Arif Hossen',
    units: 1,
    contactNumber: '01869732172',
    bloodGroup: 'A+',
    permanentAddress: 'Chandgaon Residential Area, Road No. 14, House 371',
    status: 'Inactive',
    monthsPending: 0,
    totalDueAmount: 0,
    registrationFeePaid: 100,
    registrationDate: '2025-10-01',
    inactiveDate: '2026-03-31',
    durationActiveMonths: 6,
    tenureText: '6 Months (Oct 2025 – Mar 2026)',
    leaveReason: 'Withdrawn & settled',
    notes: 'Formerly held 1 unit. Settled in March 2026.',
  },
];

export function formatMonthKeyToInfo(key: string): { key: string; label: string; yearMonth: string } {
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

export const MONTHS_CONFIG: { key: MonthKey; label: string; yearMonth: string }[] = [
  { key: '2025-10', label: 'October 2025', yearMonth: 'Oct-25' },
  { key: '2025-11', label: 'November 2025', yearMonth: 'Nov-25' },
  { key: '2025-12', label: 'December 2025', yearMonth: 'Dec-25' },
  { key: '2026-01', label: 'January 2026', yearMonth: 'Jan-26' },
  { key: '2026-02', label: 'February 2026', yearMonth: 'Feb-26' },
  { key: '2026-03', label: 'March 2026', yearMonth: 'Mar-26' },
  { key: '2026-04', label: 'April 2026', yearMonth: 'Apr-26' },
  { key: '2026-05', label: 'May 2026', yearMonth: 'May-26' },
  { key: '2026-06', label: 'June 2026', yearMonth: 'Jun-26' },
  { key: '2026-07', label: 'July 2026', yearMonth: 'Jul-26' },
  { key: '2026-08', label: 'August 2026', yearMonth: 'Aug-26' },
  { key: '2026-09', label: 'September 2026', yearMonth: 'Sep-26' },
];

export const INITIAL_INVESTMENT: BusinessInvestment = {
  id: 'inv-1',
  title: 'Six-Month Commercial Trade & Business Venture',
  principalAmount: 200000,
  sourceFund: 'Monie Club Treasury (Allocated from 3.81 Lakh Total Funds)',
  startDate: '2026-04-15',
  maturityDate: '2026-10-31',
  durationMonths: 6,
  expectedProfit: 17000,
  totalExpectedReturn: 217000,
  status: 'Active',
  partnerOrVenture: 'Chittagong Agro-Commodity & Wholesale Trade Venture',
  contactPerson: 'Investment Committee / Representative Partner',
  description: 'Capital deployment of ৳2,00,000 for a 6-month seasonal commercial trade venture concluding in October 2026. Delivers a targeted profit of ৳17,000, bringing total repayment to ৳2,17,000 upon October conclusion.',
  dividendPolicy: 'Distribute to Members per Unit',
  milestones: [
    {
      id: 'ms-1',
      title: 'Venture Capital Disbursement',
      date: '2026-04-15',
      completed: true,
      notes: '৳2,00,000 transferred from Monie Club account to trade partner.',
    },
    {
      id: 'ms-2',
      title: 'Quarterly Trade Progress Audit',
      date: '2026-07-15',
      completed: true,
      notes: 'Inventory turnover verified, trade proceeds in good standing.',
    },
    {
      id: 'ms-3',
      title: 'Pre-Maturity Settlement Notice',
      date: '2026-09-30',
      completed: false,
      notes: 'Finalize liquidation of inventory and reconciliation of accounts.',
    },
    {
      id: 'ms-4',
      title: 'Principal & Profit Settlement',
      date: '2026-10-31',
      completed: false,
      notes: 'Full recovery of ৳2,00,000 principal + ৳17,000 profit distribution to members.',
    },
  ],
};

export const INITIAL_INVESTMENTS: BusinessInvestment[] = [
  INITIAL_INVESTMENT,
  {
    id: 'inv-prev-1',
    title: 'Short-Term Grain & Agro Commodity Procurement',
    principalAmount: 150000,
    sourceFund: 'Monie Club Treasury',
    startDate: '2025-10-15',
    maturityDate: '2026-03-31',
    concludedDate: '2026-03-31',
    durationMonths: 5,
    expectedProfit: 12500,
    actualProfit: 12500,
    totalExpectedReturn: 162500,
    status: 'Inactive',
    partnerOrVenture: 'North Chittagong Agro Traders',
    contactPerson: 'Representative Partner',
    description: 'Procurement and seasonal distribution of grain commodities. Concluded on 31 March 2026 with full principal and ৳12,500 profit recovered.',
    dividendPolicy: 'Reinvest into Club Fund',
    notes: 'Concluded & Settled: ৳1,50,000 capital + ৳12,500 profit successfully credited to club fund.',
  },
];

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-1',
    title: 'Courier & Document Dispatch Charges',
    category: 'Courier & Logistics',
    amount: 100,
    date: '2025-12-15',
    paymentMethod: 'Cash',
    paidBy: 'Executive Committee',
    receiptNo: 'REC-001',
    notes: 'Official club documents sent via courier',
  },
  {
    id: 'exp-2',
    title: 'Bank Verification & Account Documentation',
    category: 'Banking & Accounts',
    amount: 360,
    date: '2025-12-20',
    paymentMethod: 'Club AC',
    paidBy: 'Club Account',
    receiptNo: 'REC-002',
    notes: 'Bank certificate and notary attestation fees',
  },
  {
    id: 'exp-3',
    title: 'Cheque Book Issuance & Government Stamp Duty',
    category: 'Banking & Accounts',
    amount: 355,
    date: '2025-12-28',
    paymentMethod: 'Club AC',
    paidBy: 'Club Account',
    receiptNo: 'REC-003',
    notes: '50-leaf club account cheque book charge',
  },
  {
    id: 'exp-4',
    title: 'Bank Account Maintenance Fee & VAT Charges',
    category: 'Banking & Accounts',
    amount: 16,
    date: '2026-01-10',
    paymentMethod: 'Club AC',
    paidBy: 'Club Account',
    receiptNo: 'REC-004',
    notes: 'Quarterly maintenance fee inclusive of excise/VAT',
  },
  {
    id: 'exp-5',
    title: 'Club Seal, Ledger Register & Stationery',
    category: 'Administrative',
    amount: 898,
    date: '2026-01-20',
    paymentMethod: 'Cash',
    paidBy: 'Cash In Hand',
    receiptNo: 'REC-005',
    notes: 'Official seal, hardcover registers, stamp pad and folders (completes ৳1,729 total cost from ledger)',
  },
];

export const INITIAL_FEE_COLLECTIONS: FeeCollection[] = [
  { id: 'f-1', memberId: 'm1', memberName: 'Saiful Islam Robin', units: 5, feeAmount: 500, date: '2025-12-30', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-2', memberId: 'm2', memberName: 'Omar Faruk Tawhid', units: 3, feeAmount: 300, date: '2025-12-30', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-3', memberId: 'm3', memberName: 'Shoaib uddin', units: 3, feeAmount: 100, date: '2025-12-23', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-5', memberId: 'm5', memberName: 'Md Saidur Rahaman Sajib', units: 2, feeAmount: 200, date: '2025-12-02', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-6', memberId: 'm6', memberName: 'Shahadat Hossen Emon', units: 2, feeAmount: 200, date: '2025-12-10', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-7', memberId: 'm7', memberName: 'Imrul Kaesh Chowdhury', units: 2, feeAmount: 200, date: '2026-01-19', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-8', memberId: 'm8', memberName: 'Jiaur Rahman Shawon', units: 2, feeAmount: 160, date: '2026-01-10', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-9', memberId: 'm9', memberName: 'Sazzad Hossen Emon', units: 2, feeAmount: 200, date: '2026-01-15', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-10', memberId: 'm10', memberName: 'Tawhid', units: 2, feeAmount: 200, date: '2025-12-11', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-11', memberId: 'm13', memberName: 'Md Junayed', units: 1, feeAmount: 100, date: '2026-01-02', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-12', memberId: 'm14', memberName: 'Ariful Islam Arafat', units: 1, feeAmount: 100, date: '2026-01-07', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-13', memberId: 'm16', memberName: 'Md Fahim Iqbal', units: 1, feeAmount: 100, date: '2026-01-01', status: 'Paid', purpose: 'Registration & Admin Fee' },
  { id: 'f-14', memberId: 'm18', memberName: 'Md Rohullah Mahi', units: 1, feeAmount: 100, date: '2025-12-09', status: 'Paid', purpose: 'Registration & Admin Fee' },
];

// Helper to seed monthly payment records accurately based on sheet page 13 & page 14
export function generateInitialMonthlyPayments(): MonthlyPayment[] {
  const records: MonthlyPayment[] = [];
  
  // Member dues pending status mapped from page 1 & 2:
  // Saiful Islam Robin: 1 month pending (Sep-26)
  // Robaid Sikder: 6 months pending (Apr, May, Jun, Jul, Aug, Sep 26)
  // Sazzad Hossen Emon: 3 months pending (Jul, Aug, Sep 26)
  // Md Fahim Iqbal: 3 months pending (Jul, Aug, Sep 26)
  // Jiaur Rahman Shawon: 2 months pending (Aug, Sep 26)
  // Md Junayed: 2 months pending (Aug, Sep 26)
  // Sana Ullah Labib: 2 months pending (Aug, Sep 26)
  // Md Rohullah Mahi: 2 months pending (Aug, Sep 26)
  // Mimoun Uddin Kader Tamim: 1 month pending (Sep 26)
  // Md Saidur Rahaman Sajib: 1 month pending (Sep 26)
  // Shahadat Hossen Emon: 1 month pending (Sep 26)
  // Imrul Kaesh Chowdhury: 1 month pending (Sep 26)
  // Ariful Islam Arafat: 0 pending (Paid Sep 26)
  // Omar Faruk Tawhid: 0 pending
  // Shoaib uddin: 0 pending
  // Tawhid: 0 pending
  // Tanjimul Islam Saydi: 0 pending
  // Taisir: 0 pending

  const pendingMap: Record<string, string[]> = {
    m1: ['2026-09'],
    m2: [],
    m3: [],
    m4: ['2026-09'],
    m5: ['2026-09'],
    m6: ['2026-09'],
    m7: ['2026-09'],
    m8: ['2026-08', '2026-09'],
    m9: ['2026-07', '2026-08', '2026-09'],
    m10: [],
    m11: [],
    m12: [],
    m13: ['2026-08', '2026-09'],
    m14: [],
    m15: ['2026-08', '2026-09'],
    m16: ['2026-07', '2026-08', '2026-09'],
    m17: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'],
    m18: ['2026-08', '2026-09'],
  };

  const defaultMethods: Record<string, string> = {
    m1: 'CellFin',
    m2: 'UCB',
    m3: 'Cash',
    m4: 'Bkash',
    m5: 'Bkash',
    m6: 'PBL',
    m7: 'IIBL',
    m8: 'UCB',
    m9: 'Bkash',
    m10: 'CityTouch',
    m11: 'Club AC',
    m12: 'Club AC',
    m13: 'Bkash',
    m14: 'Bkash',
    m15: 'Cash',
    m16: 'Bkash',
    m17: 'Bkash',
    m18: 'IBBL',
  };

  MONTHS_CONFIG.forEach((m) => {
    INITIAL_MEMBERS.filter(mem => mem.status === 'Active').forEach((mem) => {
      // Future months beyond 2026-09 are upcoming ledger slots, starting as unpaid (amountPaid: 0, status: 'Due')
      const isFutureMonth = m.key > '2026-09';
      const isDue = isFutureMonth || (pendingMap[mem.id]?.includes(m.key) ?? false);
      const isPaid = !isDue;
      const amount = mem.units * 1000;
      
      records.push({
        id: `p-${mem.id}-${m.key}`,
        memberId: mem.id,
        memberName: mem.name,
        monthKey: m.key,
        monthLabel: m.label,
        units: mem.units,
        amountExpected: amount,
        amountPaid: isPaid ? amount : 0,
        status: isPaid ? 'Paid' : 'Due',
        paymentDate: isPaid ? `${m.key}-10` : undefined,
        payment_date: isPaid ? `${m.key}-10` : undefined,
        paymentMethod: isPaid ? (m.key >= '2026-01' ? 'Club AC' : (defaultMethods[mem.id] as any || 'Club AC')) : undefined,
        receiptNumber: isPaid ? `MC-${m.yearMonth}-${mem.id}` : undefined,
      });
    });
  });

  return records;
}

export const INITIAL_ADMINS: import('../types').AdminUser[] = [
  {
    id: 'admin_treasurer',
    name: 'Imrul Kaesh Chowdhury',
    email: 'treasurer@monieclub',
    password: 'treasurer@monieclub',
    designation: 'Treasurer',
    role: 'Super Admin',
    canEdit: true,
    phone: '01822240603',
    createdAt: '2025-10-01',
  },
  {
    id: 'admin_general',
    name: 'General Admin',
    email: 'admin@monieclub',
    password: 'admin@monieclub',
    designation: 'Admin',
    role: 'Admin',
    canEdit: false,
    phone: '01753102771',
    createdAt: '2025-10-01',
  },
];

export const INITIAL_BANK_PROFITS: import('../types').BankProfitRecord[] = [
  {
    id: 'bp-1',
    amount: 3250,
    date: '2026-06-30',
    bankName: 'Club Account (IBBL)',
    description: 'Half-yearly bank profit / interest credit',
    recordedBy: 'Imrul Kaesh Chowdhury (Treasurer)',
    receiptOrVoucher: 'BP-2026-06',
    notes: 'Bank profit credited to club account, adding to total club cash reserves.',
    createdAt: '2026-06-30T10:00:00.000Z',
  },
];

export const INITIAL_CLAIMS: import('../types').PendingPaymentClaim[] = [
  {
    id: 'claim_1',
    memberId: 'm1',
    memberName: 'Saiful Islam Robin',
    memberMobile: '01863269888',
    monthKey: '2026-09',
    monthLabel: 'September 2026',
    units: 5,
    amount: 5000,
    paymentMethod: 'Bkash',
    trxId: 'BK9X2491LA',
    notes: 'Paid subscription dues via bKash personal',
    submittedAt: '2026-09-24T14:32:00.000Z',
    status: 'Pending',
  },
  {
    id: 'claim_2',
    memberId: 'm4',
    memberName: 'Mimoun Uddin Kader Tamim',
    memberMobile: '01872553338',
    monthKey: '2026-09',
    monthLabel: 'September 2026',
    units: 2,
    amount: 2000,
    paymentMethod: 'CellFin',
    trxId: 'CF88204918',
    notes: 'Transferred from CellFin wallet',
    submittedAt: '2026-09-25T10:15:00.000Z',
    status: 'Pending',
  },
];

