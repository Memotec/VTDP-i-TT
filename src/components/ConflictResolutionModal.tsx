import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Laptop,
  Cloud,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Clock,
  User,
  Hash
} from 'lucide-react';
import { ConflictItem, InventoryItem } from '../types.ts';
import { syncService } from '../services/syncService.ts';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictItem[];
  onResolved: (conflictId: string, choice: 'keep_local' | 'keep_cloud', resolvedItem: InventoryItem) => void;
  onAddToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolved,
  onAddToast
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!isOpen || conflicts.length === 0) return null;

  const currentConflict = conflicts[selectedIndex] || conflicts[0];
  const local: InventoryItem = currentConflict.localData;
  const cloud: InventoryItem = currentConflict.cloudData;

  const handleResolve = (choice: 'keep_local' | 'keep_cloud') => {
    try {
      setResolvingId(currentConflict.id);
      const res = syncService.resolveConflict(currentConflict.id, choice);

      onAddToast(
        choice === 'keep_local'
          ? `Đã chọn giữ dữ liệu Máy Trạm (Local) cho thiết bị: ${currentConflict.entityName}. Hệ thống sẽ cập nhật lên Cloud.`
          : `Đã chọn giữ dữ liệu Cloud cho thiết bị: ${currentConflict.entityName}. Local đã được đồng bộ lại.`,
        'success'
      );

      onResolved(currentConflict.id, choice, res.resolvedItem);

      // Reset selection or close if last
      if (conflicts.length <= 1) {
        onClose();
      } else if (selectedIndex >= conflicts.length - 1) {
        setSelectedIndex(Math.max(0, conflicts.length - 2));
      }
    } catch (err) {
      console.error('Lỗi khi xử lý xung đột:', err);
      onAddToast('Có lỗi xảy ra khi giải quyết xung đột!', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center z-[95000] p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Phát Hiện Xung Đột Dữ Liệu
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-black">
                  {selectedIndex + 1}/{conflicts.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cùng một thiết bị được chỉnh sửa khác nhau giữa Máy Trạm (Local) và Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector if multiple conflicts */}
        {conflicts.length > 1 && (
          <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto custom-scrollbar">
            {conflicts.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setSelectedIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedIndex === idx
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {c.entityName || `Thiết bị #${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Body Comparison */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-bold">
                Quy tắc an toàn: Không tự ý ghi đè mà không có sự xác nhận của người dùng.
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Hãy đối chiếu thông tin giữa phiên bản Máy trạm cục bộ và Cloud dưới đây. Chọn phiên bản bạn muốn giữ lại.
              </p>
            </div>
          </div>

          {/* Equipment identity */}
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">
              {currentConflict.entityName}
            </h4>
            <p className="text-xs text-slate-400 font-mono">ID: {currentConflict.entityId}</p>
          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LOCAL CARD */}
            <div className="p-5 rounded-2xl border-2 border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-blue-200 dark:border-blue-900/50">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    <Laptop className="w-4 h-4" />
                    <span>MÁY TRẠM HIỆN TẠI (LOCAL)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px] font-black rounded-full">
                    v{local.version || 1}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số lượng:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{local.qty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trạng thái:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        local.auditStatus === 'OK'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : local.auditStatus === 'MISSING'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {local.auditStatus || 'Chưa kiểm'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vị trí / Tủ:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{local.loc || 'Chưa đặt'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">S/N:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{local.sn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ghi chú:</span>
                    <span className="text-slate-700 dark:text-slate-300 italic">{local.auditNote || 'Không có'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Cập nhật: {local.updatedAt ? new Date(local.updatedAt).toLocaleString('vi-VN') : 'Gần đây'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      Người sửa: {local.updatedBy || 'Kiểm kê viên'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleResolve('keep_local')}
                disabled={resolvingId === currentConflict.id}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Giữ dữ liệu Local (Ghi đè Cloud)
              </button>
            </div>

            {/* CLOUD CARD */}
            <div className="p-5 rounded-2xl border-2 border-purple-500/50 bg-purple-50/20 dark:bg-purple-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-purple-200 dark:border-purple-900/50">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <Cloud className="w-4 h-4" />
                    <span>PHIÊN BẢN TRÊN CLOUD</span>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-[10px] font-black rounded-full">
                    v{cloud.version || 1}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số lượng:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{cloud.qty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trạng thái:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        cloud.auditStatus === 'OK'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : cloud.auditStatus === 'MISSING'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {cloud.auditStatus || 'Chưa kiểm'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vị trí / Tủ:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cloud.loc || 'Chưa đặt'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">S/N:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{cloud.sn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ghi chú:</span>
                    <span className="text-slate-700 dark:text-slate-300 italic">{cloud.auditNote || 'Không có'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Cập nhật: {cloud.updatedAt ? new Date(cloud.updatedAt).toLocaleString('vi-VN') : 'Đã đồng bộ'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      Người sửa: {cloud.updatedBy || 'Cloud user'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleResolve('keep_cloud')}
                disabled={resolvingId === currentConflict.id}
                className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Giữ dữ liệu Cloud (Cập nhật Local)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <span>* Lựa chọn sẽ áp dụng ngay và không làm mất dữ liệu lịch sử kiểm kê.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
};
