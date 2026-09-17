import React from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  AlertTriangle, 
  Sun, 
  Moon, 
  Menu, 
  Camera,
  Layers,
  FileText
} from 'lucide-react';
import { Role } from '../types.ts';
import { SyncStatusIndicator } from './SyncStatusIndicator.tsx';

interface MobileAppHeaderProps {
  activeWorkspaceTab: 'INVENTORY' | 'DISPATCHED' | 'AUDIT_LOG';
  inventoryCount: number;
  dispatchedCount: number;
  auditLogsCount: number;
  lowStockCount: number;
  role: Role | null;
  currentUsername: string | null;
  userFullName?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenMenu: () => void;
  onOpenScanner: () => void;
  onAddNewItem?: () => void;
  onToggleSearch?: () => void;
  onOpenLowStock?: () => void;
  onOpenSettings?: () => void;
  onOpenConflictModal?: () => void;
  onOpenAppsScriptFix?: () => void;
  onPullCloud?: () => void;
}

export const MobileAppHeader: React.FC<MobileAppHeaderProps> = ({
  activeWorkspaceTab,
  inventoryCount,
  dispatchedCount,
  auditLogsCount,
  lowStockCount,
  role,
  currentUsername,
  userFullName,
  darkMode,
  onToggleDarkMode,
  onOpenMenu,
  onOpenScanner,
  onAddNewItem,
  onToggleSearch,
  onOpenLowStock,
  onOpenSettings,
  onOpenConflictModal,
  onOpenAppsScriptFix,
  onPullCloud,
}) => {
  const getTabTitle = () => {
    switch (activeWorkspaceTab) {
      case 'INVENTORY':
        return { name: 'Kho Vật Tư', count: inventoryCount, unit: 'vật tư', icon: Database };
      case 'DISPATCHED':
        return { name: 'Đã Báo SD & Bàn Giao', count: dispatchedCount, unit: 'hồ sơ', icon: Layers };
      case 'AUDIT_LOG':
        return { name: 'Nhật Ký Hệ Thống', count: auditLogsCount, unit: 'bản ghi', icon: FileText };
      default:
        return { name: 'Kho Dự Phòng', count: inventoryCount, unit: 'vật tư', icon: Database };
    }
  };

  const tabInfo = getTabTitle();
  const TabIcon = tabInfo.icon;
  const userInitials = (userFullName || currentUsername || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="md:hidden bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-3.5 py-2.5 shadow-xs transition-colors">
      <div className="flex items-center justify-between gap-2">
        {/* Left: App Brand & Current Workspace Tab */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                ĐỘI TT CNS
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shrink-0">
                <TabIcon className="w-2.5 h-2.5" />
                Tổng: {tabInfo.count} / {tabInfo.unit}
              </span>
            </div>
            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
              Kho dự phòng tại chỗ • TT BĐKT
            </p>
          </div>
        </div>

        {/* Right: Quick App Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Cloud Auto-Sync Indicator */}
          {onOpenSettings && (
            <SyncStatusIndicator
              onOpenSettings={onOpenSettings}
              onOpenConflictModal={onOpenConflictModal}
              onOpenAppsScriptFix={onOpenAppsScriptFix}
              onPullCloud={onPullCloud}
            />
          )}

          {/* Quick Search toggle */}
          {onToggleSearch && (
            <button
              type="button"
              onClick={onToggleSearch}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
              title="Tìm kiếm thiết bị"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Low Stock Warning badge */}
          {lowStockCount > 0 && onOpenLowStock && (
            <button
              type="button"
              onClick={onOpenLowStock}
              className="relative w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 flex items-center justify-center active:scale-95 transition-transform animate-pulse"
              title={`${lowStockCount} thiết bị sắp hết`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[8.5px] font-black flex items-center justify-center shadow-xs">
                {lowStockCount > 9 ? '9+' : lowStockCount}
              </span>
            </button>
          )}

          {/* Admin Quick Add Item button */}
          {role === 'admin' && onAddNewItem && (
            <button
              type="button"
              onClick={onAddNewItem}
              className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center active:scale-95 transition-transform shadow-xs shadow-blue-500/30"
              title="Thêm thiết bị mới"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Theme switch */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
            title="Đổi giao diện Sáng / Tối"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mobile Profile / Menu Button */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 active:scale-95 transition-transform cursor-pointer"
            title="Mở bảng điều khiển cá nhân"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-2xs">
              {userInitials}
            </div>
            <Menu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
