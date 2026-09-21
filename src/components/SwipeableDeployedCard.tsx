import React, { useState } from 'react';
import { motion, PanInfo } from 'motion/react';
import {
  RotateCcw, Eye, Printer, QrCode, Trash2,
  FileText, ArrowRightLeft, User, Building2, MapPin, CheckCircle2,
  ChevronRight, Sparkles
} from 'lucide-react';
import { DispatchedRecord, Role } from '../types.ts';
import { playScanSuccessTone, triggerScanHaptic } from '../utils/audio.ts';

interface SwipeableDeployedCardProps {
  record: DispatchedRecord;
  index: number;
  isSelected: boolean;
  role: Role | null;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onViewDetail: (record: DispatchedRecord) => void;
  onPrintRecord: (record: DispatchedRecord) => void;
  onReturnRecord: (record: DispatchedRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onOpenPrintCenter?: (mode: 'QR' | 'LABEL' | 'AUDIT_REPORT', defaultScope?: 'ALL' | 'FILTERED', selectedItems?: any[]) => void;
}

export const SwipeableDeployedCard: React.FC<SwipeableDeployedCardProps> = ({
  record,
  index,
  isSelected,
  role,
  onToggleSelect,
  onViewDetail,
  onPrintRecord,
  onReturnRecord,
  onDeleteRecord,
  onOpenPrintCenter
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isHandover = record.type === 'HANDOVER_DOC';
  const isDeployed = record.status === 'DEPLOYED';

  const handleDrag = (_: any, info: PanInfo) => {
    // Only allow left drag for deployed items
    if (isDeployed && info.offset.x < 0) {
      setDragOffset(info.offset.x);
      setIsSwiping(true);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsSwiping(false);
    if (isDeployed && info.offset.x < -85) {
      // Trigger quick return
      playScanSuccessTone();
      triggerScanHaptic('success');
      onReturnRecord(record);
    }
    setDragOffset(0);
  };

  const isThresholdPassed = dragOffset < -85;

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 select-none touch-pan-y">
      {/* Background Swipe Action Layer (Visible when dragging left) */}
      {isDeployed && (
        <div 
          onClick={() => {
            playScanSuccessTone();
            triggerScanHaptic('success');
            onReturnRecord(record);
          }}
          className={`absolute inset-0 rounded-2xl flex items-center justify-end px-5 transition-colors cursor-pointer ${
            isThresholdPassed 
              ? 'bg-emerald-600 text-white shadow-inner' 
              : 'bg-emerald-700/90 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="text-xs font-black uppercase tracking-wider block">
                {isThresholdPassed ? 'Thả tay để thu hồi!' : 'Kéo để thu hồi'}
              </span>
              <span className="text-[10px] text-emerald-100 font-medium">
                Hoàn trả thiết bị về kho
              </span>
            </div>
            <div className={`w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center transition-transform ${
              isThresholdPassed ? 'scale-125 rotate-[-45deg] bg-white text-emerald-700' : 'scale-100'
            }`}>
              <RotateCcw className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Foreground Swipeable Card */}
      <motion.div
        drag={isDeployed ? "x" : false}
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.15}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className={`relative z-10 p-4 rounded-2xl border transition-all ${
          isSelected
            ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-md ring-2 ring-blue-500/30'
            : 'bg-white dark:bg-[#131B2E] border-slate-300 dark:border-slate-800 shadow-sm'
        } ${isSwiping ? 'shadow-lg' : ''}`}
      >
        {/* Card Header Row: Checkbox + Doc Type + Doc Number + Status */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            {/* 44px touch target checkbox */}
            <label 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(record.id, e);
              }}
              className="min-w-[44px] min-h-[44px] -ml-2 -my-2 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="w-5 h-5 rounded-md text-[#2563EB] focus:ring-blue-500 cursor-pointer pointer-events-none"
              />
            </label>

            <span className={`inline-flex items-center gap-1 text-[10.5px] font-black uppercase px-2.5 py-1 rounded-lg ${
              isHandover 
                ? 'bg-blue-100 text-[#2563EB] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-900' 
                : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-900'
            }`}>
              {isHandover ? <ArrowRightLeft className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              {isHandover ? 'BB Bàn Giao' : 'Phiếu Sử Dụng'}
            </span>

            <span className="font-mono text-xs font-black text-slate-900 dark:text-white truncate">
              {record.docNumber || `#${record.id.slice(-6)}`}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {isDeployed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg">
                <CheckCircle2 className="w-3 h-3" /> Đang dùng
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-md">
                <RotateCcw className="w-2.5 h-2.5" /> Hoàn kho
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="py-3 space-y-2.5">
          {/* Item Name */}
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onViewDetail(record)}
              className="text-left font-extrabold text-sm text-slate-900 dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400 active:text-blue-700 transition-colors leading-snug line-clamp-2"
            >
              {record.itemName}
            </button>
            <span className="shrink-0 inline-flex items-center font-black text-xs px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              x{record.qty} {record.unit || 'chiếc'}
            </span>
          </div>

          {/* S/N and P/N Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              S/N: {record.sn}
            </span>
            {record.pn && (
              <span className="font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                P/N: {record.pn}
              </span>
            )}
            <span className="text-[10px] bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 font-bold">
              {record.category || 'Vật tư CNS'}
            </span>
          </div>

          {/* Meta Info: Location, Receiver, Purpose */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{record.targetLocation || 'Hiện trường / Chưa gán'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
              <User className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{record.receiverName} {record.receiverDept ? `(${record.receiverDept})` : ''}</span>
            </div>
            {record.purpose && (
              <div className="text-[11px] text-slate-600 dark:text-slate-400 italic font-medium line-clamp-1">
                Lý do: {record.purpose}
              </div>
            )}
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
              Ngày xuất: {record.date} {record.returnedDate ? `• Ngày hoàn: ${record.returnedDate.split(' ')[0]}` : ''}
            </div>
          </div>
        </div>

        {/* Card Swipe Hint on mobile for deployed items */}
        {isDeployed && (
          <div className="flex items-center justify-between text-[10.5px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 mb-3">
            <span className="flex items-center gap-1 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vuốt thẻ sang trái để thu hồi nhanh</span>
            </span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">⟵ Trượt</span>
          </div>
        )}

        {/* High-Target Ergonomic Action Buttons (Min 44px height for mobile) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          {/* Quick Return Button if deployed (44px min touch target) */}
          {isDeployed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playScanSuccessTone();
                triggerScanHaptic('success');
                onReturnRecord(record);
              }}
              className="flex-1 min-h-[44px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 touch-manipulation"
              title="Thu hồi và hoàn trả thiết bị này về kho"
            >
              <RotateCcw className="w-4 h-4" />
              <span>THU HỒI KHO</span>
            </button>
          )}

          {/* View Details Button (44px min touch target) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(record);
            }}
            className="min-h-[44px] px-3.5 py-2.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 touch-manipulation"
            title="Xem chi tiết hồ sơ"
          >
            <Eye className="w-4 h-4 text-[#2563EB]" />
            <span>Chi tiết</span>
          </button>

          {/* Print Original Doc Button (44px min touch target) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrintRecord(record);
            }}
            className="min-h-[44px] px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-200 dark:border-amber-900/60 active:scale-95 touch-manipulation"
            title="In phiếu / Biên bản gốc"
          >
            <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>In phiếu</span>
          </button>

          {/* Print QR Tag Button (44px min touch target) */}
          {onOpenPrintCenter && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const singleItem = {
                  id: record.itemId || record.id,
                  name: record.itemName,
                  category: record.category || 'Vật tư CNS',
                  sn: record.sn || 'N/A',
                  pn: record.pn || '',
                  warehouse: record.warehouse || 'Kho Trung tâm',
                  loc: record.targetLocation || 'Tại hiện trường',
                  qty: record.qty || 1,
                  minQty: 1,
                  unit: record.unit || 'Cái',
                  auditStatus: 'OK' as const,
                  auditDate: record.date,
                  condition: 'GOOD' as const,
                  notes: record.purpose || ''
                };
                onOpenPrintCenter('QR', 'SELECTED', [singleItem]);
              }}
              className="min-h-[44px] px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-900/60 active:scale-95 touch-manipulation"
              title="In tem mã QR"
            >
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>In tem</span>
            </button>
          )}

          {/* Admin Delete Button (44px min touch target) */}
          {role === 'admin' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRecord(record.id);
              }}
              className="min-h-[44px] px-3 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center border border-rose-200 dark:border-rose-900/60 active:scale-95 touch-manipulation"
              title="Xóa bản ghi (Admin)"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
