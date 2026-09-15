import React from 'react';
import { 
  X, 
  User, 
  Database, 
  Layers, 
  FileText, 
  Printer, 
  HardDrive, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Smartphone, 
  CloudRain, 
  Sun, 
  Moon, 
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Role } from '../types.ts';

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  currentUsername: string | null;
  userFullName?: string;
  inventoryCount: number;
  dispatchedCount: number;
  auditLogsCount: number;
  activeWorkspaceTab: 'INVENTORY' | 'DISPATCHED' | 'AUDIT_LOG';
  onSelectWorkspaceTab: (tab: 'INVENTORY' | 'DISPATCHED' | 'AUDIT_LOG') => void;
  onOpenPrintCenter: () => void;
  onOpenGoogleDrive: () => void;
  onOpenAdminAccounts: () => void;
  onOpenSettings: () => void;
  onOpenSystemAuditLogs: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export const MobileDrawerMenu: React.FC<MobileDrawerMenuProps> = ({
  isOpen,
  onClose,
  role,
  currentUsername,
  userFullName,
  inventoryCount,
  dispatchedCount,
  auditLogsCount,
  activeWorkspaceTab,
  onSelectWorkspaceTab,
  onOpenPrintCenter,
  onOpenGoogleDrive,
  onOpenAdminAccounts,
  onOpenSettings,
  onOpenSystemAuditLogs,
  onLogout,
  darkMode,
  onToggleDarkMode,
  onInstallPwa,
  canInstallPwa = false,
}) => {
  if (!isOpen) return null;

  const handleNav = (tab: 'INVENTORY' | 'DISPATCHED' | 'AUDIT_LOG') => {
    onSelectWorkspaceTab(tab);
    onClose();
  };

  const userInitials = (userFullName || currentUsername || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[60000] md:hidden animate-fade-in">
      {/* Dark overlay backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-up Bottom Sheet Drawer */}
      <div className="fixed bottom-0 left-0 right-0 max-h-[88vh] bg-white dark:bg-[#131B2E] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden pb-safe z-10 animate-slide-up">
        {/* Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/25">
              {userInitials}
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                {userFullName || currentUsername || 'Người dùng'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  role === 'admin'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                }`}>
                  {role === 'admin' ? 'Super Admin' : 'Kiểm kê viên'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">@{currentUsername}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* Workspace Tabs Section */}
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 px-1">
              Phân Hệ Làm Việc
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleNav('INVENTORY')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                  activeWorkspaceTab === 'INVENTORY'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4.5 h-4.5" />
                  <span>Kho Thiết Bị & Vật Tư</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeWorkspaceTab === 'INVENTORY' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {inventoryCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('DISPATCHED')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                  activeWorkspaceTab === 'DISPATCHED'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4.5 h-4.5" />
                  <span>Sổ Bàn Giao & Điều Chuyển</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeWorkspaceTab === 'DISPATCHED' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {dispatchedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('AUDIT_LOG')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                  activeWorkspaceTab === 'AUDIT_LOG'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4.5 h-4.5" />
                  <span>Nhật Ký Hoạt Động Hệ Thống</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeWorkspaceTab === 'AUDIT_LOG' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {auditLogsCount}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Operations & Tools */}
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 px-1">
              Công Cụ & Tiện Ích
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenPrintCenter();
                  onClose();
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-bold active:scale-98 transition-all"
              >
                <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">In Ấn & Tem QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenGoogleDrive();
                  onClose();
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 text-xs font-bold active:scale-98 transition-all"
              >
                <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Google Drive</span>
              </button>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAdminAccounts();
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 text-xs font-bold active:scale-98 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">Tài Khoản Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold active:scale-98 transition-all"
              >
                <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">Cài Đặt Đồng Bộ</span>
              </button>
            </div>
          </div>

          {/* Mobile PWA Install option */}
          {canInstallPwa && onInstallPwa && (
            <div className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black">Cài Đặt App Vào Điện Thoại</h4>
                    <p className="text-[10px] text-white/80 truncate">Mở toàn màn hình, kiểm kê không cần mạng</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onInstallPwa();
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-xl text-xs font-black uppercase shadow-xs shrink-0 cursor-pointer active:scale-95"
                >
                  Cài Ngay
                </button>
              </div>
            </div>
          )}

          {/* Theme & System Controls */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Chế độ hiển thị {darkMode ? 'Ban Đêm' : 'Ban Ngày'}</span>
            </span>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="px-3 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 shadow-2xs cursor-pointer active:scale-95"
            >
              {darkMode ? 'Bật Sáng' : 'Bật Tối'}
            </button>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-black uppercase tracking-wider active:scale-98 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất Tài Khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};
