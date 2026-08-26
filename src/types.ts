export type Role = 'admin' | 'guest';

export interface AuditHistoryEntry {
  id: string;
  status: 'OK' | 'MISSING';
  date: string;
  note: string;
  user: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  pn?: string;
  sn: string;
  warehouse?: string;
  loc?: string;
  qty: number;
  auditStatus: 'OK' | 'MISSING' | null;
  auditDate?: string | null;
  auditNote?: string;
  category: string;
  imageUrl?: string;
  imagePrompt?: string;
  history?: AuditHistoryEntry[];
}

export interface SyncConfig {
  webAppUrl: string;
  autoSync: boolean;
  autoLoadOnStartup?: boolean;
  lastSynced?: string;
}

export interface StorageConfig {
  autoSaveInterval: number; // in seconds: 0 = immediate/realtime, 5, 10, 30, 60, 300
  warnOnClose: boolean;
  showAutoSaveToast: boolean;
  lastSavedTime?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  password: string;
  createdAt: string;
  status: 'active' | 'locked';
  notes?: string;
}

export interface AdminSnapshot {
  id: string;
  timestamp: string;
  name: string;
  itemCount: number;
  data: InventoryItem[];
}

export interface AdminSecurityConfig {
  adminDisplayName: string;
  autoLockMinutes: number; // 0 = disabled, 15, 30, 60
  lastLoginTime?: string;
}

export interface AuditStats {
  totalItems: number;
  totalQty: number;
  checkedCount: number;
  okCount: number;
  missingCount: number;
  healthRate: number;
  lowStockCount?: number;
}

export interface UsageSlip {
  id: string;
  itemId: string;
  itemName: string;
  sn: string;
  pn?: string;
  category: string;
  warehouse?: string;
  originalLoc?: string;
  user: string;
  qtyUsed: number;
  purpose: string;
  notes?: string;
  targetLocation: string;
  date: string;
}
