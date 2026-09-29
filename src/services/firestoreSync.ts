import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch 
} from '../firebase';
import { 
  Member, 
  MonthlyPayment, 
  BusinessInvestment, 
  ExpenseRecord, 
  FeeCollection, 
  PendingPaymentClaim, 
  AdminUser,
  BankProfitRecord
} from '../types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_INVESTMENTS, 
  INITIAL_EXPENSES, 
  INITIAL_FEE_COLLECTIONS, 
  INITIAL_ADMINS, 
  INITIAL_CLAIMS,
  INITIAL_BANK_PROFITS, 
  generateInitialMonthlyPayments, 
  MONTHS_CONFIG 
} from '../data/initialData';

// Helper to recursively strip any undefined properties because Firestore throws an error on undefined
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(data).forEach(key => {
    const val = (data as any)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
}

// Flag to prevent redundant seeding runs and avoid exceeding Firestore write quotas
let isSeeding = false;
let isQuotaExceeded = false;
const SEED_STORAGE_KEY = 'moni_sheets_seed_completed_v1';

export function checkIsQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

// Seed the complete, exact Google Sheets data into Cloud Firestore safely
export async function seedFirestoreIfEmpty(force = false) {
  if (isQuotaExceeded || isSeeding) {
    return;
  }

  // If already seeded previously on this browser and not forced, skip to save write quota
  if (!force && typeof window !== 'undefined' && localStorage.getItem(SEED_STORAGE_KEY)) {
    return;
  }

  isSeeding = true;
  try {
    const snapMembers = await getDocs(collection(db, 'members'));
    
    // Ensure feeCollections and expenses are seeded into Cloud Firestore if empty
    try {
      const snapFees = await getDocs(collection(db, 'feeCollections'));
      if (snapFees.empty) {
        for (const fee of INITIAL_FEE_COLLECTIONS) {
          await setDoc(doc(db, 'feeCollections', `fee-${fee.memberId}`), sanitizeForFirestore({ ...fee, id: `fee-${fee.memberId}` }), { merge: true });
        }
      }
    } catch {}

    try {
      const snapExpenses = await getDocs(collection(db, 'expenses'));
      if (snapExpenses.empty) {
        for (const exp of INITIAL_EXPENSES) {
          await setDoc(doc(db, 'expenses', exp.id), sanitizeForFirestore(exp), { merge: true });
        }
      }
    } catch {}

    // Ensure dummy legacy projects and mock claims are permanently purged from Firestore
    try {
      await deleteDoc(doc(db, 'investments', 'inv-prev-1'));
      await deleteDoc(doc(db, 'investments', 'inv-chittagong-agro-2026'));
      await deleteDoc(doc(db, 'pendingClaims', 'claim_1'));
      await deleteDoc(doc(db, 'pendingClaims', 'claim_2'));
    } catch {}

    // If members already exist in cloud database, mark seeded and avoid rewriting payments
    if (!force && !snapMembers.empty && snapMembers.docs.length >= INITIAL_MEMBERS.length) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEED_STORAGE_KEY, 'true');
      }
      isSeeding = false;
      return;
    }

    console.log('Seeding initial spreadsheet records into Cloud Firestore...');

    // 1. Members (18 active + 2 inactive)
    for (const m of INITIAL_MEMBERS) {
      await setDoc(doc(db, 'members', m.id), sanitizeForFirestore(m), { merge: true });
    }

    // 2. Payments
    const initPayments = generateInitialMonthlyPayments();
    for (let i = 0; i < initPayments.length; i += 40) {
      const chunk = initPayments.slice(i, i + 40);
      const batch = writeBatch(db);
      chunk.forEach(p => {
        batch.set(doc(db, 'monthlyPayments', p.id), sanitizeForFirestore(p), { merge: true });
      });
      await batch.commit();
    }

    // 3. Investments
    for (const inv of INITIAL_INVESTMENTS) {
      await setDoc(doc(db, 'investments', inv.id), sanitizeForFirestore(inv), { merge: true });
    }

    // 4. Expenses
    for (const exp of INITIAL_EXPENSES) {
      await setDoc(doc(db, 'expenses', exp.id), sanitizeForFirestore(exp), { merge: true });
    }

    // 5. Fee collections
    for (const fee of INITIAL_FEE_COLLECTIONS) {
      await setDoc(doc(db, 'feeCollections', fee.id), sanitizeForFirestore(fee), { merge: true });
    }

    // 6. Admins (Only 2 authorized credentials: treasurer and admin)
    await deleteDoc(doc(db, 'adminUsers', 'admin_president')).catch(() => {});
    await deleteDoc(doc(db, 'adminUsers', 'admin_secretary')).catch(() => {});
    for (const adm of INITIAL_ADMINS) {
      await setDoc(doc(db, 'adminUsers', adm.id), sanitizeForFirestore(adm), { merge: true });
    }

    // 7. Pending Claims
    for (const cl of INITIAL_CLAIMS) {
      await setDoc(doc(db, 'pendingClaims', cl.id), sanitizeForFirestore(cl), { merge: true });
    }

    // 8. Club Central Config
    await setDoc(doc(db, 'clubConfig', 'main'), {
      totalClubFunds: 382000,
      manualFundsAdjustment: 0,
      months: MONTHS_CONFIG,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (typeof window !== 'undefined') {
      localStorage.setItem(SEED_STORAGE_KEY, 'true');
    }
    console.log('Exact Google Sheets dataset saved in Cloud Firestore.');
  } catch (err: any) {
    if (
      err?.code === 'resource-exhausted' || 
      err?.message?.includes('Quota') || 
      err?.message?.includes('resource-exhausted')
    ) {
      isQuotaExceeded = true;
      console.warn('Firestore write quota limit reached for today. Running safely in local cached mode.');
      return;
    }
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Could not reach')) {
      console.log('Cloud Firestore offline or reconnecting; local data active.');
      return;
    }
    console.warn('Cloud Firestore sync notice:', err);
  } finally {
    isSeeding = false;
  }
}

export async function cloudSaveMember(member: Member) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'members', member.id), sanitizeForFirestore(member), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveMember notice:', e?.message || e);
  }
}

export async function cloudDeleteMember(memberId: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteMember notice:', e?.message || e);
  }
}

export async function cloudSavePayment(payment: MonthlyPayment) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'monthlyPayments', payment.id), sanitizeForFirestore(payment), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSavePayment notice:', e?.message || e);
  }
}

export async function cloudBatchSavePayments(payments: MonthlyPayment[]) {
  if (isQuotaExceeded) return;
  try {
    for (let i = 0; i < payments.length; i += 40) {
      const chunk = payments.slice(i, i + 40);
      const batch = writeBatch(db);
      chunk.forEach(p => {
        batch.set(doc(db, 'monthlyPayments', p.id), sanitizeForFirestore(p), { merge: true });
      });
      await batch.commit();
    }
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudBatchSavePayments notice:', e?.message || e);
  }
}

export async function cloudSaveInvestment(inv: BusinessInvestment) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'investments', inv.id), sanitizeForFirestore(inv), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveInvestment notice:', e?.message || e);
  }
}

export async function cloudDeleteInvestment(id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'investments', id));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteInvestment notice:', e?.message || e);
  }
}

export async function cloudSaveExpense(exp: ExpenseRecord) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'expenses', exp.id), sanitizeForFirestore(exp), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveExpense notice:', e?.message || e);
  }
}

export async function cloudDeleteExpense(id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteExpense notice:', e?.message || e);
  }
}

export async function cloudSaveFee(fee: FeeCollection) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'feeCollections', fee.id), sanitizeForFirestore(fee), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveFee notice:', e?.message || e);
  }
}

export async function cloudDeleteFee(id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'feeCollections', id));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteFee notice:', e?.message || e);
  }
}

export async function cloudSaveClaim(claim: PendingPaymentClaim) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'pendingClaims', claim.id), sanitizeForFirestore(claim), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveClaim notice:', e?.message || e);
  }
}

export async function cloudDeleteClaim(id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'pendingClaims', id));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteClaim notice:', e?.message || e);
  }
}

export async function cloudSaveAdmin(admin: AdminUser) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'adminUsers', admin.id), sanitizeForFirestore(admin), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveAdmin notice:', e?.message || e);
  }
}

export async function cloudDeleteAdmin(id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'adminUsers', id));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteAdmin notice:', e?.message || e);
  }
}

export async function cloudSaveBankProfit(profit: BankProfitRecord) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'bankProfits', profit.id), sanitizeForFirestore(profit), { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveBankProfit notice:', e?.message || e);
  }
}

export async function cloudDeleteBankProfit(id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, 'bankProfits', id));
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeleteBankProfit notice:', e?.message || e);
  }
}

export async function cloudSaveConfig(totalClubFunds: number, months: any[], manualFundsAdjustment?: number) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, 'clubConfig', 'main'), {
      totalClubFunds,
      manualFundsAdjustment: manualFundsAdjustment ?? 0,
      months,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudSaveConfig notice:', e?.message || e);
  }
}

export async function cloudDeletePaymentsForMonth(monthKey: string, memberIds: string[]) {
  if (isQuotaExceeded) return;
  try {
    const batch = writeBatch(db);
    memberIds.forEach(mId => {
      batch.delete(doc(db, 'monthlyPayments', `p-${mId}-${monthKey}`));
    });
    await batch.commit();
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') isQuotaExceeded = true;
    console.warn('cloudDeletePaymentsForMonth notice:', e?.message || e);
  }
}
