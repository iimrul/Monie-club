import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  setLogLevel,
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

// Silence internal Firestore retry logs and warnings from polluting console.error
setLogLevel('silent');

// Initialize Firestore with forced long-polling to prevent WebSocket connection failures in preview iframes
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId);

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
