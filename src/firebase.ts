import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
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
