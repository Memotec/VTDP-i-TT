import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth, testFirestoreConnection } from '../firebase.ts';
import { InventoryItem, DispatchedRecord, SystemAuditLogEntry } from '../types.ts';

export { testFirestoreConnection };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Clean helper to remove undefined fields that Firestore rejects
function sanitizeForFirestore<T extends object>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

// --- INVENTORY ITEMS ---

export async function saveInventoryItemToFirestore(item: InventoryItem): Promise<void> {
  const path = `inventory/${item.id}`;
  try {
    const docRef = doc(db, 'inventory', item.id);
    await setDoc(docRef, sanitizeForFirestore(item), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteInventoryItemFromFirestore(itemId: string): Promise<void> {
  const path = `inventory/${itemId}`;
  try {
    const docRef = doc(db, 'inventory', itemId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchSaveInventoryToFirestore(items: InventoryItem[]): Promise<void> {
  const path = 'inventory';
  try {
    const batchSize = 400;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = items.slice(i, i + batchSize);
      chunk.forEach(item => {
        const docRef = doc(db, 'inventory', item.id);
        batch.set(docRef, sanitizeForFirestore(item), { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getInventoryFromFirestore(): Promise<InventoryItem[]> {
  const path = 'inventory';
  try {
    const collRef = collection(db, 'inventory');
    const snapshot = await getDocs(collRef);
    const items: InventoryItem[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as InventoryItem);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToInventory(
  onUpdate: (items: InventoryItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'inventory';
  const collRef = collection(db, 'inventory');
  
  return onSnapshot(
    collRef,
    (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as InventoryItem);
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- DISPATCHED RECORDS ---

export async function saveDispatchedRecordToFirestore(record: DispatchedRecord): Promise<void> {
  const path = `dispatchedRecords/${record.id}`;
  try {
    const docRef = doc(db, 'dispatchedRecords', record.id);
    await setDoc(docRef, sanitizeForFirestore(record), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getDispatchedRecordsFromFirestore(): Promise<DispatchedRecord[]> {
  const path = 'dispatchedRecords';
  try {
    const collRef = collection(db, 'dispatchedRecords');
    const snapshot = await getDocs(collRef);
    const records: DispatchedRecord[] = [];
    snapshot.forEach(docSnap => {
      records.push(docSnap.data() as DispatchedRecord);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToDispatchedRecords(
  onUpdate: (records: DispatchedRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'dispatchedRecords';
  const collRef = collection(db, 'dispatchedRecords');
  
  return onSnapshot(
    collRef,
    (snapshot) => {
      const records: DispatchedRecord[] = [];
      snapshot.forEach(docSnap => {
        records.push(docSnap.data() as DispatchedRecord);
      });
      onUpdate(records);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- AUDIT LOGS ---

export async function saveAuditLogToFirestore(logEntry: SystemAuditLogEntry): Promise<void> {
  const path = `auditLogs/${logEntry.id}`;
  try {
    const docRef = doc(db, 'auditLogs', logEntry.id);
    await setDoc(docRef, sanitizeForFirestore(logEntry), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToAuditLogs(
  onUpdate: (logs: SystemAuditLogEntry[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'auditLogs';
  const collRef = collection(db, 'auditLogs');
  
  return onSnapshot(
    collRef,
    (snapshot) => {
      const logs: SystemAuditLogEntry[] = [];
      snapshot.forEach(docSnap => {
        logs.push(docSnap.data() as SystemAuditLogEntry);
      });
      onUpdate(logs);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- CATEGORIES & APP SETTINGS ---

export async function saveCategoriesToFirestore(categories: string[]): Promise<void> {
  const path = 'settings/categories';
  try {
    const docRef = doc(db, 'settings', 'categories');
    await setDoc(docRef, { categories, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
