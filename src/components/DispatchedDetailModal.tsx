import React from 'react';
import { X, FileText, ArrowRightLeft, Printer, RotateCcw, Building2, User, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { DispatchedRecord } from '../types.ts';

interface DispatchedDetailModalProps {
  record: DispatchedRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (record: DispatchedRecord) => void;
  onReturnClick: (record: DispatchedRecord) => void;
}

export const DispatchedDetailModal: React.FC<DispatchedDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  onPrint,
  onReturnClick
}) => {
  if (!isOpen || !record) return null;

  const isHandover = record.type === 'HANDOVER_DOC';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-2xl relative max-h-[92vh] overflow-y-auto my-8 flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header banner */}
        <div className="flex items-center gap-3.5 border-b border-slate-150 dark:border-slate-800 pb-5 mb-5 shrink-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
            isHandover ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            {isHandover ? <ArrowRightLeft className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                isHandover ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {isHandover ? 'Biên Bản Bàn Giao Tài Sản' : 'Phiếu Báo Sử Dụng Thiết Bị'}
              </span>
              <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-300">
                {record.docNumber || `#${record.id.slice(-6)}`}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mt-1">
              Chi Tiết Hồ Sơ Luân Chuyển
            </h3>
          </div>
        </div>

        {/* Status banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Trạng thái hiện tại:</span>
            {record.status === 'DEPLOYED' ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-black text-xs bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> ĐANG SỬ DỤNG / HOẠT ĐỘNG
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-black text-xs bg-slate-200/80 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                <RotateCcw className="w-3.5 h-3.5" /> ĐÃ THU HỒI VỀ KHO
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {record.date}
          </div>
        </div>

        {/* Main info card */}
        <div className="space-y-4 text-xs sm:text-sm">
          {/* Equipment technical details */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200/70 dark:border-slate-700/70 space-y-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Thông tin thiết bị kỹ thuật
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {record.itemName}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Chủng loại</span>
                <strong className="text-slate-800 dark:text-slate-200">{record.category}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Serial (S/N)</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{record.sn}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Part Number</span>
                <strong className="text-slate-800 dark:text-slate-200">{record.pn || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Số lượng xuất</span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                  x{record.qty} {record.unit || 'chiếc'}
                </strong>
              </div>
            </div>
          </div>

          {/* Giver & Receiver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Building2 className="w-3 h-3 text-rose-500" /> Bên giao / Kho xuất
              </span>
              <div className="font-extrabold text-slate-800 dark:text-slate-200">
                {record.giverDept || 'Đội Thông Tin – Trung tâm BĐKT'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Đại diện: <strong className="text-slate-700 dark:text-slate-300">{record.giverName || 'Admin / Đội trưởng'}</strong> {record.giverPos && `(${record.giverPos})`}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-500" /> Bên nhận / Kỹ sư tiếp nhận
              </span>
              <div className="font-extrabold text-slate-800 dark:text-slate-200">
                {record.receiverDept || 'Tổ Kỹ Thuật Chuyên Ngành'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3" /> Người nhận: <strong className="text-indigo-600 dark:text-indigo-400">{record.receiverName}</strong> {record.receiverPos && `(${record.receiverPos})`}
              </div>
            </div>
          </div>

          {/* Location & Purpose */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-2">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500" /> Vị trí lắp đặt / Hệ thống đích
              </span>
              <div className="font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm mt-0.5">
                {record.targetLocation}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Mục đích sử dụng / Lý do bàn giao
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium text-xs mt-0.5 leading-relaxed">
                {record.purpose}
              </p>
            </div>

            {record.notes && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Ghi chú kỹ thuật
                </span>
                <p className="text-slate-600 dark:text-slate-400 italic text-xs mt-0.5">
                  "{record.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Returned details if any */}
          {record.status === 'RETURNED' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Thông tin thu hồi / Hoàn kho
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {record.returnedDate}
                </span>
              </div>
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                Kỹ sư tiếp nhận thu hồi: <strong>{record.returnedBy || 'N/A'}</strong> (Đã hoàn trả {record.returnedQty || record.qty} {record.unit || 'chiếc'})
              </div>
              {record.returnNote && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300 italic pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  "{record.returnNote}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-150 dark:border-slate-800 mt-6 shrink-0">
          {record.status === 'DEPLOYED' ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReturnClick(record);
              }}
              className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Thu Hồi & Hoàn Kho
            </button>
          ) : <div />}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onPrint(record)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
            >
              <Printer className="w-3.5 h-3.5" />
              In Lại Hồ Sơ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
