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
}
