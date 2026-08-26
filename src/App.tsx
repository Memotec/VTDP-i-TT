import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode, Search, Database, RefreshCw, Plus, Edit,
  Trash2, User, Lock, LogOut, Sun, Moon, FileSpreadsheet, Printer,
  CheckCircle2, XCircle, AlertCircle, X, History, Settings, Camera, Check, Filter,
  FileText, ArrowRightLeft, Layers, Info, Crown, ShieldCheck, Key
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { InventoryItem, SyncConfig, StorageConfig, Role, AuditStats, AuditHistoryEntry, UsageSlip, UserAccount } from './types.ts';
import { INITIAL_INVENTORY, CATEGORIES } from './initialData.ts';
import { playScanBeep } from './utils/audio.ts';
import { PrintTemplates } from './components/PrintTemplates.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { ScannerModal } from './components/ScannerModal.tsx';
import { ItemDetailDrawer } from './components/ItemDetailDrawer.tsx';
import { UsageModal } from './components/UsageModal.tsx';
import { HandoverModal, HandoverRow } from './components/HandoverModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { InventoryTable } from './components/InventoryTable.tsx';
import { AdminAccountModal } from './components/AdminAccountModal.tsx';

const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'Trưởng ca Kỹ thuật CNS',
    role: 'admin',
    password: 'admin',
    createdAt: '2026-01-01',
    status: 'active',
    notes: 'Quản trị viên trưởng hệ thống (Super Admin)'
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
  const [role, setRole] = useState<Role | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    return localStorage.getItem('cns_current_username') || '';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'MISSING' | 'UNCHECKED'>('ALL');

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

  // Item form editor state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPn, setFormPn] = useState('');
  const [formSn, setFormSn] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formCategory, setFormCategory] = useState('VHF AM');

  // Modals & Drawers state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanTargetItem, setScanTargetItem] = useState<InventoryItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminAccountModalOpen, setIsAdminAccountModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);
  const [selectedItemForUsage, setSelectedItemForUsage] = useState<InventoryItem | null>(null);
  const [isUsageHistoryOpen, setIsUsageHistoryOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

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
    const savedAutoLoad = localStorage.getItem('cns_auto_load_startup');
    return {
      webAppUrl: savedUrl !== null ? savedUrl : 'https://script.google.com/macros/s/AKfycby4frQYvyEuzbVS7rctYDaxHDhSlEzNmTgYXavWzi0ROJLYEqhfwBd1QRX4v6dVU05f/exec',
      autoSync: savedAutoSync === 'true',
      autoLoadOnStartup: savedAutoLoad !== 'false',
      lastSynced: undefined
    };
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncStatusDetail, setSyncStatusDetail] = useState('');

  // LocalStorage Auto-Save & Data Loss Prevention Configuration
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(() => {
    const savedInterval = localStorage.getItem('cns_autosave_interval');
    const savedWarn = localStorage.getItem('cns_autosave_warn_close');
    const savedShowToast = localStorage.getItem('cns_autosave_show_toast');
    const savedTime = localStorage.getItem('cns_last_saved_time');
    return {
      autoSaveInterval: savedInterval !== null ? Number(savedInterval) : 0, // default 0: realtime
      warnOnClose: savedWarn !== 'false', // default: true
      showAutoSaveToast: savedShowToast === 'true', // default: false
      lastSavedTime: savedTime || undefined
    };
  });

  // UI state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [printLayout, setPrintLayout] = useState<'NONE' | 'QR' | 'LABEL'>('NONE');
  const [darkMode, setDarkMode] = useState(false);

  // Refs for current values
  const inventoryRef = useRef<InventoryItem[]>([]);
  const syncConfigRef = useRef<SyncConfig>(syncConfig);
  const roleRef = useRef<Role>('guest');
  const usageSlipsRef = useRef<UsageSlip[]>([]);
  const categoriesRef = useRef<string[]>([]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    usageSlipsRef.current = usageSlips;
  }, [usageSlips]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

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
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
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

  const saveInventoryLocally = (newInv: InventoryItem[]) => {
    setInventory(newInv);
    try {
      localStorage.setItem('cns_inventory_v30_stable', JSON.stringify(newInv));
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      localStorage.setItem('cns_last_saved_time', nowStr);
      setStorageConfig(prev => ({ ...prev, lastSavedTime: nowStr }));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  };

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

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

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
      healthRate
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (selectedCategory !== 'Tất cả loại' && item.category !== selectedCategory) return false;
      if (statusFilter === 'OK' && item.auditStatus !== 'OK') return false;
      if (statusFilter === 'MISSING' && item.auditStatus !== 'MISSING') return false;
      if (statusFilter === 'UNCHECKED' && item.auditStatus !== null) return false;

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
    setEditingItemId(null);
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
    setEditingItemId(null);
    setFormName('');
    setFormPn('');
    setFormSn('');
    setFormWarehouse('');
    setFormLoc('');
    setFormQty(1);
    setFormCategory('VHF AM');
  };

  const handleEditClick = (item: InventoryItem) => {
    if (role !== 'admin') {
      addToast('Chỉ quản lý (Admin) mới được phép chỉnh sửa thiết bị.', 'error');
      return;
    }
    setEditingItemId(item.id);
    setFormName(item.name || '');
    setFormPn(item.pn || '');
    setFormSn(item.sn || '');
    setFormWarehouse(item.warehouse || '');
    setFormLoc(item.loc || '');
    setFormQty(item.qty || 1);
    setFormCategory(item.category || 'VHF AM');

    const el = document.getElementById('editor-panel');
    el?.scrollIntoView({ behavior: 'smooth' });
    addToast('Đã tải thông tin thiết bị lên biểu mẫu.', 'info');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSn.trim()) {
      addToast('Vui lòng điền các thông tin bắt buộc (*)', 'error');
      return;
    }

    if (editingItemId) {
      const updated = inventory.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            name: formName.trim(),
            pn: formPn.trim(),
            sn: formSn.trim(),
            warehouse: formWarehouse.trim().toUpperCase(),
            loc: formLoc.trim(),
            qty: Number(formQty) || 1,
            category: formCategory
          };
        }
        return item;
      });
      saveInventoryLocally(updated);
      addToast('Cập nhật dữ liệu thiết bị thành công!', 'success');
      playScanBeep(900, 0.1);
    } else {
      const isDuplicate = inventory.some(item => item.sn.toLowerCase() === formSn.trim().toLowerCase());
      if (isDuplicate) {
        addToast(`Cảnh báo: S/N "${formSn}" đã tồn tại trong hệ thống!`, 'error');
        return;
      }

      const newItem: InventoryItem = {
        id: `item-${Date.now()}`,
        name: formName.trim(),
        pn: formPn.trim(),
        sn: formSn.trim(),
        warehouse: formWarehouse.trim().toUpperCase(),
        loc: formLoc.trim(),
        qty: Number(formQty) || 1,
        auditStatus: null,
        auditNote: '',
        category: formCategory,
        history: []
      };
      saveInventoryLocally([...inventory, newItem]);
      addToast('Đã thêm thiết bị mới vào kho thành công!', 'success');
      playScanBeep(880, 0.15);
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
        addToast('Đã xóa thiết bị khỏi cơ sở dữ liệu.', 'success');
        playScanBeep(400, 0.3);
        setConfirmDialog(null);
      }
    });
  };

  const handleQuickStatusClick = (item: InventoryItem, nextStatus: 'OK' | 'MISSING' | null) => {
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
            user: role || 'guest'
          });
        }
        return {
          ...i,
          auditStatus: nextStatus,
          auditDate: nextStatus ? nowStr : null,
          history: updatedHistory
        };
      }
      return i;
    });
    saveInventoryLocally(updated);
    addToast(`Đã cập nhật trạng thái cho S/N: ${item.sn}`, 'success');
    playScanBeep(nextStatus === 'OK' ? 950 : 350, 0.12);
  };

  const handleResetAuditStatus = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Đặt lại trạng thái kiểm kê',
      message: 'Hành động này sẽ XÓA TOÀN BỘ trạng thái kiểm kê hiện tại của tất cả thiết bị về trạng thái CHƯA KIỂM. Bạn có đồng ý thực hiện?',
      onConfirm: () => {
        const reseted = inventory.map(item => ({
          ...item,
          auditStatus: null,
          auditDate: null,
          auditNote: ''
        }));
        saveInventoryLocally(reseted);
        addToast('Đã đặt toàn bộ thiết bị về trạng thái Chưa Kiểm kê.', 'info');
        playScanBeep(300, 0.4);
        setConfirmDialog(null);
      }
    });
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
        user: roleRef.current || 'guest'
      };

      updated[idx] = {
        ...i,
        auditStatus: status,
        auditDate: nowStr,
        auditNote: note.trim() || 'Quét mã xác nhận Đủ',
        history: i.history ? [entry, ...i.history] : [entry]
      };
    });

    saveInventoryLocally(updated);
    playScanBeep(status === 'OK' ? 1047 : 330, 0.16);
    addToast(`Quét thành công! Thiết bị đã được đánh dấu ${status === 'OK' ? 'ĐỦ' : 'THIẾU'}.`, 'success');

    if (syncConfigRef.current.autoSync) {
      setTimeout(() => syncToCloud(), 300);
    }
    return true;
  };

  // Cloud Sync
  const fetchCloudData = async (targetUrl?: string) => {
    if (syncStatus === 'syncing') return;
    if (!navigator.onLine) {
      setSyncStatus('idle');
      setSyncStatusDetail('Ngoại tuyến (Offline). Trình duyệt lưu trữ cục bộ.');
      addToast('Không có mạng để tải dữ liệu từ Cloud!', 'info');
      return;
    }

    setSyncStatus('syncing');
    setSyncStatusDetail('Đang tạo yêu cầu kết nối Server...');

    try {
      const activeUrl = targetUrl || syncConfig.webAppUrl;
      const url = `${activeUrl}?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Yêu cầu dữ liệu thất bại từ Google Apps Script.');

      const resText = await res.text();
      if (resText.trim().startsWith('<!DOCTYPE') || resText.trim().startsWith('<html')) {
        throw new Error('Đường dẫn Apps Script phản hồi HTML. Vui lòng kiểm tra quyền truy cập (Anyone).');
      }

      const data = JSON.parse(resText);
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
            history: item.history || []
          }));
          saveInventoryLocally(formatted);
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
          setSyncStatus('success');
          setSyncStatusDetail(`Đã tải xuống thành công ${formatted.length} thiết bị.`);
          addToast(`Đồng bộ thành công! Đã tải xuống ${formatted.length} thiết bị.`, 'success');
          playScanBeep(1000, 0.2);
        } else {
          setSyncStatus('success');
          setSyncStatusDetail('Kho Cloud rỗng. Có thể tiến hành đẩy lên.');
          addToast('Kho trên Cloud hiện đang trống!', 'info');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi mạng không xác định.';
      setSyncStatus('error');
      setSyncStatusDetail(errorMsg);
      addToast('Lỗi tải dữ liệu từ Cloud! Xem chi tiết ở phần cài đặt.', 'error');
      playScanBeep(250, 0.3);
    }
  };

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
    setSyncStatusDetail('Đang tải dữ liệu lên Cloud...');

    try {
      const params = new URLSearchParams();
      params.append('data', JSON.stringify(inventory));
      params.append('timestamp', Date.now().toString());
      params.append('user', role || 'anonymous');

      await fetch(syncConfig.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSyncConfig(prev => ({ ...prev, lastSynced: nowStr }));
      setSyncStatus('success');
      setSyncStatusDetail('Đã đẩy dữ liệu thành công lên Apps Script.');
      addToast('Đã đẩy toàn bộ danh sách lên Cloud thành công!', 'success');
      playScanBeep(980, 0.15);
    } catch {
      setSyncStatus('error');
      setSyncStatusDetail('Đẩy dữ liệu thất bại. Hãy kiểm tra kết nối mạng.');
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
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(inventory, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `CNS_ATM_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addToast('Xuất tệp sao lưu JSON thành công!', 'success');
      playScanBeep(1000, 0.1);
    } catch {
      addToast('Không thể xuất tệp sao lưu!', 'error');
    }
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

  const startPrintSession = (type: 'QR' | 'LABEL') => {
    setPrintLayout(type);
    addToast('Đang tạo form in... Sẽ tự động mở hộp thoại in.', 'info');
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintLayout('NONE'), 1000);
    }, 600);
  };

  const handleExportWebBill = () => {
    const win = window.open('', '_blank');
    if (!win) {
      addToast('Vui lòng cho phép trình duyệt hiển thị popup mới!', 'error');
      return;
    }
    const today = new Date().toLocaleDateString('vi-VN');
    const rowsHtml = inventory.map((item, idx) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold; text-align: left;">${item.name}</td>
        <td style="padding: 10px;">${item.category || '-'}</td>
        <td style="padding: 10px; font-family: monospace;">${item.sn}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold;">${item.warehouse || '-'}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold;">${item.qty}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="font-weight: bold; color: ${item.auditStatus === 'OK' ? '#10b981' : (item.auditStatus === 'MISSING' ? '#ef4444' : '#6b7280')};">
            ${item.auditStatus === 'OK' ? 'ĐỦ/TỐT' : (item.auditStatus === 'MISSING' ? 'THIẾU/HỎNG' : 'CHƯA KIỂM')}
          </span>
        </td>
        <td style="padding: 10px; text-align: left; font-size: 11px; max-width: 155px;">${item.auditNote || ''}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Biên Bản Kiểm Kê Kho CNS/ATM</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; color: #333; margin: 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .subtitle { font-size: 13px; color: #666; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #f3f4f6; border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-weight: bold; }
            td { border: 1px solid #e2e8f0; }
            .summary { margin-top: 30px; font-size: 13px; display: flex; justify-content: space-between; }
            .signs { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; page-break-inside: avoid; }
            .sign-box { width: 250px; font-weight: bold; }
            .sign-title { margin-bottom: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 15px;">ĐỘI THÔNG TIN - KHO VẬT TƯ DỰ PHÒNG TẠI CHỖ</div>
            <div class="title">BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ CHUYÊN NGÀNH</div>
            <div class="subtitle">Ngày tạo: ${today} - Người lập: ${role ? role.toUpperCase() : 'Guest'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên Thiết Bị / Linh Kiện</th>
                <th style="width: 100px;">Phân Loại</th>
                <th style="width: 120px;">Serial Number</th>
                <th style="width: 100px;">Mã Kho (QR)</th>
                <th style="width: 50px;">SL</th>
                <th style="width: 100px;">Trạng Thái</th>
                <th style="width: 180px;">Ghi Chú Kiểm Kê</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="summary">
            <div>
              <p>Số thiết bị đạt (ĐỦ/ỔN ĐỊNH): <strong>${stats.okCount}</strong></p>
              <p>Số thiết bị lệch (THIẾU/HỎNG): <strong style="color:red">${stats.missingCount}</strong></p>
            </div>
            <div style="text-align: right;">
              <p>Đơn vị: Đội Thông Tin Hàng Không</p>
              <p>Giờ xuất: ${new Date().toLocaleTimeString('vi-VN')}</p>
            </div>
          </div>
          <div class="signs">
            <div class="sign-box">
              <div class="sign-title">Đại Diện Tổ Kiểm Kê</div>
              <div>(Ký, ghi rõ họ tên)</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Đội Trưởng Đội Thông Tin</div>
              <div>(Ký, đóng dấu xác nhận)</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast('Đã khởi tạo bản in biên bản kiểm kê!', 'success');
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
    win.document.write(`
      <html>
        <head>
          <title>Phiếu Báo Sử Dụng Thiết Bị - ${slip.sn}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; margin: 40px; line-height: 1.6; }
            .header-table { width: 100%; border: none; margin-bottom: 30px; }
            .header-left { text-align: center; width: 45%; vertical-align: top; font-size: 11px; font-weight: bold; }
            .header-right { text-align: center; width: 55%; vertical-align: top; font-size: 11px; }
            .title { text-align: center; font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 30px 0 5px 0; color: #000; }
            .subtitle { text-align: center; font-size: 12px; font-style: italic; color: #475569; margin-bottom: 30px; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 12px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; font-size: 12.5px; margin-bottom: 15px; }
            .info-item { display: flex; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
            .info-label { font-weight: 600; color: #334155; min-width: 160px; }
            .info-value { color: #0f172a; font-weight: bold; }
            .signature-section { margin-top: 50px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 12.5px; }
            .signature-box { font-weight: bold; }
            .signature-title { margin-bottom: 70px; text-transform: uppercase; font-size: 11.5px; }
          </style>
        </head>
        <body>
          <div class="title">PHIẾU BÁO SỬ DỤNG - BÀN GIAO THIẾT BỊ</div>
          <div class="subtitle">(Ngày xuất phiếu: ${slip.date})</div>
          <div>
            <div class="section-title">I. Kỹ sư tiếp nhận sử dụng: <strong>${slip.user}</strong></div>
            <div class="section-title">II. Thiết bị: <strong>${slip.itemName}</strong> (S/N: ${slip.sn}, SL: x${slip.qtyUsed})</div>
            <div class="section-title">III. Mục đích: <strong>${slip.purpose}</strong> (Vị trí mới: ${slip.targetLocation || 'Hệ thống'})</div>
          </div>
          <div class="signature-section">
            <div class="signature-box"><div class="signature-title">Người lập phiếu</div><div>${role ? role.toUpperCase() : 'Guest'}</div></div>
            <div class="signature-box"><div class="signature-title">Kỹ sư nhận</div><div>${slip.user}</div></div>
            <div class="signature-box"><div class="signature-title">Đội Trưởng Duyệt</div><div>Phê duyệt</div></div>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
    addToast(`Đã xuất phiếu sử dụng ${slip.sn}!`, 'success');
  };

  const handleSubmitUsage = (newSlip: UsageSlip, deductInv: boolean) => {
    const nextSlips = [newSlip, ...usageSlips];
    setUsageSlips(nextSlips);
    localStorage.setItem('cns_usage_slips_v1', JSON.stringify(nextSlips));

    if (deductInv && selectedItemForUsage) {
      const updatedInv = inventory.map(item => {
        if (item.id === selectedItemForUsage.id) {
          const newQty = item.qty - newSlip.qtyUsed;
          const updatedHistory = item.history ? [...item.history] : [];
          updatedHistory.unshift({
            id: `h-use-${Date.now()}`,
            status: 'OK',
            date: newSlip.date,
            note: `Xuất sử dụng x${newSlip.qtyUsed} bộ tại: ${newSlip.targetLocation || 'Hệ thống'} (Người nhận: ${newSlip.user})`,
            user: role || 'guest'
          });
          return { ...item, qty: newQty, history: updatedHistory };
        }
        return item;
      });
      saveInventoryLocally(updatedInv);
    }

    playScanBeep(1000, 0.2);
    addToast('Đã đăng ký phiếu sử dụng thành công!', 'success');
    setSelectedItemForUsage(null);
    setTimeout(() => handlePrintUsageSlip(newSlip), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col antialiased">
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
        <div className="flex-1 flex flex-col items-center justify-center p-4">
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

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all text-sm tracking-wide mt-5 active:scale-[0.98] cursor-pointer"
              >
                ĐĂNG NHẬP HỆ THỐNG
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <p className="font-bold">Gợi ý đăng nhập mặc định:</p>
              <p className="mt-1">Super Admin: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">admin / admin</span> • Kiểm kê: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">guest / 123456</span></p>
              <p className="mt-1 text-[9.5px] italic text-amber-600 dark:text-amber-400 font-semibold">* Tài khoản Admin có quyền thêm, sửa, xóa, khóa/mở khóa & phân quyền người dùng</p>
            </div>
          </div>
        </div>
      ) : (
        /* MAIN LOGGED IN APP */
        <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-md shadow-indigo-500/10">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    VẬT TƯ DỰ PHÒNG TẠI CHỖ
                    <span className="text-[9px] translate-y-[-4px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-extrabold uppercase">
                      Đội Thông Tin
                    </span>
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống quản lý định danh & kiểm định hiện vật nội bộ CNS/ATM
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-sm text-xs font-semibold">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-indigo-500 animate-ping' : syncStatus === 'success' ? 'bg-emerald-500' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                <span className="text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  {syncStatus === 'syncing' ? 'Đang sync...' : syncStatus === 'success' ? 'Đã Sync Cloud' : 'Offline'}
                </span>
                {syncConfig.lastSynced && (
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">({syncConfig.lastSynced})</span>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer"
                aria-label="Đổi giao diện"
              >
                {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all focus:outline-none cursor-pointer"
                title="Cấu hình Google Apps Script & Bộ nhớ"
              >
                <Settings className="w-4.5 h-4.5 text-slate-500 hover:text-indigo-500 transition-colors" />
              </button>

              {/* UPGRADED ADMIN & ROLE CONTROLS */}
              {role === 'admin' ? (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent pl-2.5 pr-1 py-1 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsAdminAccountModalOpen(true)}
                    className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left"
                    title="Mở Trung Tâm Quản Trị Admin (Thêm/Bớt Người Dùng, Phân Quyền, Mật Khẩu, Snapshot)"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-black text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300 leading-none">
                          {users.find(u => u.username.toLowerCase() === currentUsername.toLowerCase())?.fullName || 'SUPER ADMIN'}
                        </span>
                        <span className="text-[7.5px] font-black uppercase bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-1 rounded">
                          ADMIN
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-700/80 dark:text-amber-400/80 leading-none mt-0.5">
                        @{currentUsername || 'admin'} • Quản trị hệ thống
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminAccountModalOpen(true)}
                    className="p-1 px-2 bg-amber-200/70 dark:bg-amber-900/60 hover:bg-amber-300/80 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-[10px] font-extrabold transition-colors cursor-pointer flex items-center gap-1 ml-1"
                    title="Quản lý Người dùng & Bảo mật"
                  >
                    <Key className="w-3 h-3" />
                    <span className="hidden sm:inline">Quản lý User</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/30 text-rose-600 font-bold rounded-xl transition-all cursor-pointer"
                    title="Đăng xuất tài khoản"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 pl-3 pr-1 py-1 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs leading-none">
                        {users.find(u => u.username.toLowerCase() === currentUsername.toLowerCase())?.fullName || 'Kiểm kê viên'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 leading-none mt-0.5">
                        @{currentUsername || 'guest'} (Kiểm kê viên)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/30 text-rose-600 font-bold rounded-xl transition-all cursor-pointer ml-1"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Stats Cards and Charts */}
          <div className="mt-6">
            <StatsCards stats={stats} inventory={inventory} />
          </div>

          {/* Search and Action Toolbar */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4.5 mt-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm: Tên thiết bị, P/N, S/N, Mã Kho..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm placeholder:text-slate-400"
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

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 dark:bg-slate-800 p-1">
                <button
                  onClick={() => fetchCloudData()}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 px-3 text-[10px] uppercase font-extrabold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Tải cấu trúc từ đám mây về"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  Tải Về (PULL)
                </button>
                <button
                  onClick={syncToCloud}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 px-3 text-[10px] uppercase font-extrabold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Đẩy dữ liệu hiện có lên Cloud"
                >
                  Đẩy Lên (PUSH)
                </button>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden md:block mx-1"></div>

              <button
                onClick={() => {
                  setScanTargetItem(null);
                  setIsScannerOpen(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/10 transition-colors text-xs tracking-wide cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                KIỂM KÊ (QUÉT)
              </button>

              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 rounded-xl p-1">
                <button
                  onClick={() => startPrintSession('QR')}
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="In bộ mã QR"
                >
                  <Printer className="w-3.5 h-3.5" />
                  MÃ QR
                </button>
                <button
                  onClick={() => startPrintSession('LABEL')}
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="In tem nhãn kỹ thuật"
                >
                  TEM NHÃN
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 rounded-xl p-1">
                <button
                  onClick={handleExportExcel}
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-emerald-600 dark:text-emerald-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Xuất bảng Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  EXCEL
                </button>
                <button
                  onClick={handleExportWebBill}
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Xuất biên bản kiểm định PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
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
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-rose-600 dark:text-rose-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-2"
                  title="Lập Biên Bản Bàn Giao thiết bị"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  BB BÀN GIAO
                </button>
                <button
                  onClick={() => setIsUsageHistoryOpen(true)}
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-amber-600 dark:text-amber-400 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-2"
                  title="Xem lịch sử phiếu báo sử dụng"
                >
                  <History className="w-3.5 h-3.5" />
                  PHIẾU SỬ DỤNG ({usageSlips.length})
                </button>
              </div>
            </div>
          </section>

          {/* Filter Pills */}
          <div className="mt-6 flex flex-col lg:flex-row gap-5 items-start lg:items-stretch">
            <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4 shadow-sm flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mr-2 ml-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-500" /> Loại máy:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="w-full lg:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4 shadow-sm flex flex-wrap gap-1 items-center">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mr-2 ml-1">
                Kiểm kê:
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter('OK')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'OK' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
                >
                  Tốt / Đủ ({inventory.filter(i => i.auditStatus === 'OK').length})
                </button>
                <button
                  onClick={() => setStatusFilter('MISSING')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'MISSING' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'}`}
                >
                  Thiếu / Hỏng ({inventory.filter(i => i.auditStatus === 'MISSING').length})
                </button>
                <button
                  onClick={() => setStatusFilter('UNCHECKED')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'UNCHECKED' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-300 shadow-sm' : 'text-slate-500'}`}
                >
                  Chưa kiểm ({inventory.filter(i => i.auditStatus === null).length})
                </button>
              </div>
            </div>
          </div>

          {/* Admin Editor Form or Guest Helper & Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            {role === 'admin' ? (
              <div id="editor-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.2rem] p-6 shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-1 px-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase">
                    Admin Form
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    {editingItemId ? 'Cập Nhật Thiết Bị' : 'Thêm Mới Thiết Bị'}
                  </h2>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Tên thiết bị *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="VD: Máy thu phát VHF Jotron"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1 ml-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Phân loại</label>
                        {!isAddingNewCat ? (
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCat(true)}
                            className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" /> Thêm nhanh
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setIsAddingNewCat(false); setNewCatInput(''); }}
                            className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                      {!isAddingNewCat ? (
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-extrabold"
                        >
                          {categories.filter(cat => cat !== 'Tất cả loại').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Phân loại..."
                            value={newCatInput}
                            onChange={(e) => setNewCatInput(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newCatInput.trim();
                              if (trimmed) {
                                if (!categories.includes(trimmed)) {
                                  const updated = [...categories, trimmed];
                                  saveCategoriesLocally(updated);
                                  setFormCategory(trimmed);
                                  addToast(`Đã thêm loại: ${trimmed}`, 'success');
                                  playScanBeep(1000, 0.1);
                                } else {
                                  setFormCategory(trimmed);
                                }
                                setIsAddingNewCat(false);
                                setNewCatInput('');
                              } else {
                                addToast('Tên loại không được trống!', 'error');
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-[32px] px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                          >
                            Lưu
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Số lượng</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formQty}
                        onChange={(e) => setFormQty(Math.max(1, Number(e.target.value)))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">P/N (Model)</label>
                      <input
                        type="text"
                        value={formPn}
                        onChange={(e) => setFormPn(e.target.value)}
                        placeholder="Mã Model"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">S/N *</label>
                      <input
                        type="text"
                        required
                        value={formSn}
                        onChange={(e) => setFormSn(e.target.value)}
                        placeholder="Số Sê-ri"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-mono font-bold placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Mã Kho (QR)</label>
                      <input
                        type="text"
                        value={formWarehouse}
                        onChange={(e) => setFormWarehouse(e.target.value)}
                        placeholder="VD: KHO-01"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-bold placeholder:text-slate-400 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">Vị trí tủ / ngăn</label>
                      <input
                        type="text"
                        value={formLoc}
                        onChange={(e) => setFormLoc(e.target.value)}
                        placeholder="Tủ 2 - Ngăn B"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm shadow-indigo-600/10 cursor-pointer text-center"
                    >
                      {editingItemId ? 'LƯU CHỈNH SỬA' : 'THÊM MỚI KHO'}
                    </button>
                    <button
                      type="button"
                      onClick={clearForm}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.2rem] p-6 shadow-sm h-fit space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-black rounded-lg uppercase">
                    Quyền kiểm kê
                  </span>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Tài khoản Guest</h2>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn đang đăng nhập bằng quyền <strong className="text-slate-700 dark:text-slate-200">Kiểm kê viên (Guest)</strong>.
                  Bạn có thể tra cứu nhanh, kiểm kê bằng QR code và kết xuất báo cáo Excel/Biên bản.
                </p>
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-2xl flex gap-2">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                    Để thêm mới hoặc chỉnh sửa thông số thiết bị, vui lòng đăng nhập bằng quyền Quản trị viên (Admin).
                  </p>
                </div>
              </div>
            )}

            {/* Inventory Table & Cards */}
            <div className="lg:col-span-3">
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
              />
            </div>
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

      {/* Item Detail Drawer */}
      <ItemDetailDrawer
        item={selectedItemDetail}
        role={role}
        onClose={() => setSelectedItemDetail(null)}
        onEdit={(item) => handleEditClick(item)}
        onUsage={(item) => setSelectedItemForUsage(item)}
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
        onAddToast={addToast}
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
      />

      {/* Mobile Floating Camera Action Button */}
      {role && (
        <button
          onClick={() => {
            setScanTargetItem(null);
            setIsScannerOpen(true);
            playScanBeep(1000, 0.1);
          }}
          className="fixed bottom-6 right-6 z-40 md:hidden w-14 h-14 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 text-white rounded-full shadow-2xl transition-all active:scale-90 flex flex-col items-center justify-center border border-indigo-500 cursor-pointer"
          title="Quét camera nhanh thiết bị"
        >
          <Camera className="w-5 h-5 text-white" />
          <span className="text-[7.5px] uppercase font-black tracking-widest leading-none mt-1">SCAN</span>
        </button>
      )}
    </div>
  );
}
