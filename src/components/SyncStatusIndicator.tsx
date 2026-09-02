import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Wifi,
  WifiOff,
  Layers,
  AlertCircle
} from 'lucide-react';
import { syncService, SyncServiceState } from '../services/syncService.ts';

interface SyncStatusIndicatorProps {
  onOpenConflictModal?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onOpenConflictModal,
  onOpenSettings,
  className = ''
}) => {
  const [syncState, setSyncState] = useState<SyncServiceState>(syncService.getState());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newState) => {
      setSyncState(newState);
    });
    return unsubscribe;
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const {
    globalStatus,
    pendingCount,
    failedCount,
    lastSyncedTime,
    isOnline,
    conflicts,
    queue,
    detailMessage
  } = syncState;

  // Determine badge styling based on requirements:
  // 🟢 Đã đồng bộ, 🟡 Đang đồng bộ, 🟠 Chờ đồng bộ, 🔴 Thất bại, ⚪ Offline
  let badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  let dotBg = 'bg-emerald-500';
  let label = 'Đã đồng bộ';
  let Icon = CheckCircle2;

  if (!isOnline || globalStatus === 'offline') {
    badgeBg = 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-400/30';
    dotBg = 'bg-slate-400';
    label = 'Ngoại tuyến (Offline)';
    Icon = CloudOff;
  } else if (globalStatus === 'syncing') {
    badgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    dotBg = 'bg-amber-500 animate-ping';
    label = 'Đang đồng bộ...';
    Icon = RefreshCw;
  } else if (globalStatus === 'conflict') {
    badgeBg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
    dotBg = 'bg-purple-500 animate-pulse';
    label = `Xung đột (${conflicts.length})`;
    Icon = AlertTriangle;
  } else if (globalStatus === 'failed' || failedCount > 0) {
    badgeBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    dotBg = 'bg-rose-500';
    label = failedCount > 0 ? `Lỗi Sync (${failedCount})` : 'Đồng bộ thất bại';
    Icon = AlertCircle;
  } else if (globalStatus === 'pending' || pendingCount > 0) {
    badgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    dotBg = 'bg-amber-500';
    label = `Chờ gửi (${pendingCount})`;
    Icon = Clock;
  }

  const handleSyncNow = () => {
    syncService.processQueue(true);
  };

  const handleRetryFailed = () => {
    syncService.retryFailed();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Indicator Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none shadow-xs ${badgeBg} hover:opacity-90 active:scale-95`}
        title="Trạng thái tự động đồng bộ Cloud"
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotBg}`} />
        <Icon className={`w-3.5 h-3.5 shrink-0 ${globalStatus === 'syncing' ? 'animate-spin' : ''}`} />
        <span className="font-bold tracking-tight text-[11px] truncate">{label}</span>
        {pendingCount > 0 && globalStatus !== 'syncing' && (
          <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-black leading-tight">
            {pendingCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[9999] animate-scale-in text-slate-800 dark:text-slate-100 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-500" />
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Tự Động Đồng Bộ Cloud
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-500">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>

          {/* Conflict Banner if any */}
          {conflicts.length > 0 && (
            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="text-[11px] font-bold text-purple-800 dark:text-purple-200">
                  Phát hiện {conflicts.length} xung đột dữ liệu
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenConflictModal?.();
                }}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
              >
                Xử lý ngay
              </button>
            </div>
          )}

          {/* Status Metrics */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Chờ Đồng Bộ</span>
              <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                {pendingCount}
                <span className="text-[10px] font-medium text-slate-400">tác vụ</span>
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Đồng Bộ Gần Nhất</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-1 truncate">
                {lastSyncedTime || 'Chưa ghi nhận'}
              </span>
            </div>
          </div>

          {/* Status Detail Message */}
          {detailMessage && (
            <div className="mt-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[10.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed border border-slate-100 dark:border-slate-800/60">
              {detailMessage}
            </div>
          )}

          {/* Queue Items Preview */}
          {queue.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">
                <span>Hàng đợi Sync Queue ({queue.length})</span>
                <span>Trạng thái</span>
              </div>
              <div className="max-h-36 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl">
                {queue.slice(0, 8).map((task) => (
                  <div key={task.id} className="p-2 flex items-center justify-between gap-2 text-[10.5px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {task.action} • {task.entityType}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {task.formattedTime || new Date(task.timestamp).toLocaleTimeString('vi-VN')}
                        {task.retryCount > 0 && ` • Thử lại: ${task.retryCount}`}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase shrink-0 ${
                        task.syncStatus === 'syncing'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 animate-pulse'
                          : task.syncStatus === 'failed'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}
                    >
                      {task.syncStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {failedCount > 0 && (
              <button
                type="button"
                onClick={handleRetryFailed}
                disabled={globalStatus === 'syncing' || !isOnline}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử lại ({failedCount})
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={globalStatus === 'syncing' || !isOnline}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${globalStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Đồng bộ ngay
            </button>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Mở cấu hình Cloud Sync"
              >
                Cấu hình
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
