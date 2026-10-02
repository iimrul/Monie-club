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
import { db, collection, doc, onSnapshot, deleteDoc } from '../firebase';
import { calculateTreasuryTotals } from '../services/treasuryCalculations';
import { 
  seedFirestoreIfEmpty,
  cloudSaveMember,
  cloudDeleteMember,
  cloudSavePayment,
  cloudBatchSavePayments,
  cloudApprovePaymentClaim,
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
  cloudAddMonth,
  cloudReplaceMemberFee,
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
  addBankProfit: (profit: Omit<BankProfitRecord, 'id' | 'createdAt'>, entryId?: string) => Promise<boolean>;
  updateBankProfit: (id: string, updates: Partial<BankProfitRecord>) => Promise<boolean>;
  deleteBankProfit: (id: string) => Promise<boolean>;
  months: MonthInfo[];
  currentMonthKey: MonthKey;
  addMonth: (targetKey?: string) => Promise<boolean>;
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

  const [currentMonthKey, setCurrentMonthKey] = useState(getCurrentMonthKey);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setCurrentMonthKey(getCurrentMonthKey());
      const nextBangladeshMidnight = Date.parse(`${getCurrentDateString()}T00:00:00+06:00`) + 86_400_100;
      timer = setTimeout(refresh, Math.max(100, nextBangladeshMidnight - Date.now()));
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const [manualFundsAdjustment, setManualFundsAdjustment] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(`${STORAGE_KEY_PREFIX}_fundsAdjustment`)) || 0;
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
        if (Array.isArray(parsed)) {
          return parsed.filter(i => i.id !== 'inv-prev-1' && i.id !== 'inv-chittagong-agro-2026');
        }
      }
      return INITIAL_INVESTMENTS.filter(i => i.id !== 'inv-prev-1' && i.id !== 'inv-chittagong-agro-2026');
    } catch {
      return [];
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
        if (Array.isArray(parsed) && parsed.length >= INITIAL_FEE_COLLECTIONS.length) {
          return parsed;
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // Self-heal: merge stored custom updates with INITIAL_FEE_COLLECTIONS so previous paid members are never lost
          const feeMap = new Map<string, FeeCollection>();
          INITIAL_FEE_COLLECTIONS.forEach(f => feeMap.set(f.memberId, f));
          parsed.forEach((f: FeeCollection) => {
            if (f.status === 'Unpaid' || f.feeAmount === 0) {
              feeMap.delete(f.memberId);
            } else if (f.status === 'Paid') {
              feeMap.set(f.memberId, f);
            }
          });
          return Array.from(feeMap.values());
        }
      }
      return INITIAL_FEE_COLLECTIONS;
    } catch {
      return INITIAL_FEE_COLLECTIONS;
    }
  });

  // Portal Mode: 'member' (default for root monie-club.vercel.app / '/') or 'admin' (/admin or #admin)
  const [portalMode, setPortalModeState] = useState<PortalMode>(() => {
    try {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (pathname === '/admin' || pathname.startsWith('/admin/') || hash === '#admin') {
          return 'admin';
        }
        if (pathname === '/' || hash === '#member' || pathname === '') {
          return 'member';
        }
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_portal_mode`);
        if (stored === 'member' || stored === 'admin') {
          return stored as PortalMode;
        }
      }
      return 'member';
    } catch {
      return 'member';
    }
  });

  const setPortalMode = (mode: PortalMode) => {
    setPortalModeState(mode);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_portal_mode`, mode);
      if (typeof window !== 'undefined' && window.history) {
        if (mode === 'admin') {
          const target = window.location.pathname.startsWith('/admin') ? window.location.pathname : '/admin';
          window.history.pushState(null, '', target);
        } else {
          window.history.pushState(null, '', '/');
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
        window.history.pushState(null, '', '/');
      }
    } catch {}
    setPortalModeState('member');
  };

  // Additional income uses the existing bankProfits collection for legacy compatibility.
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
  const treasury = useMemo(() => calculateTreasuryTotals(monthlyPayments, months.map(m => m.key), bankProfits, manualFundsAdjustment),
    [monthlyPayments, months, bankProfits, manualFundsAdjustment]);
  const { totalMemberContributions: totalPaidSubscriptions, totalAdditionalIncome, totalClubFunds } = treasury;

  const setTotalClubFunds = (val: number) => {
    const adjustment = val - (totalPaidSubscriptions + totalAdditionalIncome);
    setManualFundsAdjustment(adjustment);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_fundsAdjustment`, String(adjustment));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_totalFunds`, String(val));
    } catch {}
    cloudSaveConfig(val, months, adjustment);
  };

  // Admin Users & RBAC - Only the two authorized credentials
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_admin_users`);
      if (stored) {
        const parsed: AdminUser[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(a => a.email === 'admin@monieclub' || a.email === 'treasurer@monieclub');
          if (filtered.length === 2) {
            return filtered;
          }
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

  // Current Logged-in Member (Null by default, strictly active members only)
  const [currentMemberUser, setCurrentMemberUser] = useState<Member | null>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_current_member`);
      if (stored) {
        const parsed: Member = JSON.parse(stored);
        if (parsed && parsed.status === 'Inactive') {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}_current_member`);
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Pending Member Payment Claims (Only real submissions from members)
  const [pendingClaims, setPendingClaims] = useState<PendingPaymentClaim[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_pending_claims`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => c.id !== 'claim_1' && c.id !== 'claim_2');
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Preserve the existing admin account cleanup while preventing automatic financial seeding.
  useEffect(() => {
    deleteDoc(doc(db, 'adminUsers', 'admin_president')).catch(() => {});
    deleteDoc(doc(db, 'adminUsers', 'admin_secretary')).catch(() => {});
    deleteDoc(doc(db, 'adminUsers', 'admin_1')).catch(() => {});
    deleteDoc(doc(db, 'adminUsers', 'admin_2')).catch(() => {});
  }, []);

  // Real-time Cloud Firestore listeners
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
      if (!snapshot.empty) {
        const cloudMembers: Member[] = [];
        snapshot.forEach(docSnap => cloudMembers.push(docSnap.data() as Member));
        cloudMembers.sort((a, b) => {
          const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
          const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
          return numA - numB;
        });
        setMembers(cloudMembers);
      }
    }, handleSnapshotErr('members'));

    const unsubPayments = onSnapshot(collection(db, 'monthlyPayments'), snapshot => {
      if (!snapshot.empty) {
        const cloudPayments: MonthlyPayment[] = [];
        snapshot.forEach(docSnap => cloudPayments.push(docSnap.data() as MonthlyPayment));
        setMonthlyPayments(cloudPayments);
      }
    }, handleSnapshotErr('payments'));

    const unsubInvestments = onSnapshot(collection(db, 'investments'), snapshot => {
      const cloudInv: BusinessInvestment[] = [];
      snapshot.forEach(docSnap => {
        const inv = docSnap.data() as BusinessInvestment;
        if (inv.id !== 'inv-prev-1' && inv.id !== 'inv-chittagong-agro-2026') {
          cloudInv.push(inv);
        }
      });
      setInvestments(cloudInv);
    }, handleSnapshotErr('investments'));

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), snapshot => {
      const cloudExp: ExpenseRecord[] = [];
      snapshot.forEach(docSnap => cloudExp.push(docSnap.data() as ExpenseRecord));
      setExpenses(cloudExp);
    }, handleSnapshotErr('expenses'));

    const unsubFees = onSnapshot(collection(db, 'feeCollections'), snapshot => {
      const cloudFees: FeeCollection[] = [];
      snapshot.forEach(docSnap => {
        const fee = docSnap.data() as FeeCollection;
        if (fee.status === 'Paid' && (fee.feeAmount || 0) > 0) {
          cloudFees.push(fee);
        }
      });
      setFeeCollections(cloudFees);
    }, handleSnapshotErr('fees'));

    const unsubClaims = onSnapshot(collection(db, 'pendingClaims'), snapshot => {
      const cloudClaims: PendingPaymentClaim[] = [];
      snapshot.forEach(docSnap => {
        const claim = docSnap.data() as PendingPaymentClaim;
        if (claim.id !== 'claim_1' && claim.id !== 'claim_2') {
          cloudClaims.push(claim);
        }
      });
      setPendingClaims(cloudClaims);
    }, handleSnapshotErr('claims'));

    const unsubAdmins = onSnapshot(collection(db, 'adminUsers'), snapshot => {
      if (!snapshot.empty) {
        const cloudAdmins: AdminUser[] = [];
        const allowedEmails = ['treasurer@monieclub', 'admin@monieclub'];
        snapshot.forEach(docSnap => {
          const adm = docSnap.data() as AdminUser;
          if (adm.email && allowedEmails.includes(adm.email.toLowerCase())) {
            cloudAdmins.push(adm);
          } else {
            // Existing admin-account cleanup behavior, unchanged.
            deleteDoc(doc(db, 'adminUsers', docSnap.id)).catch(() => {});
          }
        });
        if (cloudAdmins.length === 2) {
          setAdminUsers(cloudAdmins);
        } else {
          setAdminUsers(INITIAL_ADMINS);
        }
      } else {
        setAdminUsers(INITIAL_ADMINS);
      }
    }, handleSnapshotErr('admins'));

    const unsubBankProfits = onSnapshot(collection(db, 'bankProfits'), snapshot => {
      const cloudProfits: BankProfitRecord[] = [];
      snapshot.forEach(docSnap => cloudProfits.push({ ...(docSnap.data() as BankProfitRecord), id: docSnap.id }));
      setBankProfits(cloudProfits);
    }, handleSnapshotErr('bankProfits'));

    const unsubConfig = onSnapshot(doc(db, 'clubConfig', 'main'), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.months) && data.months.length > 0) {
          // Sort months chronologically
          const sorted = [...data.months].sort((a: any, b: any) => (a.key || '').localeCompare(b.key || ''));
          setMonths(sorted);
        }
        if (typeof data.manualFundsAdjustment === 'number') {
          setManualFundsAdjustment(data.manualFundsAdjustment);
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
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_fundsAdjustment`, String(manualFundsAdjustment));
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
  }, [theme, fontFamily, months, totalClubFunds, manualFundsAdjustment, members, monthlyPayments, investments, investment, expenses, feeCollections, bankProfits, adminUsers, pendingClaims, currentAdminUser, currentMemberUser]);

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
  }, [monthlyPayments, feeCollections, currentMemberUser, currentMonthKey]);

  // Strict guard: Inactive members are immediately logged out if active in session
  useEffect(() => {
    if (currentMemberUser) {
      const match = members.find(m => m.id === currentMemberUser.id);
      if (!match || match.status === 'Inactive') {
        setCurrentMemberUser(null);
        try {
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}_current_member`);
        } catch {}
      }
    }
  }, [members, currentMemberUser]);

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
      totalBankProfits: totalAdditionalIncome,
      totalMemberContributions: totalPaidSubscriptions,
      totalAdditionalIncome,
      manualFundsAdjustment,
    };
  }, [totalClubFunds, members, investments, expenses, feeCollections, totalAdditionalIncome, totalPaidSubscriptions, manualFundsAdjustment]);

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
    let savedPayment: MonthlyPayment;
    const idx = monthlyPayments.findIndex(p => p.id === paymentId || (details.memberId && details.monthKey && p.memberId === details.memberId && p.monthKey === details.monthKey));
    const isUnpaid = details.status === 'Due' || (details.status === 'Waived' && details.amountPaid <= 0);
      if (idx >= 0) {
        const p = monthlyPayments[idx];
        const finalPaid = details.amountPaid !== undefined && details.amountPaid > 0
          ? details.amountPaid
          : (details.status === 'Paid' ? p.amountExpected : (details.amountPaid || 0));

        const updated: MonthlyPayment = {
          ...p,
          amountPaid: isUnpaid ? 0 : finalPaid,
          paymentDate: isUnpaid ? undefined : details.paymentDate,
          payment_date: isUnpaid ? undefined : details.paymentDate,
          processedAt: isUnpaid ? undefined : processTime,
          processed_at: isUnpaid ? undefined : processTime,
          paymentMethod: isUnpaid ? undefined : details.paymentMethod,
          status: details.status,
          notes: isUnpaid ? details.notes || undefined : details.notes || p.notes,
          trxId: isUnpaid ? undefined : p.trxId,
          receiptNumber: isUnpaid ? undefined : (p.receiptNumber || `MC-${p.monthKey}-${Date.now().toString().slice(-4)}`),
        };
        savedPayment = updated;
        const newArr = [...monthlyPayments];
        newArr[idx] = updated;
        setMonthlyPayments(newArr);
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
          amountPaid: isUnpaid ? 0 : finalPaid,
          paymentDate: isUnpaid ? undefined : details.paymentDate,
          payment_date: isUnpaid ? undefined : details.paymentDate,
          processedAt: isUnpaid ? undefined : processTime,
          processed_at: isUnpaid ? undefined : processTime,
          paymentMethod: isUnpaid ? undefined : details.paymentMethod,
          status: details.status,
          notes: details.notes,
          receiptNumber: isUnpaid ? undefined : `MC-${monthKey}-${Date.now().toString().slice(-4)}`,
        };
        savedPayment = created;
        setMonthlyPayments(prev => [...prev.filter(p => p.id !== paymentId), created]);
      }
    cloudSavePayment(savedPayment);
  };

  const quickCollectDue = (memberId: string, monthKey: MonthKey, paymentMethod?: PaymentMethod) => {
    const todayStr = getCurrentDateString();
    const processTime = new Date().toISOString();
    const methodToUse = paymentMethod || 'Club AC';
    setMonthlyPayments(prev => 
      prev.map(p => {
        if (p.memberId === memberId && p.monthKey === monthKey) {
          const actualPaymentDate = todayStr;
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
          const actualPaymentDate = todayStr;
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
          const actualPaymentDate = todayStr;
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
          const actualPaymentDate = todayStr;
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
  const addMonth = async (targetKey?: string) => {
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
      return false; // Already exists
    }

    const monthInfo = formatMonthKeyToInfo(newKey);
    const updatedMonths = [...months, monthInfo].sort((a, b) => a.key.localeCompare(b.key));

    // Create payment slots for all active members with status strictly 'Due' and amountPaid: 0
    const existingSlots = new Set(monthlyPayments.filter(p => p.monthKey === newKey).map(p => p.memberId));
    const newPayments: MonthlyPayment[] = members
      .filter(m => m.status === 'Active')
      .filter(m => !existingSlots.has(m.id))
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

    // Preserve any existing advance payments or historical records for this month.
    const saved = await cloudAddMonth(totalClubFunds, updatedMonths, manualFundsAdjustment, newPayments);
    if (!saved) return false;
    setMonths(updatedMonths);
    setMonthlyPayments(prev => [...prev, ...newPayments.filter(p => !prev.some(existing => existing.id === p.id))]);

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_months`, JSON.stringify(updatedMonths));
    } catch {}
    return true;
  };

  const deleteMonth = (monthKey: MonthKey) => {
    const updatedMonths = months.filter(m => m.key !== monthKey);
    setMonths(updatedMonths);
    const updatedPayments = monthlyPayments.filter(p => p.monthKey !== monthKey);
    setMonthlyPayments(updatedPayments);
    cloudSaveConfig(totalClubFunds, updatedMonths, manualFundsAdjustment);
    const memberIds = members.map(m => m.id);
    cloudDeletePaymentsForMonth(monthKey, memberIds);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_months`, JSON.stringify(updatedMonths));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_payments`, JSON.stringify(updatedPayments));
    } catch {}
  };

  const addBankProfit = async (profitData: Omit<BankProfitRecord, 'id' | 'createdAt'>, entryId = `income-${crypto.randomUUID()}`) => {
    if (!Number.isFinite(profitData.amount) || profitData.amount <= 0) return false;
    const newProfit: BankProfitRecord = {
      ...profitData,
      id: entryId,
      createdAt: new Date().toISOString(),
    };
    const saved = await cloudSaveBankProfit(newProfit);
    if (saved) setBankProfits(prev => [newProfit, ...prev.filter(p => p.id !== entryId)]);
    return saved;
  };

  const updateBankProfit = async (id: string, updates: Partial<BankProfitRecord>) => {
    const existing = bankProfits.find(p => p.id === id);
    if (!existing) return false;
    if (updates.amount !== undefined && (!Number.isFinite(updates.amount) || updates.amount <= 0)) return false;
    const updated = { ...existing, ...updates, id };
    const saved = await cloudSaveBankProfit(updated);
    if (saved) setBankProfits(prev => prev.map(p => p.id === id ? updated : p));
    return saved;
  };

  const deleteBankProfit = async (id: string) => {
    const removed = await cloudDeleteBankProfit(id);
    if (removed) setBankProfits(prev => prev.filter(p => p.id !== id));
    return removed;
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
    const profitMode = venture.profitMode || 'range';
    const minRoi = venture.minRoiPercent !== undefined ? Number(venture.minRoiPercent) : undefined;
    const maxRoi = venture.maxRoiPercent !== undefined ? Number(venture.maxRoiPercent) : undefined;
    const minProfit = venture.minProfit !== undefined ? Number(venture.minProfit) : (minRoi !== undefined ? (principal * minRoi) / 100 : undefined);
    const maxProfit = venture.maxProfit !== undefined ? Number(venture.maxProfit) : (maxRoi !== undefined ? (principal * maxRoi) / 100 : undefined);
    const profit = Number(venture.expectedProfit) || (maxProfit !== undefined ? maxProfit : (minProfit || 0));

    const newVenture: BusinessInvestment = {
      ...venture,
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      principalAmount: principal,
      profitMode,
      minRoiPercent: minRoi,
      maxRoiPercent: maxRoi,
      minProfit,
      maxProfit,
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
          if (updated.profitMode === 'range' && updated.minRoiPercent !== undefined && updated.maxRoiPercent !== undefined) {
            if (updated.minProfit === undefined) updated.minProfit = (p * updated.minRoiPercent) / 100;
            if (updated.maxProfit === undefined) updated.maxProfit = (p * updated.maxRoiPercent) / 100;
          }
          const profit = updated.expectedProfit !== undefined ? Number(updated.expectedProfit) : (updated.maxProfit || inv.expectedProfit);
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
            if (updated.profitMode === 'range' && updated.minRoiPercent !== undefined && updated.maxRoiPercent !== undefined) {
              if (updated.minProfit === undefined) updated.minProfit = (p * updated.minRoiPercent) / 100;
              if (updated.maxProfit === undefined) updated.maxProfit = (p * updated.maxRoiPercent) / 100;
            }
            const profit = updated.expectedProfit !== undefined ? Number(updated.expectedProfit) : (updated.maxProfit || inv.expectedProfit);
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
    if (remainingDue <= 0) return;

    const feeAmount = details?.feeAmount !== undefined ? details.feeAmount : remainingDue;
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

  const setMemberFeeStatus = async (
    memberId: string, 
    status: 'Paid' | 'Unpaid', 
    details?: { feeAmount?: number; date?: string; paymentMethod?: PaymentMethod; notes?: string }
  ) => {
    const member = members.find(m => m.id === memberId);

    if (status === 'Unpaid') {
      // Remove all active fee collections for this member
      const toDelete = feeCollections.filter(f => f.memberId === memberId);

      // Save explicit Unpaid record so cloud sync knows this member was intentionally set to Unpaid
      const unpaidRecord: FeeCollection = {
        id: `fee-${memberId}`,
        memberId: memberId,
        memberName: member?.name || memberId,
        units: member?.units || 1,
        feeAmount: 0,
        date: new Date().toISOString().split('T')[0],
        status: 'Unpaid',
        purpose: 'Registration & Admin Fee (100/unit)',
      };
      const saved = await cloudReplaceMemberFee(memberId, toDelete.map(f => f.id), unpaidRecord);
      if (saved) setFeeCollections(prev => prev.filter(f => f.memberId !== memberId));
    } else {
      // Mark as Paid
      if (!member) return;

      const feeAmount = details?.feeAmount !== undefined ? details.feeAmount : member.units * 100;
      const date = details?.date || new Date().toISOString().split('T')[0];
      const paymentMethod = details?.paymentMethod || 'Cash';
      const notes = details?.notes || `Registration & Admin Fee (100/unit)`;

      const existingFees = feeCollections.filter(f => f.memberId === memberId);

      const deterministicId = `fee-${member.id}`;
      const newRecord: FeeCollection = {
        id: deterministicId,
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

      const saved = await cloudReplaceMemberFee(memberId, existingFees.map(f => f.id), newRecord);
      if (saved) setFeeCollections(prev => [newRecord, ...prev.filter(f => f.memberId !== memberId)]);
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
          if (updates.status === 'Due') updated.amountPaid = 0;
          if (updated.status === 'Due' && updated.amountPaid <= 0) {
            updated.paymentDate = undefined;
            updated.payment_date = undefined;
            updated.processedAt = undefined;
            updated.processed_at = undefined;
            updated.paymentMethod = undefined;
            updated.trxId = undefined;
            updated.receiptNumber = undefined;
            if (p.status !== 'Due' && updates.notes === undefined) updated.notes = undefined;
          }
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

  // Member Portal Authentication Handlers with International Phone Number Matching
  const memberLogin = (mobile: string): { success: boolean; error?: string } => {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length < 5) {
      return { success: false, error: 'Please enter a valid mobile number.' };
    }

    const inputNoZero = cleanMobile.replace(/^0+/, '');

    const found = members.find(m => {
      const mClean = m.contactNumber.replace(/[^0-9]/g, '');
      if (!mClean) return false;

      // 1. Direct exact match (e.g. 01863269888, 601168433905, 966577160390)
      if (mClean === cleanMobile) return true;

      // 2. Normalized leading zeros comparison
      const mNoZero = mClean.replace(/^0+/, '');
      if (mNoZero === inputNoZero) return true;

      // 3. Suffix comparison (e.g. stored +966577160390 matches user input 0577160390 or 577160390, or stored 0186... matches +880186...)
      if (inputNoZero.length >= 7 && mNoZero.length >= 7) {
        if (mNoZero.endsWith(inputNoZero) || inputNoZero.endsWith(mNoZero)) {
          return true;
        }
      }

      // 4. Last 9 digits match (standard national subscriber number across all telecoms)
      if (cleanMobile.length >= 9 && mClean.length >= 9) {
        if (cleanMobile.slice(-9) === mClean.slice(-9)) {
          return true;
        }
      }

      return false;
    });

    if (!found) {
      return { success: false, error: 'No active club member found registered with this phone number. If you live abroad, please include your country code (e.g. +966..., +60...).' };
    }

    // Inactive members are strictly barred from logging into the member portal
    if (found.status === 'Inactive') {
      return { 
        success: false, 
        error: 'আপনার মেম্বারশিপ অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive)। নিষ্ক্রিয় সদস্যরা মেম্বার পোর্টালে লগইন করতে পারবেন না। প্রয়োজনে ট্রেজারারের সাথে যোগাযোগ করুন। (This membership account is inactive. Inactive members cannot access the portal. Please contact the Treasurer.)' 
      };
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

  const approvePaymentClaim = async (claimId: string) => {
    const claim = pendingClaims.find(c => c.id === claimId);
    if (!claim || claim.status !== 'Pending') return;

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
    const changedPayments: MonthlyPayment[] = [];
    const updatedPayments = [...monthlyPayments];
      targetMonths.forEach(target => {
        const idx = updatedPayments.findIndex(p => p.memberId === claim.memberId && p.monthKey === target.monthKey);
        if (idx !== -1) {
          const updatedRecord = {
            ...updatedPayments[idx],
            amountPaid: perMonthAmount,
            status: 'Paid' as const,
            paymentDate: memberPaymentDate,
            payment_date: memberPaymentDate,
            processedAt: adminProcessingTime,
            processed_at: adminProcessingTime,
            paymentMethod: claim.paymentMethod,
            trxId: claim.trxId || updatedPayments[idx].trxId,
            notes: claim.notes ? `[Verified Member Payment]: ${claim.notes}` : updatedPayments[idx].notes,
          };
          updatedPayments[idx] = updatedRecord;
          changedPayments.push(updatedRecord);
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
          updatedPayments.push(newRecord);
          changedPayments.push(newRecord);
        }
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
    const saved = await cloudApprovePaymentClaim(updatedClaim, changedPayments);
    if (!saved) return;
    setMonthlyPayments(updatedPayments);
    setPendingClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
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
        currentMonthKey,
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
