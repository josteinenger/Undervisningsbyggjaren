/**
 * src/lib/firebase.ts
 * Firebase v12 modulær syntaks for prosjektet 'visionary'
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, collection, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'visionary',
  authDomain: 'visionary.firebaseapp.com',
  storageBucket: 'visionary.appspot.com',
};

// Initialiser Firebase idempotent
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export { getFirestore, doc, collection, getDoc, setDoc, updateDoc, deleteDoc };
export default db;
