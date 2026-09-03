import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  QrCode, Search, Database, RefreshCw, Plus, Edit,
  Trash2, User, Lock, LogOut, Sun, Moon, FileSpreadsheet, Printer,
  CheckCircle2, XCircle, AlertCircle, X, History, Settings, Camera, Check, Filter,
  FileText, ArrowRightLeft, Layers, Info, Crown, ShieldCheck, Shield, Key, AlertTriangle,
  Smartphone, Download, Sparkles, Tag, Activity, PlusCircle, HardDrive
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { InventoryItem, SyncConfig, StorageConfig, Role, AuditStats, AuditHistoryEntry, UsageSlip, UserAccount, DispatchedRecord, SystemAuditLogEntry, AuditActionType } from './types.ts';
import { INITIAL_INVENTORY, CATEGORIES, INITIAL_DISPATCHED_RECORDS, INITIAL_SYSTEM_AUDIT_LOGS } from './initialData.ts';
import { playScanBeep } from './utils/audio.ts';
import { PrintTemplates, PrintLayoutType } from './components/PrintTemplates.tsx';
import { PrintPreviewModal, PrintMode } from './components/PrintPreviewModal.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { ScannerModal } from './components/ScannerModal.tsx';
import { ItemDetailDrawer } from './components/ItemDetailDrawer.tsx';
import { UsageModal } from './components/UsageModal.tsx';
import { HandoverModal, HandoverRow } from './components/HandoverModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { GoogleDriveModal } from './components/GoogleDriveModal.tsx';
import { InventoryTable } from './components/InventoryTable.tsx';
import { AdminAccountModal } from './components/AdminAccountModal.tsx';
import { MobileAppDock, MobileTab } from './components/MobileAppDock.tsx';
import { MobileAppInstallModal } from './components/MobileAppInstallModal.tsx';
import { DeployedRegistryTable } from './components/DeployedRegistryTable.tsx';
import { ReturnStockModal } from './components/ReturnStockModal.tsx';
import { DispatchedDetailModal } from './components/DispatchedDetailModal.tsx';
import { SystemAuditLogView } from './components/SystemAuditLogView.tsx';
import { SystemAuditLogModal } from './components/SystemAuditLogModal.tsx';
import { ItemFormModal } from './components/ItemFormModal.tsx';
import { LocalDatabase } from './database/localDatabase.ts';
import { syncService } from './services/syncService.ts';
import { CloudService } from './services/cloudService.ts';
import { SyncStatusIndicator } from './components/SyncStatusIndicator.tsx';
import { ConflictResolutionModal } from './components/ConflictResolutionModal.tsx';
import { ConflictItem } from './types.ts';
import { findMatchingInventoryItems } from './utils/qrParser.ts';


const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'admin',
    role: 'admin',
    password: 'admin',
    createdAt: '2026-01-01',
    status: 'active',
    notes: 'Quản trị Hệ Thống)'
  },
  {
    id: 'u-guest',
    username: 'guest',
    fullName: 'Kiểm kê viên Ca 1',
    role: 'guest',
    password: '123456',
    createdAt: '2026-01-01',
    status: 'active',
    notes: 'Tài khoản quét mã & kiểm định hiện vật'
  },
  {
    id: 'u-tech1',
    username: 'nhanvien_cns',
    fullName: 'Kỹ sư Trực ban CNS',
    role: 'guest',
    password: '123456',
    createdAt: '2026-01-15',
    status: 'active',
    notes: 'Kỹ sư trực vận hành đài trạm'
  }
];

export default function App() {
  // Inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [role, setRole] = useState<Role>(() => {
    const saved = localStorage.getItem('cns_session_active');
    if (saved === 'admin' || saved === 'guest') return saved as Role;
    return 'admin';
  });
  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    return localStorage.getItem('cns_current_username') || 'admin';
  });

  // Dynamic user accounts list
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('cns_user_accounts_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fallback */ }
    }
    const initial = [...DEFAULT_USER_ACCOUNTS];
    const storedAdminPass = localStorage.getItem('cns_admin_password');
    const storedAdminName = localStorage.getItem('cns_admin_name');
    const storedGuestPass = localStorage.getItem('cns_guest_password');
    if (storedAdminPass) initial[0].password = storedAdminPass;
    if (storedAdminName) initial[0].fullName = storedAdminName;
    if (storedGuestPass) initial[1].password = storedGuestPass;
    return initial;
  });

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả loại');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'MISSING' | 'UNCHECKED' | 'LOW_STOCK'>('ALL');
  const [isLowStockBannerDismissed, setIsLowStockBannerDismissed] = useState(false);
  const [isLowStockDropdownOpen, setIsLowStockDropdownOpen] = useState(false);

  // Categories list
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('cns_categories_v30');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fallback */ }
    }
    return CATEGORIES;
  });
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Item form modal state
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Modals & Drawers state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanTargetItem, setScanTargetItem] = useState<InventoryItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminAccountModalOpen, setIsAdminAccountModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);
  const [selectedItemForUsage, setSelectedItemForUsage] = useState<InventoryItem | null>(null);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>(() => LocalDatabase.getConflicts());
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [activePrintMode, setActivePrintMode] = useState<PrintMode>('QR');
  const [mobileTab, setMobileTab] = useState<MobileTab>('inventory');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'INVENTORY' | 'DISPATCHED' | 'AUDIT_LOG'>('INVENTORY');

  // System Audit Log state
  const [auditLogs, setAuditLogs] = useState<SystemAuditLogEntry[]>(() => {
    const saved = localStorage.getItem('cns_system_audit_logs_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fallback */ }
    }
    return INITIAL_SYSTEM_AUDIT_LOGS;
  });
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);

  // Dispatched & Deployed Equipment Registry state
  const [dispatchedRecords, setDispatchedRecords] = useState<DispatchedRecord[]>(() => {
    const saved = localStorage.getItem('cns_dispatched_records_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fallback */ }
    }
    return INITIAL_DISPATCHED_RECORDS;
  });
  const [selectedDispatchedDetail, setSelectedDispatchedDetail] = useState<DispatchedRecord | null>(null);
  const [selectedDispatchedForReturn, setSelectedDispatchedForReturn] = useState<DispatchedRecord | null>(null);

  // Handover document state
  const [handoverNo, setHandoverNo] = useState(() => `${Math.floor(100 + Math.random() * 900)}/KT`);
  const [handoverGiverDept, setHandoverGiverDept] = useState('Đội Thông tin – Trung tâm BĐKT');
  const [handoverGiverName, setHandoverGiverName] = useState('Nguyễn Văn Khải');
  const [handoverGiverPos, setHandoverGiverPos] = useState('Đội trưởng');
  const [handoverReceiverDept, setHandoverReceiverDept] = useState('Tổ Kỹ thuật Không lưu');
  const [handoverReceiverName, setHandoverReceiverName] = useState('Trần Quốc Toản');
  const [handoverReceiverPos, setHandoverReceiverPos] = useState('Kỹ sư trực ban');
  const [handoverLocation, setHandoverLocation] = useState('Trung tâm Bảo đảm Kỹ thuật');
  const [handoverDay, setHandoverDay] = useState(() => new Date().getDate().toString());
  const [handoverMonth, setHandoverMonth] = useState(() => (new Date().getMonth() + 1).toString());
  const [handoverYear, setHandoverYear] = useState(() => new Date().getFullYear().toString());
  const [handoverReason, setHandoverReason] = useState('Đảm bảo trang thiết bị kỹ thuật dự phòng và vận hành ổn định hệ thống');
  const [handoverRows, setHandoverRows] = useState<HandoverRow[]>([]);

  // Equipment Usage state
  const [usageSlips, setUsageSlips] = useState<UsageSlip[]>(() => {
    const saved = localStorage.getItem('cns_usage_slips_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* fallback */ }
    }
    return [];
  });

  // Cloud Sync configurations
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const savedUrl = localStorage.getItem('cns_sync_url');
    const savedAutoSync = localStorage.getItem('cns_auto_sync');
    const savedAutoSync30s = localStorage.getItem('cns_auto_sync_30s');
    const savedAutoSyncInterval = localStorage.getItem('cns_auto_sync_interval');
    const savedAutoLoad = localStorage.getItem('cns_auto_load_startup');
    return {
      webAppUrl: savedUrl !== null ? savedUrl : 'https://script.google.com/macros/s/AKfycby4frQYvyEuzbVS7rctYDaxHDhSlEzNmTgYXavWzi0ROJLYEqhfwBd1QRX4v6dVU05f/exec',
      autoSync: savedAutoSync === 'true',
      autoSync30s: savedAutoSync30s !== 'false', // Default: true for 30s auto Google Sheet pull
      autoSyncInterval: savedAutoSyncInterval ? Number(savedAutoSyncInterval) : 30, // Default 30s
      autoLoadOnStartup: savedAutoLoad !== 'false',
      lastSynced: undefined
    };
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncStatusDetail, setSyncStatusDetail] = useState('');

  const handleConflictResolved = (conflictId: string, choice: 'keep_local' | 'keep_cloud', resolvedItem: InventoryItem) => {
    const updatedInv = inventory.map(item => item.id === resolvedItem.id ? resolvedItem : item);
    saveInventoryLocally(updatedInv);
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  // LocalStorage Auto-Save & Data Loss Prevention Configuration
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(() => {
    const savedInterval = localStorage.getItem('cns_autosave_interval');
    const savedWarn = localStorage.getItem('cns_autosave_warn_close');
    const savedShowToast = localStorage.getItem('cns_autosave_show_toast');
    const savedTime = localStorage.getItem('cns_last_saved_time');
    const savedAutoBackup24h = localStorage.getItem('cns_auto_backup_24h');
    const savedLastAutoBackup = localStorage.getItem('cns_last_auto_backup_timestamp');
    return {
      autoSaveInterval: savedInterval !== null ? Number(savedInterval) : 0, // default 0: realtime
      warnOnClose: savedWarn !== 'false', // default: true
      showAutoSaveToast: savedShowToast === 'true', // default: false
      lastSavedTime: savedTime || undefined,
      autoBackup24h: savedAutoBackup24h !== 'false', // default: true
      lastAutoBackupTime: savedLastAutoBackup ? Number(savedLastAutoBackup) : undefined,
    };
  });

  // UI state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [printLayout, setPrintLayout] = useState<'NONE' | 'QR' | 'LABEL'>('NONE');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cns_theme');
      return saved !== 'light';
    }
    return true;
  });

  // Refs for current values
  const inventoryRef = useRef<InventoryItem[]>([]);
  const syncConfigRef = useRef<SyncConfig>(syncConfig);
  const roleRef = useRef<Role>('guest');
  const usageSlipsRef = useRef<UsageSlip[]>([]);
  const dispatchedRecordsRef = useRef<DispatchedRecord[]>([]);
  const categoriesRef = useRef<string[]>([]);
  const auditLogsRef = useRef<SystemAuditLogEntry[]>([]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    usageSlipsRef.current = usageSlips;
  }, [usageSlips]);

  useEffect(() => {
    dispatchedRecordsRef.current = dispatchedRecords;
  }, [dispatchedRecords]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    auditLogsRef.current = auditLogs;
  }, [auditLogs]);

  useEffect(() => {
    syncConfigRef.current = syncConfig;
  }, [syncConfig]);

  useEffect(() => {
    roleRef.current = role || 'guest';
  }, [role]);

  // Periodic Auto-Save Timer to LocalStorage
  useEffect(() => {
    if (storageConfig.autoSaveInterval <= 0) return;

    const intervalMs = storageConfig.autoSaveInterval * 1000;
    const timer = setInterval(() => {
      try {
        if (inventoryRef.current && inventoryRef.current.length > 0) {
          localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(inventoryRef.current));
        }
        if (usageSlipsRef.current) {
          localStorage.setItem('cns_usage_slips_v1', JSON.stringify(usageSlipsRef.current));
        }
        if (dispatchedRecordsRef.current) {
          localStorage.setItem('cns_dispatched_records_v1', JSON.stringify(dispatchedRecordsRef.current));
        }
        if (categoriesRef.current) {
          localStorage.setItem('cns_categories_v30', JSON.stringify(categoriesRef.current));
        }
        const nowStr = new Date().toLocaleTimeString('vi-VN');
        localStorage.setItem('cns_last_saved_time', nowStr);
        setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));

        if (storageConfig.showAutoSaveToast) {
          addToast(`💾 Tự động lưu LocalStorage lúc ${nowStr}`, 'info');
        }
      } catch (err) {
        console.warn('Auto-save timer error:', err);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [storageConfig.autoSaveInterval, storageConfig.showAutoSaveToast]);

  // Emergency Flush on Tab Close / Reload / Page Hide
  useEffect(() => {
    const flushDataToLocalStorage = () => {
      try {
        if (inventoryRef.current && inventoryRef.current.length > 0) {
          localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(inventoryRef.current));
        }
        if (usageSlipsRef.current) {
          localStorage.setItem('cns_usage_slips_v1', JSON.stringify(usageSlipsRef.current));
        }
        if (dispatchedRecordsRef.current) {
          localStorage.setItem('cns_dispatched_records_v1', JSON.stringify(dispatchedRecordsRef.current));
        }
        if (categoriesRef.current) {
          localStorage.setItem('cns_categories_v30', JSON.stringify(categoriesRef.current));
        }
        const nowStr = new Date().toLocaleTimeString('vi-VN');
        localStorage.setItem('cns_last_saved_time', nowStr);
      } catch (err) {
        console.warn('Emergency flush error:', err);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      flushDataToLocalStorage();
      if (storageConfig.warnOnClose) {
        e.preventDefault();
        e.returnValue = 'Dữ liệu CNS đang được lưu trữ. Bạn có chắc muốn rời đi?';
        return e.returnValue;
      }
    };

    const handlePageHide = () => {
      flushDataToLocalStorage();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDataToLocalStorage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [storageConfig.warnOnClose]);

  // Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('cns_theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
      if (!savedTheme) {
        localStorage.setItem('cns_theme', 'dark');
      }
    }

    const localInv = localStorage.getItem('cns_inventory_v30_stable');
    if (localInv) {
      try {
        setInventory(JSON.parse(localInv));
      } catch {
        setInventory(INITIAL_INVENTORY);
      }
    } else {
      setInventory(INITIAL_INVENTORY);
      localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(INITIAL_INVENTORY));
    }

    const savedRole = localStorage.getItem('cns_session_active');
    const savedUsername = localStorage.getItem('cns_current_username');
    if (savedRole === 'admin' || savedRole === 'guest') {
      setRole(savedRole as Role);
      setCurrentUsername(savedUsername || (savedRole === 'admin' ? 'admin' : 'guest'));
    }

    const handleOnline = () => addToast('📡 Đã kết nối mạng trở lại.', 'success');
    const handleOffline = () => {
      addToast('🔌 Chế độ ngoại tuyến (Offline) đang hoạt động.', 'info');
      setSyncStatusDetail('Ngoại tuyến (Offline). Tất cả dữ liệu lưu trữ tại trình duyệt.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Configure SyncService with current cloud URL and actor
  useEffect(() => {
    syncService.configure(syncConfig.webAppUrl, currentUsername || 'guest');
  }, [syncConfig.webAppUrl, currentUsername]);

  // Subscribe to SyncService notifications & conflict events
  useEffect(() => {
    const unsub = syncService.subscribe(syncState => {
      setConflicts(syncState.conflicts);
      if (syncState.conflicts.length > 0) {
        setIsConflictModalOpen(true);
      }
    });
    return unsub;
  }, []);

  const saveInventoryLocally = (newInv: InventoryItem[]) => {
    setInventory(newInv);
    LocalDatabase.saveInventory(newInv);
    const nowStr = new Date().toLocaleTimeString('vi-VN');
    localStorage.setItem('cns_last_saved_time', nowStr);
    setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));
  };

  const saveDispatchedRecordsLocally = (newRecords: DispatchedRecord[]) => {
    setDispatchedRecords(newRecords);
    LocalDatabase.saveDispatchedRecords(newRecords);
  };

  const saveAuditLogsLocally = (newLogs: SystemAuditLogEntry[]) => {
    setAuditLogs(newLogs);
    try {
      localStorage.setItem('cns_system_audit_logs_v1', JSON.stringify(newLogs));
    } catch (err) {
      console.warn('Audit logs save error:', err);
    }
  };

  const addSystemAuditLog = (
    actionType: AuditActionType,
    actionTitle: string,
    details: string,
    target?: {
      id?: string;
      name?: string;
      sn?: string;
      category?: string;
      prevData?: string;
      newData?: string;
    }
  ) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timestamp = `${dateStr} ${timeStr}`;

    const currentActorUser = currentUsername || 'guest';
    const matchedUser = users.find(u => u.username.toLowerCase() === currentActorUser.toLowerCase());

    const newLogEntry: SystemAuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      actionType,
      actionTitle,
      performedBy: currentActorUser,
      performedByName: matchedUser?.fullName || (role === 'admin' ? 'Quản Trị Viên' : 'Kiểm Kê Viên'),
      userRole: role || 'guest',
      targetId: target?.id,
      targetName: target?.name,
      targetSN: target?.sn,
      targetCategory: target?.category,
      details,
      prevData: target?.prevData,
      newData: target?.newData,
      ipAddress: '192.168.1.45 (Trạm Kỹ Thuật Đội Thông Tin)',
    };

    const updated = [newLogEntry, ...auditLogsRef.current];
    saveAuditLogsLocally(updated);
  };

  const handleClearAuditLogs = () => {
    if (role !== 'admin') {
      addToast('Chỉ Quản trị viên mới có quyền dọn dẹp nhật ký hệ thống!', 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'DỌN DẸP / XÓA TOÀN BỘ NHẬT KÝ',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử nhật ký hệ thống? Hành động này sẽ làm mới danh sách nhật ký.',
      onConfirm: () => {
        saveAuditLogsLocally([]);
        addToast('Đã dọn dẹp sạch toàn bộ nhật ký hệ thống!', 'info');
        setConfirmDialog(null);
      }
    });
  };

  // Periodic 24-Hour Automatic JSON Backup Function
  const triggerAutoBackupJSON = useCallback((isManual = false) => {
    try {
      const currentInv = inventoryRef.current && inventoryRef.current.length > 0 ? inventoryRef.current : inventory;
      if (!currentInv || currentInv.length === 0) {
        if (isManual) {
          addToast('Kho hiện tại chưa có dữ liệu để sao lưu!', 'info');
        }
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      const fileName = isManual
        ? `CNS_ATM_Backup_${dateStr}_${timeStr}.json`
        : `CNS_ATM_AutoBackup_24H_${dateStr}_${timeStr}.json`;

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentInv, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      const nowMs = Date.now();
      localStorage.setItem('cns_last_auto_backup_timestamp', String(nowMs));
      setStorageConfig(prev => ({ ...prev, lastAutoBackupTime: nowMs }));

      if (isManual) {
        addToast(`Xuất tệp sao lưu JSON thành công (${currentInv.length} thiết bị)!`, 'success');
      } else {
        addToast(`Hệ thống đã tự động tải về bản sao lưu JSON định kỳ 24h (${currentInv.length} thiết bị).`, 'success');
      }
      playScanBeep(1000, 0.15);

      addSystemAuditLog(
        'AUTO_BACKUP',
        isManual ? 'Xuất sao lưu JSON thủ công' : 'Tự động tải về bản sao lưu JSON định kỳ (24 giờ)',
        `Hệ thống tải về tệp sao lưu JSON kho thiết bị gồm ${currentInv.length} bản ghi: ${fileName}`
      );
    } catch (err) {
      console.error('Lỗi khi tải bản sao lưu JSON:', err);
      if (isManual) {
        addToast('Không thể tạo tệp sao lưu JSON!', 'error');
      }
    }
  }, [inventory, addToast, addSystemAuditLog]);

  // Periodic Auto-Backup Timer: Trigger every 24 hours while active
  useEffect(() => {
    if (storageConfig.autoBackup24h === false) return;

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const checkAndTriggerBackup = () => {
      const savedTimestampStr = localStorage.getItem('cns_last_auto_backup_timestamp');
      const now = Date.now();

      if (!savedTimestampStr) {
        // Initial setup: set anchor timestamp so the 24h countdown starts
        localStorage.setItem('cns_last_auto_backup_timestamp', String(now));
        setStorageConfig(prev => ({ ...prev, lastAutoBackupTime: now }));
        return;
      }

      const lastBackup = Number(savedTimestampStr);
      if (isNaN(lastBackup) || lastBackup <= 0) {
        localStorage.setItem('cns_last_auto_backup_timestamp', String(now));
        setStorageConfig(prev => ({ ...prev, lastAutoBackupTime: now }));
        return;
      }

      // Check if 24 hours (or more) have passed since the last backup
      if (now - lastBackup >= TWENTY_FOUR_HOURS) {
        if (inventoryRef.current && inventoryRef.current.length > 0) {
          triggerAutoBackupJSON(false);
        }
      }
    };

    // Initial check after 4 seconds to let app finish hydration
    const initialTimer = setTimeout(() => {
      checkAndTriggerBackup();
    }, 4000);

    // Periodic check interval: checks every 60 seconds while app is active
    const intervalTimer = setInterval(() => {
      checkAndTriggerBackup();
    }, 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [storageConfig.autoBackup24h, triggerAutoBackupJSON]);


  const handleManualSaveLocalStorage = () => {
    try {
      localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(inventory));
      localStorage.setItem('cns_usage_slips_v1', JSON.stringify(usageSlips));
      localStorage.setItem('cns_categories_v30', JSON.stringify(categories));
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      localStorage.setItem('cns_last_saved_time', nowStr);
      setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));
      addToast(`Đã lưu toàn bộ ${inventory.length} thiết bị vào LocalStorage!`, 'success');
      playScanBeep(1000, 0.15);
    } catch {
      addToast('Không thể ghi vào bộ nhớ máy (LocalStorage).', 'error');
      playScanBeep(300, 0.2);
    }
  };

  const handleResetToDefault = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Khôi Phục Dữ Liệu Mẫu CNS',
      message: 'Bạn có chắc chắn muốn đặt lại cơ sở dữ liệu về danh sách thiết bị CNS tiêu chuẩn ban đầu?',
      onConfirm: () => {
        setInventory(INITIAL_INVENTORY);
        localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(INITIAL_INVENTORY));
        const nowStr = new Date().toLocaleTimeString('vi-VN');
        localStorage.setItem('cns_last_saved_time', nowStr);
        setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));
        addToast('Đã khôi phục thành công danh sách thiết bị mẫu CNS ban đầu!', 'success');
        playScanBeep(1000, 0.15);
        setConfirmDialog(null);
      }
    });
  };

  const saveCategoriesLocally = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('cns_categories_v30', JSON.stringify(newCats));
  };

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => (item.qty ?? 0) <= 1);
  }, [inventory]);

  const stats = useMemo<AuditStats>(() => {
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((acc, item) => acc + (item.qty || 0), 0);
    const checkedCount = inventory.filter(item => item.auditStatus !== null).length;
    const okCount = inventory.filter(item => item.auditStatus === 'OK').length;
    const missingCount = inventory.filter(item => item.auditStatus === 'MISSING').length;
    const healthRate = checkedCount > 0 ? Math.round((okCount / checkedCount) * 100) : 100;

    return {
      totalItems,
      totalQty,
      checkedCount,
      okCount,
      missingCount,
      healthRate,
      lowStockCount: lowStockItems.length
    };
  }, [inventory, lowStockItems.length]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (selectedCategory !== 'Tất cả loại' && item.category !== selectedCategory) return false;
      if (statusFilter === 'OK' && item.auditStatus !== 'OK') return false;
      if (statusFilter === 'MISSING' && item.auditStatus !== 'MISSING') return false;
      if (statusFilter === 'UNCHECKED' && item.auditStatus !== null) return false;
      if (statusFilter === 'LOW_STOCK' && (item.qty ?? 0) > 1) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const snMatch = item.sn.toLowerCase().includes(q);
        const pnMatch = item.pn?.toLowerCase().includes(q) || false;
        const whMatch = item.warehouse?.toLowerCase().includes(q) || false;
        const locMatch = item.loc?.toLowerCase().includes(q) || false;
        return nameMatch || snMatch || pnMatch || whMatch || locMatch;
      }
      return true;
    });
  }, [inventory, selectedCategory, statusFilter, searchQuery]);

  // Auto-Lock Inactivity Timer for Admin
  useEffect(() => {
    if (role !== 'admin') return;

    const autolockMinutes = Number(localStorage.getItem('cns_admin_autolock') || '0');
    if (autolockMinutes <= 0) return;

    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        addToast(`🔒 Phiên làm việc Admin đã tự động khóa do không hoạt động (${autolockMinutes} phút).`, 'info');
      }, autolockMinutes * 60 * 1000);
    };

    resetTimer();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [role]);

  // User management updater
  const handleUpdateUsers = (newUsers: UserAccount[]) => {
    setUsers(newUsers);
    localStorage.setItem('cns_user_accounts_v2', JSON.stringify(newUsers));
  };

  // Login handler with upgraded dynamic user database & lock checking
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.toLowerCase().trim();
    const p = password;

    const matchedUser = users.find(
      account => account.username.toLowerCase() === u && account.password === p
    );

    if (matchedUser) {
      if (matchedUser.status === 'locked') {
        setLoginError('Tài khoản này đã bị Quản trị viên khóa! Vui lòng liên hệ Trưởng ca.');
        playScanBeep(300, 0.3);
        return;
      }

      setRole(matchedUser.role);
      setCurrentUsername(matchedUser.username);
      localStorage.setItem('cns_session_active', matchedUser.role);
      localStorage.setItem('cns_current_username', matchedUser.username);
      setLoginError('');
      setUsername('');
      setPassword('');

      if (matchedUser.role === 'admin') {
        addToast(`Xin chào ${matchedUser.fullName} (Super Admin)! Đăng nhập thành công.`, 'success');
      } else {
        addToast(`Xin chào ${matchedUser.fullName} (Kiểm kê viên)! Đăng nhập thành công.`, 'success');
      }
      playScanBeep(1000, 0.15);

      addSystemAuditLog(
        'AUTH_LOGIN',
        'Đăng nhập hệ thống',
        `Tài khoản @${matchedUser.username} (${matchedUser.fullName}) đăng nhập thành công với vai trò ${matchedUser.role === 'admin' ? 'Super Admin' : 'Kiểm Kê Viên'}.`
      );
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
      playScanBeep(300, 0.25);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cns_session_active');
    localStorage.removeItem('cns_current_username');
    setRole(null);
    setCurrentUsername('');
    setEditingItem(null);
    setIsItemFormModalOpen(false);
    clearForm();
    addToast('Đã đăng xuất tài khoản.', 'info');
  };

  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (newVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cns_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cns_theme', 'light');
    }
  };

  const clearForm = () => {
    setEditingItem(null);
    setIsItemFormModalOpen(false);
  };

  const handleOpenAddNewModal = () => {
    if (role !== 'admin') {
      addToast('Chỉ quản lý (Admin) mới có quyền thêm thiết bị mới.', 'error');
      return;
    }
    setEditingItem(null);
    setIsItemFormModalOpen(true);
  };

  const handleEditClick = (item: InventoryItem) => {
    if (role !== 'admin') {
      addToast('Chỉ quản lý (Admin) mới được phép chỉnh sửa thiết bị.', 'error');
      return;
    }
    setEditingItem(item);
    setIsItemFormModalOpen(true);
    addToast('Đã mở cửa sổ biểu mẫu chỉnh sửa thiết bị.', 'info');
  };

  const handleItemFormSubmit = (formData: {
    name: string;
    pn: string;
    sn: string;
    warehouse: string;
    loc: string;
    qty: number;
    category: string;
  }) => {
    if (!formData.name.trim() || !formData.sn.trim()) {
      addToast('Vui lòng điền các thông tin bắt buộc (*)', 'error');
      return;
    }

    if (editingItem) {
      const existingItem = inventory.find(i => i.id === editingItem.id);
      const updatedItem = LocalDatabase.applyMetadata({
        ...(existingItem || editingItem),
        name: formData.name.trim(),
        pn: formData.pn.trim(),
        sn: formData.sn.trim(),
        warehouse: formData.warehouse.trim().toUpperCase(),
        loc: formData.loc.trim(),
        qty: Number(formData.qty) || 1,
        category: formData.category
      }, currentUsername || 'guest', false);

      const updated = inventory.map(item => item.id === editingItem.id ? updatedItem : item);
      saveInventoryLocally(updated);
      syncService.enqueue('equipment', updatedItem.id, 'UPDATE', updatedItem, currentUsername);
      addToast('Cập nhật dữ liệu thiết bị thành công!', 'success');
      playScanBeep(900, 0.1);

      addSystemAuditLog(
        'ITEM_UPDATE',
        'Chỉnh sửa thông tin thiết bị',
        `Cập nhật thiết bị "${formData.name.trim()}": Kho ${formData.warehouse.trim().toUpperCase()}, Vị trí ${formData.loc.trim()}, SL ${formData.qty}, Loại ${formData.category}`,
        {
          id: editingItem.id,
          name: formData.name.trim(),
          sn: formData.sn.trim(),
          category: formData.category,
          prevData: `SL: ${existingItem?.qty || 1} | Kho: ${existingItem?.warehouse || 'Chưa gán'} | Vị trí: ${existingItem?.loc || 'Chưa gán'}`,
          newData: `SL: ${formData.qty} | Kho: ${formData.warehouse.trim().toUpperCase()} | Vị trí: ${formData.loc.trim()}`
        }
      );

      const newQtyNum = Number(formData.qty) || 0;
      if (newQtyNum <= 1) {
        setTimeout(() => {
          addToast(`⚠️ CẢNH BÁO TỒN KHO: Thiết bị "${formData.name.trim()}" có số lượng là ${newQtyNum} (Dưới ngưỡng an toàn <= 1 cái)!`, newQtyNum === 0 ? 'error' : 'info');
        }, 350);
      }
    } else {
      const isDuplicate = inventory.some(item => item.sn.toLowerCase() === formData.sn.trim().toLowerCase());
      if (isDuplicate) {
        addToast(`Cảnh báo: S/N "${formData.sn}" đã tồn tại trong hệ thống!`, 'error');
        return;
      }

      const rawItem: InventoryItem = {
        id: `item-${Date.now()}`,
        name: formData.name.trim(),
        pn: formData.pn.trim(),
        sn: formData.sn.trim(),
        warehouse: formData.warehouse.trim().toUpperCase(),
        loc: formData.loc.trim(),
        qty: Number(formData.qty) || 1,
        auditStatus: null,
        auditNote: '',
        category: formData.category,
        history: []
      };
      const newItem = LocalDatabase.applyMetadata(rawItem, currentUsername || 'guest', true);
      saveInventoryLocally([...inventory, newItem]);
      syncService.enqueue('equipment', newItem.id, 'CREATE', newItem, currentUsername);
      addToast('Đã thêm thiết bị mới vào kho thành công!', 'success');
      playScanBeep(880, 0.15);

      addSystemAuditLog(
        'ITEM_CREATE',
        'Thêm mới thiết bị vào kho',
        `Nhập mới thiết bị "${formData.name.trim()}" (S/N: ${formData.sn.trim()}, P/N: ${formData.pn.trim() || 'N/A'}, SL: ${formData.qty}) tại Kho ${formData.warehouse.trim().toUpperCase()}`,
        {
          id: newItem.id,
          name: newItem.name,
          sn: newItem.sn,
          category: newItem.category,
          newData: `SL: ${newItem.qty} | Kho: ${newItem.warehouse} | Vị trí: ${newItem.loc}`
        }
      );

      const newQtyNum = Number(formData.qty) || 0;
      if (newQtyNum <= 1) {
        setTimeout(() => {
          addToast(`⚠️ CẢNH BÁO TỒN KHO: Thiết bị "${formData.name.trim()}" có số lượng là ${newQtyNum} (Dưới ngưỡng an toàn <= 1 cái)!`, newQtyNum === 0 ? 'error' : 'info');
        }, 350);
      }
    }
    clearForm();
  };

  const handleDeleteClick = (item: InventoryItem) => {
    if (role !== 'admin') {
      addToast('Chỉ quản lý (Admin) mới có quyền xóa thiết bị.', 'error');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa thiết bị',
      message: `Bạn đang chọn xóa thiết bị "${item.name}" (S/N: ${item.sn}). Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?`,
      onConfirm: () => {
        const nextInv = inventory.filter(i => i.id !== item.id);
        saveInventoryLocally(nextInv);
        syncService.enqueue('equipment', item.id, 'DELETE', { id: item.id }, currentUsername);
        addToast('Đã xóa thiết bị khỏi cơ sở dữ liệu.', 'success');
        playScanBeep(400, 0.3);

        addSystemAuditLog(
          'ITEM_DELETE',
          'Xóa thiết bị khỏi kho',
          `Xóa vĩnh viễn thiết bị "${item.name}" (S/N: ${item.sn}, SL: ${item.qty}) khỏi hệ thống quản lý`,
          {
            id: item.id,
            name: item.name,
            sn: item.sn,
            category: item.category,
            prevData: `Tồn kho trước khi xóa: ${item.qty} ${item.loc ? `(${item.loc})` : ''}`
          }
        );

        setConfirmDialog(null);
      }
    });
  };

  const handleQuickStatusClick = (item: InventoryItem, nextStatus: 'OK' | 'MISSING' | null) => {
    let touchedItem: InventoryItem | null = null;
    const updated = inventory.map(i => {
      if (i.id === item.id) {
        const nowStr = new Date().toLocaleString('vi-VN');
        const updatedHistory: AuditHistoryEntry[] = i.history ? [...i.history] : [];
        if (nextStatus) {
          updatedHistory.unshift({
            id: `h-${Date.now()}`,
            status: nextStatus,
            date: nowStr,
            note: 'Kiểm bằng nhấp chọn nhanh trên danh sách',
            user: currentUsername || role || 'guest'
          });
        }
        touchedItem = LocalDatabase.applyMetadata({
          ...i,
          auditStatus: nextStatus,
          auditDate: nextStatus ? nowStr : null,
          history: updatedHistory
        }, currentUsername || 'guest', false);
        return touchedItem;
      }
      return i;
    });
    saveInventoryLocally(updated);
    if (touchedItem) {
      syncService.enqueue('equipment', (touchedItem as InventoryItem).id, 'STATUS_CHANGE', touchedItem, currentUsername);
    }
    addToast(`Đã cập nhật trạng thái cho S/N: ${item.sn}`, 'success');
    playScanBeep(nextStatus === 'OK' ? 950 : 350, 0.12);

    addSystemAuditLog(
      'INVENTORY_AUDIT',
      'Kiểm kê nhanh trên danh sách',
      `Đánh dấu trạng thái "${nextStatus === 'OK' ? 'ĐỦ / TỐT (OK)' : (nextStatus === 'MISSING' ? 'THIẾU / HỎNG' : 'CHƯA KIỂM')}" cho thiết bị "${item.name}" (S/N: ${item.sn})`,
      {
        id: item.id,
        name: item.name,
        sn: item.sn,
        category: item.category,
        prevData: `Trạng thái: ${item.auditStatus || 'Chưa kiểm'}`,
        newData: `Trạng thái: ${nextStatus || 'Chưa kiểm'}`
      }
    );
  };

  const handleResetAuditStatus = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Đặt lại trạng thái kiểm kê',
      message: 'Hành động này sẽ XÓA TOÀN BỘ trạng thái kiểm kê hiện tại của tất cả thiết bị về trạng thái CHƯA KIỂM. Bạn có đồng ý thực hiện?',
      onConfirm: () => {
        const reseted = inventory.map(item => LocalDatabase.applyMetadata({
          ...item,
          auditStatus: null,
          auditDate: null,
          auditNote: ''
        }, currentUsername || 'guest', false));
        saveInventoryLocally(reseted);
        syncService.enqueue('inventory_batch', `RESET_ALL_${Date.now()}`, 'BATCH_UPSERT', { action: 'RESET_ALL_AUDIT' }, currentUsername);
        addToast('Đã đặt toàn bộ thiết bị về trạng thái Chưa Kiểm kê.', 'info');
        playScanBeep(300, 0.4);

        addSystemAuditLog(
          'INVENTORY_AUDIT',
          'Đặt lại toàn bộ trạng thái kiểm kê',
          `Đặt toàn bộ ${inventory.length} thiết bị về trạng thái Chưa Kiểm Kê.`
        );

        setConfirmDialog(null);
      }
    });
  };

  const handleExportCsv = () => {
    if (filteredInventory.length === 0) {
      addToast('Không có dữ liệu trong danh sách lọc để xuất CSV!', 'error');
      return;
    }

    const headers = ['STT', 'Tên Thiết Bị', 'Chủng Loại', 'Part Number (P/N)', 'Serial Number (S/N)', 'Số Lượng', 'Mã Kho', 'Vị Trí', 'Trạng Thái Kiểm Kê', 'Ngày Kiểm Kê', 'Ghi Chú'];
    const rows = filteredInventory.map((item, idx) => [
      idx + 1,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.pn || '').replace(/"/g, '""')}"`,
      `"${(item.sn || '').replace(/"/g, '""')}"`,
      item.qty,
      `"${(item.warehouse || '').replace(/"/g, '""')}"`,
      `"${(item.loc || '').replace(/"/g, '""')}"`,
      `"${item.auditStatus === 'OK' ? 'Đủ/Tốt' : item.auditStatus === 'MISSING' ? 'Thiếu/Thất lạc' : 'Chưa kiểm kê'}"`,
      `"${(item.auditDate || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_vat_tu_cns_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(`Đã xuất thành công ${filteredInventory.length} thiết bị ra file CSV!`, 'success');

    addSystemAuditLog(
      'DATA_IMPORT',
      'Xuất dữ liệu kho CSV',
      `Đã xuất ${filteredInventory.length} mục thiết bị ra file CSV với bộ lọc hiện tại.`
    );
  };

  // Scanning logic
  const handleScannedCode = (code: string, status: 'OK' | 'MISSING', note: string): boolean => {
    if (!code.trim()) return false;
    const cleanCode = code.trim().toUpperCase();

    const matchingItemsIdx = inventoryRef.current.reduce<number[]>((acc, item, idx) => {
      if (
        (item.warehouse && item.warehouse.toUpperCase() === cleanCode) ||
        item.sn.toUpperCase() === cleanCode
      ) {
        acc.push(idx);
      }
      return acc;
    }, []);

    if (matchingItemsIdx.length === 0) {
      playScanBeep(200, 0.4);
      return false;
    }

    const nowStr = new Date().toLocaleString('vi-VN');
    const updated = [...inventoryRef.current];

    matchingItemsIdx.forEach(idx => {
      const i = updated[idx];
      const entry: AuditHistoryEntry = {
        id: `h-${Date.now()}-${idx}`,
        status: status,
        date: nowStr,
        note: note.trim() || 'Kiểm kê tự động bằng hệ thống quét QR',
        user: currentUsername || roleRef.current || 'guest'
      };

      updated[idx] = LocalDatabase.applyMetadata({
        ...i,
        auditStatus: status,
        auditDate: nowStr,
        auditNote: note.trim() || 'Quét mã xác nhận Đủ',
        history: i.history ? [entry, ...i.history] : [entry]
      }, currentUsername || 'guest', false);
    });

    saveInventoryLocally(updated);
    matchingItemsIdx.forEach(idx => {
      const item = updated[idx];
      syncService.enqueue('equipment', item.id, 'STATUS_CHANGE', item, currentUsername);
    });
    playScanBeep(status === 'OK' ? 1047 : 330, 0.16);
    addToast(`Quét thành công! Thiết bị đã được đánh dấu ${status === 'OK' ? 'ĐỦ' : 'THIẾU'}.`, 'success');

    const firstMatched = updated[matchingItemsIdx[0]];
    addSystemAuditLog(
      'INVENTORY_AUDIT',
      'Quét mã QR / Barcode kiểm kê',
      `Quét mã "${cleanCode}" xác nhận trạng thái ${status === 'OK' ? 'ĐẠT CHUẨN (OK)' : 'CẦN XỬ LÝ (THIẾU)'} cho ${matchingItemsIdx.length} thiết bị (vd: ${firstMatched?.name || cleanCode})`,
      {
        id: firstMatched?.id,
        name: firstMatched?.name,
        sn: firstMatched?.sn,
        category: firstMatched?.category,
        newData: `Trạng thái: ${status}`
      }
    );

    return true;
  };

  // Cloud Sync
  const fetchCloudData = async (targetUrl?: string, isSilent: boolean = false) => {
    if (syncStatus === 'syncing') return;
    if (!navigator.onLine) {
      if (!isSilent) {
        setSyncStatus('idle');
        setSyncStatusDetail('Ngoại tuyến (Offline). Trình duyệt lưu trữ cục bộ.');
        addToast('Không có mạng để tải dữ liệu từ Cloud!', 'info');
      }
      return;
    }

    setSyncStatus('syncing');
    setSyncStatusDetail('Đang tạo yêu cầu kết nối Google Sheet Cloud...');

    try {
      const activeUrl = targetUrl || syncConfig.webAppUrl;
      const res = await CloudService.pullFromCloud(activeUrl);

      if (!res.success) {
        throw new Error(res.error || 'Yêu cầu dữ liệu thất bại từ Google Apps Script.');
      }

      const data = res.items;
      if (data && Array.isArray(data)) {
        if (data.length > 0) {
          const formatted: InventoryItem[] = data.map((item: Partial<InventoryItem>, index: number) => ({
            id: item.id || `cloud-item-${index}-${Date.now()}`,
            name: item.name || 'Thiết bị không tên',
            pn: item.pn || '',
            sn: item.sn || `SN-${index}`,
            warehouse: item.warehouse || '',
            loc: item.loc || '',
            qty: Number(item.qty) || 1,
            auditStatus: item.auditStatus === 'OK' ? 'OK' : (item.auditStatus === 'MISSING' ? 'MISSING' : null),
            auditDate: item.auditDate || null,
            auditNote: item.auditNote || '',
            category: item.category || 'Khác',
            history: item.history || [],
            version: item.version || 1,
            updatedAt: item.updatedAt || new Date().toISOString()
          }));

          // Run conflict check with existing local inventory
          const detectedConflicts = syncService.checkForConflicts(formatted, inventory);
          if (detectedConflicts.length > 0) {
            setConflicts(detectedConflicts);
            setIsConflictModalOpen(true);
            if (!isSilent) {
              addToast(`Phát hiện ${detectedConflicts.length} xung đột dữ liệu giữa Cloud và Local!`, 'error');
            }
          }

          // Merge items that have no conflicts
          const conflictIds = new Set(detectedConflicts.map(c => c.entityId));
          const localMap = new Map<string, InventoryItem>(inventory.map(i => [i.id, i]));
          const merged: InventoryItem[] = [];

          // Keep cloud items or resolved items
          formatted.forEach(cloudItem => {
            if (conflictIds.has(cloudItem.id)) {
              // keep local until user resolves
              const localVersion = localMap.get(cloudItem.id);
              if (localVersion) merged.push(localVersion);
              else merged.push(cloudItem);
            } else {
              merged.push(cloudItem);
            }
          });

          // Add any strictly local new items not on cloud yet
          inventory.forEach(localItem => {
            if (!formatted.some(ci => ci.id === localItem.id)) {
              merged.push(localItem);
            }
          });

          saveInventoryLocally(merged);
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
          setSyncStatus('success');
          setSyncStatusDetail(`Tự động đồng bộ ${formatted.length} thiết bị từ Google Sheet (${nowStr}).`);
          if (!isSilent) {
            addToast(`Đồng bộ thành công! Đã xử lý ${formatted.length} thiết bị từ Cloud.`, 'success');
            playScanBeep(1000, 0.2);
          }
        } else {
          setSyncStatus('success');
          setSyncStatusDetail('Kho Cloud rỗng. Có thể tiến hành đẩy lên.');
          if (!isSilent) {
            addToast('Kho trên Cloud hiện đang trống!', 'info');
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi mạng không xác định.';
      setSyncStatus('error');
      setSyncStatusDetail(errorMsg);
      if (!isSilent) {
        addToast('Lỗi tải dữ liệu từ Cloud! Xem chi tiết ở phần cài đặt.', 'error');
        playScanBeep(250, 0.3);
      }
    }
  };

  // Automatic 30-second background connection to Google Sheets Cloud to pull data
  useEffect(() => {
    if (!syncConfig.autoSync30s || !syncConfig.webAppUrl) return;

    const intervalSec = syncConfig.autoSyncInterval && syncConfig.autoSyncInterval > 0 ? syncConfig.autoSyncInterval : 30;

    // Initial fetch on page load if autoLoadOnStartup enabled
    if (syncConfig.autoLoadOnStartup) {
      fetchCloudData(undefined, true);
    }

    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        fetchCloudData(undefined, true);
      }
    }, intervalSec * 1000);

    return () => clearInterval(intervalId);
  }, [syncConfig.autoSync30s, syncConfig.autoSyncInterval, syncConfig.webAppUrl, syncConfig.autoLoadOnStartup]);

  const syncToCloud = async () => {
    if (syncStatus === 'syncing') return;
    if (!navigator.onLine) {
      setSyncStatus('idle');
      setSyncStatusDetail('Không thể tải lên. Thiết bị đang Ngoại tuyến.');
      addToast('Không có kết nối mạng để kết nối với Cloud!', 'error');
      playScanBeep(250, 0.3);
      return;
    }

    setSyncStatus('syncing');
    setSyncStatusDetail('Đang đồng bộ dữ liệu lên Cloud...');

    try {
      // First process any pending queue
      await syncService.processQueue(true);

      // Perform a full inventory push to ensure Google Sheet matches state
      const res = await CloudService.pushToCloud(syncConfig.webAppUrl, inventory, syncService.getQueue(), currentUsername || role || 'anonymous');
      if (!res.success) {
        throw new Error(res.error || 'Đẩy dữ liệu thất bại');
      }

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
      setSyncStatus('success');
      setSyncStatusDetail('Đã đồng bộ dữ liệu thành công lên Apps Script.');
      addToast('Đã đồng bộ toàn bộ dữ liệu lên Cloud thành công!', 'success');
      playScanBeep(980, 0.15);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncStatusDetail(err?.message || 'Đẩy dữ liệu thất bại. Hãy kiểm tra kết nối mạng.');
      addToast('Không thể đẩy dữ liệu lên Cloud. Hãy thử lại.', 'error');
    }
  };

  // Exports
  const handleExportExcel = () => {
    if (inventory.length === 0) {
      addToast('Không có dữ liệu để xuất Excel!', 'error');
      return;
    }

    try {
      const excelRows = inventory.map((item, index) => ({
        'STT': index + 1,
        'Tên thiết bị': item.name,
        'Phân loại': item.category || 'Khác',
        'Part Number (P/N)': item.pn || 'N/A',
        'Serial Number (S/N)': item.sn,
        'Mã Kho (QR)': item.warehouse || '',
        'Vị trí / Tủ': item.loc || '',
        'Số lượng': item.qty,
        'Trạng thái kiểm kê': item.auditStatus === 'OK' ? 'Đủ/Tốt' : (item.auditStatus === 'MISSING' ? 'Thiếu/Hỏng' : 'Chưa kiểm'),
        'Ngày kiểm gần nhất': item.auditDate || '',
        'Ghi chú kiểm kê': item.auditNote || ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sach vat tu CNS');

      const fileDate = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Kho_Vat_Tu_CNS_ATM_${fileDate}.xlsx`);
      addToast('Xuất báo cáo Excel thành công!', 'success');
      playScanBeep(1000, 0.1);
    } catch {
      addToast('Có lỗi xảy ra khi tạo file Excel!', 'error');
    }
  };

  const handleExportJSON = () => {
    triggerAutoBackupJSON(true);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const hasMinimumFields = parsed.every((item: unknown) => item && typeof item === 'object' && 'sn' in item && 'name' in item);
          if (hasMinimumFields) {
            saveInventoryLocally(parsed);
            const importedCats = parsed
              .map((it: { category?: string }) => it.category)
              .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '');
            const combined = Array.from(new Set([...categories, ...importedCats]));
            saveCategoriesLocally(combined);

            addToast(`Đã khôi phục ${parsed.length} thiết bị từ backup JSON.`, 'success');
            playScanBeep(1000, 0.25);

            addSystemAuditLog(
              'DATA_RESTORE',
              'Khôi phục dữ liệu từ bản sao lưu JSON',
              `Khôi phục thành công danh sách ${parsed.length} thiết bị từ tệp sao lưu JSON.`
            );
          } else {
            addToast('Cấu trúc file JSON backup không đúng định dạng!', 'error');
          }
        }
      } catch {
        addToast('Lỗi phân tích file JSON!', 'error');
      }
    };
    fileReader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenPrintCenter = (mode: PrintMode = 'QR') => {
    setActivePrintMode(mode);
    setPrintLayout(mode);
    setIsPrintPreviewOpen(true);
  };

  const startPrintSession = (type: 'QR' | 'LABEL' | 'AUDIT_REPORT') => {
    setPrintLayout(type);
    setActivePrintMode(type);
    addToast('Đang kết nối máy in và chuẩn bị biểu mẫu...', 'info');
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintLayout('NONE'), 1200);
    }, 400);
  };

  const handleExportWebBill = () => {
    handleOpenPrintCenter('AUDIT_REPORT');
  };

  const handlePrintOfficialHandover = () => {
    if (handoverRows.length === 0) {
      addToast('Danh sách thiết bị bàn giao đang trống!', 'error');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép popup mới!', 'error');
      return;
    }

    const rowsHtml = handoverRows.map((row, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; font-size: 13.5px; font-weight: bold; font-family: 'Times New Roman', Times, serif;">${row.name}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px;">${row.unit || 'Cái'}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px; font-weight: bold;">${row.qty}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-size: 13.5px;">${row.quality || 'Tốt (Mới 100%)'}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; font-size: 13.5px;">${row.specs || 'N/A'}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: center; font-family: monospace; font-size: 13.5px; font-weight: bold;">${row.sn || 'N/A'}</td>
        <td style="border: 1px solid #000; padding: 7px 5px; text-align: left; font-size: 13.5px;">${row.note || ''}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>BIÊN BẢN GIAO NHẬN TÀI SẢN CÔNG CỤ - ${handoverNo}</title>
          <style>
            @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; margin: 0; padding: 0; background-color: #fff; }
            .container { width: 100%; max-width: 680px; margin: 0 auto; }
            .header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 25px; }
            .header-table td { border: none; padding: 0; vertical-align: top; }
            .national-brand { text-align: center; font-size: 12.5px; width: 58%; }
            .national-title { font-weight: bold; text-transform: uppercase; font-size: 12px; }
            .national-subtitle { font-weight: bold; font-size: 13px; margin-top: 3px; }
            .company-brand { text-align: center; font-size: 12px; width: 42%; }
            .company-name { text-transform: uppercase; font-size: 11px; font-weight: bold; }
            .dept-name { text-transform: uppercase; font-weight: bold; font-size: 12px; margin-top: 3px; }
            .doc-number { font-size: 12.5px; margin-top: 5px; text-align: center; }
            .location-date { font-size: 13px; text-align: center; font-style: italic; margin-top: 6px; }
            .doc-title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 30px 0 6px 0; letter-spacing: 0.5px; }
            .doc-intro { text-align: left; font-size: 14px; margin-bottom: 18px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px; }
            .info-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 12px; }
            .info-table td { border: none; padding: 4px 0; font-size: 14.5px; }
            .table-main { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
            .table-main th { border: 1px solid #000; background-color: #fff; padding: 8px 5px; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase; }
            .footer-note { font-size: 14px; margin: 15px 0 25px 0; text-align: left; }
            .signature-table { width: 100%; border-collapse: collapse; border: none; margin-top: 25px; page-break-inside: avoid; }
            .signature-table td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 0; }
            .sig-title { font-weight: bold; text-transform: uppercase; font-size: 13.5px; margin-bottom: 5px; }
            .sig-name { font-weight: bold; font-size: 14px; text-transform: uppercase; margin-top: 80px; }
          </style>
        </head>
        <body>
          <div class="container">
            <table class="header-table">
              <tr>
                <td class="company-brand">
                  <div class="company-name">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                  <div class="dept-name"><u>TRUNG TÂM BĐKT</u></div>
                  <div style="margin-top: 12px;" class="doc-number">Số: ${handoverNo || '......../KT'}</div>
                </td>
                <td class="national-brand">
                  <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div class="national-subtitle"><u>Độc lập - Tự do - Hạnh phúc</u></div>
                  <div class="location-date">TPHCM, ngày ${handoverDay} tháng ${handoverMonth} năm ${handoverYear}</div>
                </td>
              </tr>
            </table>

            <div class="doc-title">BIÊN BẢN GIAO, NHẬN TÀI SẢN, CÔNG CỤ</div>
            <div class="doc-intro">
              Hôm nay, ngày ${handoverDay} tháng ${handoverMonth} năm ${handoverYear}, tại ${handoverLocation || 'Trung tâm Bảo đảm Kỹ thuật'}
            </div>

            <div class="section-title">THÀNH PHẦN BÀN GIAO:</div>
            
            <table class="info-table">
              <tr>
                <td style="font-weight: bold; width: 100%;" colspan="2">
                  1. Đại diện bên giao: ${handoverGiverDept || 'Đội Thông tin – Trung tâm BĐKT'}
                </td>
              </tr>
              <tr>
                <td style="width: 55%; padding-left: 20px;">
                  Ông (bà): <span style="font-weight: bold;">${handoverGiverName || '...........................................'}</span>
                </td>
                <td style="width: 45%;">
                  Chức vụ: <span style="font-weight: bold;">${handoverGiverPos || '...........................................'}</span>
                </td>
              </tr>
              <tr>
                <td style="font-weight: bold; width: 100%;" colspan="2">
                  2. Đại diện bên nhận: ${handoverReceiverDept || '...........................................'}
                </td>
              </tr>
              <tr>
                <td style="width: 55%; padding-left: 20px;">
                  Ông (bà): <span style="font-weight: bold;">${handoverReceiverName || '...........................................'}</span>
                </td>
                <td style="width: 45%;">
                  Chức vụ: <span style="font-weight: bold;">${handoverReceiverPos || '...........................................'}</span>
                </td>
              </tr>
            </table>

            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 45px;">STT</th>
                  <th>Tên tài sản, công cụ</th>
                  <th style="width: 55px;">ĐVT</th>
                  <th style="width: 70px;">Số lượng</th>
                  <th style="width: 90px;">Chất lượng</th>
                  <th>Nhãn hiệu, quy cách, xuất xứ</th>
                  <th style="width: 110px;">S/N</th>
                  <th style="width: 90px;">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="font-size: 14px; margin-top: 10px; margin-bottom: 5px; text-align: left;">
              Lý do bàn giao: <span style="font-weight: bold;">${handoverReason || '...........................................................................'}</span>
            </div>

            <div class="footer-note">
              Biên bản này được lập thành hai bản, mỗi bên giữ một bản, các bản có giá trị như nhau.
            </div>

            <table class="signature-table">
              <tr>
                <td>
                  <div class="sig-title">ĐẠI DIỆN BÊN GIAO</div>
                  <div class="sig-name">${handoverGiverName || ''}</div>
                </td>
                <td>
                  <div class="sig-title">ĐẠI DIỆN BÊN NHẬN</div>
                  <div class="sig-name">${handoverReceiverName || ''}</div>
                </td>
              </tr>
            </table>
          </div>

          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast('Đã khởi tạo in biên bản bàn giao thành công!', 'success');
  };

  const handlePrintUsageSlip = (slip: UsageSlip) => {
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép popup mới!', 'error');
      return;
    }

    const now = new Date();
    let printDay = String(now.getDate()).padStart(2, '0');
    let printMonth = String(now.getMonth() + 1).padStart(2, '0');
    let printYear = String(now.getFullYear());

    if (slip.date) {
      const match = slip.date.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (match) {
        printDay = match[1].padStart(2, '0');
        printMonth = match[2].padStart(2, '0');
        printYear = match[3];
      }
    }

    const docNo = slip.docNumber || `PBSD-${printYear}/${String(slip.id.slice(-4)).padStart(3, '0')}`;
    const giverName = slip.giverName || (currentUsername ? `Kỹ sư ${currentUsername}` : 'Admin Kho');
    const giverDept = slip.giverDept || 'Đội Thông Tin – Trung tâm Bảo đảm Kỹ thuật';
    const giverPos = slip.giverPos || 'Kỹ sư phụ trách kho';
    const receiverName = slip.user || 'Kỹ sư tiếp nhận';
    const receiverDept = slip.receiverDept || 'Tổ Vận Hành CNS/ATM';
    const receiverPos = slip.receiverPos || 'Kỹ sư trực ban / Khai thác';

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PHIẾU BÁO SỬ DỤNG - BÀN GIAO THIẾT BỊ - ${docNo}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 20mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000000;
              line-height: 1.42;
              font-size: 13pt;
              background: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              width: 100%;
              max-width: 720px;
              margin: 0 auto;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-bottom: 18px;
            }
            .header-table td {
              border: none;
              vertical-align: top;
              padding: 0;
            }
            .left-header {
              width: 46%;
              text-align: center;
            }
            .right-header {
              width: 54%;
              text-align: center;
            }
            .org-parent {
              font-size: 10.5pt;
              text-transform: uppercase;
              font-weight: normal;
              margin: 0;
            }
            .org-company {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 1px 0;
            }
            .org-center {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 1px 0;
            }
            .org-dept {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 2px 0 0 0;
            }
            .doc-number {
              font-size: 11.5pt;
              font-style: italic;
              margin-top: 6px;
            }
            .nat-title {
              font-size: 11.5pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
            }
            .nat-subtitle {
              font-size: 12.5pt;
              font-weight: bold;
              margin: 2px 0 0 0;
            }
            .date-location {
              font-size: 12pt;
              font-style: italic;
              margin-top: 4px;
            }
            .title-box {
              text-align: center;
              margin: 22px 0 16px 0;
            }
            .main-title {
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 4px 0;
            }
            .sub-title {
              font-size: 11.5pt;
              font-style: italic;
              margin: 0;
            }
            .section-heading {
              font-size: 12.5pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 14px 0 6px 0;
            }
            .info-list {
              font-size: 12.5pt;
              line-height: 1.5;
              margin-bottom: 12px;
            }
            .info-row {
              margin: 4px 0;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0 16px 0;
              font-size: 11.5pt;
            }
            .data-table th, .data-table td {
              border: 1px solid #000000;
              padding: 6px 6px;
              vertical-align: middle;
            }
            .data-table th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              font-size: 11pt;
            }
            .data-table td.center {
              text-align: center;
            }
            .data-table td.bold {
              font-weight: bold;
            }
            .data-table td.mono {
              font-family: 'Courier New', Courier, monospace;
              font-weight: bold;
            }
            .terms-box {
              font-size: 11.5pt;
              font-style: italic;
              line-height: 1.45;
              margin: 12px 0 18px 0;
            }
            .terms-box p {
              margin: 3px 0;
            }
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              margin-top: 22px;
              page-break-inside: avoid;
            }
            .signature-table td {
              border: none;
              width: 25%;
              text-align: center;
              vertical-align: top;
              padding: 0 4px;
            }
            .sig-role {
              font-weight: bold;
              font-size: 11.5pt;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .sig-note {
              font-size: 10.5pt;
              font-style: italic;
              margin-top: 2px;
            }
            .sig-spacing {
              height: 70px;
            }
            .sig-fullname {
              font-weight: bold;
              font-size: 12pt;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <table class="header-table">
              <tr>
                <td class="left-header">
                  <div class="org-parent">TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM</div>
                  <div class="org-company">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                  <div class="org-center">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                  <div class="org-dept"><u>ĐỘI THÔNG TIN CNS/ATM</u></div>
                  <div class="doc-number">Số: <strong>${docNo}</strong></div>
                </td>
                <td class="right-header">
                  <div class="nat-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div class="nat-subtitle"><u>Độc lập - Tự do - Hạnh phúc</u></div>
                  <div class="date-location">TP. Hồ Chí Minh, ngày ${printDay} tháng ${printMonth} năm ${printYear}</div>
                </td>
              </tr>
            </table>

            <div class="title-box">
              <div class="main-title">PHIẾU BÁO SỬ DỤNG - BÀN GIAO THIẾT BỊ</div>
              <div class="sub-title">(V/v trích xuất, cấp phát và luân chuyển vật tư dự phòng phục vụ kỹ thuật hàng không)</div>
            </div>

            <div class="section-heading">I. CĂN CỨ VÀ THÀNH PHẦN THỰC HIỆN:</div>
            <div class="info-list">
              <div class="info-row">
                <strong>1. Bên Giao (Cấp xuất kho):</strong> ${giverDept}
              </div>
              <div class="info-row" style="padding-left: 18px;">
                - Đại diện: <strong>${giverName}</strong> 
                &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp; 
                Chức vụ: <strong>${giverPos}</strong>
              </div>
              <div class="info-row" style="margin-top: 6px;">
                <strong>2. Bên Nhận (Tiếp nhận sử dụng):</strong> ${receiverDept}
              </div>
              <div class="info-row" style="padding-left: 18px;">
                - Đại diện: <strong>${receiverName}</strong> 
                &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp; 
                Chức vụ: <strong>${receiverPos}</strong>
              </div>
              <div class="info-row" style="margin-top: 6px;">
                <strong>3. Thời gian cấp xuất:</strong> ${slip.date}
              </div>
              <div class="info-row">
                <strong>4. Vị trí lắp đặt / Hệ thống đích:</strong> <strong>${slip.targetLocation || 'Hệ thống thiết bị chuyên ngành'}</strong>
              </div>
            </div>

            <div class="section-heading">II. DANH MỤC TRANG THIẾT BỊ VÀ VẬT TƯ BÀN GIAO:</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 32px;">STT</th>
                  <th>Tên Trang Thiết Bị / Vật Tư</th>
                  <th style="width: 90px;">Chủng Loại</th>
                  <th style="width: 85px;">Part No.</th>
                  <th style="width: 105px;">Serial No. (S/N)</th>
                  <th style="width: 42px;">SL</th>
                  <th style="width: 48px;">ĐVT</th>
                  <th style="width: 85px;">Kho Xuất</th>
                  <th style="width: 85px;">Hiện Trạng</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="center">01</td>
                  <td class="bold">${slip.itemName}</td>
                  <td class="center">${slip.category || 'Vật tư CNS'}</td>
                  <td class="center">${slip.pn || 'N/A'}</td>
                  <td class="center mono">${slip.sn}</td>
                  <td class="center bold">${slip.qtyUsed}</td>
                  <td class="center">${slip.unit || 'Chiếc'}</td>
                  <td class="center">${slip.warehouse || 'Kho TT'}</td>
                  <td class="center" style="font-weight: bold;">Tốt (100%)</td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">III. MỤC ĐÍCH SỬ DỤNG VÀ THÔNG SỐ KỸ THUẬT:</div>
            <div class="info-list">
              <div class="info-row">
                - <strong>Mục đích sử dụng:</strong> ${slip.purpose || 'Thay thế dự phòng / Bảo dưỡng định kỳ'}
              </div>
              <div class="info-row">
                - <strong>Ghi chú & Tham số kỹ thuật:</strong> ${slip.notes || 'Thiết bị đã kiểm tra các tham số kỹ thuật đạt chuẩn, hoạt động ổn định trước khi đưa vào vận hành.'}
              </div>
            </div>

            <div class="section-heading">IV. TRÁCH NHIỆM & QUY ĐỊNH BẢO QUẢN:</div>
            <div class="terms-box">
              <p>1. Bên nhận chịu trách nhiệm tiếp nhận, bảo quản và vận hành trang thiết bị đúng quy trình kỹ thuật hàng không quy định.</p>
              <p>2. Khi có sự cố hư hỏng hoặc thu hồi hoàn kho, kỹ sư quản lý phải báo cáo kịp thời cho Phụ trách kho và Lãnh đạo Đội để lập biên bản xử lý cập nhật hệ thống.</p>
              <p>3. Phiếu này được lập thành 02 bản có giá trị pháp lý như nhau, lưu tại Sổ Theo Dõi Đội Thông Tin và Đơn vị tiếp nhận sử dụng.</p>
            </div>

            <table class="signature-table">
              <tr>
                <td>
                  <div class="sig-role">KỸ SƯ TIẾP NHẬN</div>
                  <div class="sig-note">(Ký, ghi rõ họ tên)</div>
                  <div class="sig-spacing"></div>
                  <div class="sig-fullname">${receiverName}</div>
                </td>
                <td>
                  <div class="sig-role">NGƯỜI LẬP PHIẾU</div>
                  <div class="sig-note">(Ký, ghi rõ họ tên)</div>
                  <div class="sig-spacing"></div>
                  <div class="sig-fullname">${giverName}</div>
                </td>
                <td>
                  <div class="sig-role">PHỤ TRÁCH KHO</div>
                  <div class="sig-note">(Ký, ghi rõ họ tên)</div>
                  <div class="sig-spacing"></div>
                  <div class="sig-fullname">...............................</div>
                </td>
                <td>
                  <div class="sig-role">LÃNH ĐẠO ĐỘI</div>
                  <div class="sig-note">(Ký, đóng dấu duyệt)</div>
                  <div class="sig-spacing"></div>
                  <div class="sig-fullname">...............................</div>
                </td>
              </tr>
            </table>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast(`Đã xuất phiếu báo sử dụng chuẩn form (${slip.sn})!`, 'success');
  };

  const handleSubmitUsage = (newSlip: UsageSlip, deductInv: boolean) => {
    const nextSlips = [newSlip, ...usageSlips];
    setUsageSlips(nextSlips);
    localStorage.setItem('cns_usage_slips_v1', JSON.stringify(nextSlips));

    // Also register into the centralized Dispatched Equipment Registry
    const rawDispatchRecord: DispatchedRecord = {
      id: `disp-u-${Date.now()}`,
      type: 'USAGE_SLIP',
      docNumber: newSlip.docNumber || `PBSD-${new Date().getFullYear()}/${String(dispatchedRecords.length + 1).padStart(3, '0')}`,
      itemId: newSlip.itemId,
      itemName: newSlip.itemName,
      category: newSlip.category,
      sn: newSlip.sn,
      pn: newSlip.pn,
      qty: newSlip.qtyUsed,
      unit: newSlip.unit || 'Chiếc',
      date: newSlip.date,
      warehouse: newSlip.warehouse,
      originalLoc: newSlip.originalLoc,
      giverDept: newSlip.giverDept || 'Đội Thông Tin – TT BĐKT',
      giverName: newSlip.giverName || (currentUsername ? `Kỹ sư ${currentUsername}` : 'Admin Kho'),
      giverPos: newSlip.giverPos || 'Kỹ sư quản lý kho',
      receiverDept: newSlip.receiverDept || 'Tổ Vận Hành CNS/ATM',
      receiverName: newSlip.user,
      receiverPos: newSlip.receiverPos || 'Kỹ sư tiếp nhận',
      targetLocation: newSlip.targetLocation || 'Hệ thống thiết bị Đài/Trạm',
      purpose: newSlip.purpose,
      notes: newSlip.notes,
      status: 'DEPLOYED'
    };
    const newDispatchRecord = LocalDatabase.applyMetadata(rawDispatchRecord, currentUsername || 'guest', true);

    const nextDispatches = [newDispatchRecord, ...dispatchedRecords];
    saveDispatchedRecordsLocally(nextDispatches);
    syncService.enqueue('dispatched_record', newDispatchRecord.id, 'CREATE', newDispatchRecord, currentUsername);

    if (deductInv && selectedItemForUsage) {
      let resultedQty = selectedItemForUsage.qty;
      const updatedInv = inventory.map(item => {
        if (item.id === selectedItemForUsage.id) {
          const newQty = Math.max(0, item.qty - newSlip.qtyUsed);
          resultedQty = newQty;
          const updatedHistory = item.history ? [...item.history] : [];
          updatedHistory.unshift({
            id: `h-use-${Date.now()}`,
            status: 'OK',
            date: newSlip.date,
            note: `Xuất sử dụng x${newSlip.qtyUsed} bộ tại: ${newSlip.targetLocation || 'Hệ thống'} (Người nhận: ${newSlip.user})`,
            user: currentUsername || role || 'guest'
          });
          const withMeta = LocalDatabase.applyMetadata({ ...item, qty: newQty, history: updatedHistory }, currentUsername || 'guest', false);
          syncService.enqueue('equipment', withMeta.id, 'UPDATE', withMeta, currentUsername);
          return withMeta;
        }
        return item;
      });
      saveInventoryLocally(updatedInv);

      if (resultedQty <= 1) {
        setTimeout(() => {
          addToast(`⚠️ CẢNH BÁO TỒN KHO: Sau khi xuất, thiết bị "${selectedItemForUsage.name}" chỉ còn lại ${resultedQty} cái (Dưới ngưỡng an toàn <= 1)! Cần lập kế hoạch nhập bổ sung.`, 'error');
        }, 500);
      }
    }

    playScanBeep(1000, 0.2);
    addToast('Đã đăng ký phiếu sử dụng & tổng hợp vào Sổ Theo Dõi!', 'success');

    addSystemAuditLog(
      'USAGE_DISPATCH',
      'Xuất phiếu báo sử dụng thiết bị',
      `Xuất x${newSlip.qtyUsed} bộ "${newSlip.itemName}" (S/N: ${newSlip.sn || 'N/A'}) cho ${newSlip.user} tại vị trí: ${newSlip.targetLocation || 'Hệ thống'}. Mục đích: ${newSlip.purpose}`,
      {
        id: newSlip.itemId,
        name: newSlip.itemName,
        sn: newSlip.sn,
        category: newSlip.category,
        prevData: `Tồn kho trước: ${selectedItemForUsage?.qty || 0}`,
        newData: `Tồn kho sau: ${Math.max(0, (selectedItemForUsage?.qty || 0) - (deductInv ? newSlip.qtyUsed : 0))}`
      }
    );

    setSelectedItemForUsage(null);
    setTimeout(() => handlePrintUsageSlip(newSlip), 500);
  };

  // Handover document saving to centralized registry
  const handleSaveHandoverToRegistry = (deductStock: boolean) => {
    if (handoverRows.length === 0) {
      addToast('Danh sách thiết bị bàn giao đang trống!', 'error');
      return;
    }

    const docDateStr = `${handoverDay}/${handoverMonth}/${handoverYear}`;
    const newRecords: DispatchedRecord[] = handoverRows.map((row, idx) => {
      const matchedInv = inventory.find(i => i.id === row.id || (row.sn && i.sn.toLowerCase() === row.sn.toLowerCase()));
      const rawRec: DispatchedRecord = {
        id: `disp-h-${Date.now()}-${idx}`,
        type: 'HANDOVER_DOC',
        docNumber: handoverNo || `${Math.floor(100 + Math.random() * 900)}/KT`,
        itemId: row.id,
        itemName: row.name,
        category: matchedInv?.category || 'Vật tư CNS',
        sn: row.sn || 'N/A',
        pn: row.specs || matchedInv?.pn || '',
        qty: row.qty,
        unit: row.unit || 'Cái',
        date: docDateStr,
        warehouse: matchedInv?.warehouse || 'Kho Trung tâm',
        originalLoc: matchedInv?.loc || '',
        giverDept: handoverGiverDept,
        giverName: handoverGiverName,
        giverPos: handoverGiverPos,
        receiverDept: handoverReceiverDept,
        receiverName: handoverReceiverName,
        receiverPos: handoverReceiverPos,
        targetLocation: handoverLocation || 'Trung tâm BĐKT',
        purpose: handoverReason,
        notes: row.note || '',
        status: 'DEPLOYED'
      };
      return LocalDatabase.applyMetadata(rawRec, currentUsername || 'guest', true);
    });

    const updatedDispatches = [...newRecords, ...dispatchedRecords];
    saveDispatchedRecordsLocally(updatedDispatches);
    newRecords.forEach(r => {
      syncService.enqueue('dispatched_record', r.id, 'CREATE', r, currentUsername);
    });

    // Deduct stock if requested
    if (deductStock) {
      let updatedInv = [...inventory];
      handoverRows.forEach(row => {
        updatedInv = updatedInv.map(invItem => {
          if (invItem.id === row.id || (row.sn && invItem.sn.toLowerCase() === row.sn.toLowerCase())) {
            const newQty = Math.max(0, invItem.qty - row.qty);
            const history = invItem.history ? [...invItem.history] : [];
            history.unshift({
              id: `h-ho-${Date.now()}-${row.id}`,
              status: 'OK',
              date: docDateStr,
              note: `Bàn giao x${row.qty} theo BB số ${handoverNo} cho ${handoverReceiverName} (${handoverReceiverDept})`,
              user: currentUsername || role || 'guest'
            });
            const withMeta = LocalDatabase.applyMetadata({ ...invItem, qty: newQty, history }, currentUsername || 'guest', false);
            syncService.enqueue('equipment', withMeta.id, 'UPDATE', withMeta, currentUsername);
            return withMeta;
          }
          return invItem;
        });
      });
      saveInventoryLocally(updatedInv);
    }

    addToast(`Đã lưu ${newRecords.length} thiết bị bàn giao vào Sổ Tổng Hợp Theo Dõi!`, 'success');

    addSystemAuditLog(
      'HANDOVER_CREATE',
      'Lập biên bản bàn giao thiết bị',
      `Bàn giao ${handoverRows.length} mục thiết bị theo Biên Bản số ${handoverNo} cho ${handoverReceiverName} (${handoverReceiverDept}) tại ${handoverLocation}. Lý do: ${handoverReason}`,
      {
        name: `Biên bản bàn giao ${handoverNo}`,
        newData: `Bàn giao ${handoverRows.length} thiết bị: ${handoverRows.map(r => `${r.name} (x${r.qty})`).join(', ')}`
      }
    );
  };

  // Return equipment to stock from dispatched registry
  const handleConfirmReturnStock = (
    recordId: string,
    returnQty: number,
    returnCondition: string,
    returnRecipient: string,
    returnNote: string
  ) => {
    const targetRecord = dispatchedRecords.find(r => r.id === recordId);
    if (!targetRecord) {
      addToast('Không tìm thấy bản ghi cần thu hồi!', 'error');
      return;
    }

    const todayStr = new Date().toLocaleDateString('vi-VN');

    // 1. Update dispatched record
    const updatedDispatches = dispatchedRecords.map(r => {
      if (r.id === recordId) {
        const withMeta = LocalDatabase.applyMetadata({
          ...r,
          status: 'RETURNED' as const,
          returnedDate: todayStr,
          returnedBy: returnRecipient,
          returnedQty: returnQty,
          returnNote: `Tình trạng: ${returnCondition}. Ghi chú: ${returnNote}`
        }, currentUsername || 'guest', false);
        syncService.enqueue('dispatched_record', withMeta.id, 'UPDATE', withMeta, currentUsername);
        return withMeta;
      }
      return r;
    });

    saveDispatchedRecordsLocally(updatedDispatches);

    // 2. Increment inventory stock
    let updatedInv = [...inventory];
    let matchedIndex = updatedInv.findIndex(i => i.id === targetRecord.itemId || (targetRecord.sn && targetRecord.sn !== 'N/A' && i.sn.toLowerCase() === targetRecord.sn.toLowerCase()));

    if (matchedIndex >= 0) {
      const existingItem = updatedInv[matchedIndex];
      const history = existingItem.history ? [...existingItem.history] : [];
      history.unshift({
        id: `h-ret-${Date.now()}`,
        status: returnCondition.includes('Hỏng') || returnCondition.includes('Lỗi') ? 'MISSING' : 'OK',
        date: todayStr,
        note: `Thu hồi/Nhập trả kho x${returnQty} từ ${targetRecord.receiverName || targetRecord.targetLocation}. Tình trạng: ${returnCondition}. Người nhận: ${returnRecipient}`,
        user: currentUsername || role || 'guest'
      });

      const withMeta = LocalDatabase.applyMetadata({
        ...existingItem,
        qty: existingItem.qty + returnQty,
        history
      }, currentUsername || 'guest', false);
      updatedInv[matchedIndex] = withMeta;
      syncService.enqueue('equipment', withMeta.id, 'UPDATE', withMeta, currentUsername);
    } else {
      // If item was previously deleted from stock, re-create it in inventory
      const rawNewItem: InventoryItem = {
        id: targetRecord.itemId || `inv-ret-${Date.now()}`,
        name: targetRecord.itemName,
        category: targetRecord.category || 'Vật tư CNS',
        sn: targetRecord.sn || `SN-RET-${Date.now().toString().slice(-4)}`,
        pn: targetRecord.pn || '',
        warehouse: targetRecord.warehouse || 'Kho Trung tâm',
        loc: targetRecord.originalLoc || 'Kệ Thu Hồi / Dự phòng',
        qty: returnQty,
        auditStatus: returnCondition.includes('Hỏng') || returnCondition.includes('Lỗi') ? 'MISSING' : 'OK',
        auditDate: todayStr,
        history: [{
          id: `h-ret-${Date.now()}`,
          status: returnCondition.includes('Hỏng') || returnCondition.includes('Lỗi') ? 'MISSING' : 'OK',
          date: todayStr,
          note: `Thu hồi hoàn kho thiết bị từ sổ theo dõi (${targetRecord.docNumber}). Tình trạng: ${returnCondition}`,
          user: currentUsername || role || 'guest'
        }]
      };
      const newItem = LocalDatabase.applyMetadata(rawNewItem, currentUsername || 'guest', true);
      updatedInv.unshift(newItem);
      syncService.enqueue('equipment', newItem.id, 'CREATE', newItem, currentUsername);
    }

    saveInventoryLocally(updatedInv);
    setSelectedDispatchedForReturn(null);
    playScanBeep(800, 0.2);
    addToast(`Đã thu hồi & hoàn kho x${returnQty} "${targetRecord.itemName}" thành công!`, 'success');

    addSystemAuditLog(
      'STOCK_RETURN',
      'Thu hồi hoàn kho thiết bị',
      `Thu hồi hoàn kho x${returnQty} "${targetRecord.itemName}" (S/N: ${targetRecord.sn}) từ ${targetRecord.receiverName || targetRecord.targetLocation}. Tình trạng: ${returnCondition}. Người nhận bàn giao lại: ${returnRecipient}`,
      {
        id: targetRecord.itemId,
        name: targetRecord.itemName,
        sn: targetRecord.sn,
        category: targetRecord.category,
        newData: `Đã nhập lại kho x${returnQty} | Tình trạng: ${returnCondition}`
      }
    );
  };

  // Delete a dispatched record
  const handleDeleteDispatchedRecord = (recordId: string) => {
    const record = dispatchedRecords.find(r => r.id === recordId);
    if (!record) return;

    setConfirmDialog({
      isOpen: true,
      title: 'XÓA HỒ SƠ THEO DÕI',
      message: `Bạn có chắc chắn muốn xóa hồ sơ bàn giao/sử dụng của thiết bị "${record.itemName}" (S/N: ${record.sn}, Mã số: ${record.docNumber}) khỏi sổ theo dõi?`,
      onConfirm: () => {
        const next = dispatchedRecords.filter(r => r.id !== recordId);
        saveDispatchedRecordsLocally(next);
        syncService.enqueue('dispatched_record', recordId, 'DELETE', { id: recordId }, currentUsername);
        addToast('Đã xóa hồ sơ khỏi Sổ Theo Dõi!', 'success');

        addSystemAuditLog(
          'ITEM_DELETE',
          'Xóa hồ sơ theo dõi bàn giao',
          `Xóa hồ sơ bàn giao/sử dụng của thiết bị "${record.itemName}" (S/N: ${record.sn}, Mã số: ${record.docNumber}) khỏi Sổ Theo Dõi.`,
          {
            id: record.id,
            name: record.itemName,
            sn: record.sn,
            category: record.category
          }
        );

        setConfirmDialog(null);
      }
    });
  };

  // Print a single dispatched record doc
  const handlePrintDispatchedRecord = (record: DispatchedRecord) => {
    if (record.type === 'USAGE_SLIP') {
      const slip: UsageSlip = {
        id: record.id,
        docNumber: record.docNumber,
        itemId: record.itemId,
        itemName: record.itemName,
        sn: record.sn,
        pn: record.pn,
        category: record.category,
        warehouse: record.warehouse,
        originalLoc: record.originalLoc,
        user: record.receiverName,
        qtyUsed: record.qty,
        unit: record.unit,
        purpose: record.purpose,
        notes: record.notes,
        targetLocation: record.targetLocation,
        date: record.date,
        giverDept: record.giverDept,
        giverName: record.giverName,
        giverPos: record.giverPos,
        receiverDept: record.receiverDept,
        receiverPos: record.receiverPos
      };
      handlePrintUsageSlip(slip);
    } else {
      // Handover doc print
      const win = window.open('', '_blank');
      if (!win) {
        addToast('Vui lòng cho phép popup mới!', 'error');
        return;
      }
      win.document.write(`
        <html>
          <head>
            <title>BIÊN BẢN BÀN GIAO THIẾT BỊ - ${record.docNumber}</title>
            <style>
              @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
              body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; margin: 0; padding: 0; background-color: #fff; }
              .container { width: 100%; max-width: 680px; margin: 0 auto; }
              .header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 25px; }
              .header-table td { border: none; padding: 0; vertical-align: top; }
              .national-brand { text-align: center; font-size: 12.5px; width: 58%; }
              .national-title { font-weight: bold; text-transform: uppercase; font-size: 12px; }
              .national-subtitle { font-weight: bold; font-size: 13px; margin-top: 3px; }
              .company-brand { text-align: center; font-size: 12px; width: 42%; }
              .company-name { text-transform: uppercase; font-size: 11px; font-weight: bold; }
              .dept-name { text-transform: uppercase; font-weight: bold; font-size: 12px; margin-top: 3px; }
              .doc-number { font-size: 12.5px; margin-top: 5px; text-align: center; }
              .location-date { font-size: 13px; text-align: center; font-style: italic; margin-top: 6px; }
              .doc-title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 30px 0 6px 0; letter-spacing: 0.5px; }
              .doc-intro { text-align: left; font-size: 14px; margin-bottom: 18px; }
              .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px; }
              .info-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 12px; }
              .info-table td { border: none; padding: 4px 0; font-size: 14.5px; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
              .table-main th { border: 1px solid #000; background-color: #fff; padding: 8px 5px; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase; }
              .table-main td { border: 1px solid #000; padding: 7px 6px; font-size: 13.5px; }
              .footer-note { font-size: 14px; margin: 15px 0 25px 0; text-align: left; }
              .signature-table { width: 100%; border-collapse: collapse; border: none; margin-top: 25px; page-break-inside: avoid; }
              .signature-table td { border: none; width: 50%; text-align: center; vertical-align: top; padding: 0; }
              .sig-title { font-weight: bold; text-transform: uppercase; font-size: 13.5px; margin-bottom: 5px; }
              .sig-name { font-weight: bold; font-size: 14px; text-transform: uppercase; margin-top: 80px; }
            </style>
          </head>
          <body>
            <div class="container">
              <table class="header-table">
                <tr>
                  <td class="company-brand">
                    <div class="company-name">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                    <div class="dept-name"><u>TRUNG TÂM BĐKT</u></div>
                    <div style="margin-top: 12px;" class="doc-number">Số: ${record.docNumber}</div>
                  </td>
                  <td class="national-brand">
                    <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="national-subtitle"><u>Độc lập - Tự do - Hạnh phúc</u></div>
                    <div class="location-date">Ngày bàn giao: ${record.date}</div>
                  </td>
                </tr>
              </table>

              <div class="doc-title">BIÊN BẢN BÀN GIAO THIẾT BỊ CNS/ATM</div>
              <div class="doc-intro">
                Địa điểm bàn giao: ${record.targetLocation || 'Trung tâm Bảo đảm Kỹ thuật'}
              </div>

              <div class="section-title">THÀNH PHẦN BÀN GIAO:</div>
              <table class="info-table">
                <tr>
                  <td style="font-weight: bold; width: 100%;" colspan="2">
                    1. Đại diện bên giao: ${record.giverDept || 'Đội Thông tin – Trung tâm BĐKT'}
                  </td>
                </tr>
                <tr>
                  <td style="width: 55%; padding-left: 20px;">
                    Ông (bà): <span style="font-weight: bold;">${record.giverName || 'Admin Kho'}</span>
                  </td>
                  <td style="width: 45%;">
                    Chức vụ: <span style="font-weight: bold;">${record.giverPos || 'Kỹ sư'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-weight: bold; width: 100%;" colspan="2">
                    2. Đại diện bên nhận: ${record.receiverDept || 'Tổ Kỹ thuật Không lưu'}
                  </td>
                </tr>
                <tr>
                  <td style="width: 55%; padding-left: 20px;">
                    Ông (bà): <span style="font-weight: bold;">${record.receiverName || 'Kỹ sư tiếp nhận'}</span>
                  </td>
                  <td style="width: 45%;">
                    Chức vụ: <span style="font-weight: bold;">${record.receiverPos || 'Kỹ sư trực ban'}</span>
                  </td>
                </tr>
              </table>

              <table class="table-main">
                <thead>
                  <tr>
                    <th style="width: 45px;">STT</th>
                    <th>Tên tài sản, thiết bị</th>
                    <th style="width: 55px;">ĐVT</th>
                    <th style="width: 60px;">SL</th>
                    <th>Quy cách / P/N</th>
                    <th style="width: 110px;">S/N</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="text-align: center;">1</td>
                    <td style="font-weight: bold;">${record.itemName}</td>
                    <td style="text-align: center;">${record.unit || 'Bộ'}</td>
                    <td style="text-align: center; font-weight: bold;">${record.qty}</td>
                    <td>${record.pn || 'N/A'}</td>
                    <td style="text-align: center; font-family: monospace; font-weight: bold;">${record.sn}</td>
                    <td style="text-align: center;">${record.status === 'DEPLOYED' ? 'Đang hoạt động' : 'Đã thu hồi hoàn kho'}</td>
                  </tr>
                </tbody>
              </table>

              <div style="font-size: 14px; margin-top: 10px; margin-bottom: 5px;">
                Mục đích / Lý do: <strong>${record.purpose || 'Đảm bảo hoạt động ổn định hệ thống CNS'}</strong>
              </div>

              ${record.notes ? `<div style="font-size: 13.5px; margin-bottom: 5px;">Ghi chú: ${record.notes}</div>` : ''}

              ${record.status === 'RETURNED' ? `
                <div style="margin-top: 15px; padding: 10px; border: 1px solid #000; font-size: 13px; background-color: #f9f9f9;">
                  <strong>HỒ SƠ THU HỒI HOÀN KHO:</strong><br/>
                  - Ngày thu hồi: ${record.returnedDate || 'N/A'}<br/>
                  - Người tiếp nhận: ${record.returnedBy || 'N/A'}<br/>
                  - Số lượng đã hoàn kho: ${record.returnedQty || record.qty} ${record.unit || 'Bộ'}<br/>
                  - Tình trạng: ${record.returnNote || 'Tốt'}
                </div>
              ` : ''}

              <div class="footer-note">
                Biên bản này được lập thành hai bản, mỗi bên giữ một bản, các bản có giá trị như nhau.
              </div>

              <table class="signature-table">
                <tr>
                  <td>
                    <div class="sig-title">ĐẠI DIỆN BÊN GIAO</div>
                    <div class="sig-name">${record.giverName || ''}</div>
                  </td>
                  <td>
                    <div class="sig-title">ĐẠI DIỆN BÊN NHẬN</div>
                    <div class="sig-name">${record.receiverName || ''}</div>
                  </td>
                </tr>
              </table>
            </div>

            <script>window.onload = function() { window.print(); }<\/script>
          </body>
        </html>
      `);
      win.document.close();
      addToast(`Đã in biên bản bàn giao ${record.docNumber}!`, 'success');
    }
  };

  // Print all Dispatched Records Registry
  const handlePrintDispatchedRegistry = () => {
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép popup mới!', 'error');
      return;
    }

    const todayStr = new Date().toLocaleDateString('vi-VN');
    const rowsHtml = dispatchedRecords.map((r, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 12px;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-family: monospace; font-size: 11.5px; font-weight: bold;">${r.docNumber}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 12px; font-weight: bold;">${r.itemName}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-family: monospace; font-size: 11.5px; font-weight: bold;">${r.sn}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; font-weight: bold;">${r.qty} ${r.unit || 'Bộ'}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 11.5px;">${r.date}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 12px;">${r.receiverName} (${r.receiverDept || 'Tổ Vận Hành'})</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 11.5px;">${r.targetLocation || 'Hệ thống'}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 11.5px; font-weight: bold;">${r.status === 'DEPLOYED' ? 'ĐANG SỬ DỤNG' : 'ĐÃ THU HỒI'}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>SỔ TỔNG HỢP THEO DÕI THIẾT BỊ BÀN GIAO & SỬ DỤNG</title>
          <style>
            @page { size: A4 landscape; margin: 15mm 15mm 15mm 15mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.4; margin: 0; padding: 0; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .header-table td { border: none; vertical-align: top; }
            .title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
            .subtitle { text-align: center; font-size: 12px; font-style: italic; margin-bottom: 15px; }
            .table-main { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-main th { border: 1px solid #000; background-color: #f2f2f2; padding: 7px 4px; text-align: center; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .sig-section { width: 100%; border-collapse: collapse; margin-top: 30px; page-break-inside: avoid; }
            .sig-section td { border: none; width: 50%; text-align: center; vertical-align: top; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 45%; text-align: center;">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                <div style="font-size: 12px; font-weight: bold; text-transform: uppercase;"><u>TRUNG TÂM BẢO ĐẢM KỸ THUẬT</u></div>
              </td>
              <td style="width: 55%; text-align: center;">
                <div style="font-size: 11px; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style="font-size: 12px; font-weight: bold;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
                <div style="font-size: 12px; font-style: italic; margin-top: 4px;">Ngày trích xuất: ${todayStr}</div>
              </td>
            </tr>
          </table>

          <div class="title">SỔ TỔNG HỢP THEO DÕI THIẾT BỊ ĐÃ BÀN GIAO & ĐƯA VÀO SỬ DỤNG</div>
          <div class="subtitle">(Tổng số: ${dispatchedRecords.length} hồ sơ | Đang hoạt động ngoài hệ thống: ${dispatchedRecords.filter(r => r.status === 'DEPLOYED').length} thiết bị)</div>

          <table class="table-main">
            <thead>
              <tr>
                <th style="width: 35px;">STT</th>
                <th style="width: 90px;">Mã Số / Số PB</th>
                <th>Tên Thiết Bị / Vật Tư</th>
                <th style="width: 110px;">S/N</th>
                <th style="width: 65px;">Số Lượng</th>
                <th style="width: 80px;">Ngày Xuất</th>
                <th>Người / Đơn Vị Nhận</th>
                <th>Vị Trí Lắp Đặt / Sử Dụng</th>
                <th style="width: 95px;">Tình Trạng</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <table class="sig-section">
            <tr>
              <td>
                <div style="font-weight: bold; font-size: 12.5px; text-transform: uppercase;">NGƯỜI LẬP BÁO CÁO</div>
                <div style="font-size: 12px; font-style: italic; margin-top: 4px;">(Ký, ghi rõ họ tên)</div>
                <div style="font-weight: bold; font-size: 13px; margin-top: 70px;">${currentUsername ? `Kỹ sư ${currentUsername.toUpperCase()}` : 'Kỹ sư Quản lý Kho'}</div>
              </td>
              <td>
                <div style="font-weight: bold; font-size: 12.5px; text-transform: uppercase;">LÃNH ĐẠO PHÊ DUYỆT</div>
                <div style="font-size: 12px; font-style: italic; margin-top: 4px;">(Ký, ghi rõ họ tên)</div>
                <div style="font-weight: bold; font-size: 13px; margin-top: 70px;">ĐỘI TRƯỞNG</div>
              </td>
            </tr>
          </table>

          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast('Đã khởi tạo in Sổ Theo Dõi Bàn Giao & Sử Dụng!', 'success');
  };

  return (
    <div className="min-h-screen bg-[#D2D3D6] dark:bg-[#1E2430] text-slate-100 flex flex-col antialiased">
      {/* Toast notifications */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-5 py-4 rounded-2xl shadow-xl text-white font-medium text-sm flex items-start gap-3 border border-white/10 animate-slide-in transition-all duration-300 ${
              t.type === 'success' ? 'bg-emerald-600 dark:bg-emerald-700' :
              t.type === 'error' ? 'bg-rose-600 dark:bg-rose-700' : 'bg-slate-800 dark:bg-slate-900'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
            {t.type === 'info' && <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Print templates */}
      <PrintTemplates printLayout={printLayout} inventory={inventory} />

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[90000] p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 text-center animate-scale-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-rose-100 dark:border-rose-900/30">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-2xl text-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-rose-600/20 transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOT LOGGED IN SCREEN */}
      {!role ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#1E2430] dark:bg-[#1E2430]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 px-8 py-10 sm:px-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">KHO CNS & ATM</h1>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2.5 uppercase tracking-widest">
                Đội Thông Tin Hàng Không
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase ml-1">
                  Tài khoản đăng nhập
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                    placeholder="Nhập 'admin' hoặc 'guest'"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase ml-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                    placeholder="Mật khẩu tương ứng"
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-xs font-medium border border-rose-100 dark:border-rose-900/40">
                  {loginError}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-5">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all text-sm tracking-wide active:scale-[0.98] cursor-pointer"
                >
                  ĐĂNG NHẬP HỆ THỐNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('admin');
                    setCurrentUsername('admin');
                    localStorage.setItem('cns_session_active', 'admin');
                    localStorage.setItem('cns_current_username', 'admin');
                    addToast('Đã vào hệ thống với quyền Quản trị viên (Super Admin).', 'success');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2.5 rounded-2xl transition-all text-xs cursor-pointer"
                >
                  Bỏ qua & Vào ngay với quyền Super Admin
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <p className="font-bold">Gợi ý đăng nhập mặc định:</p>
              <p className="mt-1">Super Admin: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">admin / admin</span> • Kiểm kê: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">guest / 123456</span></p>
              <p className="mt-1 text-[9.5px] italic text-amber-600 dark:text-amber-400 font-semibold">* Tài khoản Admin có quyền thêm, sửa, xóa, khóa/mở khóa & phân quyền người dùng</p>
            </div>
          </div>
        </div>
      ) : (
        /* MODERN ENTERPRISE DASHBOARD LAYOUT */
        <div className="min-h-screen bg-[#1E2430] dark:bg-[#1E2430] text-slate-100 dark:text-[#F8FAFC] flex flex-col md:flex-row w-full font-sans antialiased">
          {/* Left Sidebar */}
          <aside className="w-full md:w-72 bg-white dark:bg-[#131B2E] border-r border-[#E2E8F0] dark:border-slate-800 flex flex-col shrink-0">
            {/* Sidebar Brand Header */}
            <div className="p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <Database className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white truncate">CNS/ATM</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Đội Thông Tin • Bảo Đảm Kỹ Thuật</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 px-3 py-1 tracking-wider">Hệ Thống Chính</div>
              
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('INVENTORY')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWorkspaceTab === 'INVENTORY'
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-4.5 h-4.5" />
                <span className="flex-1 text-left">Kho Vật Tư Dự Phòng Tại Chỗ Đội TT</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeWorkspaceTab === 'INVENTORY' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {inventory.length}
                </span>
              </button>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={handleOpenAddNewModal}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#2563EB] dark:text-blue-400 bg-blue-50/50 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 transition-colors cursor-pointer border border-blue-200/80 dark:border-blue-900/60"
                  title="Mở form thêm mới thiết bị vào kho"
                >
                  <PlusCircle className="w-4.5 h-4.5 text-[#2563EB] dark:text-blue-400" />
                  <span className="flex-1 text-left font-black">Thêm Mới Thiết Bị</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('DISPATCHED')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWorkspaceTab === 'DISPATCHED'
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-4.5 h-4.5" />
                <span className="flex-1 text-left">Thiết Bị Bàn Giao & Sử Dụng</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeWorkspaceTab === 'DISPATCHED' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {dispatchedRecords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('AUDIT_LOG')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWorkspaceTab === 'AUDIT_LOG'
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4.5 h-4.5" />
                <span className="flex-1 text-left">Nhật Ký Kiểm Toán (Logs)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeWorkspaceTab === 'AUDIT_LOG' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {auditLogs.length}
                </span>
              </button>

              <div className="pt-4 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 px-3 py-1 tracking-wider">Tiện Ích & Quản Trị</div>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setIsAdminAccountModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                >
                  <Crown className="w-4.5 h-4.5 text-[#F59E0B]" />
                  <span className="flex-1 text-left">Quản Trị Người Dùng & Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <Settings className="w-4.5 h-4.5 text-slate-400" />
                <span className="flex-1 text-left">Cấu Hình GAS & Cloud Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4.5 h-4.5 text-[#2563EB]" />
                <span className="flex-1 text-left">Cài App Mobile (PWA)</span>
              </button>
            </nav>

            {/* Sidebar Footer Profile */}
            <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                  {role === 'admin' ? <Crown className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {users.find(u => u.username.toLowerCase() === currentUsername.toLowerCase())?.fullName || currentUsername}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    {role === 'admin' ? 'Super Admin' : 'Kiểm kê viên'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Enterprise Header */}
            <header className="bg-white dark:bg-[#131B2E] border-b border-[#E2E8F0] dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    {activeWorkspaceTab === 'INVENTORY' ? 'Kho Dự Phòng Tại Chỗ' : activeWorkspaceTab === 'DISPATCHED' ? 'Sổ Bàn Giao Thiết Bị' : 'Nhật Ký Hệ Thống'}
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-900 hidden sm:inline">
              
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Đội Thông Tin  • Trung Tâm Bảo Đảm Kỹ Thuật
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Advanced Local-First Cloud Auto-Sync Indicator & Popover */}
                <SyncStatusIndicator
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenConflictModal={() => setIsConflictModalOpen(true)}
                />

                {/* Low Stock Warning Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLowStockDropdownOpen(!isLowStockDropdownOpen)}
                    className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                      lowStockItems.length > 0
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-50 dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 text-slate-400'
                    }`}
                    title="Cảnh báo an toàn tồn kho"
                  >
                    <AlertTriangle className={`w-4.5 h-4.5 ${lowStockItems.length > 0 ? 'animate-bounce text-[#F59E0B]' : ''}`} />
                    {lowStockItems.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#DC2626] text-white rounded-full text-[9.5px] font-black flex items-center justify-center shadow-sm">
                        {lowStockItems.length}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isLowStockDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[9999] animate-scale-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Cảnh Báo Tồn Kho (≤ 1 bộ)
                          </h4>
                        </div>
                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {lowStockItems.length} mã
                        </span>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar my-2 divide-y divide-slate-100 dark:divide-slate-800">
                        {lowStockItems.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-400">Tất cả thiết bị đều an toàn (&gt; 1 cái).</p>
                        ) : (
                          lowStockItems.map(item => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                                <p className="text-[9.5px] text-slate-400 font-mono">S/N: {item.sn}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemDetail(item);
                                  setIsLowStockDropdownOpen(false);
                                }}
                                className="px-2 py-1 bg-blue-50 text-[#2563EB] hover:bg-blue-100 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Xem
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Drive Quick Action */}
                <button
                  onClick={() => setIsGoogleDriveModalOpen(true)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-[#E2E8F0] dark:border-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all cursor-pointer"
                  title="Sao Lưu & Đồng Bộ Google Drive"
                >
                  <HardDrive className="w-4.5 h-4.5" />
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Đổi giao diện Sáng / Tối"
                >
                  {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
                </button>
              </div>
            </header>

            {/* Dashboard Content Body */}
            <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">


          {activeWorkspaceTab === 'DISPATCHED' ? (
            /* DISPATCHED & DEPLOYED REGISTRY TABLE VIEW */
            <div className="mt-6">
              <DeployedRegistryTable
                records={dispatchedRecords}
                role={role}
                onViewDetail={(record) => setSelectedDispatchedDetail(record)}
                onReturnRecord={(record) => setSelectedDispatchedForReturn(record)}
                onDeleteRecord={handleDeleteDispatchedRecord}
                onPrintRecord={handlePrintDispatchedRecord}
                onPrintRegistry={handlePrintDispatchedRegistry}
                onCreateUsageSlip={() => {
                  if (inventory.length > 0) {
                    setSelectedItemForUsage(inventory[0]);
                  } else {
                    addToast('Kho vật tư chưa có thiết bị để xuất sử dụng!', 'error');
                  }
                }}
                onCreateHandoverDoc={() => {
                  setIsHandoverModalOpen(true);
                  if (handoverRows.length === 0 && inventory.length > 0) {
                    const initialRows: HandoverRow[] = inventory.slice(0, 1).map(item => ({
                      id: item.id,
                      name: item.name,
                      unit: 'Cái',
                      qty: 1,
                      quality: 'Tốt (Mới 100%)',
                      specs: `${item.pn ? 'P/N: ' + item.pn + '. ' : ''}Quy cách chuẩn`,
                      sn: item.sn,
                      note: ''
                    }));
                    setHandoverRows(initialRows);
                  }
                }}
              />
            </div>
          ) : activeWorkspaceTab === 'AUDIT_LOG' ? (
            /* SYSTEM AUDIT LOG WORKSPACE VIEW */
            <div className="mt-6">
              <SystemAuditLogView
                logs={auditLogs}
                role={role}
                currentUsername={currentUsername || 'guest'}
                onClearLogs={handleClearAuditLogs}
                onAddToast={addToast}
              />
            </div>
          ) : (
            /* STANDARD INVENTORY WORKSPACE VIEW */
            <>
              {/* Stats Cards and Charts */}
              <div className="mt-6">
            <StatsCards
              stats={stats}
              inventory={inventory}
              onFilterLowStock={() => setStatusFilter('LOW_STOCK')}
            />
          </div>

          {/* Search and Action Toolbar */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4.5 sm:p-5 mt-6 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shadow-sm">
            <div className="relative w-full xl:w-[420px]">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm: Tên thiết bị, P/N, S/N, Mã Kho..."
                className="w-full pl-12 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm sm:text-base font-medium placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800 p-1 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => fetchCloudData()}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 px-3.5 text-xs font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
                  title="Tải cấu trúc từ đám mây về"
                >
                  <RefreshCw className={`w-4 h-4 text-indigo-500 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  Tải Về (PULL)
                </button>
                <button
                  onClick={syncToCloud}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 px-3.5 text-xs font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
                  title="Đẩy dữ liệu hiện có lên Cloud"
                >
                  Đẩy Lên (PUSH)
                </button>
              </div>

              <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 hidden xl:block mx-1"></div>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={handleOpenAddNewModal}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold py-3 px-5 rounded-2xl shadow-md shadow-blue-500/25 transition-all text-xs sm:text-sm tracking-wide cursor-pointer"
                  title="Mở biểu mẫu thêm mới thiết bị vào kho"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  THÊM THIẾT BỊ
                </button>
              )}

              <button
                onClick={() => {
                  setScanTargetItem(null);
                  setIsScannerOpen(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-5 rounded-2xl shadow-md shadow-indigo-600/15 transition-all text-xs sm:text-sm tracking-wide cursor-pointer"
              >
                <Camera className="w-4.5 h-4.5 animate-pulse" />
                KIỂM KÊ (QUÉT)
              </button>

              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => handleOpenPrintCenter('QR')}
                  className="p-2 px-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 transition-all text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Mở xem trước & In bảng mã QR định danh"
                >
                  <Printer className="w-4 h-4 text-indigo-500" />
                  MÃ QR
                </button>
                <button
                  onClick={() => handleOpenPrintCenter('LABEL')}
                  className="p-2 px-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 transition-all text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Mở xem trước & In tem nhãn kỹ thuật"
                >
                  <Tag className="w-4 h-4 text-indigo-500" />
                  TEM NHÃN
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200/50 dark:border-slate-700/50 flex-wrap sm:flex-nowrap">
                <button
                  onClick={handleExportExcel}
                  className="p-2 px-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-emerald-700 dark:text-emerald-400 transition-all text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Xuất bảng Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  EXCEL
                </button>
                <button
                  onClick={() => handleOpenPrintCenter('AUDIT_REPORT')}
                  className="p-2 px-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-indigo-700 dark:text-indigo-400 transition-all text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="In Biên bản kiểm kê chuẩn form hành chính"
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  BIÊN BẢN
                </button>
                <button
                  onClick={() => {
                    setIsHandoverModalOpen(true);
                    if (handoverRows.length === 0 && inventory.length > 0) {
                      const initialRows: HandoverRow[] = inventory.slice(0, 1).map(item => ({
                        id: item.id,
                        name: item.name,
                        unit: 'Cái',
                        qty: 1,
                        quality: 'Tốt (Mới 100%)',
                        specs: `${item.pn ? 'P/N: ' + item.pn + '. ' : ''}Quy cách chuẩn`,
                        sn: item.sn,
                        note: ''
                      }));
                      setHandoverRows(initialRows);
                    }
                  }}
                  className="p-2 px-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-rose-700 dark:text-rose-400 transition-all text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-2.5 shadow-xs"
                  title="Lập Biên Bản Bàn Giao thiết bị"
                >
                  <ArrowRightLeft className="w-4 h-4 text-rose-500" />
                  BB BÀN GIAO
                </button>
                <button
                  onClick={() => setIsUsageHistoryOpen(true)}
                  className="p-2 px-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-amber-700 dark:text-amber-400 transition-all text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-2.5 shadow-xs"
                  title="Xem lịch sử phiếu báo sử dụng"
                >
                  <History className="w-4 h-4 text-amber-500" />
                  PHIẾU SỬ DỤNG ({usageSlips.length})
                </button>
              </div>
            </div>
          </section>

          {/* Filter Pills */}
          <div className="mt-6 flex flex-col xl:flex-row gap-5 items-start xl:items-stretch">
            <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4.5 shadow-sm flex flex-wrap gap-2 items-center">
              <span className="text-xs uppercase font-black text-slate-400 tracking-wider mr-2 ml-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-500" /> Phân Loại:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="w-full xl:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4.5 shadow-sm flex flex-wrap gap-2 items-center">
              <span className="text-xs uppercase font-black text-slate-400 tracking-wider mr-2 ml-1">
                Kiểm kê:
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 text-xs sm:text-sm font-extrabold flex-wrap sm:flex-nowrap gap-1">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter('OK')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${statusFilter === 'OK' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'}`}
                >
                  Tốt / Đủ ({inventory.filter(i => i.auditStatus === 'OK').length})
                </button>
                <button
                  onClick={() => setStatusFilter('MISSING')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${statusFilter === 'MISSING' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'}`}
                >
                  Thiếu / Hỏng ({inventory.filter(i => i.auditStatus === 'MISSING').length})
                </button>
                <button
                  onClick={() => setStatusFilter('UNCHECKED')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${statusFilter === 'UNCHECKED' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                >
                  Chưa kiểm ({inventory.filter(i => i.auditStatus === null).length})
                </button>
                <button
                  onClick={() => setStatusFilter('LOW_STOCK')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'LOW_STOCK'
                      ? 'bg-amber-500 text-white shadow-sm font-black'
                      : lowStockItems.length > 0
                      ? 'text-amber-600 dark:text-amber-400 font-extrabold hover:bg-amber-100/80 dark:hover:bg-amber-950/50'
                      : 'text-slate-500'
                  }`}
                  title="Lọc các thiết bị có số lượng <= 1 bộ"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Sắp hết ({lowStockItems.length})
                </button>
              </div>
            </div>
          </div>

          {/* Main Inventory Table & Actions */}
          <div className="mt-6">
            {role !== 'admin' && (
              <div className="mb-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Chế độ Kiểm kê viên (Guest): <span className="font-normal text-slate-600 dark:text-slate-400">Bạn có toàn quyền tra cứu, quét mã QR/mã vạch kiểm kê hiện vật và xuất báo cáo PDF/Excel.</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <InventoryTable
              filteredInventory={filteredInventory}
              role={role}
              onResetAuditStatus={handleResetAuditStatus}
              onQuickAuditStatus={handleQuickStatusClick}
              onSelectDetail={(item) => setSelectedItemDetail(item)}
              onOpenUsage={(item) => {
                setSelectedItemForUsage(item);
              }}
              onEditItem={handleEditClick}
              onDeleteItem={handleDeleteClick}
              onOpenScanTarget={(item) => {
                setScanTargetItem(item);
                setIsScannerOpen(true);
                playScanBeep(1000, 0.1);
              }}
              onExportCsv={handleExportCsv}
              onAddNewItem={handleOpenAddNewModal}
            />
          </div>
            </>
          )}
            </main>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScanTargetItem(null);
        }}
        inventory={inventory}
        scanTargetItem={scanTargetItem}
        onScanned={handleScannedCode}
      />

      {/* Item Form Modal (Add & Edit) */}
      <ItemFormModal
        isOpen={isItemFormModalOpen}
        onClose={() => {
          setIsItemFormModalOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        categories={categories}
        onSaveCategory={(newCat) => {
          const updated = [...categories, newCat];
          saveCategoriesLocally(updated);
          addToast(`Đã thêm loại: ${newCat}`, 'success');
          playScanBeep(1000, 0.1);
        }}
        onSubmit={handleItemFormSubmit}
      />

      {/* Item Detail Drawer */}
      <ItemDetailDrawer
        item={selectedItemDetail}
        role={role}
        onClose={() => setSelectedItemDetail(null)}
        onEdit={(item) => {
          setSelectedItemDetail(null);
          handleEditClick(item);
        }}
        onUsage={(item) => setSelectedItemForUsage(item)}
        onPrintQr={(item) => {
          setPrintLayout('QR');
          setIsPrintPreviewOpen(true);
        }}
        onPrintLabel={(item) => {
          setPrintLayout('LABEL');
          setIsPrintPreviewOpen(true);
        }}
      />

      {/* Usage Slips Modal */}
      <UsageModal
        selectedItemForUsage={selectedItemForUsage}
        isUsageHistoryOpen={isUsageHistoryOpen}
        usageSlips={usageSlips}
        role={role}
        onCloseUsageForm={() => setSelectedItemForUsage(null)}
        onCloseHistory={() => setIsUsageHistoryOpen(false)}
        onSubmitUsage={handleSubmitUsage}
        onDeleteSlip={(slipId) => {
          const remaining = usageSlips.filter(s => s.id !== slipId);
          setUsageSlips(remaining);
          localStorage.setItem('cns_usage_slips_v1', JSON.stringify(remaining));
          addToast('Đã xóa phiếu báo sử dụng.', 'success');
        }}
        onClearHistory={() => {
          setUsageSlips([]);
          localStorage.removeItem('cns_usage_slips_v1');
          addToast('Đã xóa trắng lịch sử phiếu sử dụng.', 'info');
        }}
        onPrintSlip={handlePrintUsageSlip}
      />

      {/* Handover Certificate Modal */}
      <HandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        inventory={inventory}
        handoverNo={handoverNo}
        setHandoverNo={setHandoverNo}
        handoverLocation={handoverLocation}
        setHandoverLocation={setHandoverLocation}
        handoverDay={handoverDay}
        setHandoverDay={setHandoverDay}
        handoverMonth={handoverMonth}
        setHandoverMonth={setHandoverMonth}
        handoverYear={handoverYear}
        setHandoverYear={setHandoverYear}
        handoverReason={handoverReason}
        setHandoverReason={setHandoverReason}
        handoverGiverDept={handoverGiverDept}
        setHandoverGiverDept={setHandoverGiverDept}
        handoverGiverName={handoverGiverName}
        setHandoverGiverName={setHandoverGiverName}
        handoverGiverPos={handoverGiverPos}
        setHandoverGiverPos={setHandoverGiverPos}
        handoverReceiverDept={handoverReceiverDept}
        setHandoverReceiverDept={setHandoverReceiverDept}
        handoverReceiverName={handoverReceiverName}
        setHandoverReceiverName={setHandoverReceiverName}
        handoverReceiverPos={handoverReceiverPos}
        setHandoverReceiverPos={setHandoverReceiverPos}
        handoverRows={handoverRows}
        setHandoverRows={setHandoverRows}
        onPrintHandover={handlePrintOfficialHandover}
        onSaveHandoverToRegistry={handleSaveHandoverToRegistry}
        onAddToast={addToast}
      />

      {/* Return Dispatched Equipment To Stock Modal */}
      <ReturnStockModal
        isOpen={!!selectedDispatchedForReturn}
        onClose={() => setSelectedDispatchedForReturn(null)}
        record={selectedDispatchedForReturn}
        onConfirmReturn={handleConfirmReturnStock}
      />

      {/* Dispatched Record Detail Modal */}
      <DispatchedDetailModal
        isOpen={!!selectedDispatchedDetail}
        onClose={() => setSelectedDispatchedDetail(null)}
        record={selectedDispatchedDetail}
        role={role}
        onReturn={(rec) => {
          setSelectedDispatchedDetail(null);
          setSelectedDispatchedForReturn(rec);
        }}
        onPrint={(rec) => handlePrintDispatchedRecord(rec)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        syncConfig={syncConfig}
        setSyncConfig={setSyncConfig}
        storageConfig={storageConfig}
        setStorageConfig={setStorageConfig}
        syncStatus={syncStatus}
        syncStatusDetail={syncStatusDetail}
        categories={categories}
        saveCategoriesLocally={saveCategoriesLocally}
        onPullCloud={() => fetchCloudData()}
        onPushCloud={syncToCloud}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onManualSaveLocalStorage={handleManualSaveLocalStorage}
        onResetToDefault={handleResetToDefault}
        itemCount={inventory.length}
        usageCount={usageSlips.length}
        onOpenGoogleDriveModal={() => setIsGoogleDriveModalOpen(true)}
        onAddToast={addToast}
      />

      {/* Google Drive Backup & Sync Modal */}
      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        inventory={inventory}
        dispatchedRecords={dispatchedRecords}
        onRestoreFromBackup={(data) => {
          if (data.inventory && data.inventory.length > 0) {
            setInventory(data.inventory);
            saveInventoryLocally(data.inventory);
          }
          if (data.dispatchedRecords && data.dispatchedRecords.length > 0) {
            setDispatchedRecords(data.dispatchedRecords);
            LocalDatabase.saveDispatchedRecords(data.dispatchedRecords);
          }
        }}
        onAddToast={addToast}
      />

      {/* Admin Account & Security Center Modal */}
      <AdminAccountModal
        isOpen={isAdminAccountModalOpen}
        onClose={() => setIsAdminAccountModalOpen(false)}
        inventory={inventory}
        onRestoreSnapshot={(restoredItems) => saveInventoryLocally(restoredItems)}
        onAddToast={addToast}
        onLogout={handleLogout}
        users={users}
        onUpdateUsers={handleUpdateUsers}
        currentUsername={currentUsername || 'admin'}
        onOpenAuditLog={() => setIsAuditLogModalOpen(true)}
      />

      {/* System Audit Log Center Modal */}
      <SystemAuditLogModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
        logs={auditLogs}
        role={role}
        currentUsername={currentUsername || 'guest'}
        onClearLogs={handleClearAuditLogs}
        onAddToast={addToast}
      />

      {/* Print Preview & Options Center Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => {
          setIsPrintPreviewOpen(false);
          setPrintLayout('NONE');
        }}
        inventory={inventory}
        filteredInventory={filteredInventory}
        stats={stats}
        currentUsername={users.find(u => u.username.toLowerCase() === currentUsername?.toLowerCase())?.fullName || currentUsername || 'Kiểm kê viên'}
        onAddToast={addToast}
      />

      {/* Printable Area: rendered in DOM for standard browser @media print */}
      <PrintTemplates
        printLayout={printLayout}
        inventory={filteredInventory.length > 0 ? filteredInventory : inventory}
        stats={stats}
        inspectorName={users.find(u => u.username.toLowerCase() === currentUsername?.toLowerCase())?.fullName || 'Kỹ sư trực ban Đội TT'}
      />

      {/* Mobile Bottom Navigation Dock */}
      {role && (
        <MobileAppDock
          currentTab={mobileTab}
          onSelectTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'inventory') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (tab === 'stats') {
              const el = document.getElementById('stats-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }
            } else if (tab === 'reports') {
              handleOpenPrintCenter('AUDIT_REPORT');
            } else if (tab === 'admin') {
              if (role === 'admin') {
                setIsAdminAccountModalOpen(true);
              } else {
                setIsSettingsOpen(true);
              }
            }
          }}
          onOpenScanner={() => {
            setScanTargetItem(null);
            setIsScannerOpen(true);
            playScanBeep(1000, 0.1);
          }}
          lowStockCount={lowStockItems.length}
          missingCount={stats.missingCount}
          role={role}
        />
      )}

      {/* Conflict Resolution Modal for Cloud vs Local Concurrency */}
      <ConflictResolutionModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        onResolved={handleConflictResolved}
        onAddToast={addToast}
      />

      {/* Mobile PWA Installation Modal */}
      <MobileAppInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
