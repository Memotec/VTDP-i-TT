import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import {
  QrCode, Search, Database, RefreshCw, Edit,
  User, Lock, LogOut, Sun, Moon, FileSpreadsheet, Printer,
  CheckCircle2, XCircle, AlertCircle, X, History, Settings, Camera, Check, Filter,
  FileText, ArrowRightLeft, Layers, Crown, AlertTriangle,
  Smartphone, Download, Tag, Activity, PlusCircle, HardDrive, ChevronDown, FileDown, FileCode, Cloud
} from 'lucide-react';

import { InventoryItem, SyncConfig, StorageConfig, Role, AuditStats, AuditHistoryEntry, UsageSlip, UserAccount, DispatchedRecord, SystemAuditLogEntry, AuditActionType, DataSourceOrigin } from './types.ts';
import { INITIAL_INVENTORY, CATEGORIES, INITIAL_DISPATCHED_RECORDS } from './initialData.ts';
import { playScanBeep } from './utils/audio.ts';
import { PrintTemplates } from './components/PrintTemplates.tsx';
import type { PrintMode } from './components/PrintPreviewModal.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import type { HandoverRow } from './components/HandoverModal.tsx';
import { InventoryTable } from './components/InventoryTable.tsx';
import { MobileAppDock, MobileTab } from './components/MobileAppDock.tsx';
import { MobileAppHeader } from './components/MobileAppHeader.tsx';
import { MobileDrawerMenu } from './components/MobileDrawerMenu.tsx';
import { MobileInstallBanner } from './components/MobileInstallBanner.tsx';
import { usePWAInstall } from './hooks/usePWAInstall.ts';
import { DeployedRegistryTable } from './components/DeployedRegistryTable.tsx';
import { getAccessToken, googleSignIn } from './services/authService.ts';
import { uploadToDrive } from './services/googleDriveService.ts';
import { LocalDatabase } from './database/localDatabase.ts';
import { syncService } from './services/syncService.ts';
import { CloudService } from './services/cloudService.ts';
import { SyncStatusIndicator } from './components/SyncStatusIndicator.tsx';
import { ConflictItem } from './types.ts';
import { findMatchingInventoryItems } from './utils/qrParser.ts';
import { safePrintHtml, exportInventoryReportToPDF } from './utils/pdfExporter.ts';
import { exportInventoryReportToGoogleDoc } from './services/googleDocsService.ts';
import {
  testFirestoreConnection,
  batchSaveInventoryToFirestore,
  saveInventoryItemToFirestore,
  deleteInventoryItemFromFirestore,
  saveDispatchedRecordToFirestore,
  saveAuditLogToFirestore,
  saveCategoriesToFirestore,
  subscribeToInventory,
  subscribeToDispatchedRecords,
  subscribeToAuditLogs,
  getInventoryFromFirestore,
  getDispatchedRecordsFromFirestore
} from './services/firebaseFirestoreService.ts';

// Lazy-loaded modals and tabs for bundle size optimization and high performance
const AppsScriptFixModal = React.lazy(() => import('./components/AppsScriptFixModal.tsx').then(m => ({ default: m.AppsScriptFixModal })));
const PrintPreviewModal = React.lazy(() => import('./components/PrintPreviewModal.tsx').then(m => ({ default: m.PrintPreviewModal })));
const ScannerModal = React.lazy(() => import('./components/ScannerModal.tsx').then(m => ({ default: m.ScannerModal })));
const ItemDetailDrawer = React.lazy(() => import('./components/ItemDetailDrawer.tsx').then(m => ({ default: m.ItemDetailDrawer })));
const UsageModal = React.lazy(() => import('./components/UsageModal.tsx').then(m => ({ default: m.UsageModal })));
const HandoverModal = React.lazy(() => import('./components/HandoverModal.tsx').then(m => ({ default: m.HandoverModal })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal.tsx').then(m => ({ default: m.SettingsModal })));
const GoogleDriveModal = React.lazy(() => import('./components/GoogleDriveModal.tsx').then(m => ({ default: m.GoogleDriveModal })));
const GoogleDocsModal = React.lazy(() => import('./components/GoogleDocsModal.tsx').then(m => ({ default: m.GoogleDocsModal })));
const AdminAccountModal = React.lazy(() => import('./components/AdminAccountModal.tsx').then(m => ({ default: m.AdminAccountModal })));
const MobileAppInstallModal = React.lazy(() => import('./components/MobileAppInstallModal.tsx').then(m => ({ default: m.MobileAppInstallModal })));
const ReturnStockModal = React.lazy(() => import('./components/ReturnStockModal.tsx').then(m => ({ default: m.ReturnStockModal })));
const DispatchedDetailModal = React.lazy(() => import('./components/DispatchedDetailModal.tsx').then(m => ({ default: m.DispatchedDetailModal })));
const SystemAuditLogView = React.lazy(() => import('./components/SystemAuditLogView.tsx').then(m => ({ default: m.SystemAuditLogView })));
const SystemAuditLogModal = React.lazy(() => import('./components/SystemAuditLogModal.tsx').then(m => ({ default: m.SystemAuditLogModal })));
const ItemFormModal = React.lazy(() => import('./components/ItemFormModal.tsx').then(m => ({ default: m.ItemFormModal })));
const ConflictResolutionModal = React.lazy(() => import('./components/ConflictResolutionModal.tsx').then(m => ({ default: m.ConflictResolutionModal })));
const PublicItemLookupModal = React.lazy(() => import('./components/PublicItemLookupModal.tsx').then(m => ({ default: m.PublicItemLookupModal })));
const ItemQrCodeModal = React.lazy(() => import('./components/ItemQrCodeModal.tsx').then(m => ({ default: m.ItemQrCodeModal })));


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
  // Inventory state - initialized directly from LocalDatabase to prevent empty state flash
  const [inventory, setInventory] = useState<InventoryItem[]>(() => LocalDatabase.getInventory());
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
  const [isLowStockDropdownOpen, setIsLowStockDropdownOpen] = useState(false);

  // Categories list
  const [categories, setCategories] = useState<string[]>(() => LocalDatabase.getCategories());

  // Item form modal state
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [initialAddSn, setInitialAddSn] = useState<string>('');
  const [initialAddWarehouse, setInitialAddWarehouse] = useState<string>('');

  // Modals & Drawers state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanTargetItem, setScanTargetItem] = useState<InventoryItem | null>(null);
  const [isPublicLookupOpen, setIsPublicLookupOpen] = useState(false);
  const [publicLookupCode, setPublicLookupCode] = useState('');
  const [publicLookupItem, setPublicLookupItem] = useState<InventoryItem | null>(null);
  const [isItemQrModalOpen, setIsItemQrModalOpen] = useState(false);
  const [selectedItemForQrModal, setSelectedItemForQrModal] = useState<InventoryItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminAccountModalOpen, setIsAdminAccountModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);
  const [selectedItemForUsage, setSelectedItemForUsage] = useState<InventoryItem | null>(null);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);
  const [isAppsScriptFixOpen, setIsAppsScriptFixOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>(() => LocalDatabase.getConflicts());
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isGoogleDocsModalOpen, setIsGoogleDocsModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [activePrintMode, setActivePrintMode] = useState<PrintMode>('QR');
  const [mobileTab, setMobileTab] = useState<MobileTab>('inventory');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'INVENTORY' | 'DISPATCHED' | 'AUDIT_LOG'>('INVENTORY');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { isInstallable: pwaInstallable, isInstalled: pwaInstalled, installPwa } = usePWAInstall();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // System Audit Log state
  const [auditLogs, setAuditLogs] = useState<SystemAuditLogEntry[]>(() => LocalDatabase.getAuditLogs());
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);

  // Dispatched & Deployed Equipment Registry state
  const [dispatchedRecords, setDispatchedRecords] = useState<DispatchedRecord[]>(() => LocalDatabase.getDispatchedRecords());
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
  const [usageSlips, setUsageSlips] = useState<UsageSlip[]>(() => LocalDatabase.getUsageSlips());

  // Cloud Sync configurations
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwPYEY6_0ng5msNsNrddYbvkYKx3NNIDWWNbxDxCwkMw0GdtCYEMFsE0hfJVROWsVcs/exec';
    const savedUrl = localStorage.getItem('cns_sync_url');
    const savedAutoSync = localStorage.getItem('cns_auto_sync');
    const savedAutoSync30s = localStorage.getItem('cns_auto_sync_30s');
    const savedAutoSyncInterval = localStorage.getItem('cns_auto_sync_interval');
    const savedAutoLoad = localStorage.getItem('cns_auto_load_startup');
    
    let targetUrl = DEFAULT_GAS_URL;
    if (savedUrl && savedUrl.trim() && !savedUrl.includes('AKfycby4frQYvyEuzbVS7rctYDaxHDhSlEzNmTgYXavWzi0ROJLYEqhfwBd1QRX4v6dVU05f')) {
      targetUrl = savedUrl.trim();
    } else {
      localStorage.setItem('cns_sync_url', DEFAULT_GAS_URL);
    }

    return {
      webAppUrl: targetUrl,
      autoSync: savedAutoSync !== 'false', // Enabled bidirectional auto-sync
      autoSync30s: savedAutoSync30s !== 'false', // Default: true for 30s auto Google Sheet pull
      autoSyncInterval: savedAutoSyncInterval ? Number(savedAutoSyncInterval) : 30, // Default 30s
      autoLoadOnStartup: savedAutoLoad !== 'false',
      lastSynced: undefined
    };
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncStatusDetail, setSyncStatusDetail] = useState('');
  const [dataSourceOrigin, setDataSourceOrigin] = useState<DataSourceOrigin>('cloud_loading');
  const [isCloudFirstLoading, setIsCloudFirstLoading] = useState<boolean>(true);
  const [cloudFirstError, setCloudFirstError] = useState<string | null>(null);
  const [showFallbackBanner, setShowFallbackBanner] = useState<boolean>(true);

  const handleConflictResolved = (conflictId: string, choice: 'keep_local' | 'keep_cloud', resolvedItem: InventoryItem) => {
    const updatedInv = inventory.map(item => item.id === resolvedItem.id ? resolvedItem : item);
    saveInventoryLocally(updatedInv);
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  };

  const handleResolveAllConflicts = (choice: 'keep_local' | 'keep_cloud') => {
    const updated = syncService.resolveAllConflicts(choice);
    setInventory(updated);
    LocalDatabase.saveInventory(updated);
    setConflicts([]);
    setIsConflictModalOpen(false);
  };

  const handleClearAllConflicts = () => {
    syncService.clearConflicts();
    setConflicts([]);
    setIsConflictModalOpen(false);
  };

  // LocalStorage Auto-Save & Data Loss Prevention Configuration
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(() => {
    const savedInterval = localStorage.getItem('cns_autosave_interval');
    const savedWarn = localStorage.getItem('cns_autosave_warn_close');
    const savedShowToast = localStorage.getItem('cns_autosave_show_toast');
    const savedTime = localStorage.getItem('cns_last_saved_time');
    const savedAutoBackup24h = localStorage.getItem('cns_auto_backup_24h');
    const savedLastAutoBackup = localStorage.getItem('cns_last_auto_backup_timestamp');
    const savedAutoDriveBackup = localStorage.getItem('cns_auto_drive_backup');
    const savedLastDriveBackup = localStorage.getItem('cns_last_drive_backup_timestamp');
    return {
      autoSaveInterval: savedInterval !== null ? Number(savedInterval) : 0, // default 0: realtime
      warnOnClose: savedWarn !== 'false', // default: true
      showAutoSaveToast: savedShowToast === 'true', // default: false
      lastSavedTime: savedTime || undefined,
      autoBackup24h: savedAutoBackup24h !== 'false', // default: true
      lastAutoBackupTime: savedLastAutoBackup ? Number(savedLastAutoBackup) : undefined,
      autoDriveBackup: savedAutoDriveBackup !== 'false', // default: true
      lastDriveBackupTime: savedLastDriveBackup ? Number(savedLastDriveBackup) : undefined,
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

  const handleAddNewWithCode = useCallback((code: string) => {
    setIsScannerOpen(false);
    setEditingItem(null);
    const clean = code.trim().toUpperCase();
    if (/^(KHO|MA|CNS|WH|BIN|RACK|SHELF)/i.test(clean) || clean.includes('KHO')) {
      setInitialAddWarehouse(clean);
      setInitialAddSn('');
    } else {
      setInitialAddSn(clean);
      setInitialAddWarehouse('');
    }
    setIsItemFormModalOpen(true);
    addToast(`Đã mở biểu mẫu thêm mới thiết bị với mã "${code}"`, 'info');
  }, [addToast]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [printLayout, setPrintLayout] = useState<'NONE' | 'QR' | 'LABEL'>('NONE');
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExportingInventoryPdf, setIsExportingInventoryPdf] = useState(false);
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

  // Public QR Code Lookup: Detect URL query parameters (?lookup=... / ?qr=... / ?item=... / ?sn=... / ?code=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkUrlLookupParam = () => {
      try {
        const url = new URL(window.location.href);
        const lookupParam = url.searchParams.get('lookup') ||
                            url.searchParams.get('qr') ||
                            url.searchParams.get('item') ||
                            url.searchParams.get('code') ||
                            url.searchParams.get('sn') ||
                            url.searchParams.get('warehouse');

        if (lookupParam && lookupParam.trim()) {
          const code = lookupParam.trim();
          const currentInv = inventoryRef.current && inventoryRef.current.length > 0 
            ? inventoryRef.current 
            : LocalDatabase.getInventory();
          const match = findMatchingInventoryItems(currentInv, code);
          setPublicLookupCode(code);
          if (match.matched && match.matchedItems.length > 0) {
            setPublicLookupItem(match.matchedItems[0]);
          } else {
            setPublicLookupItem(null);
          }
          setIsPublicLookupOpen(true);
        }
      } catch (err) {
        console.warn('URL lookup check error:', err);
      }
    };

    checkUrlLookupParam();
    window.addEventListener('popstate', checkUrlLookupParam);
    return () => window.removeEventListener('popstate', checkUrlLookupParam);
  }, []);

  // When inventory updates, re-evaluate public lookup item if modal is open and was unmatched
  useEffect(() => {
    if (isPublicLookupOpen && publicLookupCode && !publicLookupItem && inventory.length > 0) {
      const match = findMatchingInventoryItems(inventory, publicLookupCode);
      if (match.matched && match.matchedItems.length > 0) {
        setPublicLookupItem(match.matchedItems[0]);
      }
    }
  }, [inventory, isPublicLookupOpen, publicLookupCode, publicLookupItem]);

  const handleOpenPublicLookup = useCallback((itemOrCode: InventoryItem | string) => {
    const currentInv = inventoryRef.current && inventoryRef.current.length > 0
      ? inventoryRef.current
      : LocalDatabase.getInventory();

    if (typeof itemOrCode === 'string') {
      const code = itemOrCode.trim();
      setPublicLookupCode(code);
      const match = findMatchingInventoryItems(currentInv, code);
      if (match.matched && match.matchedItems.length > 0) {
        setPublicLookupItem(match.matchedItems[0]);
      } else {
        setPublicLookupItem(null);
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('lookup', code);
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      const code = itemOrCode.warehouse || itemOrCode.sn || itemOrCode.id || '';
      setPublicLookupCode(code);
      setPublicLookupItem(itemOrCode);
      if (typeof window !== 'undefined' && code) {
        const url = new URL(window.location.href);
        url.searchParams.set('lookup', code);
        window.history.replaceState({}, '', url.toString());
      }
    }
    setIsPublicLookupOpen(true);
  }, []);

  const handleClosePublicLookup = useCallback(() => {
    setIsPublicLookupOpen(false);
    setPublicLookupItem(null);
    setPublicLookupCode('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('lookup');
      url.searchParams.delete('qr');
      url.searchParams.delete('item');
      url.searchParams.delete('code');
      url.searchParams.delete('sn');
      url.searchParams.delete('warehouse');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }, []);

  const handleOpenItemQrModal = useCallback((item: InventoryItem) => {
    setSelectedItemForQrModal(item);
    setIsItemQrModalOpen(true);
  }, []);

  const handleCloseItemQrModal = useCallback(() => {
    setIsItemQrModalOpen(false);
    setSelectedItemForQrModal(null);
  }, []);

  // Periodic Auto-Save Timer to LocalStorage
  useEffect(() => {
    if (storageConfig.autoSaveInterval <= 0) return;

    const intervalMs = storageConfig.autoSaveInterval * 1000;
    const timer = setInterval(() => {
      try {
        if (inventoryRef.current && inventoryRef.current.length > 0) {
          LocalDatabase.saveInventory(inventoryRef.current);
        }
        if (usageSlipsRef.current) {
          LocalDatabase.saveUsageSlips(usageSlipsRef.current);
        }
        if (dispatchedRecordsRef.current) {
          LocalDatabase.saveDispatchedRecords(dispatchedRecordsRef.current);
        }
        if (categoriesRef.current) {
          LocalDatabase.saveCategories(categoriesRef.current);
        }
        const nowStr = new Date().toLocaleTimeString('vi-VN');
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
          LocalDatabase.saveInventory(inventoryRef.current);
        }
        if (usageSlipsRef.current) {
          LocalDatabase.saveUsageSlips(usageSlipsRef.current);
        }
        if (dispatchedRecordsRef.current) {
          LocalDatabase.saveDispatchedRecords(dispatchedRecordsRef.current);
        }
        if (categoriesRef.current) {
          LocalDatabase.saveCategories(categoriesRef.current);
        }
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

  // Synchronize darkMode changes to HTML classList, localStorage, and theme-color meta tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cns_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cns_theme', 'light');
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', darkMode ? '#0f172a' : '#2563EB');
    }
  }, [darkMode]);

  // Initialization
  useEffect(() => {
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

  // Firebase Firestore Connection & Realtime Synchronization
  useEffect(() => {
    // 1. Test connection to Firestore on boot
    testFirestoreConnection().catch(err => {
      console.warn('Firebase Firestore test connection:', err);
    });

    let isFirstInvSnapshot = true;
    let isFirstRecordSnapshot = true;

    // 2. Realtime listener for Inventory from Firestore
    const unsubInv = subscribeToInventory(
      (firestoreItems) => {
        if (!firestoreItems) return;
        // Filter out items that have been explicitly deleted locally
        const validItems = firestoreItems.filter(item => !LocalDatabase.isItemDeleted(item.id, item.sn));
        if (validItems.length === 0) return;

        setInventory(prev => {
          if (prev.length === 0) {
            LocalDatabase.saveInventory(validItems);
            return validItems;
          }

          const currentQueue = syncService.getState().queue;
          const pendingIds = new Set(
            currentQueue.filter(q => q.syncStatus === 'pending' || q.syncStatus === 'syncing').map(q => q.entityId)
          );

          const localMapById = new Map<string, InventoryItem>();
          const localMapBySn = new Map<string, InventoryItem>();
          prev.forEach(item => {
            localMapById.set(item.id, item);
            if (item.sn) localMapBySn.set(item.sn.trim().toLowerCase(), item);
          });

          let hasChanges = false;
          const merged: InventoryItem[] = [];
          const matchedLocalIds = new Set<string>();

          validItems.forEach(cloudItem => {
            const cleanSn = (cloudItem.sn || '').trim().toLowerCase();
            const localMatch = localMapById.get(cloudItem.id) || (cleanSn ? localMapBySn.get(cleanSn) : undefined);

            if (localMatch) {
              matchedLocalIds.add(localMatch.id);
              if (pendingIds.has(localMatch.id)) {
                // Keep local unpushed change
                merged.push(localMatch);
              } else {
                // Check if cloud has different data
                const isDifferent =
                  Number(localMatch.qty) !== Number(cloudItem.qty) ||
                  (localMatch.auditStatus || '') !== (cloudItem.auditStatus || '') ||
                  (localMatch.name || '') !== (cloudItem.name || '') ||
                  (localMatch.loc || '') !== (cloudItem.loc || '') ||
                  (localMatch.warehouse || '') !== (cloudItem.warehouse || '') ||
                  (localMatch.auditNote || '') !== (cloudItem.auditNote || '');

                if (isDifferent) {
                  hasChanges = true;
                  merged.push({
                    ...cloudItem,
                    id: localMatch.id,
                    history: (cloudItem.history && cloudItem.history.length > 0) ? cloudItem.history : (localMatch.history || []),
                    syncStatus: 'synced'
                  });
                } else {
                  merged.push(localMatch);
                }
              }
            } else {
              // New item added on cloud
              hasChanges = true;
              merged.push({
                ...cloudItem,
                syncStatus: 'synced'
              });
            }
          });

          // Retain local items not yet in cloud (unless deleted)
          prev.forEach(localItem => {
            if (!matchedLocalIds.has(localItem.id) && !LocalDatabase.isItemDeleted(localItem.id, localItem.sn)) {
              merged.push(localItem);
            }
          });

          if (hasChanges) {
            LocalDatabase.saveInventory(merged);
            const nowStr = new Date().toLocaleTimeString('vi-VN');
            setSyncConfig(conf => ({ ...conf, lastSynced: nowStr }));
            setSyncStatus('success');
            setSyncStatusDetail(`Đã tự động đồng bộ dữ liệu mới nhất từ Cloud (${nowStr}).`);
            if (!isFirstInvSnapshot) {
              addToast(`☁️ Cloud: Tự động tải & cập nhật dữ liệu kho mới (${nowStr})!`, 'info');
            }
            return merged;
          }

          return prev;
        });

        isFirstInvSnapshot = false;
      },
      (err) => console.warn('Firestore inventory listener:', err)
    );

    // 3. Realtime listener for Dispatched Records from Firestore
    const unsubRecords = subscribeToDispatchedRecords(
      (firestoreRecords) => {
        if (!firestoreRecords) return;

        setDispatchedRecords(prev => {
          if (prev.length === 0) {
            if (firestoreRecords.length > 0) {
              LocalDatabase.saveDispatchedRecords(firestoreRecords);
              return firestoreRecords;
            }
            return prev;
          }

          const localMap = new Map<string, DispatchedRecord>(prev.map(r => [r.id, r]));
          let hasChanges = false;
          const merged = [...prev];

          firestoreRecords.forEach(cloudRecord => {
            const existing = localMap.get(cloudRecord.id);
            if (!existing) {
              hasChanges = true;
              merged.unshift(cloudRecord);
            } else {
              if (
                existing.status !== cloudRecord.status ||
                existing.returnedDate !== cloudRecord.returnedDate ||
                existing.returnedQty !== cloudRecord.returnedQty
              ) {
                hasChanges = true;
                const idx = merged.findIndex(r => r.id === cloudRecord.id);
                if (idx !== -1) merged[idx] = cloudRecord;
              }
            }
          });

          if (hasChanges) {
            LocalDatabase.saveDispatchedRecords(merged);
            if (!isFirstRecordSnapshot) {
              addToast('☁️ Cloud: Đã tự động đồng bộ sổ theo dõi trang thiết bị mới!', 'info');
            }
            return merged;
          }

          return prev;
        });

        isFirstRecordSnapshot = false;
      },
      (err) => console.warn('Firestore dispatched listener:', err)
    );

    return () => {
      unsubInv();
      unsubRecords();
    };
  }, []);

  // Subscribe to SyncService notifications & conflict events
  useEffect(() => {
    const unsub = syncService.subscribe(syncState => {
      setConflicts(syncState.conflicts);
    });
    return unsub;
  }, []);

  const saveInventoryLocally = (newInv: InventoryItem[], immediateCloud: boolean = false) => {
    setInventory(newInv);
    LocalDatabase.saveInventory(newInv);
    const nowStr = new Date().toLocaleTimeString('vi-VN');
    localStorage.setItem('cns_last_saved_time', nowStr);
    setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));

    if (immediateCloud) {
      // Trigger instant push to Cloud Google Sheet
      syncService.triggerImmediateSync().catch(err => console.warn('Instant cloud push:', err));
    } else {
      // Automatically trigger debounced push to Cloud Google Sheet
      syncService.scheduleDebouncedPush();
    }
    // Also sync to Firebase Firestore in background
    batchSaveInventoryToFirestore(newInv).catch(err => console.warn('Firestore batch save:', err));
  };

  const saveDispatchedRecordsLocally = (newRecords: DispatchedRecord[]) => {
    setDispatchedRecords(newRecords);
    LocalDatabase.saveDispatchedRecords(newRecords);
    // Automatically trigger debounced push to Cloud Google Sheet
    syncService.scheduleDebouncedPush();
    // Also sync to Firebase Firestore in background
    newRecords.forEach(rec => {
      saveDispatchedRecordToFirestore(rec).catch(err => console.warn('Firestore record save:', err));
    });
  };

  const saveAuditLogsLocally = (newLogs: SystemAuditLogEntry[]) => {
    setAuditLogs(newLogs);
    try {
      LocalDatabase.saveAuditLogs(newLogs);
    } catch (err) {
      console.warn('Audit logs save error:', err);
    }
    // Sync latest audit log to Firestore
    if (newLogs.length > 0) {
      saveAuditLogToFirestore(newLogs[0]).catch(err => console.warn('Firestore audit log save:', err));
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

  // Periodic Background Auto-Backup to Google Drive folder 'QLVT_Backup'
  const triggerAutoDriveBackup = useCallback(async (isSilent = true) => {
    try {
      const token = await getAccessToken();
      if (!token) return; // Not signed in to Google Drive

      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `QLVT_Inventory_Backup_${dateStr}.json`;

      const backupData = {
        app: 'CNS Equipment Inventory Management',
        version: '2.5.0',
        exportedAt: now.toISOString(),
        folder: 'QLVT_Backup',
        itemCount: inventoryRef.current?.length || 0,
        inventory: inventoryRef.current || [],
        dispatchedRecords: LocalDatabase.getDispatchedRecords() || []
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      await uploadToDrive(token, fileName, jsonStr, 'application/json');

      const nowMs = Date.now();
      localStorage.setItem('cns_last_drive_backup_timestamp', String(nowMs));
      setStorageConfig(prev => ({ ...prev, lastDriveBackupTime: nowMs }));

      if (!isSilent) {
        addToast("Đã tự động sao lưu dữ liệu lên thư mục 'QLVT_Backup' trên Google Drive!", 'success');
      }
      addSystemAuditLog('AUTO_BACKUP', 'Sao Lưu Google Drive', "Tự động sao lưu ngầm dữ liệu kho lên Google Drive 'QLVT_Backup'");
    } catch (err) {
      console.error("Lỗi tự động sao lưu Google Drive 'QLVT_Backup':", err);
    }
  }, [addToast, addSystemAuditLog]);

  useEffect(() => {
    if (storageConfig.autoDriveBackup === false) return;

    const DRIVE_CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

    const checkAndTriggerDriveBackup = async () => {
      const savedTimestampStr = localStorage.getItem('cns_last_drive_backup_timestamp');
      const now = Date.now();

      if (!savedTimestampStr) {
        if (inventoryRef.current && inventoryRef.current.length > 0) {
          await triggerAutoDriveBackup(true);
        }
        return;
      }

      const lastBackup = Number(savedTimestampStr);
      if (now - lastBackup >= DRIVE_CHECK_INTERVAL) {
        if (inventoryRef.current && inventoryRef.current.length > 0) {
          await triggerAutoDriveBackup(true);
        }
      }
    };

    const initialTimer = setTimeout(() => {
      checkAndTriggerDriveBackup();
    }, 6000);

    const intervalTimer = setInterval(() => {
      checkAndTriggerDriveBackup();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [storageConfig.autoDriveBackup, triggerAutoDriveBackup]);


  const handleManualSaveLocalStorage = () => {
    try {
      LocalDatabase.saveInventory(inventory);
      LocalDatabase.saveUsageSlips(usageSlips);
      LocalDatabase.saveCategories(categories);
      const nowStr = new Date().toLocaleTimeString('vi-VN');
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
        LocalDatabase.saveInventory(INITIAL_INVENTORY);
        const nowStr = new Date().toLocaleTimeString('vi-VN');
        setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));
        addToast('Đã khôi phục thành công danh sách thiết bị mẫu CNS ban đầu!', 'success');
        playScanBeep(1000, 0.15);
        setConfirmDialog(null);
      }
    });
  };

  const saveCategoriesLocally = (newCats: string[]) => {
    setCategories(newCats);
    LocalDatabase.saveCategories(newCats);
    // Automatically trigger debounced push to Cloud Google Sheet
    syncService.scheduleDebouncedPush();
    // Sync to Firestore
    saveCategoriesToFirestore(newCats).catch(err => console.warn('Firestore categories save:', err));
  };

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => (item.qty ?? 0) <= 1);
  }, [inventory]);

  const stats = useMemo<AuditStats>(() => {
    const totalItems = inventory.length;
    let totalQty = 0;
    let checkedCount = 0;
    let okCount = 0;
    let missingCount = 0;

    for (let i = 0; i < totalItems; i++) {
      const item = inventory[i];
      totalQty += (item.qty || 0);
      if (item.auditStatus === 'OK') {
        checkedCount++;
        okCount++;
      } else if (item.auditStatus === 'MISSING') {
        checkedCount++;
        missingCount++;
      }
    }

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
    const q = searchQuery.toLowerCase().trim();
    return inventory.filter(item => {
      if (selectedCategory !== 'Tất cả loại' && item.category !== selectedCategory) return false;
      if (statusFilter === 'OK' && item.auditStatus !== 'OK') return false;
      if (statusFilter === 'MISSING' && item.auditStatus !== 'MISSING') return false;
      if (statusFilter === 'UNCHECKED' && item.auditStatus !== null) return false;
      if (statusFilter === 'LOW_STOCK' && (item.qty ?? 0) > 1) return false;

      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.sn.toLowerCase().includes(q) ||
          (item.pn && item.pn.toLowerCase().includes(q)) ||
          (item.warehouse && item.warehouse.toLowerCase().includes(q)) ||
          (item.loc && item.loc.toLowerCase().includes(q))
        );
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

  const toggleTheme = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

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
      const currentItems = LocalDatabase.getInventory();
      const existingItem = currentItems.find(i => i.id === editingItem.id) || editingItem;
      const updatedItem = LocalDatabase.applyMetadata({
        ...existingItem,
        name: formData.name.trim(),
        pn: formData.pn.trim(),
        sn: formData.sn.trim(),
        warehouse: (formData.warehouse || 'KHO CHÍNH').trim().toUpperCase(),
        loc: formData.loc.trim(),
        qty: Math.max(1, Number(formData.qty) || 1),
        category: formData.category
      }, currentUsername || 'guest', false);

      const updated = currentItems.map(item => item.id === editingItem.id ? updatedItem : item);
      saveInventoryLocally(updated, true);
      saveInventoryItemToFirestore(updatedItem).catch(err => console.warn('Firestore item update:', err));
      syncService.enqueue('equipment', updatedItem.id, 'UPDATE', updatedItem, currentUsername, true);
      addToast('Cập nhật dữ liệu thiết bị và lưu lên Cloud tức thì!', 'success');
      playScanBeep(900, 0.1);

      addSystemAuditLog(
        'ITEM_UPDATE',
        'Chỉnh sửa thông tin thiết bị',
        `Cập nhật thiết bị "${formData.name.trim()}": Kho ${(formData.warehouse || 'KHO CHÍNH').trim().toUpperCase()}, Vị trí ${formData.loc.trim()}, SL ${formData.qty}, Loại ${formData.category}`,
        {
          id: editingItem.id,
          name: formData.name.trim(),
          sn: formData.sn.trim(),
          category: formData.category,
          prevData: `SL: ${existingItem?.qty || 1} | Kho: ${existingItem?.warehouse || 'Chưa gán'} | Vị trí: ${existingItem?.loc || 'Chưa gán'}`,
          newData: `SL: ${formData.qty} | Kho: ${(formData.warehouse || 'KHO CHÍNH').trim().toUpperCase()} | Vị trí: ${formData.loc.trim()}`
        }
      );

      const newQtyNum = Number(formData.qty) || 0;
      if (newQtyNum <= 1) {
        setTimeout(() => {
          addToast(`⚠️ CẢNH BÁO TỒN KHO: Thiết bị "${formData.name.trim()}" có số lượng là ${newQtyNum} (Dưới ngưỡng an toàn <= 1 cái)!`, newQtyNum === 0 ? 'error' : 'info');
        }, 350);
      }
    } else {
      const currentItems = LocalDatabase.getInventory();
      const cleanSn = formData.sn.trim().toLowerCase();
      const isDuplicate = currentItems.some(item => (item.sn || '').trim().toLowerCase() === cleanSn);
      if (isDuplicate) {
        addToast(`Cảnh báo: S/N "${formData.sn}" đã tồn tại trong hệ thống!`, 'error');
        return;
      }

      // If this SN was previously tombstoned, remove it from tombstones since it is being re-added
      LocalDatabase.removeDeletedItemTombstone(formData.sn.trim());

      const rawItem: InventoryItem = {
        id: `item-${Date.now()}`,
        name: formData.name.trim(),
        pn: formData.pn.trim(),
        sn: formData.sn.trim(),
        warehouse: (formData.warehouse || 'KHO CHÍNH').trim().toUpperCase(),
        loc: formData.loc.trim(),
        qty: Math.max(1, Number(formData.qty) || 1),
        auditStatus: null,
        auditNote: '',
        category: formData.category,
        history: []
      };
      const newItem = LocalDatabase.applyMetadata(rawItem, currentUsername || 'guest', true);
      const nextInv = [...currentItems.filter(i => i.id !== newItem.id && (i.sn || '').trim().toLowerCase() !== cleanSn), newItem];
      
      saveInventoryLocally(nextInv, true);
      saveInventoryItemToFirestore(newItem).catch(err => console.warn('Firestore item create:', err));
      syncService.enqueue('equipment', newItem.id, 'CREATE', newItem, currentUsername, true);
      addToast('Đã thêm thiết bị mới vào kho và lưu lên Cloud tức thì!', 'success');
      playScanBeep(880, 0.15);

      addSystemAuditLog(
        'ITEM_CREATE',
        'Thêm mới thiết bị vào kho',
        `Nhập mới thiết bị "${formData.name.trim()}" (S/N: ${formData.sn.trim()}, P/N: ${formData.pn.trim() || 'N/A'}, SL: ${formData.qty}) tại Kho ${(formData.warehouse || 'KHO CHÍNH').trim().toUpperCase()}`,
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
      message: `Bạn đang chọn xóa thiết bị "${item.name}" (S/N: ${item.sn}). Hành động này sẽ xóa vĩnh viễn và cập nhật lên Cloud ngay lập tức. Bạn có chắc chắn muốn xóa?`,
      onConfirm: async () => {
        // 1. Record tombstone & update local database atomically
        const nextInv = LocalDatabase.deleteItem(item.id, item.sn);
        setInventory(nextInv);
        const nowStr = new Date().toLocaleTimeString('vi-VN');
        localStorage.setItem('cns_last_saved_time', nowStr);
        setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));

        // 2. Immediately delete from Firestore document
        deleteInventoryItemFromFirestore(item.id).catch(err => console.warn('Delete from Firestore:', err));

        // 3. Immediately queue and push changes to Cloud Google Sheet
        syncService.enqueue('equipment', item.id, 'DELETE', { id: item.id, sn: item.sn }, currentUsername, true);
        syncService.triggerImmediateSync().catch(err => console.warn('Instant delete sync:', err));

        addToast(`Đã xóa thiết bị "${item.name}" và cập nhật lên Cloud tức thì.`, 'success');
        playScanBeep(400, 0.3);

        addSystemAuditLog(
          'ITEM_DELETE',
          'Xóa thiết bị khỏi kho',
          `Xóa vĩnh viễn thiết bị "${item.name}" (S/N: ${item.sn}, SL: ${item.qty}) khỏi hệ thống quản lý và đồng bộ Cloud`,
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

  const handleExportFilteredInventoryGoogleDoc = async () => {
    if (filteredInventory.length === 0) {
      addToast('Không có thiết bị nào trong danh sách đang lọc để xuất Google Doc!', 'error');
      return;
    }

    try {
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        token = res?.accessToken || null;
      }
      if (!token) return;

      addToast('Đang khởi tạo tài liệu Google Docs...', 'info');
      const isFilteredCat = selectedCategory && selectedCategory !== 'ALL' && selectedCategory !== 'Tất cả loại';
      const res = await exportInventoryReportToGoogleDoc(token, filteredInventory, {
        currentUsername: currentUsername || (role === 'admin' ? 'Kỹ sư Quản lý Kho' : 'Kiểm kê viên'),
        categoryFilter: selectedCategory,
        searchQuery: searchQuery,
        reportTitle: isFilteredCat
          ? `BÁO CÁO TỒN KHO & HIỆN TRẠNG THIẾT BỊ (${selectedCategory.toUpperCase()})`
          : 'BÁO CÁO TỒN KHO & HIỆN TRẠNG TRANG THIẾT BỊ DỰ PHÒNG TẠI CHỖ',
        reportDate: new Date().toLocaleDateString('vi-VN')
      });
      addToast(`Đã xuất thành công Google Doc: "${res.title}"!`, 'success');
      window.open(res.webViewLink, '_blank');
      addSystemAuditLog(
        'REPORT_DISPATCH',
        'Xuất Báo Cáo Google Docs',
        `Xuất báo cáo tồn kho Google Docs cho ${filteredInventory.length} thiết bị bởi ${currentUsername || 'Quản trị viên'}.`
      );
    } catch (err: any) {
      console.error('Lỗi khi xuất Google Doc:', err);
      addToast(err.message || 'Có lỗi xảy ra khi tạo Google Doc. Vui lòng kiểm tra kết nối Google!', 'error');
    }
  };

  const handleExportFilteredInventoryPdf = async () => {
    if (filteredInventory.length === 0) {
      addToast('Không có thiết bị nào trong danh sách đang lọc để xuất PDF!', 'error');
      return;
    }

    try {
      setIsExportingInventoryPdf(true);
      addToast('Đang khởi tạo tệp PDF Báo cáo tồn kho Đội Thông Tin...', 'info');
      const isFilteredCat = selectedCategory && selectedCategory !== 'ALL' && selectedCategory !== 'Tất cả loại';
      await exportInventoryReportToPDF(filteredInventory, {
        currentUsername: currentUsername || (role === 'admin' ? 'Kỹ sư Quản lý Kho' : 'Kiểm kê viên'),
        categoryFilter: selectedCategory,
        searchQuery: searchQuery,
        reportTitle: isFilteredCat
          ? `BÁO CÁO TỒN KHO & HIỆN TRẠNG THIẾT BỊ (${selectedCategory.toUpperCase()})`
          : 'BÁO CÁO TỒN KHO & HIỆN TRẠNG TRANG THIẾT BỊ DỰ PHÒNG TẠI CHỖ',
        reportDate: new Date().toLocaleDateString('vi-VN')
      });
      addToast(`Đã xuất thành công tệp PDF Báo cáo tồn kho (${filteredInventory.length} thiết bị)!`, 'success');
      addSystemAuditLog(
        'REPORT_DISPATCH',
        'Xuất Báo Cáo Tồn Kho PDF',
        `Xuất báo cáo tồn kho PDF cho ${filteredInventory.length} thiết bị (Chuyên mục: ${selectedCategory}, Tìm kiếm: "${searchQuery || 'Tất cả'}").`
      );
    } catch (err) {
      console.error('Lỗi khi xuất PDF tồn kho:', err);
      addToast('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại!', 'error');
    } finally {
      setIsExportingInventoryPdf(false);
    }
  };

  // Scanning logic for QR code & Barcode audit
  const handleScannedCode = (code: string, status: 'OK' | 'MISSING', note: string) => {
    if (!code || !code.trim()) {
      return { success: false, message: 'Mã quét rỗng' };
    }

    const currentInventory = inventoryRef.current && inventoryRef.current.length > 0
      ? inventoryRef.current
      : LocalDatabase.getInventory();

    const matchResult = findMatchingInventoryItems(code, currentInventory);

    if (!matchResult.matched || matchResult.matchedIndices.length === 0) {
      playScanBeep(200, 0.4);
      addToast(`Không tìm thấy thiết bị nào khớp với mã "${code}"`, 'error');
      return {
        success: false,
        message: `Không tìm thấy thiết bị nào khớp với mã "${code}". Bạn có thể nhấn nút bên dưới để thêm mới thiết bị vào kho.`
      };
    }

    const matchingItemsIdx = matchResult.matchedIndices;
    const nowStr = new Date().toLocaleString('vi-VN');
    const updated = [...currentInventory];

    matchingItemsIdx.forEach(idx => {
      const i = updated[idx];
      const entry: AuditHistoryEntry = {
        id: `h-${Date.now()}-${idx}`,
        status: status,
        date: nowStr,
        note: note.trim() || `Kiểm kê qua mã QR/Barcode (${matchResult.matchDescription})`,
        user: currentUsername || roleRef.current || 'guest'
      };

      updated[idx] = LocalDatabase.applyMetadata({
        ...i,
        auditStatus: status,
        auditDate: nowStr,
        auditNote: note.trim() || (status === 'OK' ? 'Quét mã xác nhận Đủ / Hoạt động tốt' : 'Quét mã xác nhận Thiếu / Cần bảo trì'),
        history: i.history ? [entry, ...i.history] : [entry]
      }, currentUsername || 'guest', false);
    });

    saveInventoryLocally(updated);
    matchingItemsIdx.forEach(idx => {
      const item = updated[idx];
      syncService.enqueue('equipment', item.id, 'STATUS_CHANGE', item, currentUsername);
      saveInventoryItemToFirestore(item).catch(err => console.warn('Firestore item sync:', err));
    });

    playScanBeep(status === 'OK' ? 1047 : 330, 0.16);
    const firstMatched = updated[matchingItemsIdx[0]];
    const statusText = status === 'OK' ? 'ĐỦ / HOẠT ĐỘNG TỐT (OK)' : 'THIẾU / CẦN XỬ LÝ (MISSING)';
    addToast(`Đã kiểm kê thành công: ${firstMatched.name} [${statusText}]`, 'success');

    addSystemAuditLog(
      'INVENTORY_AUDIT',
      'Quét mã QR / Barcode kiểm kê',
      `Quét mã "${code}" (${matchResult.matchDescription}) xác nhận trạng thái ${statusText} cho ${matchingItemsIdx.length} thiết bị (vd: ${firstMatched?.name || code})`,
      {
        id: firstMatched?.id,
        name: firstMatched?.name,
        sn: firstMatched?.sn,
        category: firstMatched?.category,
        newData: `Trạng thái: ${status}`
      }
    );

    return {
      success: true,
      item: firstMatched,
      message: `Đã ghi nhận kiểm kê [${statusText}]: ${firstMatched.name} (${matchResult.matchDescription})`
    };
  };

  // Utility to check if inventory items actually changed to avoid wasteful React re-renders and disk writes
  const isInventoryEqual = (a: InventoryItem[], b: InventoryItem[]): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const itemA = a[i];
      const itemB = b[i];
      if (
        itemA.id !== itemB.id ||
        itemA.name !== itemB.name ||
        itemA.sn !== itemB.sn ||
        itemA.pn !== itemB.pn ||
        itemA.qty !== itemB.qty ||
        itemA.warehouse !== itemB.warehouse ||
        itemA.loc !== itemB.loc ||
        itemA.auditStatus !== itemB.auditStatus ||
        itemA.auditDate !== itemB.auditDate ||
        itemA.category !== itemB.category
      ) {
        return false;
      }
    }
    return true;
  };

  // --- CLOUD-FIRST PRIORITY DATA LOADING STRATEGY ---
  // "ưu tiên đồng bộ, tải dữ liệu từ Cloud trước nếu thất bại sẽ đồng bộ Local"
  const handleFallbackToLocal = (reason: string, isSilent: boolean = false, isStartup: boolean = false) => {
    // 1. Retrieve data safely from LocalStorage / LocalDatabase
    const localInv = LocalDatabase.getInventory();
    if (localInv && localInv.length > 0) {
      setInventory(localInv);
    } else {
      const rawLocal = localStorage.getItem('cns_inventory_v30_stable');
      if (rawLocal) {
        try {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInventory(parsed);
          }
        } catch {
          setInventory(INITIAL_INVENTORY);
        }
      } else {
        setInventory(INITIAL_INVENTORY);
        LocalDatabase.saveInventory(INITIAL_INVENTORY);
      }
    }

    const localDispatched = LocalDatabase.getDispatchedRecords();
    if (localDispatched && localDispatched.length > 0) {
      setDispatchedRecords(localDispatched);
    }

    // 2. Set State to local_fallback
    setDataSourceOrigin('local_fallback');
    setCloudFirstError(reason);
    setShowFallbackBanner(true);
    setIsCloudFirstLoading(false);
    syncService.setDataSourceOrigin('local_fallback', `Đang dùng dữ liệu Local dự phòng (${reason})`);
    setSyncStatus('idle');
    setSyncStatusDetail(`Đã kích hoạt Local dự phòng: ${reason}`);

    // 3. User feedback
    if (!isSilent) {
      addToast(`Tải từ Cloud không thành công (${reason}). Hệ thống đã tự động chuyển sang nạp dữ liệu từ Local an toàn!`, 'info');
      playScanBeep(300, 0.25);
    }

    // 4. Audit Log entry for traceability
    const nowStr = new Date().toLocaleString('vi-VN');
    const auditEntry: SystemAuditLogEntry = {
      id: `audit_fallback_${Date.now()}`,
      timestamp: nowStr,
      actionType: 'CLOUD_AUTO_SYNC',
      actionTitle: 'Kích hoạt Chế độ Đồng bộ Local Dự Phòng (Fallback)',
      performedBy: currentUsername || 'system',
      performedByName: currentUsername === 'admin' ? 'Quản Trị Viên' : 'Kỹ Sư Trực Ban',
      userRole: role,
      details: `Không thể kết nối tải dữ liệu từ Cloud (${reason}). Hệ thống tự động kích hoạt đồng bộ dữ liệu từ bộ nhớ Local an toàn.`
    };
    setAuditLogs(prev => {
      const updated = [auditEntry, ...prev.slice(0, 499)];
      try {
        localStorage.setItem('cns_system_audit_logs_v1', JSON.stringify(updated));
      } catch { /* ignore storage errors */ }
      return updated;
    });
  };

  // Cloud Sync with Cloud-First Priority and Local Fallback
  const fetchCloudData = async (targetUrl?: string, isSilent: boolean = false, isStartup: boolean = false) => {
    // Guard against concurrent execution
    if (syncStatus === 'syncing' || syncService.getState().globalStatus === 'syncing') {
      return;
    }

    setIsCloudFirstLoading(true);
    setCloudFirstError(null);
    syncService.setDataSourceOrigin('cloud_loading', 'Đang ưu tiên đồng bộ & tải dữ liệu từ Cloud...');
    setSyncStatus('syncing');
    setSyncStatusDetail('Đang ưu tiên kết nối và tải dữ liệu từ Cloud...');

    // If offline, fallback to local immediately
    if (!navigator.onLine) {
      handleFallbackToLocal('Thiết bị đang Ngoại tuyến (Offline). Không có kết nối mạng tới Cloud.', isSilent, isStartup);
      return;
    }

    const activeUrl = (targetUrl || syncConfig.webAppUrl || '').trim();
    let cloudSuccess = false;
    let cloudItems: InventoryItem[] = [];
    let cloudDispatched: DispatchedRecord[] = [];
    let failureReason = '';

    // Priority 1: Google Apps Script Web App / Google Sheets Cloud
    if (activeUrl && activeUrl.startsWith('http')) {
      try {
        const res = await CloudService.pullFromCloud(activeUrl);
        if (res.success && (res.items || res.dispatched)) {
          cloudItems = res.items || [];
          cloudDispatched = res.dispatched || [];
          cloudSuccess = true;
        } else {
          failureReason = res.error || 'Google Apps Script không phản hồi dữ liệu hợp lệ';
        }
      } catch (err: unknown) {
        failureReason = err instanceof Error ? err.message : 'Lỗi kết nối Google Sheets Cloud';
      }
    } else {
      failureReason = 'Chưa cấu hình URL Google Apps Script Web App';
    }

    // Priority 1b: Secondary cloud tier - Firebase Firestore if Apps Script failed or empty
    if (!cloudSuccess || (cloudItems.length === 0 && cloudDispatched.length === 0)) {
      try {
        const firestoreItems = await getInventoryFromFirestore();
        const firestoreDispatched = await getDispatchedRecordsFromFirestore();
        if (firestoreItems.length > 0 || firestoreDispatched.length > 0) {
          cloudItems = firestoreItems.length > 0 ? firestoreItems : cloudItems;
          cloudDispatched = firestoreDispatched.length > 0 ? firestoreDispatched : cloudDispatched;
          cloudSuccess = true;
        }
      } catch (fsErr) {
        console.warn('Firestore fallback fetch failed:', fsErr);
      }
    }

    // Process Cloud Result
    if (cloudSuccess && (cloudItems.length > 0 || cloudDispatched.length > 0)) {
      // Sync dispatched records if returned by Cloud
      if (cloudDispatched.length > 0) {
        const existingDispatched = LocalDatabase.getDispatchedRecords();
        const existingMap = new Map(existingDispatched.map(d => [d.id, d]));
        let hasNewDispatch = false;

        cloudDispatched.forEach(cd => {
          if (cd && cd.id && !existingMap.has(cd.id)) {
            existingDispatched.unshift(cd);
            hasNewDispatch = true;
          }
        });

        if (hasNewDispatch) {
          saveDispatchedRecordsLocally(existingDispatched);
        }
      }

      if (cloudItems.length > 0) {
        const currentLocal = LocalDatabase.getInventory();
        const pendingQueue = syncService.getQueue();
        const pendingEntityIds = new Set(
          pendingQueue
            .filter(q => q.syncStatus === 'pending' || q.syncStatus === 'syncing')
            .map(q => q.entityId)
        );

        // Run conflict check with existing local inventory
        const detectedConflicts = syncService.checkForConflicts(cloudItems, currentLocal);
        setConflicts(detectedConflicts);
        if (detectedConflicts.length > 0) {
          if (!isSilent) {
            addToast(`Phát hiện ${detectedConflicts.length} xung đột dữ liệu giữa Cloud và Local. Hãy đối chiếu và chọn phiên bản giữ lại.`, 'info');
            setIsConflictModalOpen(true);
          }
        }

        const conflictIds = new Set(detectedConflicts.map(c => c.entityId));
        const localMapById = new Map<string, InventoryItem>();
        const localMapBySn = new Map<string, InventoryItem>();

        currentLocal.forEach(item => {
          localMapById.set(item.id, item);
          if (item.sn) {
            localMapBySn.set(item.sn.trim().toLowerCase(), item);
          }
        });

        const merged: InventoryItem[] = [];
        const matchedLocalIds = new Set<string>();

        // Process each cloud item with conflict, pending, and ID/SN match checks
        cloudItems.forEach(cloudItem => {
          // If item was deleted locally, do not resurrect it
          if (LocalDatabase.isItemDeleted(cloudItem.id, cloudItem.sn)) {
            deleteInventoryItemFromFirestore(cloudItem.id).catch(() => {});
            return;
          }

          const cleanSn = (cloudItem.sn || '').trim().toLowerCase();
          const localMatch = localMapById.get(cloudItem.id) || (cleanSn ? localMapBySn.get(cleanSn) : undefined);

          if (localMatch) {
            matchedLocalIds.add(localMatch.id);

            if (conflictIds.has(localMatch.id)) {
              // Keep local until user explicitly resolves conflict in modal
              merged.push(localMatch);
            } else if (pendingEntityIds.has(localMatch.id)) {
              // Local has active unpushed edits in queue! DO NOT overwrite with older cloud snapshot!
              merged.push(localMatch);
            } else {
              // Cloud wins: adopt cloud data while retaining local audit history if cloud history is empty
              merged.push({
                ...cloudItem,
                id: localMatch.id, // Preserve consistent local ID
                history: (cloudItem.history && cloudItem.history.length > 0) ? cloudItem.history : (localMatch.history || []),
                syncStatus: 'synced'
              });
            }
          } else {
            // Brand new item from cloud
            merged.push({
              ...cloudItem,
              syncStatus: 'synced'
            });
          }
        });

        // Retain local items not present in cloud to prevent accidental data deletion
        currentLocal.forEach(localItem => {
          if (!matchedLocalIds.has(localItem.id)) {
            // Only retain if NOT tombstoned
            if (!LocalDatabase.isItemDeleted(localItem.id, localItem.sn)) {
              merged.push(localItem);
            }
          }
        });

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Performance optimization: only re-save and trigger React re-render if items actually changed
        const hasActualChanges = !isInventoryEqual(currentLocal, merged);
        if (hasActualChanges) {
          saveInventoryLocally(merged);
        }

        setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
        setDataSourceOrigin('cloud');
        syncService.setDataSourceOrigin('cloud', `Đã đồng bộ từ Cloud lúc ${nowStr}`);
        setSyncStatus('success');
        setSyncStatusDetail(`Ưu tiên Cloud thành công: Đã đồng bộ ${cloudItems.length} thiết bị từ Cloud (${nowStr}).${hasActualChanges ? ' Đã cập nhật thay đổi mới.' : ' Dữ liệu đã đồng nhất.'}`);
        setIsCloudFirstLoading(false);

        if (!isSilent) {
          addToast(`Ưu tiên Cloud: Đã tải và đồng bộ thành công ${cloudItems.length} thiết bị từ Cloud!`, 'success');
          playScanBeep(1000, 0.2);
        }
      } else {
        setDataSourceOrigin('cloud');
        syncService.setDataSourceOrigin('cloud', 'Kho trên Cloud hiện đang trống.');
        setSyncStatus('success');
        setSyncStatusDetail('Kho Cloud hiện đang trống.');
        setIsCloudFirstLoading(false);
        if (!isSilent) {
          addToast('Kho trên Cloud hiện đang trống!', 'info');
        }
      }
    } else {
      // Cloud Failed -> Trigger Fallback to Local
      handleFallbackToLocal(failureReason || 'Không thể kết nối máy chủ Cloud', isSilent, isStartup);
    }
  };

  // Automatic startup Cloud-First priority fetch
  useEffect(() => {
    fetchCloudData(undefined, false, true);
  }, []);

  // Automatic 30-second background connection to Google Sheets Cloud to pull data
  useEffect(() => {
    if (!syncConfig.autoSync30s || !syncConfig.webAppUrl) return;

    const intervalSec = syncConfig.autoSyncInterval && syncConfig.autoSyncInterval > 0 ? syncConfig.autoSyncInterval : 30;

    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        fetchCloudData(undefined, true, false);
      }
    }, intervalSec * 1000);

    return () => clearInterval(intervalId);
  }, [syncConfig.autoSync30s, syncConfig.autoSyncInterval, syncConfig.webAppUrl]);

  const syncToCloud = async () => {
    if (syncStatus === 'syncing' || syncService.getState().globalStatus === 'syncing') return;
    if (!navigator.onLine) {
      setSyncStatus('idle');
      setSyncStatusDetail('Không thể tải lên. Thiết bị đang Ngoại tuyến.');
      addToast('Không có kết nối mạng để kết nối với Cloud!', 'error');
      playScanBeep(250, 0.3);
      return;
    }

    setSyncStatus('syncing');
    setSyncStatusDetail('Đang đồng bộ toàn bộ dữ liệu kho và sổ bàn giao lên Cloud...');

    try {
      const currentDispatched = LocalDatabase.getDispatchedRecords();
      const currentCategories = LocalDatabase.getCategories();
      
      const res = await CloudService.pushToCloud(
        syncConfig.webAppUrl,
        inventory,
        currentDispatched,
        syncService.getQueue(),
        currentUsername || role || 'anonymous',
        currentCategories
      );

      if (!res.success) {
        if (res.scriptErrorCode === 'NON_FROZEN_ROWS_EXCEPTION') {
          setIsAppsScriptFixOpen(true);
        }
        throw new Error(res.error || 'Đẩy dữ liệu thất bại');
      }

      // Mark queue as cleared and inventory as synced
      syncService.clearQueue();
      LocalDatabase.markAllItemsSyncStatus('synced');

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
      setSyncStatus('success');
      setSyncStatusDetail(`Đã đồng bộ toàn bộ dữ liệu thành công lên Apps Script (${nowStr}).`);
      addToast('Đã đồng bộ toàn bộ kho và sổ bàn giao lên Cloud thành công!', 'success');
      playScanBeep(980, 0.15);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đẩy dữ liệu thất bại. Hãy kiểm tra kết nối mạng.';
      setSyncStatus('error');
      setSyncStatusDetail(errorMsg);
      addToast(`Không thể đẩy dữ liệu lên Cloud: ${errorMsg}`, 'error');
    }
  };

  // Exports
  const handleExportExcel = async () => {
    if (inventory.length === 0) {
      addToast('Không có dữ liệu để xuất Excel!', 'error');
      return;
    }

    try {
      const XLSX = await import('xlsx');
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

    const html = `
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
    `;

    safePrintHtml(html);
    addToast('Đã khởi tạo in biên bản bàn giao thành công!', 'success');
  };

  const handlePrintUsageSlip = (slip: UsageSlip) => {
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

    const html = `
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
    `;

    safePrintHtml(html);
    addToast(`Đã xuất phiếu báo sử dụng chuẩn form (${slip.sn})!`, 'success');
  };

  const handleSubmitUsage = (newSlip: UsageSlip, deductInv: boolean) => {
    const nextSlips = [newSlip, ...usageSlips];
    setUsageSlips(nextSlips);
    LocalDatabase.saveUsageSlips(nextSlips);

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
      const html = `
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
      `;
      safePrintHtml(html);
      addToast(`Đã in biên bản bàn giao ${record.docNumber}!`, 'success');
    }
  };

  // Print all Dispatched Records Registry
  const handlePrintDispatchedRegistry = () => {
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

    const html = `
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
    `;

    safePrintHtml(html);
    addToast('Đã khởi tạo in Sổ Theo Dõi Bàn Giao & Sử Dụng!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
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
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                Kho Vật tư dự phòng Đội Thông tin -TT BĐKT
              </h1>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-2.5 uppercase tracking-wider">
                Hệ Thống Quản Lý & Kiểm Kê Trang Thiết Bị
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
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-[#F8FAFC] flex flex-col md:flex-row w-full font-sans antialiased">
          {/* Left Sidebar (Desktop Only) */}
          <aside className="hidden md:flex md:w-72 bg-white dark:bg-[#131B2E] border-r border-[#E2E8F0] dark:border-slate-800 flex-col shrink-0">
            {/* Sidebar Brand Header */}
            <div className="p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                <Database className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xs truncate inline-block">
                  KHO DỰ PHÒNG CNS/ATM
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-1">
                  Kho vật tư dự phòng tại chỗ Đội TT • TT BĐKT
                </p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 px-3 py-1 tracking-wider">Danh Mục Chính</div>
              
              <button
                type="button"
                onClick={() => {
                  setActiveWorkspaceTab('INVENTORY');
                  setMobileTab('inventory');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWorkspaceTab === 'INVENTORY'
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 text-left truncate">Kho Thiết Bị & Vật Tư</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeWorkspaceTab === 'INVENTORY' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {inventory.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWorkspaceTab('DISPATCHED');
                  setMobileTab('dispatched');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWorkspaceTab === 'DISPATCHED'
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 text-left truncate">Sổ Bàn Giao & Điều Chuyển</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeWorkspaceTab === 'DISPATCHED' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {dispatchedRecords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWorkspaceTab('AUDIT_LOG');
                  setMobileTab('reports');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWorkspaceTab === 'AUDIT_LOG'
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 text-left truncate">Nhật Ký Hệ Thống</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${activeWorkspaceTab === 'AUDIT_LOG' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {auditLogs.length}
                </span>
              </button>

              <div className="pt-3 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 px-3 py-1 tracking-wider">Tác Vụ Kho & Bàn Giao</div>

              <button
                type="button"
                onClick={() => {
                  setScanTargetItem(null);
                  setIsScannerOpen(true);
                  playScanBeep(1000, 0.1);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <Camera className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                <span className="flex-1 text-left truncate">Quét Mã QR & Barcode</span>
              </button>

              <button
                type="button"
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
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                <span className="flex-1 text-left truncate">Lập Biên Bản Bàn Giao</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUsageHistoryOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <History className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                <span className="flex-1 text-left truncate">Sổ Phiếu Sử Dụng</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0">
                  {usageSlips.length}
                </span>
              </button>

              <div className="pt-3 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 px-3 py-1 tracking-wider">Quản Trị & Hệ Thống</div>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setIsAdminAccountModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                >
                  <Crown className="w-4.5 h-4.5 text-[#D97706] shrink-0" />
                  <span className="flex-1 text-left truncate">Quản Trị Tài Khoản</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <Settings className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                <span className="flex-1 text-left truncate">Cấu Hình & Sao Lưu</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4.5 h-4.5 text-[#2563EB] shrink-0" />
                <span className="flex-1 text-left truncate">Cài App Mobile (PWA)</span>
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
            {/* Mobile PWA Installation Promotion Banner */}
            <MobileInstallBanner
              isInstallable={pwaInstallable}
              isInstalled={pwaInstalled}
              onInstall={installPwa}
            />

            {/* Mobile Dedicated Application Header (Mobile screens only) */}
            <MobileAppHeader
              activeWorkspaceTab={activeWorkspaceTab}
              inventoryCount={inventory.length}
              dispatchedCount={dispatchedRecords.length}
              auditLogsCount={auditLogs.length}
              lowStockCount={lowStockItems.length}
              role={role}
              currentUsername={currentUsername}
              userFullName={users.find(u => u.username.toLowerCase() === currentUsername?.toLowerCase())?.fullName}
              darkMode={darkMode}
              onToggleDarkMode={toggleTheme}
              onOpenMenu={() => setIsMobileDrawerOpen(true)}
              onOpenScanner={() => {
                setScanTargetItem(null);
                setIsScannerOpen(true);
                playScanBeep(1000, 0.1);
              }}
              onAddNewItem={role === 'admin' ? handleOpenAddNewModal : undefined}
              onToggleSearch={() => {
                if (searchInputRef.current) {
                  searchInputRef.current.focus();
                  searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              onOpenLowStock={() => setIsLowStockDropdownOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenConflictModal={() => setIsConflictModalOpen(true)}
              onOpenAppsScriptFix={() => setIsAppsScriptFixOpen(true)}
              onPullCloud={() => fetchCloudData(undefined, false, false)}
            />

            {/* Top Enterprise Header (Desktop screens only) */}
            <header className="hidden md:flex bg-white dark:bg-[#131B2E] border-b border-[#E2E8F0] dark:border-slate-800 px-6 py-4 items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <span>
                      {activeWorkspaceTab === 'INVENTORY' ? 'Kho Dự Phòng Tại Chỗ' : activeWorkspaceTab === 'DISPATCHED' ? 'Sổ Bàn Giao & Điều Chuyển' : 'Nhật Ký Hệ Thống'}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-900 hidden sm:inline-flex items-center">
                      {activeWorkspaceTab === 'INVENTORY' ? `${inventory.length} vật tư` : activeWorkspaceTab === 'DISPATCHED' ? `${dispatchedRecords.length} hồ sơ` : `${auditLogs.length} bản ghi`}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    Đội Thông Tin • Trung Tâm Bảo Đảm Kỹ Thuật CNS/ATM
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Advanced Local-First Cloud Auto-Sync Indicator & Popover */}
                <SyncStatusIndicator
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenConflictModal={() => setIsConflictModalOpen(true)}
                  onOpenAppsScriptFix={() => setIsAppsScriptFixOpen(true)}
                  onPullCloud={() => fetchCloudData(undefined, false, false)}
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
                      <div className="max-h-60 overflow-y-auto custom-scrollbar my-2 divide-y divide-slate-100 dark:border-slate-800">
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

                {/* Google Docs Quick Action */}
                <button
                  onClick={() => setIsGoogleDocsModalOpen(true)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-[#E2E8F0] dark:border-slate-800 text-blue-600 dark:text-blue-400 rounded-xl transition-all cursor-pointer"
                  title="Quản Lý & Tạo Văn Bản Google Docs"
                >
                  <FileText className="w-4.5 h-4.5" />
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

            {/* Dashboard Content Body with Mobile-Optimized Padding */}
            <main className="flex-1 px-3 py-3 sm:px-6 sm:py-6 lg:p-8 space-y-4 sm:space-y-6 pb-28 md:pb-8 max-w-[1600px] w-full mx-auto">


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
                onPrintFullRegistry={handlePrintDispatchedRegistry}
                onCreateUsageSlip={() => {
                  if (inventory.length > 0) {
                    setSelectedItemForUsage(inventory[0]);
                  } else {
                    addToast('Kho vật tư chưa có thiết bị để xuất sử dụng!', 'error');
                  }
                }}
                onCreateHandover={() => {
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
                onAddToast={addToast}
              />
            </div>
          ) : activeWorkspaceTab === 'AUDIT_LOG' ? (
            /* SYSTEM AUDIT LOG WORKSPACE VIEW */
            <div className="mt-6">
              <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">Đang tải nhật ký hệ thống...</div>}>
                <SystemAuditLogView
                  logs={auditLogs}
                  role={role}
                  currentUsername={currentUsername || 'guest'}
                  onClearLogs={handleClearAuditLogs}
                  onAddToast={addToast}
                />
              </Suspense>
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
          <section className="bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-4 mt-6 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3.5 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-full xl:max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm: Tên thiết bị, S/N, P/N, Vị trí, Mã kho..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 transition-all text-xs font-medium placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons Group */}
            <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end">
              {role === 'admin' && (
                <button
                  type="button"
                  onClick={handleOpenAddNewModal}
                  className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-black py-2 px-3.5 rounded-xl shadow-xs shadow-blue-500/20 transition-all text-xs cursor-pointer"
                  title="Thêm thiết bị mới vào kho"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ THÊM THIẾT BỊ</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setScanTargetItem(null);
                  setIsScannerOpen(true);
                  playScanBeep(1000, 0.1);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black py-2 px-3.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
                title="Mở camera quét mã QR/Barcode kiểm kê"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                <span>QUÉT MÃ</span>
              </button>

              {/* IN ẤN DROPDOWN */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintDropdownOpen(!isPrintDropdownOpen);
                    setIsExportDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 font-black py-2 px-3 rounded-xl transition-all text-xs cursor-pointer shadow-xs"
                  title="In ấn tem nhãn & biểu mẫu"
                >
                  <Printer className="w-4 h-4" />
                  <span>IN ẤN</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {isPrintDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsPrintDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-scale-in space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPrintDropdownOpen(false);
                          handleOpenPrintCenter('LABEL');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#2563EB] rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <Tag className="w-4 h-4 text-[#2563EB]" />
                        <span>In Tem Nhãn Kỹ Thuật</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPrintDropdownOpen(false);
                          handleOpenPrintCenter('QR');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#2563EB] rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <QrCode className="w-4 h-4 text-[#2563EB]" />
                        <span>In Bảng Mã QR Định Danh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPrintDropdownOpen(false);
                          handleOpenPrintCenter('AUDIT_REPORT');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#2563EB] rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <FileText className="w-4 h-4 text-[#2563EB]" />
                        <span>In Biên Bản Kiểm Kê Kho</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* XUẤT DỮ LIỆU DROPDOWN */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsExportDropdownOpen(!isExportDropdownOpen);
                    setIsPrintDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 font-black py-2 px-3 rounded-xl transition-all text-xs cursor-pointer shadow-xs"
                  title="Xuất dữ liệu Excel / CSV / Sao lưu"
                >
                  <FileDown className="w-4 h-4" />
                  <span>XUẤT DỮ LIỆU</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {isExportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-scale-in space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          handleExportFilteredInventoryGoogleDoc();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Xuất Tài Liệu Google Docs (.gdoc)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          handleExportFilteredInventoryPdf();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span>Xuất Báo Cáo Tồn Kho PDF (.pdf)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          handleExportExcel();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Xuất Bảng Tính Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          handleExportCsv();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <FileDown className="w-4 h-4 text-emerald-600" />
                        <span>Xuất Danh Sách CSV (.csv)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          handleExportJSON();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <FileCode className="w-4 h-4 text-emerald-600" />
                        <span>Sao Lưu Toàn Bộ Dữ Liệu (JSON)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* BÀN GIAO & PHIẾU QUICK ACTIONS */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
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
                  className="p-2 px-2.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-rose-700 dark:text-rose-400 transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  title="Lập Biên Bản Bàn Giao thiết bị"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
                  <span>BB BÀN GIAO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUsageHistoryOpen(true)}
                  className="p-2 px-2.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-amber-700 dark:text-amber-400 transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-2"
                  title="Xem sổ phiếu báo sử dụng thiết bị"
                >
                  <History className="w-3.5 h-3.5 text-amber-500" />
                  <span>PHIẾU ({usageSlips.length})</span>
                </button>
              </div>
            </div>
          </section>

          {/* Filter & Category Bar */}
          <div className="mt-4 flex flex-col xl:flex-row gap-3 items-stretch">
            {/* Category Filter */}
            <div className="flex-1 bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-2.5 shadow-xs flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <span className="text-xs uppercase font-black text-slate-400 tracking-wider shrink-0 flex items-center gap-1.5 pl-1.5">
                <Filter className="w-3.5 h-3.5 text-[#2563EB]" /> Phân Loại:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#2563EB] text-white shadow-xs font-black'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Audit Filter */}
            <div className="bg-white dark:bg-[#131B2E] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-2 shadow-xs flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                Tất cả ({stats.totalItems})
              </button>
              <button
                onClick={() => setStatusFilter('OK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'OK'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                Đủ / Tốt ({stats.okCount})
              </button>
              <button
                onClick={() => setStatusFilter('MISSING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'MISSING'
                    ? 'bg-rose-600 text-white font-black shadow-xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                Thiếu / Hỏng ({stats.missingCount})
              </button>
              <button
                onClick={() => setStatusFilter('UNCHECKED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'UNCHECKED'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                Chưa kiểm ({stats.totalItems - stats.checkedCount})
              </button>
              <button
                onClick={() => setStatusFilter('LOW_STOCK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === 'LOW_STOCK'
                    ? 'bg-amber-500 text-white font-black shadow-xs'
                    : lowStockItems.length > 0
                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Sắp hết ({lowStockItems.length})
              </button>
            </div>
          </div>

          {/* Main Inventory Table & Actions */}
          <div className="mt-6">
            {/* Cloud-First Loading Banner */}
            {isCloudFirstLoading && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200">
                      Đang ưu tiên đồng bộ & tải dữ liệu mới nhất từ Cloud...
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      Hệ thống tự động kết nối Google Sheets & Firestore Cloud để nạp bản ghi mới nhất.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 border border-blue-300/50 dark:border-blue-700/50">
                  Ưu tiên Cloud
                </span>
              </div>
            )}

            {/* Local Fallback Active Banner */}
            {!isCloudFirstLoading && dataSourceOrigin === 'local_fallback' && showFallbackBanner && (
              <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                        Chế độ Đồng bộ Local Dự Phòng (Fallback)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        Local Database Hoạt Động
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                      Tải từ Cloud thất bại ({cloudFirstError || 'Không thể kết nối máy chủ Cloud'}).
                      Hệ thống đã tự động bảo toàn và nạp cơ sở dữ liệu từ bộ nhớ Local trên máy. Mọi thao tác kiểm kê và sửa đổi đều an toàn và sẽ tự động đồng bộ lên Cloud khi có mạng.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => fetchCloudData(undefined, false, false)}
                    disabled={isCloudFirstLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Thử kết nối và nạp lại từ Cloud"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudFirstLoading ? 'animate-spin' : ''}`} />
                    <span>Thử lại Cloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFallbackBanner(false)}
                    className="p-1.5 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                    title="Đóng thông báo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

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
              onOpenQrModal={handleOpenItemQrModal}
              onOpenPublicLookup={handleOpenPublicLookup}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportFilteredInventoryPdf}
              isExportingPdf={isExportingInventoryPdf}
              onAddNewItem={handleOpenAddNewModal}
            />
          </div>
            </>
          )}
            </main>
          </div>
        </div>
      )}

      {/* Public QR Code Lookup Modal for Any Phone Camera Scan */}
      {isPublicLookupOpen && (
        <Suspense fallback={null}>
          <PublicItemLookupModal
            isOpen={isPublicLookupOpen}
            onClose={handleClosePublicLookup}
            lookupCode={publicLookupCode}
            item={publicLookupItem}
            inventory={inventory}
            role={role}
            onSelectAnotherCode={(code) => handleOpenPublicLookup(code)}
            onOpenScanner={() => {
              setIsScannerOpen(true);
            }}
            onEnterApp={() => {
              setIsPublicLookupOpen(false);
            }}
            onPrintQr={(item) => {
              setPrintLayout('QR');
              setIsPrintPreviewOpen(true);
            }}
            onPrintLabel={(item) => {
              setPrintLayout('LABEL');
              setIsPrintPreviewOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* Item QR Code Preview & Download Modal */}
      {isItemQrModalOpen && selectedItemForQrModal && (
        <Suspense fallback={null}>
          <ItemQrCodeModal
            isOpen={isItemQrModalOpen}
            onClose={handleCloseItemQrModal}
            item={selectedItemForQrModal}
            onPrintQr={(item) => {
              handleCloseItemQrModal();
              setPrintLayout('QR');
              setIsPrintPreviewOpen(true);
            }}
            onPrintLabel={(item) => {
              handleCloseItemQrModal();
              setPrintLayout('LABEL');
              setIsPrintPreviewOpen(true);
            }}
            onOpenPublicLookup={(item) => {
              handleCloseItemQrModal();
              handleOpenPublicLookup(item);
            }}
          />
        </Suspense>
      )}

      {/* Scanner Modal */}
      {isScannerOpen && (
        <Suspense fallback={null}>
          <ScannerModal
            isOpen={isScannerOpen}
            onClose={() => {
              setIsScannerOpen(false);
              setScanTargetItem(null);
            }}
            inventory={inventory}
            scanTargetItem={scanTargetItem}
            onScanned={handleScannedCode}
            onAddNewWithCode={handleAddNewWithCode}
            onViewItemDetail={(item) => {
              setIsScannerOpen(false);
              setSelectedItemDetail(item);
            }}
          />
        </Suspense>
      )}

      {/* Item Form Modal (Add & Edit) */}
      {isItemFormModalOpen && (
        <Suspense fallback={null}>
          <ItemFormModal
            isOpen={isItemFormModalOpen}
            onClose={() => {
              setIsItemFormModalOpen(false);
              setEditingItem(null);
              setInitialAddSn('');
              setInitialAddWarehouse('');
            }}
            editingItem={editingItem}
            categories={categories}
            initialSn={initialAddSn}
            initialWarehouse={initialAddWarehouse}
            onSaveCategory={(newCat) => {
              const updated = [...categories, newCat];
              saveCategoriesLocally(updated);
              addToast(`Đã thêm loại: ${newCat}`, 'success');
              playScanBeep(1000, 0.1);
            }}
            onSubmit={handleItemFormSubmit}
          />
        </Suspense>
      )}

      {/* Item Detail Drawer */}
      {selectedItemDetail && (
        <Suspense fallback={null}>
          <ItemDetailDrawer
            item={selectedItemDetail}
            role={role}
            onClose={() => setSelectedItemDetail(null)}
            onEdit={(item) => {
              setSelectedItemDetail(null);
              handleEditClick(item);
            }}
            onUsage={(item) => setSelectedItemForUsage(item)}
            onPrintQr={() => {
              setPrintLayout('QR');
              setIsPrintPreviewOpen(true);
            }}
            onPrintLabel={() => {
              setPrintLayout('LABEL');
              setIsPrintPreviewOpen(true);
            }}
            onOpenQrModal={(item) => handleOpenItemQrModal(item)}
            onOpenPublicLookup={(item) => handleOpenPublicLookup(item)}
          />
        </Suspense>
      )}

      {/* Usage Slips Modal */}
      {(selectedItemForUsage || isUsageHistoryOpen) && (
        <Suspense fallback={null}>
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
              LocalDatabase.saveUsageSlips(remaining);
              addToast('Đã xóa phiếu báo sử dụng.', 'success');
            }}
            onClearHistory={() => {
              setUsageSlips([]);
              LocalDatabase.saveUsageSlips([]);
              addToast('Đã xóa trắng lịch sử phiếu sử dụng.', 'info');
            }}
            onPrintSlip={handlePrintUsageSlip}
          />
        </Suspense>
      )}

      {/* Handover Certificate Modal */}
      {isHandoverModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Return Dispatched Equipment To Stock Modal */}
      {!!selectedDispatchedForReturn && (
        <Suspense fallback={null}>
          <ReturnStockModal
            isOpen={!!selectedDispatchedForReturn}
            onClose={() => setSelectedDispatchedForReturn(null)}
            record={selectedDispatchedForReturn}
            onConfirmReturn={handleConfirmReturnStock}
          />
        </Suspense>
      )}

      {/* Dispatched Record Detail Modal */}
      {!!selectedDispatchedDetail && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
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
            onOpenGoogleDocsModal={() => setIsGoogleDocsModalOpen(true)}
            onAddToast={addToast}
          />
        </Suspense>
      )}

      {/* Google Drive Backup & Sync Modal */}
      {isGoogleDriveModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Google Docs Management Modal */}
      {isGoogleDocsModalOpen && (
        <Suspense fallback={null}>
          <GoogleDocsModal
            isOpen={isGoogleDocsModalOpen}
            onClose={() => setIsGoogleDocsModalOpen(false)}
            inventory={inventory}
            selectedCategory={selectedCategory}
            currentUsername={currentUsername || 'Kỹ sư Quản lý Kho'}
            onAddToast={addToast}
          />
        </Suspense>
      )}

      {/* Admin Account & Security Center Modal */}
      {isAdminAccountModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* System Audit Log Center Modal */}
      {isAuditLogModalOpen && (
        <Suspense fallback={null}>
          <SystemAuditLogModal
            isOpen={isAuditLogModalOpen}
            onClose={() => setIsAuditLogModalOpen(false)}
            logs={auditLogs}
            role={role}
            currentUsername={currentUsername || 'guest'}
            onClearLogs={handleClearAuditLogs}
            onAddToast={addToast}
          />
        </Suspense>
      )}

      {/* Print Preview & Options Center Modal */}
      {isPrintPreviewOpen && (
        <Suspense fallback={null}>
          <PrintPreviewModal
            isOpen={isPrintPreviewOpen}
            initialMode={activePrintMode}
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
        </Suspense>
      )}

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
              setActiveWorkspaceTab('INVENTORY');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (tab === 'dispatched') {
              setActiveWorkspaceTab('DISPATCHED');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (tab === 'stats') {
              setActiveWorkspaceTab('INVENTORY');
              const el = document.getElementById('stats-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }
            } else if (tab === 'reports') {
              handleOpenPrintCenter('AUDIT_REPORT');
            } else if (tab === 'admin') {
              setIsMobileDrawerOpen(true);
            }
          }}
          onOpenScanner={() => {
            setScanTargetItem(null);
            setIsScannerOpen(true);
            playScanBeep(1000, 0.1);
          }}
          lowStockCount={lowStockItems.length}
          missingCount={stats.missingCount}
          dispatchedCount={dispatchedRecords.length}
          role={role}
        />
      )}

      {/* Mobile Drawer Menu / Profile Sheet */}
      <MobileDrawerMenu
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        role={role}
        currentUsername={currentUsername}
        userFullName={users.find(u => u.username.toLowerCase() === currentUsername?.toLowerCase())?.fullName}
        inventoryCount={inventory.length}
        dispatchedCount={dispatchedRecords.length}
        auditLogsCount={auditLogs.length}
        activeWorkspaceTab={activeWorkspaceTab}
        onSelectWorkspaceTab={(tab) => {
          setActiveWorkspaceTab(tab);
          if (tab === 'INVENTORY') setMobileTab('inventory');
          else if (tab === 'DISPATCHED') setMobileTab('dispatched');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPrintCenter={() => handleOpenPrintCenter('AUDIT_REPORT')}
        onOpenGoogleDrive={() => setIsGoogleDriveModalOpen(true)}
        onOpenAdminAccounts={() => setIsAdminAccountModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSystemAuditLogs={() => setIsAuditLogModalOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={toggleTheme}
        canInstallPwa={pwaInstallable}
        onInstallPwa={installPwa}
      />

      {/* Conflict Resolution Modal for Cloud vs Local Concurrency */}
      {isConflictModalOpen && (
        <Suspense fallback={null}>
          <ConflictResolutionModal
            isOpen={isConflictModalOpen}
            onClose={() => setIsConflictModalOpen(false)}
            conflicts={conflicts}
            onResolved={handleConflictResolved}
            onResolveAll={handleResolveAllConflicts}
            onClearAll={handleClearAllConflicts}
            onAddToast={addToast}
          />
        </Suspense>
      )}

      {/* Mobile PWA Installation Modal */}
      {isInstallModalOpen && (
        <Suspense fallback={null}>
          <MobileAppInstallModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Google Apps Script Frozen Rows Fix Modal */}
      {isAppsScriptFixOpen && (
        <Suspense fallback={null}>
          <AppsScriptFixModal
            isOpen={isAppsScriptFixOpen}
            onClose={() => setIsAppsScriptFixOpen(false)}
            isSyncing={syncStatus === 'syncing'}
            onRetrySync={async () => {
              await syncToCloud();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
