export type Language = 'bn' | 'en';

export const toBengaliNumber = (num: number | string): string => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, digit => bengaliDigits[parseInt(digit, 10)]);
};

export const formatCurrency = (amount: number, lang: Language): string => {
  const formatted = amount.toLocaleString('en-IN');
  if (lang === 'bn') {
    return `৳${toBengaliNumber(formatted)}`;
  }
  return `৳${formatted}`;
};

export const translateMonthLabel = (monthKeyOrLabel: string, lang: Language): string => {
  if (lang === 'en') return monthKeyOrLabel;

  const monthMap: Record<string, string> = {
    January: 'জানুয়ারি',
    February: 'ফেব্রুয়ারি',
    March: 'মার্চ',
    April: 'এপ্রিল',
    May: 'মে',
    June: 'জুন',
    July: 'জুলাই',
    August: 'আগস্ট',
    September: 'সেপ্টেম্বর',
    October: 'অক্টোবর',
    November: 'নভেম্বর',
    December: 'ডিসেম্বর',
    'Jan': 'জানু',
    'Feb': 'ফেব্রু',
    'Mar': 'মার্চ',
    'Apr': 'এপ্রিল',
    'Jun': 'জুন',
    'Jul': 'জুলাই',
    'Aug': 'আগস্ট',
    'Sep': 'সেপ্টে',
    'Oct': 'অক্টো',
    'Nov': 'নভে',
    'Dec': 'ডিসে',
  };

  let translated = monthKeyOrLabel;
  Object.entries(monthMap).forEach(([en, bn]) => {
    translated = translated.replace(new RegExp(en, 'g'), bn);
  });
  return toBengaliNumber(translated);
};

export const memberTranslations = {
  bn: {
    portalBadge: 'সদস্য ড্যাশবোর্ড',
    unitsLabel: 'ইউনিট',
    unitSingle: 'ইউনিট',
    unitPlural: 'ইউনিট',
    logout: 'লগআউট',
    welcomeBack: 'স্বাগতম,',
    memberId: 'আইডি',
    phone: 'মোবাইল',
    bloodGroup: 'রক্তের গ্রুপ',
    address: 'স্থায়ী ঠিকানা',
    membershipStatus: 'স্ট্যাটাস',
    active: 'সক্রিয় সদস্য',
    inactive: 'নিষ্ক্রিয়',

    // Financial Overview
    financialOverviewTitle: 'আর্থিক বিবরণী ও তহবিল স্থিতি',
    totalPaid: 'মোট পরিশোধিত কিস্তি',
    totalDue: 'চলতি বকেয়া',
    noDue: 'কোনো বকেয়া নেই',
    allClear: 'সব কিস্তি পরিশোধিত',
    dueMonthsCount: 'মাসের কিস্তি বকেয়া',
    monthlyRate: 'মাসিক কিস্তির হার',
    perMonth: '/ মাস',
    ventureShare: 'ভেঞ্চার হতে আনুমানিক লাভ',
    dividendShareNotice: 'চলমান ব্যবসায়িক বিনিয়োগ হতে মেম্বারশিপ শেয়ার',
    submitDepositNotice: 'পেমেন্ট নোটিশ দিন',
    viewLedger: 'লেজার দেখুন',

    // Navigation Tabs
    tabActivity: 'আমার কার্যক্রম',
    tabLedger: 'পেমেন্ট লেজার',
    tabNotices: 'নোটিশ পাঠান',
    tabTreasury: 'ক্লাব তহবিল ও ভেঞ্চার',

    // Activity Tab
    recentActivity: 'সাম্প্রতিক লেনদেন ও পেমেন্ট হিস্ট্রি',
    recentActivityDesc: 'আপনার জমার ট্রানজেকশন ও অ্যাডমিন অনুমোদনের লাইভ হিস্ট্রি',
    verifiedPayment: 'যাচাইকৃত পেমেন্ট',
    pendingVerification: 'যাচাইয়ের অপেক্ষায়',
    paymentMethod: 'পেমেন্ট মাধ্যম',
    paidOn: 'পরিশোধের তারিখ',
    trxId: 'ট্রানজেকশন আইডি',
    receiptNo: 'রসিদ নং',
    noPaymentFound: 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি',

    // Ledger Tab
    ledgerTitle: 'আপনার মাসিক কিস্তির খতিয়ান',
    ledgerSubtitle: 'অক্টোবর ২০২৫ হতে সেপ্টেম্বর ২০২৬ পর্যন্ত আপনার জমাকৃত ও বকেয়া কিস্তির বিস্তারিত',
    monthCol: 'মাস',
    expectedCol: 'নির্ধারিত ফি',
    paidCol: 'পরিশোধিত',
    statusCol: 'অবস্থা',
    paymentDateCol: 'পরিশোধের তারিখ',
    methodCol: 'পদ্ধতি',
    paidBadge: 'পরিশোধিত',
    dueBadge: 'বকেয়া',

    // Modal & Claims
    claimModalTitle: 'পেমেন্ট জমার নোটিশ পাঠান',
    claimModalSubtitle: 'আপনার জমাকৃত কিস্তির তথ্য দিন, ট্রেজারার ব্যাংক স্টেটমেন্ট যাচাই করে অনুমোদন করবেন।',
    selectMonthsLabel: 'যে মাসের কিস্তি পরিশোধ করেছেন (একাধিক নির্বাচনযোগ্য)',
    amountLabel: 'মোট পরিশোধিত পরিমাণ (টাকা)',
    paymentDateLabel: 'যে তারিখে টাকা পাঠিয়েছেন',
    paymentMethodLabel: 'টাকা পাঠানোর মাধ্যম',
    trxIdLabel: 'ট্রানজেকশন আইডি (Bkash/Nagad/Bank Trx ID)',
    notesLabel: 'মন্তব্য বা অতিরিক্ত তথ্য (যদি থাকে)',
    submitClaimBtn: 'নোটিশ সাবমিট করুন',
    submitting: 'সাবমিট হচ্ছে...',
    submittedSuccess: 'পেমেন্ট নোটিশ সফলভাবে জমা হয়েছে!',
    cancelBtn: 'বাতিল',
    selectAllDue: 'সকল বকেয়া একসাথে নির্বাচন করুন',

    // Treasury & Venture Tab
    treasuryTitle: 'ক্লাব সেন্ট্রাল ফান্ড ও চলমান ভেঞ্চার',
    treasurySubtitle: 'ক্লাবের মোট মূলধন, ব্যবসায় বিনিয়োগকৃত টাকা ও নগদ লিকুইড রিজার্ভের স্বচ্ছ তথ্য',
    totalClubFunds: 'ক্লাবের মোট সংগৃহীত ফান্ড',
    investedFunds: 'ব্যবসায় নিয়োজিত মূলধন',
    liquidReserves: 'ক্লাব একাউন্টে নগদ গচ্ছিত',
    totalOperatingCosts: 'ক্লাব পরিচালনা ব্যয়',
    registrationFeePool: 'রেজিস্ট্রেশন ফি হতে ব্যয় নির্বাহ',
    activeVenturesTitle: 'চলমান ব্যবসায়িক প্রজেক্ট / ভেঞ্চার',
    noActiveVenture: 'বর্তমানে কোনো সক্রিয় ভেঞ্চার চলমান নেই',
    projectedReturn: 'প্রত্যাশিত মোট রিটার্ন',
    ventureDuration: 'মেয়াদকাল',
    partnerOrBiz: 'ব্যবসায়িক খাত / পার্টনার',
    yourShareProjected: 'আপনার সম্ভাব্য শেয়ার',
  },
  en: {
    portalBadge: 'Member Portal',
    unitsLabel: 'Units',
    unitSingle: 'unit',
    unitPlural: 'units',
    logout: 'Logout',
    welcomeBack: 'Welcome back,',
    memberId: 'ID',
    phone: 'Phone',
    bloodGroup: 'Blood Group',
    address: 'Permanent Address',
    membershipStatus: 'Status',
    active: 'Active Member',
    inactive: 'Inactive',

    // Financial Overview
    financialOverviewTitle: 'Financial Overview & Balance',
    totalPaid: 'Total Paid Subscriptions',
    totalDue: 'Current Dues',
    noDue: 'No Dues Pending',
    allClear: 'All Subscriptions Cleared',
    dueMonthsCount: 'Month(s) Dues Pending',
    monthlyRate: 'Monthly Subscription Rate',
    perMonth: '/ month',
    ventureShare: 'Projected Venture Return',
    dividendShareNotice: 'Estimated dividend share from active business investments',
    submitDepositNotice: 'Submit Payment Notice',
    viewLedger: 'View Ledger',

    // Navigation Tabs
    tabActivity: 'My Activity',
    tabLedger: 'Payment Ledger',
    tabNotices: 'Submit Deposit',
    tabTreasury: 'Treasury & Ventures',

    // Activity Tab
    recentActivity: 'Recent Transactions & Payment Records',
    recentActivityDesc: 'Live verified payment history and ledger approvals',
    verifiedPayment: 'Verified Payment',
    pendingVerification: 'Pending Verification',
    paymentMethod: 'Method',
    paidOn: 'Payment Date',
    trxId: 'Transaction ID',
    receiptNo: 'Receipt No',
    noPaymentFound: 'No payment records found',

    // Ledger Tab
    ledgerTitle: 'Personal Monthly Ledger',
    ledgerSubtitle: 'Detailed record of monthly subscriptions from October 2025 to September 2026',
    monthCol: 'Month',
    expectedCol: 'Expected',
    paidCol: 'Paid',
    statusCol: 'Status',
    paymentDateCol: 'Date Paid',
    methodCol: 'Method',
    paidBadge: 'Paid',
    dueBadge: 'Due',

    // Modal & Claims
    claimModalTitle: 'Submit Payment Notice',
    claimModalSubtitle: 'Provide details of your deposit. The Treasurer will verify and approve into ledger.',
    selectMonthsLabel: 'Select Paid Month(s) (Multi-month supported)',
    amountLabel: 'Total Deposited Amount (BDT)',
    paymentDateLabel: 'Actual Payment Date',
    paymentMethodLabel: 'Payment Channel',
    trxIdLabel: 'Transaction ID (Bkash/Nagad/Bank Reference)',
    notesLabel: 'Notes or Depositor Info (Optional)',
    submitClaimBtn: 'Submit Payment Notice',
    submitting: 'Submitting...',
    submittedSuccess: 'Payment notice submitted successfully!',
    cancelBtn: 'Cancel',
    selectAllDue: 'Select All Due Months',

    // Treasury & Venture Tab
    treasuryTitle: 'Club Treasury & Active Ventures',
    treasurySubtitle: 'Complete transparency into club capital, active ventures, and liquid reserves',
    totalClubFunds: 'Total Club Treasury',
    investedFunds: 'Deployed in Business Ventures',
    liquidReserves: 'Liquid Cash Reserves',
    totalOperatingCosts: 'Total Operating Expenses',
    registrationFeePool: 'Funded from Registration Fee',
    activeVenturesTitle: 'Active Business Investments',
    noActiveVenture: 'No business investments active currently',
    projectedReturn: 'Projected Total Return',
    ventureDuration: 'Duration',
    partnerOrBiz: 'Partner / Sector',
    yourShareProjected: 'Your Projected Share',
  }
};
