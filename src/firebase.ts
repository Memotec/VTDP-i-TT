import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Set Firestore log level to 'error' to avoid noisy connection retry messages
try {
  setLogLevel('error');
} catch {
  // Ignored if already set
}

const firestoreDatabaseId = (firebaseConfig as any).firestoreDatabaseId;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    firestoreDatabaseId
  );
} catch {
  // If Firestore is already initialized on this app instance (e.g. during HMR/hot reload)
  firestoreInstance = firestoreDatabaseId
    ? getFirestore(app, firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as any)?.code;
    if (
      errMsg.includes('the client is offline') || 
      errMsg.includes('Could not reach Cloud Firestore') ||
      errCode === 'unavailable' ||
      errCode === 'failed-precondition'
    ) {
      console.warn('Firebase Firestore is operating in offline mode or waiting for connection.');
    } else {
      console.warn('Firebase Firestore test connection check:', errMsg);
    }
    return false;
  }
}
