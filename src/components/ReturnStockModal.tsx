import React, { useState } from 'react';
import { X, RotateCcw, CheckCircle2, AlertCircle, PackageCheck } from 'lucide-react';
import { DispatchedRecord } from '../types.ts';

interface ReturnStockModalProps {
  record: DispatchedRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReturn: (
    recordId: string,
    returnQty: number,
    returnedBy: string,
    returnNote: string,
    condition: 'GOOD' | 'NEEDS_MAINTENANCE' | 'DAMAGED'
  ) => void;
  currentUserName?: string;
}

export const ReturnStockModal: React.FC<ReturnStockModalProps> = ({
  record,
  isOpen,
  onClose,
  onConfirmReturn,
  currentUserName = 'Kỹ sư tiếp nhận'
}) => {
  const [returnQty, setReturnQty] = useState(1);
  const [returnedBy, setReturnedBy] = useState(currentUserName);
  const [condition, setCondition] = useState<'GOOD' | 'NEEDS_MAINTENANCE' | 'DAMAGED'>('GOOD');
  const [returnNote, setReturnNote] = useState('');

  // Reset or set defaults when record changes
  React.useEffect(() => {
    if (record) {
      setReturnQty(record.qty || 1);
      setReturnedBy(currentUserName || 'Kỹ sư trực ban');
      setCondition('GOOD');
      setReturnNote('');
    }
  }, [record, currentUserName]);

  if (!isOpen || !record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnQty < 1 || returnQty > record.qty) return;
    if (!returnedBy.trim()) return;

    onConfirmReturn(
      record.id,
      returnQty,
      returnedBy.trim(),
      returnNote.trim(),
      condition
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto my-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider">
              Thu Hồi & Hoàn Trả Về Kho
            </h3>
            <p className="text-xs text-slate-400 font-semibold uppercase">
              Nhập lại kho dự phòng CNS/ATM và cập nhật tồn kho
            </p>
          </div>
        </div>

        {/* Item context banner */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {record.type === 'USAGE_SLIP' ? 'Phiếu Báo Sử Dụng' : 'Biên Bản Bàn Giao'}
            </span>
            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
              {record.docNumber || `#${record.id.slice(-6)}`}
            </span>
          </div>

          <div className="text-sm font-black text-slate-900 dark:text-white">
            {record.itemName}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div>
              <span className="text-slate-400">S/N:</span> <strong className="font-mono">{record.sn}</strong>
            </div>
            <div>
              <span className="text-slate-400">Đã xuất:</span> <strong className="text-indigo-600 dark:text-indigo-400 font-black">x{record.qty} {record.unit || 'chiếc'}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Nơi đã lắp/giao:</span> <strong>{record.targetLocation}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                Số lượng hoàn trả *
              </label>
              <input
                type="number"
                min={1}
                max={record.qty}
                required
                value={returnQty}
                onChange={(e) => setReturnQty(Math.min(record.qty, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-800 dark:text-white font-extrabold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                Tình trạng kỹ thuật khi thu hồi *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'GOOD' | 'NEEDS_MAINTENANCE' | 'DAMAGED')}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-3 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="GOOD">Tốt / Hoạt động chuẩn</option>
                <option value="NEEDS_MAINTENANCE">Cần hiệu chuẩn / Bảo dưỡng</option>
                <option value="DAMAGED">Hỏng hóc / Chờ thanh lý</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
              Kỹ sư tiếp nhận thu hồi *
            </label>
            <input
              type="text"
              required
              value={returnedBy}
              onChange={(e) => setReturnedBy(e.target.value)}
              placeholder="Họ tên kỹ sư xác nhận hoàn kho"
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
              Ghi chú lý do thu hồi / Kết quả kiểm tra
            </label>
            <textarea
              rows={2}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Ví dụ: Thiết bị hoàn thành chu kỳ thử nghiệm hoặc đã thay thiết bị chính thức vào..."
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5">
            <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
              Hệ thống sẽ tự động cộng lại <strong className="font-extrabold">{returnQty} {record.unit || 'chiếc'}</strong> vào số lượng tồn kho của thiết bị này và cập nhật nhật ký lưu vết.
            </p>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold py-3 rounded-2xl text-xs transition-colors cursor-pointer text-center"
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
            >
              <CheckCircle2 className="w-4 h-4" />
              Xác Nhận Hoàn Kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
