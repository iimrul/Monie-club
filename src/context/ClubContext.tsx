import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Member, 
  MonthlyPayment, 
  BusinessInvestment, 
  ExpenseRecord, 
  FeeCollection, 
  ClubSummary, 
  MonthKey,
  UITheme,
  AppFont,
  PaymentMethod,
  MemberFinancials,
  AdminUser,
  PendingPaymentClaim,
  BankProfitRecord
} from '../types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_INVESTMENT,
  INITIAL_INVESTMENTS, 
  INITIAL_EXPENSES, 
  INITIAL_FEE_COLLECTIONS,
  INITIAL_ADMINS,
  INITIAL_CLAIMS,
  INITIAL_BANK_PROFITS,
  generateInitialMonthlyPayments,
  MONTHS_CONFIG,
  formatMonthKeyToInfo
} from '../data/initialData';
import {
  getCurrentMonthKey,
  getCurrentDateString,
  formatMonthKey,
  calculateMemberDues,
  OFFICIAL_CLUB_NAME
} from '../services/paymentDueManager';
import { db, collection, doc, onSnapshot } from '../firebase';
import { 
  seedFirestoreIfEmpty,
  cloudSaveMember,
  cloudDeleteMember,
  cloudSavePayment,
  cloudBatchSavePayments,
  cloudSaveInvestment,
  cloudDeleteInvestment,
  cloudSaveExpense,
  cloudDeleteExpense,
  cloudSaveFee,
  cloudDeleteFee,
  cloudSaveClaim,
  cloudDeleteClaim,
  cloudSaveAdmin,
  cloudDeleteAdmin,
  cloudSaveBankProfit,
  cloudDeleteBankProfit,
  cloudSaveConfig,
  cloudDeletePaymentsForMonth
} from '../services/firestoreSync';

export interface MonthInfo {
  key: MonthKey;
  label: string;
  yearMonth: string;
}

export type PortalMode = 'member' | 'admin';

interface ClubContextType {
  theme: UITheme;
  setTheme: (t: UITheme) => void;
  fontFamily: AppFont;
  setFontFamily: (f: AppFont) => void;
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  adminSignOutAndGoToMemberPortal: () => void;
  // Admin & RBAC
  adminUsers: AdminUser[];
  currentAdminUser: AdminUser | null;
  adminLogin: (email: string, password?: string) => { success: boolean; error?: string };
  adminLogout: () => void;
  designateSuperAdmin: (newSuperAdminId: string) => void;
  updateAdminUser: (id: string, updates: Partial<AdminUser>) => void;
  addAdminUser: (admin: Omit<AdminUser, 'id'>) => void;
  deleteAdminUser: (id: string) => void;
  // Member Portal Authentication
  currentMemberUser: Member | null;
  memberLogin: (mobile: string) => { success: boolean; error?: string };
  memberLogout: () => void;
  // Pending Member Payment Claims
  pendingClaims: PendingPaymentClaim[];
  submitPaymentClaim: (claim: Omit<PendingPaymentClaim, 'id' | 'submittedAt' | 'status'>) => void;
  approvePaymentClaim: (claimId: string) => void;
  rejectPaymentClaim: (claimId: string, reason?: string) => void;
  deletePaymentClaim: (claimId: string) => void;
  // General Club Data
  members: Member[];
  monthlyPayments: MonthlyPayment[];
  investments: BusinessInvestment[];
  investment: BusinessInvestment;
  expenses: ExpenseRecord[];
  feeCollections: FeeCollection[];
  summary: ClubSummary;
  bankProfits: BankProfitRecord[];
  addBankProfit: (profit: Omit<BankProfitRecord, 'id' | 'createdAt'>) => void;
  updateBankProfit: (id: string, updates: Partial<BankProfitRecord>) => void;
  deleteBankProfit: (id: string) => void;
  months: MonthInfo[];
  addMonth: (targetKey?: string) => void;
  deleteMonth: (monthKey: MonthKey) => void;
  setTotalClubFunds: (val: number) => void;
  recordPayment: (paymentId: string, details: { amountPaid: number; paymentDate: string; paymentMethod: any; notes?: string; status: 'Paid' | 'Due' | 'Partial' | 'Waived'; memberId?: string; memberName?: string; monthKey?: MonthKey }) => void;
  updatePayment: (paymentId: string, updates: Partial<MonthlyPayment>) => void;
  quickCollectDue: (memberId: string, monthKey: MonthKey, paymentMethod?: PaymentMethod) => void;
  batchCollectMemberDues: (memberId: string, paymentMethod?: PaymentMethod) => void;
  batchMarkMonthPaid: (monthKey: MonthKey, paymentMethod?: PaymentMethod) => void;
  quickAdvancePayMember: (memberId: string, count: number, paymentMethod?: PaymentMethod) => void;
  addMember: (member: Omit<Member, 'id' | 'monthsPending' | 'totalDueAmount'>) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addInvestment: (venture: Omit<BusinessInvestment, 'id'>) => void;
  updateInvestment: (idOrUpdates: string | Partial<BusinessInvestment>, maybeUpdates?: Partial<BusinessInvestment>) => void;
  deleteInvestment: (id: string) => void;
  concludeInvestment: (id: string, details?: { actualProfit?: number; concludedDate?: string; notes?: string }) => void;
  reactivateInvestment: (id: string) => void;
  toggleInvestmentMilestone: (milestoneId: string, investmentId?: string) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => void;
  deleteExpense: (id: string) => void;
  addFeeCollection: (fee: Omit<FeeCollection, 'id'>) => void;
  updateFeeCollection: (id: string, updates: Partial<FeeCollection>) => void;
  deleteFeeCollection: (id: string) => void;
  collectMemberFee: (memberId: string, details?: { feeAmount?: number; date?: string; paymentMethod?: PaymentMethod; purpose?: string; notes?: string }) => void;
  batchCollectAllFees: (paymentMethod?: PaymentMethod) => void;
  restoreFeeCollections: (collections: FeeCollection[]) => void;
  setMemberFeeStatus: (memberId: string, status: 'Paid' | 'Unpaid', details?: { feeAmount?: number; date?: string; paymentMethod?: PaymentMethod; notes?: string }) => void;
  getMemberFinancials: (memberId: string) => MemberFinancials;
  resetToInitialData: () => void;
  restoreExactSheetsData: () => Promise<void>;
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
}

const STORAGE_KEY_PREFIX = 'moni_club_data_v5';

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<UITheme>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_theme`);
      if (stored === 'light' || stored === 'dark' || stored === 'warm' || stored === 'midnight') {
        return stored as UITheme;
      }
      return 'midnight';
    } catch {
      return 'midnight';
    }
  });

  const [fontFamily, setFontFamily] = useState<AppFont>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_font`);
      if (stored === 'inter' || stored === 'outfit' || stored === 'system') {
        return stored as AppFont;
      }
      return 'outfit';
    } catch {
      return 'outfit';
    }
  });

  const [months, setMonths] = useState<MonthInfo[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_months`);
      return stored ? JSON.parse(stored) : MONTHS_CONFIG;
    } catch {
      return MONTHS_CONFIG;
    }
  });

  const [manualFundsAdjustment, setManualFundsAdjustment] = useState<number>(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_fundsAdjustment`);
      return 0;
    } catch {
      return 0;
    }
  });

  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_members`);
      if (stored) {
        const parsed: Member[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_MEMBERS.length) {
          return parsed.map(m => {
            const init = INITIAL_MEMBERS.find(im => im.id === m.id);
            if (init && init.status === 'Inactive') {
              return {
                ...init,
                ...m,
                inactiveDate: m.inactiveDate || init.inactiveDate,
                durationActiveMonths: m.durationActiveMonths || init.durationActiveMonths,
                tenureText: m.tenureText || init.tenureText,
                leaveReason: m.leaveReason || init.leaveReason,
              };
            }
            return m;
          });
        }
      }
      return INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_payments`);
      if (stored) {
        const parsed: MonthlyPayment[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return parsed;
        }
      }
      return generateInitialMonthlyPayments();
    } catch {
      return generateInitialMonthlyPayments();
    }
  });

  const [investments, setInvestments] = useState<BusinessInvestment[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_investments`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_INVESTMENTS;
    } catch {
      return INITIAL_INVESTMENTS;
    }
  });

  const investment = useMemo<BusinessInvestment>(() => {
    return investments.find(inv => inv.status === 'Active') || investments[0] || INITIAL_INVESTMENT;
  }, [investments]);

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_expenses`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [feeCollections, setFeeCollections] = useState<FeeCollection[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_fees`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_FEE_COLLECTIONS;
    } catch {
      return INITIAL_FEE_COLLECTIONS;
    }
  });

  // Portal Mode: 'admin' (default - credentials-secured admin panel) or 'member' (individual member portal)
  const [portalMode, setPortalModeState] = useState<PortalMode>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.toLowerCase();
        if (hash === '#member') {
          return 'member';
        }
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_portal_mode`);
        if (stored === 'member' || stored === 'admin') {
          return stored as PortalMode;
        }
      }
      return 'admin';
    } catch {
      return 'admin';
    }
  });

  const setPortalMode = (mode: PortalMode) => {
    setPortalModeState(mode);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_portal_mode`, mode);
      if (typeof window !== 'undefined' && window.history) {
        if (mode === 'admin') {
          window.history.pushState(null, '', '/');
        } else {
          window.history.pushState(null, '', '#member');
        }
      }
    } catch {
      // ignore pushState errors in iframe
    }
  };

  const adminSignOutAndGoToMemberPortal = () => {
    setCurrentAdminUser(null);
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}_session_admin`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_current_admin`);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_portal_mode`, 'member');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(null, '', '#member');
      }
    } catch {}
    setPortalModeState('member');
  };

  // Bank Profits (manually inputable interest/profits from bank that increase club cash)
  const [bankProfits, setBankProfits] = useState<BankProfitRecord[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_bank_profits`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return INITIAL_BANK_PROFITS;
    } catch {
      return INITIAL_BANK_PROFITS;
    }
  });

  // Dynamically calculate total paid subscriptions across active months from the Ledger
  const totalPaidSubscriptions = useMemo(() => {
    const activeMonthKeys = new Set(months.map(m => m.key));
    return monthlyPayments
      .filter(p => activeMonthKeys.has(p.monthKey))
      .reduce((sum, p) => {
        if (p.status === 'Paid') {
          return sum + (Number(p.amountPaid) > 0 ? Number(p.amountPaid) : Number(p.amountExpected) || 0);
        }
        return sum + (Number(p.amountPaid) || 0);
      }, 0);
  }, [monthlyPayments, months]);

  // Dynamically calculate total realized bank profits
  const totalBankProfits = useMemo(() => {
    return bankProfits.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [bankProfits]);

  // Total Treasury is dynamic: sum of all member paid subscriptions in ledger + bank profits + manual adjustment (if any)
  const totalClubFunds = useMemo(() => {
    return totalPaidSubscriptions + totalBankProfits + (manualFundsAdjustment || 0);
  }, [totalPaidSubscriptions, totalBankProfits, manualFundsAdjustment]);

  const setTotalClubFunds = (val: number) => {
    const adjustment = val - (totalPaidSubscriptions + totalBankProfits);
    setManualFundsAdjustment(adjustment);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_fundsAdjustment`, String(adjustment));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_totalFunds`, String(val));
    } catch {}
    cloudSaveConfig(val, months);
  };

  // Admin Users & RBAC - Only the two authorized credentials
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_admin_users`);
      if (stored) {
        const parsed: AdminUser[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 2 && parsed.some(a => a.email === 'admin@monieclub') && parsed.some(a => a.email === 'treasurer@monieclub')) {
          return parsed;
        }
      }
      return INITIAL_ADMINS;
    } catch {
      return INITIAL_ADMINS;
    }
  });

  // Current Logged-in Admin (Persisted across sessions in localStorage)
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_current_admin`) || sessionStorage.getItem(`${STORAGE_KEY_PREFIX}_session_admin`);
      if (stored) {
        const parsed: AdminUser = JSON.parse(stored);
        if (parsed.email === 'treasurer@monieclub' || parsed.email === 'treasurer') {
          return { ...parsed, email: 'treasurer@monieclub', role: 'Super Admin', canEdit: true, designation: 'Treasurer' };
        }
        if (parsed.email === 'admin@monieclub' || parsed.email === 'admin') {
          return { ...parsed, email: 'admin@monieclub', role: 'Admin', canEdit: false, designation: 'Admin' };
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Current Logged-in Member (Null by default, requiring mobile number login)
  const [currentMemberUser, setCurrentMemberUser] = useState<Member | null>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_current_member`);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch {
      return null;
    }
  });

  // Pending Member Payment Claims
  const [pendingClaims, setPendingClaims] = useState<PendingPaymentClaim[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_pending_claims`);
      return stored ? JSON.parse(stored) : INITIAL_CLAIMS;
    } catch {
      return INITIAL_CLAIMS;
    }
  });

  // 1. Initial Cloud Firestore Seed Check on App Mount (Disabled automatic writes during quota limit)
  useEffect(() => {
    // Cloud Firestore is operating in safe read-only / cached mode while daily write quota resets
  }, []);

  // 2. Real-time Cloud Firestore Listeners (Ensures all data is saved and synced with cloud)
  useEffect(() => {
    const handleSnapshotErr = (name: string) => (err: any) => {
      if (
        err?.code === 'unavailable' || 
        err?.code === 'resource-exhausted' ||
        err?.message?.includes('offline') || 
        err?.message?.includes('Could not reach') ||
        err?.message?.includes('Quota')
      ) {
        return; // Silent offline/quota fallback to cached local state
      }
      console.warn(`Firestore ${name} sync notice:`, err);
    };

    const unsubMembers = onSnapshot(collection(db, 'members'), snapshot => {
      if (!snapshot.empty && snapshot.docs.length >= INITIAL_MEMBERS.length) {
        const cloudMembers: Member[] = [];
        snapshot.forEach(docSnap => cloudMembers.push(docSnap.data() as Member));
        setMembers(cloudMembers);
      }
    }, handleSnapshotErr('members'));

    const unsubPayments = onSnapshot(collection(db, 'monthlyPayments'), snapshot => {
      if (!snapshot.empty && snapshot.docs.length >= 200) {
        const cloudPayments: MonthlyPayment[] = [];
        snapshot.forEach(docSnap => cloudPayments.push(docSnap.data() as MonthlyPayment));
        setMonthlyPayments(prev => {
          if (!prev || prev.length === 0) return cloudPayments;
          const cloudMap = new Map<string, MonthlyPayment>();
          cloudPayments.forEach(p => cloudMap.set(p.id, p));
          return prev.map(localP => {
            const cloudP = cloudMap.get(localP.id);
            if (!cloudP) return localP;
            const localTime = new Date(localP.processedAt || localP.processed_at || 0).getTime();
            const cloudTime = new Date(cloudP.processedAt || cloudP.processed_at || 0).getTime();
            return localTime > cloudTime ? localP : cloudP;
          });
        });
      }
    }, handleSnapshotErr('payments'));

    const unsubInvestments = onSnapshot(collection(db, 'investments'), snapshot => {
      if (!snapshot.empty) {
        const cloudInv: BusinessInvestment[] = [];
        snapshot.forEach(docSnap => cloudInv.push(docSnap.data() as BusinessInvestment));
        setInvestments(cloudInv);
      }
    }, handleSnapshotErr('investments'));

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), snapshot => {
      if (!snapshot.empty) {
        const cloudExp: ExpenseRecord[] = [];
        snapshot.forEach(docSnap => cloudExp.push(docSnap.data() as ExpenseRecord));
        setExpenses(cloudExp);
      }
    }, handleSnapshotErr('expenses'));

    const unsubFees = onSnapshot(collection(db, 'feeCollections'), snapshot => {
      if (!snapshot.empty) {
        const cloudFees: FeeCollection[] = [];
        snapshot.forEach(docSnap => cloudFees.push(docSnap.data() as FeeCollection));
        setFeeCollections(cloudFees);
      }
    }, handleSnapshotErr('fees'));

    const unsubClaims = onSnapshot(collection(db, 'pendingClaims'), snapshot => {
      if (!snapshot.empty) {
        const cloudClaims: PendingPaymentClaim[] = [];
        snapshot.forEach(docSnap => cloudClaims.push(docSnap.data() as PendingPaymentClaim));
        setPendingClaims(cloudClaims);
      }
    }, handleSnapshotErr('claims'));

    const unsubAdmins = onSnapshot(collection(db, 'adminUsers'), snapshot => {
      if (!snapshot.empty) {
        const cloudAdmins: AdminUser[] = [];
        snapshot.forEach(docSnap => cloudAdmins.push(docSnap.data() as AdminUser));
        setAdminUsers(cloudAdmins);
      }
    }, handleSnapshotErr('admins'));

    const unsubBankProfits = onSnapshot(collection(db, 'bankProfits'), snapshot => {
      const cloudProfits: BankProfitRecord[] = [];
      snapshot.forEach(docSnap => cloudProfits.push(docSnap.data() as BankProfitRecord));
      if (!snapshot.empty) {
        setBankProfits(cloudProfits);
      } else {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_bank_profits`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length === 0) {
              setBankProfits([]);
            }
          } catch {}
        }
      }
    }, handleSnapshotErr('bankProfits'));

    const unsubConfig = onSnapshot(doc(db, 'clubConfig', 'main'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.months) && data.months.length > 0) {
          // Sort months chronologically
          const sorted = [...data.months].sort((a: any, b: any) => (a.key || '').localeCompare(b.key || ''));
          setMonths(sorted);
        }
      }
    }, handleSnapshotErr('config'));

    return () => {
      unsubMembers();
      unsubPayments();
      unsubInvestments();
      unsubExpenses();
      unsubFees();
      unsubClaims();
      unsubAdmins();
      unsubBankProfits();
      unsubConfig();
    };
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_theme`, theme);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_font`, fontFamily);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_months`, JSON.stringify(months));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_totalFunds`, String(totalClubFunds));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_members`, JSON.stringify(members));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_payments`, JSON.stringify(monthlyPayments));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_investments`, JSON.stringify(investments));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_investment`, JSON.stringify(investment));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_fees`, JSON.stringify(feeCollections));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_bank_profits`, JSON.stringify(bankProfits));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_admin_users`, JSON.stringify(adminUsers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_pending_claims`, JSON.stringify(pendingClaims));
      if (currentMemberUser) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_current_member`, JSON.stringify(currentMemberUser));
      } else {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}_current_member`);
      }
    } catch (e) {
      console.error('Failed to sync to localStorage', e);
    }
  }, [theme, fontFamily, months, totalClubFunds, members, monthlyPayments, investments, investment, expenses, feeCollections, bankProfits, adminUsers, pendingClaims, currentAdminUser, currentMemberUser]);

  // Recalculate member pending months, total due amounts, and registrationFeePaid based on monthlyPayments & feeCollections
  // Dues cutoff is strictly the current calendar month; future months NEVER generate dues!
  useEffect(() => {
    setMembers(prevMembers => {
      let changed = false;
      const updated = prevMembers.map(member => {
        if (member.status === 'Inactive') {
          return member;
        }
        const dues = calculateMemberDues(member, monthlyPayments);
        const monthsPending = dues.monthsPending;
        const totalDueAmount = dues.totalDueAmount;

        const feePaid = feeCollections
          .filter(f => f.memberId === member.id && f.status === 'Paid')
          .reduce((sum, f) => sum + f.feeAmount, 0);

        if (
          member.monthsPending !== monthsPending || 
          member.totalDueAmount !== totalDueAmount ||
          member.registrationFeePaid !== feePaid
        ) {
          changed = true;
          return {
            ...member,
            monthsPending,
            totalDueAmount,
            registrationFeePaid: feePaid,
          };
        }
        return member;
      });

      if (changed && currentMemberUser) {
        const updatedCurrent = updated.find(m => m.id === currentMemberUser.id);
        if (
          updatedCurrent &&
          (updatedCurrent.monthsPending !== currentMemberUser.monthsPending ||
           updatedCurrent.totalDueAmount !== currentMemberUser.totalDueAmount)
        ) {
          setCurrentMemberUser(updatedCurrent);
        }
      }

      return changed ? updated : prevMembers;
    });
  }, [monthlyPayments, feeCollections, currentMemberUser]);

  // Dynamically compute summary
  const summary = useMemo<ClubSummary>(() => {
    const totalDues = members
      .filter(m => m.status === 'Active')
      .reduce((sum, m) => sum + m.totalDueAmount, 0);

    const activeMembersCount = members.filter(m => m.status === 'Active').length;
    const totalActiveUnits = members
      .filter(m => m.status === 'Active')
      .reduce((sum, m) => sum + m.units, 0);

    const totalFeeCollected = feeCollections.reduce((sum, f) => sum + f.feeAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const feeBalance = totalFeeCollected - totalExpenses;

    const activeInvestments = investments.filter(inv => inv.status === 'Active');
    const investedFunds = activeInvestments.reduce((sum, inv) => sum + inv.principalAmount, 0);
    const expectedVentureProfit = activeInvestments.reduce((sum, inv) => sum + inv.expectedProfit, 0);
    const liquidReserves = Math.max(0, totalClubFunds - investedFunds); // remaining in account
    const totalBankProfits = bankProfits.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalClubFunds,
      investedFunds,
      liquidReserves,
      expectedVentureProfit,
      totalDues,
      activeMembersCount,
      totalActiveUnits,
      totalFeeCollected,
      totalExpenses,
      feeBalance,
      totalBankProfits,
    };
  }, [totalClubFunds, members, investments, expenses, feeCollections, bankProfits]);

  const recordPayment = (
    paymentId: string, 
    details: { 
      amountPaid: number; 
      paymentDate: string; 
      paymentMethod: any; 
      notes?: string; 
      status: 'Paid' | 'Due' | 'Partial' | 'Waived';
      memberId?: string;
      memberName?: string;
      monthKey?: MonthKey;
    }
  ) => {
    const processTime = new Date().toISOString();
    let savedPayment: MonthlyPayment | null = null;

    setMonthlyPayments(prev => {
      const idx = prev.findIndex(p => p.id === paymentId || (details.memberId && details.monthKey && p.memberId === details.memberId && p.monthKey === details.monthKey));
      if (idx >= 0) {
        const p = prev[idx];
        const finalPaid = details.amountPaid !== undefined && details.amountPaid > 0
          ? details.amountPaid
          : (details.status === 'Paid' ? p.amountExpected : (details.amountPaid || 0));

        const updated: MonthlyPayment = {
          ...p,
          amountPaid: finalPaid,
          paymentDate: details.paymentDate,
          payment_date: details.paymentDate,
          processedAt: processTime,
          processed_at: processTime,
          paymentMethod: details.paymentMethod,
          status: details.status,
          notes: details.notes || p.notes,
          receiptNumber: p.receiptNumber || `MC-${p.monthKey}-${Date.now().toString().slice(-4)}`,
        };
        savedPayment = updated;
        const newArr = [...prev];
        newArr[idx] = updated;
        return newArr;
      } else {
        const parts = paymentId.split('-');
        const memberId = details.memberId || (parts.length >= 2 ? parts[1] : '');
        const monthKey = (details.monthKey || (parts.length >= 3 ? `${parts[2]}-${parts[3]}` : getCurrentMonthKey())) as MonthKey;
        const member = members.find(m => m.id === memberId);
        const monthInfo = months.find(m => m.key === monthKey);
        const units = member?.units || 1;
        const amountExpected = units * 1000;
        const finalPaid = details.amountPaid !== undefined && details.amountPaid > 0
          ? details.amountPaid
          : (details.status === 'Paid' ? amountExpected : (details.amountPaid || 0));

        const created: MonthlyPayment = {
          id: paymentId,
          memberId: memberId || 'unknown',
          memberName: details.memberName || member?.name || 'Member',
          monthKey,
          monthLabel: monthInfo?.label || monthKey,
          units,
          amountExpected,
          amountPaid: finalPaid,
          paymentDate: details.paymentDate,
          payment_date: details.paymentDate,
          processedAt: processTime,
          processed_at: processTime,
          paymentMethod: details.paymentMethod,
          status: details.status,
          notes: details.notes,
          receiptNumber: `MC-${monthKey}-${Date.now().toString().slice(-4)}`,
        };
        savedPayment = created;
        return [...prev, created];
      }
    });

    if (savedPayment) {
      cloudSavePayment(savedPayment);
    }
  };

  const quickCollectDue = (memberId: string, monthKey: MonthKey, paymentMethod?: PaymentMethod) => {
    const todayStr = getCurrentDateString();
    const processTime = new Date().toISOString();
    const methodToUse = paymentMethod || 'Club AC';
    setMonthlyPayments(prev => 
      prev.map(p => {
        if (p.memberId === memberId && p.monthKey === monthKey) {
          const actualPaymentDate = p.paymentDate || todayStr;
          const updated: MonthlyPayment = {
            ...p,
            amountPaid: p.amountExpected,
            paymentDate: actualPaymentDate,
            payment_date: actualPaymentDate,
            processedAt: processTime,
            processed_at: processTime,
            paymentMethod: methodToUse,
            status: 'Paid',
            receiptNumber: p.receiptNumber || `MC-${monthKey}-${memberId}`,
          };
          cloudSavePayment(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const batchCollectMemberDues = (memberId: string, paymentMethod?: PaymentMethod) => {
    const todayStr = getCurrentDateString();
    const processTime = new Date().toISOString();
    const methodToUse = paymentMethod || 'Club AC';
    const changedPayments: MonthlyPayment[] = [];
    const currentKey = getCurrentMonthKey();

    setMonthlyPayments(prev => 
      prev.map(p => {
        // Collect only dues up to the current calendar month that are not yet paid
        if (p.memberId === memberId && p.monthKey <= currentKey && p.status === 'Due') {
          const actualPaymentDate = p.paymentDate || todayStr;
          const updated: MonthlyPayment = {
            ...p,
            amountPaid: p.amountExpected,
            paymentDate: actualPaymentDate,
            payment_date: actualPaymentDate,
            processedAt: processTime,
            processed_at: processTime,
            paymentMethod: methodToUse,
            status: 'Paid',
            receiptNumber: p.receiptNumber || `MC-${p.monthKey}-${memberId}`,
          };
          changedPayments.push(updated);
          return updated;
        }
        return p;
      })
    );
    if (changedPayments.length > 0) {
      cloudBatchSavePayments(changedPayments);
    }
  };

  // Quick 1-tap: Settle all unpaid members for a specific month
  const batchMarkMonthPaid = (monthKey: MonthKey, paymentMethod?: PaymentMethod) => {
    const todayStr = getCurrentDateString();
    const processTime = new Date().toISOString();
    const methodToUse = paymentMethod || 'Club AC';
    const changedPayments: MonthlyPayment[] = [];
    setMonthlyPayments(prev => 
      prev.map(p => {
        if (p.monthKey === monthKey && p.status === 'Due') {
          const actualPaymentDate = p.paymentDate || todayStr;
          const updated: MonthlyPayment = {
            ...p,
            amountPaid: p.amountExpected,
            paymentDate: actualPaymentDate,
            payment_date: actualPaymentDate,
            processedAt: processTime,
            processed_at: processTime,
            paymentMethod: methodToUse,
            status: 'Paid',
            receiptNumber: p.receiptNumber || `MC-${monthKey}-${p.memberId}`,
          };
          changedPayments.push(updated);
          return updated;
        }
        return p;
      })
    );
    if (changedPayments.length > 0) {
      cloudBatchSavePayments(changedPayments);
    }
  };

  // Quick 1-tap: Pay next N unpaid months for a member (advance or catch-up)
  const quickAdvancePayMember = (memberId: string, count: number, paymentMethod?: PaymentMethod) => {
    const todayStr = getCurrentDateString();
    const processTime = new Date().toISOString();
    const methodToUse = paymentMethod || 'Club AC';
    const changedPayments: MonthlyPayment[] = [];
    setMonthlyPayments(prev => {
      let paidCount = 0;
      return prev.map(p => {
        if (p.memberId === memberId && p.status === 'Due' && paidCount < count) {
          paidCount++;
          const actualPaymentDate = p.paymentDate || todayStr;
          const updated: MonthlyPayment = {
            ...p,
            amountPaid: p.amountExpected,
            paymentDate: actualPaymentDate,
            payment_date: actualPaymentDate,
            processedAt: processTime,
            processed_at: processTime,
            paymentMethod: methodToUse,
            status: 'Paid',
            receiptNumber: p.receiptNumber || `MC-${p.monthKey}-${memberId}`,
          };
          changedPayments.push(updated);
          return updated;
        }
        return p;
      });
    });
    if (changedPayments.length > 0) {
      cloudBatchSavePayments(changedPayments);
    }
  };

  // Dynamically add a new calendar month
  const addMonth = (targetKey?: string) => {
    let newKey = targetKey;
    if (!newKey) {
      // Find the last month and compute the next calendar month
      const lastMonth = months[months.length - 1];
      if (lastMonth) {
        const [yearStr, monthStr] = lastMonth.key.split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10) + 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
        newKey = `${year}-${String(month).padStart(2, '0')}`;
      } else {
        newKey = '2026-10';
      }
    }

    if (months.some(m => m.key === newKey)) {
      return; // Already exists
    }

    const monthInfo = formatMonthKeyToInfo(newKey);
    const updatedMonths = [...months, monthInfo].sort((a, b) => a.key.localeCompare(b.key));
    setMonths(updatedMonths);

    // Create payment slots for all active members with status strictly 'Due' and amountPaid: 0
    const newPayments: MonthlyPayment[] = members
      .filter(m => m.status === 'Active')
      .map(mem => ({
        id: `p-${mem.id}-${newKey}`,
        memberId: mem.id,
        memberName: mem.name,
        monthKey: newKey!,
        monthLabel: monthInfo.label,
        units: mem.units,
        amountExpected: mem.units * 1000,
        amountPaid: 0,
        status: 'Due' as const,
        paymentDate: undefined,
        payment_date: undefined,
        paymentMethod: undefined,
        receiptNumber: undefined,
        notes: undefined,
      }));

    // Filter out any stale/existing payment records for this month to guarantee all members are 'Due'
    const paymentsWithoutNewKey = monthlyPayments.filter(p => p.monthKey !== newKey);
    const updatedPayments = [...paymentsWithoutNewKey, ...newPayments];
    setMonthlyPayments(updatedPayments);

    // Persist to Cloud Firestore & localStorage
    cloudSaveConfig(totalClubFunds, updatedMonths);
    cloudBatchSavePayments(newPayments);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_months`, JSON.stringify(updatedMonths));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_payments`, JSON.stringify(updatedPayments));
    } catch {}
  };

  const deleteMonth = (monthKey: MonthKey) => {
    const updatedMonths = months.filter(m => m.key !== monthKey);
    setMonths(updatedMonths);
    const updatedPayments = monthlyPayments.filter(p => p.monthKey !== monthKey);
    setMonthlyPayments(updatedPayments);
    cloudSaveConfig(totalClubFunds, updatedMonths);
    const memberIds = members.map(m => m.id);
    cloudDeletePaymentsForMonth(monthKey, memberIds);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_months`, JSON.stringify(updatedMonths));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_payments`, JSON.stringify(updatedPayments));
    } catch {}
  };

  const addBankProfit = (profitData: Omit<BankProfitRecord, 'id' | 'createdAt'>) => {
    const newProfit: BankProfitRecord = {
      ...profitData,
      id: `bp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBankProfits(prev => [newProfit, ...prev]);
    cloudSaveBankProfit(newProfit);
  };

  const updateBankProfit = (id: string, updates: Partial<BankProfitRecord>) => {
    setBankProfits(prev => {
      const existing = prev.find(p => p.id === id);
      if (!existing) return prev;
      const updated = { ...existing, ...updates };
      cloudSaveBankProfit(updated);
      return prev.map(p => p.id === id ? updated : p);
    });
  };

  const deleteBankProfit = (id: string) => {
    setBankProfits(prev => {
      const updated = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_bank_profits`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    cloudDeleteBankProfit(id);
  };

  const addMember = (newMemData: Omit<Member, 'id' | 'monthsPending' | 'totalDueAmount'>) => {
    const newId = `m-${Date.now()}`;
    const newMember: Member = {
      ...newMemData,
      id: newId,
      monthsPending: 0,
      totalDueAmount: 0,
    };

    setMembers(prev => [...prev, newMember]);
    cloudSaveMember(newMember);

    // Create payment entries for all months
    const newPayments: MonthlyPayment[] = months.map(m => ({
      id: `p-${newId}-${m.key}`,
      memberId: newId,
      memberName: newMember.name,
      monthKey: m.key,
      monthLabel: m.label,
      units: newMember.units,
      amountExpected: newMember.units * 1000,
      amountPaid: 0,
      status: 'Due',
    }));

    setMonthlyPayments(prev => [...prev, ...newPayments]);
    cloudBatchSavePayments(newPayments);
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, ...updates };
        cloudSaveMember(updated);
        return updated;
      }
      return m;
    }));
    if (updates.name || updates.units) {
      setMonthlyPayments(prev => 
        prev.map(p => {
          if (p.memberId === id) {
            const newUnits = updates.units !== undefined ? updates.units : p.units;
            const newExpected = newUnits * 1000;
            const updated: MonthlyPayment = {
              ...p,
              memberName: updates.name || p.memberName,
              units: newUnits,
              amountExpected: newExpected,
              amountPaid: p.status === 'Paid' ? newExpected : p.amountPaid,
            };
            cloudSavePayment(updated);
            return updated;
          }
          return p;
        })
      );
    }
  };

  const deleteMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    cloudDeleteMember(id);
    setMonthlyPayments(prev => prev.filter(p => p.memberId !== id));
  };

  const addInvestment = (venture: Omit<BusinessInvestment, 'id'>) => {
    const principal = Number(venture.principalAmount) || 0;
    const profit = Number(venture.expectedProfit) || 0;
    const newVenture: BusinessInvestment = {
      ...venture,
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      principalAmount: principal,
      expectedProfit: profit,
      totalExpectedReturn: principal + profit,
      status: venture.status || 'Active',
      startDate: venture.startDate || new Date().toISOString().split('T')[0],
      maturityDate: venture.maturityDate || '',
      durationMonths: Number(venture.durationMonths) || 6,
      partnerOrVenture: venture.partnerOrVenture || 'General Commercial Trade',
      description: venture.description || '',
      milestones: venture.milestones || [],
    };
    setInvestments(prev => [newVenture, ...prev]);
    cloudSaveInvestment(newVenture);
  };

  const updateInvestment = (
    idOrUpdates: string | Partial<BusinessInvestment>,
    maybeUpdates?: Partial<BusinessInvestment>
  ) => {
    if (typeof idOrUpdates === 'string') {
      const targetId = idOrUpdates;
      const updates = maybeUpdates || {};
      setInvestments(prev => prev.map(inv => {
        if (inv.id === targetId) {
          const updated = { ...inv, ...updates };
          const p = updated.principalAmount !== undefined ? Number(updated.principalAmount) : inv.principalAmount;
          const profit = updated.expectedProfit !== undefined ? Number(updated.expectedProfit) : inv.expectedProfit;
          updated.principalAmount = p;
          updated.expectedProfit = profit;
          updated.totalExpectedReturn = p + profit;
          cloudSaveInvestment(updated);
          return updated;
        }
        return inv;
      }));
    } else {
      const updates = idOrUpdates;
      setInvestments(prev => {
        const activeTarget = prev.find(i => i.status === 'Active') || prev[0];
        if (!activeTarget) return prev;
        return prev.map(inv => {
          if (inv.id === activeTarget.id) {
            const updated = { ...inv, ...updates };
            const p = updated.principalAmount !== undefined ? Number(updated.principalAmount) : inv.principalAmount;
            const profit = updated.expectedProfit !== undefined ? Number(updated.expectedProfit) : inv.expectedProfit;
            updated.principalAmount = p;
            updated.expectedProfit = profit;
            updated.totalExpectedReturn = p + profit;
            cloudSaveInvestment(updated);
            return updated;
          }
          return inv;
        });
      });
    }
  };

  const concludeInvestment = (
    id: string,
    details?: { actualProfit?: number; concludedDate?: string; notes?: string }
  ) => {
    setInvestments(prev => prev.map(inv => {
      if (inv.id === id) {
        const actualProfit = details?.actualProfit !== undefined ? Number(details.actualProfit) : inv.expectedProfit;
        const concludedDate = details?.concludedDate || new Date().toISOString().split('T')[0];
        const updated: BusinessInvestment = {
          ...inv,
          status: 'Inactive',
          concludedDate,
          actualProfit,
          notes: details?.notes !== undefined ? details.notes : (inv.notes || `Concluded on ${concludedDate}. Principal ৳${inv.principalAmount.toLocaleString()} & ৳${actualProfit.toLocaleString()} profit settled.`),
        };
        cloudSaveInvestment(updated);
        return updated;
      }
      return inv;
    }));
  };

  const reactivateInvestment = (id: string) => {
    setInvestments(prev => prev.map(inv => {
      if (inv.id === id) {
        const updated: BusinessInvestment = {
          ...inv,
          status: 'Active',
          concludedDate: undefined,
        };
        cloudSaveInvestment(updated);
        return updated;
      }
      return inv;
    }));
  };

  const deleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id));
    cloudDeleteInvestment(id);
  };

  const toggleInvestmentMilestone = (milestoneId: string, investmentId?: string) => {
    setInvestments(prev => prev.map(inv => {
      if (!investmentId || inv.id === investmentId) {
        if (!inv.milestones) return inv;
        return {
          ...inv,
          milestones: inv.milestones.map(ms => ms.id === milestoneId ? { ...ms, completed: !ms.completed } : ms),
        };
      }
      return inv;
    }));
  };

  const addExpense = (expenseData: Omit<ExpenseRecord, 'id'>) => {
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    cloudSaveExpense(newExpense);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    cloudDeleteExpense(id);
  };

  const addFeeCollection = (feeData: Omit<FeeCollection, 'id'>) => {
    const newFee: FeeCollection = {
      ...feeData,
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      receiptNo: feeData.receiptNo || `FEE-${Date.now().toString().slice(-4)}`,
    };
    setFeeCollections(prev => [newFee, ...prev]);
    cloudSaveFee(newFee);
  };

  const updateFeeCollection = (id: string, updates: Partial<FeeCollection>) => {
    setFeeCollections(prev => 
      prev.map(f => {
        if (f.id === id) {
          const updated = { ...f, ...updates };
          cloudSaveFee(updated);
          return updated;
        }
        return f;
      })
    );
  };

  const deleteFeeCollection = (id: string) => {
    setFeeCollections(prev => prev.filter(f => f.id !== id));
    cloudDeleteFee(id);
  };

  const collectMemberFee = (
    memberId: string, 
    details?: { feeAmount?: number; date?: string; paymentMethod?: PaymentMethod; purpose?: string; notes?: string }
  ) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Required fee based on 100 per unit
    const expectedFee = member.units * 100;
    const paidSoFar = feeCollections
      .filter(f => f.memberId === memberId && f.status === 'Paid')
      .reduce((sum, f) => sum + f.feeAmount, 0);
    const remainingDue = Math.max(0, expectedFee - paidSoFar);

    const feeAmount = details?.feeAmount !== undefined ? details.feeAmount : (remainingDue > 0 ? remainingDue : expectedFee);
    const date = details?.date || new Date().toISOString().split('T')[0];
    const paymentMethod = details?.paymentMethod || 'Cash';
    const purpose = details?.purpose || 'Registration & Admin Fee (100/unit)';
    const notes = details?.notes || `Fee for ${member.units} unit(s) @ ৳100/unit`;

    const newFee: FeeCollection = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      memberId: member.id,
      memberName: member.name,
      units: member.units,
      feeAmount,
      date,
      status: 'Paid',
      purpose,
      paymentMethod,
      notes,
      receiptNo: `FEE-${Date.now().toString().slice(-4)}`,
    };

    setFeeCollections(prev => [newFee, ...prev]);
    cloudSaveFee(newFee);
  };

  const batchCollectAllFees = (paymentMethod: PaymentMethod = 'Club AC') => {
    const date = new Date().toISOString().split('T')[0];
    const newRecords: FeeCollection[] = [];

    members.forEach(member => {
      const expectedFee = member.units * 100;
      const paidSoFar = feeCollections
        .filter(f => f.memberId === member.id && f.status === 'Paid')
        .reduce((sum, f) => sum + f.feeAmount, 0);
      const remainingDue = expectedFee - paidSoFar;

      if (remainingDue > 0) {
        const item: FeeCollection = {
          id: `fee-${Date.now()}-${member.id}`,
          memberId: member.id,
          memberName: member.name,
          units: member.units,
          feeAmount: remainingDue,
          date,
          status: 'Paid',
          purpose: 'Registration & Admin Fee (100/unit)',
          paymentMethod,
          notes: `Batch collected dues (${member.units} unit(s) @ ৳100/unit)`,
          receiptNo: `FEE-${Date.now().toString().slice(-4)}-${member.id}`,
        };
        newRecords.push(item);
        cloudSaveFee(item);
      }
    });

    if (newRecords.length > 0) {
      setFeeCollections(prev => [...newRecords, ...prev]);
    }
  };

  const restoreFeeCollections = (collections: FeeCollection[]) => {
    setFeeCollections(collections);
  };

  const setMemberFeeStatus = (
    memberId: string, 
    status: 'Paid' | 'Unpaid', 
    details?: { feeAmount?: number; date?: string; paymentMethod?: PaymentMethod; notes?: string }
  ) => {
    if (status === 'Unpaid') {
      // Remove all fee collections for this member to mark them unpaid
      const toDelete = feeCollections.filter(f => f.memberId === memberId);
      toDelete.forEach(f => cloudDeleteFee(f.id));
      setFeeCollections(prev => prev.filter(f => f.memberId !== memberId));
    } else {
      // Mark as Paid
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      const feeAmount = details?.feeAmount !== undefined ? details.feeAmount : member.units * 100;
      const date = details?.date || new Date().toISOString().split('T')[0];
      const paymentMethod = details?.paymentMethod || 'Cash';
      const notes = details?.notes || `Registration & Admin Fee (100/unit)`;

      const existingFees = feeCollections.filter(f => f.memberId === memberId);
      existingFees.forEach(f => cloudDeleteFee(f.id));

      const newRecord: FeeCollection = {
        id: `fee-${Date.now()}-${member.id}`,
        memberId: member.id,
        memberName: member.name,
        units: member.units,
        feeAmount,
        date,
        status: 'Paid',
        purpose: 'Registration & Admin Fee (100/unit)',
        paymentMethod,
        notes,
        receiptNo: `FEE-${Date.now().toString().slice(-4)}`,
      };

      setFeeCollections(prev => {
        const withoutMember = prev.filter(f => f.memberId !== memberId);
        return [newRecord, ...withoutMember];
      });
      cloudSaveFee(newRecord);
    }
  };

  const restoreExactSheetsData = async () => {
    const initMembers = INITIAL_MEMBERS;
    const initPayments = generateInitialMonthlyPayments();
    const initInv = INITIAL_INVESTMENTS;
    const initExp = INITIAL_EXPENSES;
    const initFees = INITIAL_FEE_COLLECTIONS;
    const initAdmins = INITIAL_ADMINS;

    setMembers(initMembers);
    setMonthlyPayments(initPayments);
    setInvestments(initInv);
    setExpenses(initExp);
    setFeeCollections(initFees);
    setAdminUsers(initAdmins);
    setManualFundsAdjustment(0);
    setMonths(MONTHS_CONFIG);

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_members`, JSON.stringify(initMembers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_payments`, JSON.stringify(initPayments));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_investments`, JSON.stringify(initInv));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_expenses`, JSON.stringify(initExp));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_fees`, JSON.stringify(initFees));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_admin_users`, JSON.stringify(initAdmins));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_fundsAdjustment`, '0');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_totalFunds`, '382000');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_months`, JSON.stringify(MONTHS_CONFIG));
    } catch {}

    // Write full sheets dataset into Cloud Firestore
    await seedFirestoreIfEmpty(true);
  };

  const resetToInitialData = () => {
    if (window.confirm('Are you sure you want to reset all data back to the original Google Sheet records? Any changes will be overwritten.')) {
      restoreExactSheetsData();
    }
  };

  const exportDataJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      clubName: OFFICIAL_CLUB_NAME,
      members,
      monthlyPayments,
      investments,
      investment,
      expenses,
      feeCollections,
    };
    return JSON.stringify(data, null, 2);
  };

  const importDataJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.members && parsed.monthlyPayments) {
        setMembers(parsed.members);
        setMonthlyPayments(parsed.monthlyPayments);
        if (parsed.investments) {
          setInvestments(parsed.investments);
        } else if (parsed.investment) {
          setInvestments([parsed.investment]);
        }
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.feeCollections) setFeeCollections(parsed.feeCollections);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Invalid JSON import', e);
      return false;
    }
  };

  const updatePayment = (paymentId: string, updates: Partial<MonthlyPayment>) => {
    setMonthlyPayments(prev => 
      prev.map(p => {
        if (p.id === paymentId) {
          const updated = { ...p, ...updates };
          cloudSavePayment(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const updateExpense = (id: string, updates: Partial<ExpenseRecord>) => {
    setExpenses(prev => 
      prev.map(e => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          cloudSaveExpense(updated);
          return updated;
        }
        return e;
      })
    );
  };

  const getMemberFinancials = (memberId: string): MemberFinancials => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      return { monthlyPaid: 0, totalPaid: 0, totalDue: 0, paidMonthsCount: 0 };
    }

    if (member.status === 'Inactive') {
      const recorded = monthlyPayments.filter(p => p.memberId === member.id && p.status === 'Paid');
      const monthlyPaid = recorded.length > 0 
        ? recorded.reduce((sum, p) => sum + p.amountPaid, 0)
        : (member.durationActiveMonths || 6) * member.units * 1000;
      return {
        monthlyPaid,
        totalPaid: monthlyPaid,
        totalDue: 0,
        paidMonthsCount: recorded.length > 0 ? recorded.length : (member.durationActiveMonths || 6),
      };
    }

    const memberPayments = monthlyPayments.filter(p => p.memberId === member.id && p.status === 'Paid');
    const monthlyPaid = memberPayments.reduce((sum, p) => sum + p.amountPaid, 0);

    return {
      monthlyPaid,
      totalPaid: monthlyPaid,
      totalDue: member.totalDueAmount,
      paidMonthsCount: memberPayments.length,
    };
  };

  // Admin Authentication & RBAC Handlers
  const adminLogin = (email: string, password?: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password?.trim() || '';

    // Credential 1: Treasurer (Super Admin, canEdit: true)
    if (cleanEmail === 'treasurer@monieclub' || cleanEmail === 'treasurer') {
      if (cleanPassword !== 'treasurer@monieclub') {
        return { success: false, error: 'Incorrect password for treasurer.' };
      }
      const treasurerAdmin: AdminUser = {
        id: 'admin_treasurer',
        name: 'Imrul Kaesh Chowdhury',
        email: 'treasurer@monieclub',
        password: 'treasurer@monieclub',
        designation: 'Treasurer',
        role: 'Super Admin',
        canEdit: true,
        phone: '01822240603',
        createdAt: '2025-10-01',
      };
      setCurrentAdminUser(treasurerAdmin);
      try {
        sessionStorage.setItem(`${STORAGE_KEY_PREFIX}_session_admin`, JSON.stringify(treasurerAdmin));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_current_admin`, JSON.stringify(treasurerAdmin));
      } catch {}
      return { success: true };
    }

    // Credential 2: Admin (Just Admin, canEdit: false)
    if (cleanEmail === 'admin@monieclub' || cleanEmail === 'admin') {
      if (cleanPassword !== 'admin@monieclub') {
        return { success: false, error: 'Incorrect password for admin.' };
      }
      const generalAdmin: AdminUser = {
        id: 'admin_general',
        name: 'General Admin',
        email: 'admin@monieclub',
        password: 'admin@monieclub',
        designation: 'Admin',
        role: 'Admin',
        canEdit: false,
        phone: '01753102771',
        createdAt: '2025-10-01',
      };
      setCurrentAdminUser(generalAdmin);
      try {
        sessionStorage.setItem(`${STORAGE_KEY_PREFIX}_session_admin`, JSON.stringify(generalAdmin));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_current_admin`, JSON.stringify(generalAdmin));
      } catch {}
      return { success: true };
    }

    // Generic fallback for any other stored admin
    const admin = adminUsers.find(a => a.email.toLowerCase() === cleanEmail);
    if (!admin) {
      return { success: false, error: 'Invalid admin credentials. Use treasurer@monieclub or admin@monieclub.' };
    }

    if (admin.password && cleanPassword !== admin.password) {
      return { success: false, error: 'Incorrect admin password.' };
    }

    setCurrentAdminUser(admin);
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}_session_admin`, JSON.stringify(admin));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_current_admin`, JSON.stringify(admin));
    } catch {}
    return { success: true };
  };

  const adminLogout = () => {
    setCurrentAdminUser(null);
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}_session_admin`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_current_admin`);
    } catch {}
  };

  const designateSuperAdmin = (newSuperAdminId: string) => {
    let updatedList: AdminUser[] = [];
    setAdminUsers(prev => {
      updatedList = prev.map(a => {
        if (a.id === newSuperAdminId) {
          return {
            ...a,
            role: 'Super Admin',
            canEdit: true,
          };
        }
        return {
          ...a,
          role: 'Admin',
          canEdit: false,
        };
      });
      return updatedList;
    });

    // Save all updated admins to Cloud Firestore
    updatedList.forEach(a => cloudSaveAdmin(a));

    setCurrentAdminUser(prev => {
      if (!prev) return null;
      if (prev.id === newSuperAdminId) {
        const sup = { ...prev, role: 'Super Admin' as const, canEdit: true };
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}_current_admin`, JSON.stringify(sup)); } catch {}
        return sup;
      }
      const view = { ...prev, role: 'Admin' as const, canEdit: false };
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}_current_admin`, JSON.stringify(view)); } catch {}
      return view;
    });
  };

  const updateAdminUser = (id: string, updates: Partial<AdminUser>) => {
    setAdminUsers(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...updates };
        cloudSaveAdmin(updated);
        return updated;
      }
      return a;
    }));
    setCurrentAdminUser(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const addAdminUser = (admin: Omit<AdminUser, 'id'>) => {
    const newAdmin: AdminUser = {
      ...admin,
      id: `admin_${Date.now()}`,
      role: 'Admin',
      canEdit: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAdminUsers(prev => [...prev, newAdmin]);
    cloudSaveAdmin(newAdmin);
  };

  const deleteAdminUser = (id: string) => {
    const target = adminUsers.find(a => a.id === id);
    if (target?.role === 'Super Admin') {
      alert('Cannot delete the active Super Admin. Please designate another admin as Super Admin first.');
      return;
    }
    setAdminUsers(prev => prev.filter(a => a.id !== id));
    cloudDeleteAdmin(id);
    if (currentAdminUser?.id === id) {
      setCurrentAdminUser(null);
    }
  };

  // Member Portal Authentication Handlers
  const memberLogin = (mobile: string): { success: boolean; error?: string } => {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (!cleanMobile) {
      return { success: false, error: 'Please enter a valid mobile number.' };
    }
    const found = members.find(m => {
      const mClean = m.contactNumber.replace(/[^0-9]/g, '');
      return mClean === cleanMobile || (cleanMobile.length >= 10 && mClean.endsWith(cleanMobile));
    });
    if (!found) {
      return { success: false, error: 'No active club member found registered with this phone number.' };
    }
    setCurrentMemberUser(found);
    return { success: true };
  };

  const memberLogout = () => {
    setCurrentMemberUser(null);
  };

  // Pending Member Payment Claims Handlers
  const submitPaymentClaim = (claim: Omit<PendingPaymentClaim, 'id' | 'submittedAt' | 'status'>) => {
    const actualPaymentDate = claim.paymentDate || claim.payment_date || getCurrentDateString();
    const newClaim: PendingPaymentClaim = {
      ...claim,
      id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      submittedAt: new Date().toISOString(),
      paymentDate: actualPaymentDate,
      payment_date: actualPaymentDate,
      status: 'Pending',
    };
    setPendingClaims(prev => [newClaim, ...prev]);
    cloudSaveClaim(newClaim);
  };

  const approvePaymentClaim = (claimId: string) => {
    const claim = pendingClaims.find(c => c.id === claimId);
    if (!claim) return;

    // Preserve the actual date the member submitted/paid the deposit!
    const memberPaymentDate = claim.paymentDate || claim.payment_date || (claim.submittedAt ? claim.submittedAt.split('T')[0] : getCurrentDateString());
    const adminProcessingTime = new Date().toISOString();

    const targetMonths: { monthKey: MonthKey; monthLabel: string }[] = [];
    if (claim.monthKeys && claim.monthKeys.length > 0) {
      claim.monthKeys.forEach((mk, idx) => {
        const ml = (claim.monthLabels && claim.monthLabels[idx]) || formatMonthKey(mk).label;
        targetMonths.push({ monthKey: mk, monthLabel: ml });
      });
    } else {
      targetMonths.push({ monthKey: claim.monthKey, monthLabel: claim.monthLabel || formatMonthKey(claim.monthKey).label });
    }

    const perMonthAmount = targetMonths.length > 0 ? Math.round(claim.amount / targetMonths.length) : claim.amount;

    // 1. Update/Add matching MonthlyPayment records with actual member payment date for all target months
    setMonthlyPayments(prev => {
      let updated = [...prev];
      targetMonths.forEach(target => {
        const idx = updated.findIndex(p => p.memberId === claim.memberId && p.monthKey === target.monthKey);
        if (idx !== -1) {
          const updatedRecord = {
            ...updated[idx],
            amountPaid: perMonthAmount,
            status: 'Paid' as const,
            paymentDate: memberPaymentDate,
            payment_date: memberPaymentDate,
            processedAt: adminProcessingTime,
            processed_at: adminProcessingTime,
            paymentMethod: claim.paymentMethod,
            trxId: claim.trxId || updated[idx].trxId,
            notes: claim.notes ? `[Verified Member Payment]: ${claim.notes}` : updated[idx].notes,
          };
          updated[idx] = updatedRecord;
          cloudSavePayment(updatedRecord);
        } else {
          const newRecord: MonthlyPayment = {
            id: `p-${claim.memberId}-${target.monthKey}`,
            memberId: claim.memberId,
            memberName: claim.memberName,
            monthKey: target.monthKey,
            monthLabel: target.monthLabel,
            units: claim.units,
            amountExpected: claim.units * 1000,
            amountPaid: perMonthAmount,
            status: 'Paid',
            paymentDate: memberPaymentDate,
            payment_date: memberPaymentDate,
            processedAt: adminProcessingTime,
            processed_at: adminProcessingTime,
            paymentMethod: claim.paymentMethod,
            trxId: claim.trxId,
            notes: claim.notes ? `[Verified Member Payment]: ${claim.notes}` : undefined,
          };
          updated.push(newRecord);
          cloudSavePayment(newRecord);
        }
      });
      return updated;
    });

    // 2. Mark claim as Approved and record processing timestamp
    const updatedClaim: PendingPaymentClaim = {
      ...claim,
      status: 'Approved',
      reviewedBy: currentAdminUser?.name || 'Treasurer (Super Admin)',
      reviewedAt: adminProcessingTime,
      processedAt: adminProcessingTime,
      processed_at: adminProcessingTime,
    };
    setPendingClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
    cloudSaveClaim(updatedClaim);
  };

  const rejectPaymentClaim = (claimId: string, reason?: string) => {
    const claim = pendingClaims.find(c => c.id === claimId);
    if (!claim) return;
    const updatedClaim: PendingPaymentClaim = {
      ...claim,
      status: 'Rejected',
      reviewedBy: currentAdminUser?.name || 'Treasurer (Super Admin)',
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason || 'Payment details could not be verified in club bank/mobile account.',
    };
    setPendingClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
    cloudSaveClaim(updatedClaim);
  };

  const deletePaymentClaim = (claimId: string) => {
    setPendingClaims(prev => prev.filter(c => c.id !== claimId));
    cloudDeleteClaim(claimId);
  };

  return (
    <ClubContext.Provider
      value={{
        theme,
        setTheme,
        fontFamily,
        setFontFamily,
        portalMode,
        setPortalMode,
        adminSignOutAndGoToMemberPortal,
        adminUsers,
        currentAdminUser,
        adminLogin,
        adminLogout,
        designateSuperAdmin,
        updateAdminUser,
        addAdminUser,
        deleteAdminUser,
        currentMemberUser,
        memberLogin,
        memberLogout,
        pendingClaims,
        submitPaymentClaim,
        approvePaymentClaim,
        rejectPaymentClaim,
        deletePaymentClaim,
        members,
        monthlyPayments,
        investments,
        investment,
        expenses,
        feeCollections,
        summary,
        bankProfits,
        addBankProfit,
        updateBankProfit,
        deleteBankProfit,
        months,
        addMonth,
        deleteMonth,
        batchMarkMonthPaid,
        quickAdvancePayMember,
        setTotalClubFunds,
        recordPayment,
        updatePayment,
        quickCollectDue,
        batchCollectMemberDues,
        addMember,
        updateMember,
        deleteMember,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        concludeInvestment,
        reactivateInvestment,
        toggleInvestmentMilestone,
        addExpense,
        updateExpense,
        deleteExpense,
        addFeeCollection,
        updateFeeCollection,
        deleteFeeCollection,
        collectMemberFee,
        batchCollectAllFees,
        restoreFeeCollections,
        setMemberFeeStatus,
        getMemberFinancials,
        resetToInitialData,
        restoreExactSheetsData,
        exportDataJSON,
        importDataJSON,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
};
