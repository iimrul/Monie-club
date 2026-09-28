import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  getDocs, 
  updateDoc, 
  writeBatch,
  disableNetwork,
  enableNetwork 
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Initialize Firestore with robust long-polling auto-detection
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, dbId);

// Safely halt network retry loops while daily quota resets
disableNetwork(db).catch(() => {});

export const auth = getAuth(app);

export { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  getDocs, 
  updateDoc, 
  writeBatch, 
  disableNetwork, 
  enableNetwork 
};
export default app;
