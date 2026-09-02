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
  // Cloud & Auto-Sync Tracking Metadata
  syncStatus?: 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict';
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
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
  autoBackup24h?: boolean; // periodic 24-hour auto download of inventory JSON
  lastAutoBackupTime?: number; // timestamp in milliseconds
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
  docNumber?: string;
  itemId: string;
  itemName: string;
  sn: string;
  pn?: string;
  category: string;
  warehouse?: string;
  originalLoc?: string;
  user: string;
  qtyUsed: number;
  unit?: string;
  giverDept?: string;
  giverName?: string;
  giverPos?: string;
  receiverDept?: string;
  receiverPos?: string;
  purpose: string;
  notes?: string;
  targetLocation: string;
  date: string;
}

export type DispatchType = 'USAGE_SLIP' | 'HANDOVER_DOC';
export type DispatchStatus = 'DEPLOYED' | 'RETURNED';

export interface DispatchedRecord {
  id: string;
  type: DispatchType;
  docNumber?: string; // Số hiệu phiếu hoặc biên bản (VD: 125/KT, SLIP-892)
  itemId?: string;
  itemName: string;
  category: string;
  sn: string;
  pn?: string;
  qty: number;
  unit?: string;
  date: string; // Ngày bàn giao/xuất sử dụng
  warehouse?: string;
  originalLoc?: string;
  
  // Bên giao & Bên nhận
  giverDept?: string;
  giverName?: string;
  giverPos?: string;
  receiverDept?: string;
  receiverName: string; // Kỹ sư tiếp nhận hoặc Tổ/Đài nhận
  receiverPos?: string;
  
  targetLocation: string; // Vị trí lắp đặt mới / Hệ thống đích
  purpose: string; // Mục đích sử dụng / Lý do bàn giao
  notes?: string; // Ghi chú kỹ thuật
  
  status: DispatchStatus; // 'DEPLOYED' (Đang vận hành/sử dụng) | 'RETURNED' (Đã thu hồi về kho)
  returnedDate?: string;
  returnedBy?: string;
  returnedQty?: number;
  returnNote?: string;
  // Cloud & Auto-Sync Tracking Metadata
  syncStatus?: 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict';
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
}

export type AuditActionType =
  | 'ITEM_CREATE'
  | 'ITEM_UPDATE'
  | 'ITEM_DELETE'
  | 'INVENTORY_AUDIT'
  | 'USAGE_DISPATCH'
  | 'HANDOVER_CREATE'
  | 'STOCK_RETURN'
  | 'DATA_IMPORT'
  | 'DATA_RESTORE'
  | 'AUTO_BACKUP'
  | 'REPORT_DISPATCH'
  | 'AUTH_LOGIN'
  | 'CATEGORY_CHANGE'
  | 'CLOUD_AUTO_SYNC'
  | 'CLOUD_CONFLICT';

export type SyncActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_UPSERT' | 'STATUS_CHANGE';
export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
export type SyncEntityType = 'equipment' | 'dispatched_record' | 'inventory_batch' | 'category' | 'usage_slip';
export type GlobalSyncState = 'synced' | 'syncing' | 'pending' | 'failed' | 'conflict' | 'offline';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncActionType;
  payload: any;
  timestamp: number;
  formattedTime?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: number;
  syncStatus: SyncItemStatus;
  error?: string;
  user?: string;
}

export interface ConflictItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  entityName: string;
  localData: any;
  cloudData: any;
  detectedAt: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
  localVersion?: number;
  cloudVersion?: number;
}

export interface SystemAuditLogEntry {
  id: string;
  timestamp: string; // e.g. "29/08/2026 14:35:10"
  actionType: AuditActionType;
  actionTitle: string; // e.g. "Thêm mới thiết bị Card CPU RMC-300"
  performedBy: string; // Username e.g. "admin", "ky_su_nam"
  performedByName?: string; // Full name e.g. "KS. Nguyễn Văn Khải"
  userRole: Role;
  targetId?: string; // Item ID or Record ID
  targetName?: string; // Equipment name or Doc number
  targetCategory?: string;
  targetSN?: string;
  details: string; // Specific description & parameters
  prevData?: string; // Previous state summary (if editing/updating)
  newData?: string; // New state summary
  ipAddress?: string; // e.g. "192.168.10.15 (Trạm Kỹ Thuật TACC)"
}

