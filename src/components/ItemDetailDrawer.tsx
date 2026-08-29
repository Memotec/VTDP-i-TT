import React from 'react';
import {
  X,
  Clock,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Tag,
  Hash,
  Layers,
  Edit3,
  Send,
  Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem, Role } from '../types.ts';

interface ItemDetailDrawerProps {
  item: InventoryItem | null;
  role: Role | null;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onUsage: (item: InventoryItem) => void;
  onPrintQr?: (item: InventoryItem) => void;
  onPrintLabel?: (item: InventoryItem) => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  role,
  onClose,
  onEdit,
  onUsage,
  onPrintQr,
  onPrintLabel,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex justify-end z-[80000] animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-screen shadow-2xl flex flex-col border-l border-slate-150 dark:border-slate-800 animate-slide-left">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-black bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                Chi tiết thiết bị CNS
              </span>
              <span className="text-xs font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg">
                {item.category}
              </span>
            </div>
            <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg line-clamp-1">
              {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:text-slate-950 dark:hover:text-white text-slate-400 cursor-pointer rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable details contents */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* QR Code Identification Card with Print Buttons */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/60 dark:to-slate-800/30 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3.5">
            {item.warehouse || item.sn ? (
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <QRCodeSVG value={item.warehouse || item.sn} size={160} level="M" />
              </div>
            ) : (
              <div className="w-40 h-40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                Chưa có mã QR
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                <QrCode className="w-4 h-4" />
                <span>{item.warehouse || item.sn || 'N/A'}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mã QR định danh quản lý & vị trí kho dự phòng tại chỗ
              </p>
            </div>

            {/* In nhãn / In QR nhanh cho 1 thiết bị */}
            <div className="flex items-center gap-2 pt-1 w-full">
              {onPrintQr && (
                <button
                  type="button"
                  onClick={() => onPrintQr(item)}
                  className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Mã QR</span>
                </button>
              )}
              {onPrintLabel && (
                <button
                  type="button"
                  onClick={() => onPrintLabel(item)}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>In Tem Nhãn</span>
                </button>
              )}
            </div>
          </div>

          {/* Equipment Technical Attributes */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 space-y-4.5">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Thông số & Vị trí kỹ thuật</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" /> P/N - Model
                </span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold block text-sm">
                  {item.pn || 'N/A'}
                </strong>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" /> Serial (S/N)
                </span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold block text-sm">
                  {item.sn}
                </strong>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Số lượng tồn
                </span>
                <strong className="text-slate-800 dark:text-slate-200 font-black block text-sm">
                  {item.qty} bộ / chiếc
                </strong>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Vị trí phân kho
                </span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold block text-sm">
                  {item.loc || 'N/A'}
                </strong>
              </div>
            </div>

            {/* Audit Status block */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase block">
                  Trạng thái kiểm định
                </span>
                {item.auditStatus === 'OK' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ĐỦ / HOẠT ĐỘNG TỐT
                  </span>
                ) : item.auditStatus === 'MISSING' ? (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-extrabold text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-2.5 py-1 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5" /> THIẾU / HỎNG HÓC
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold text-xs bg-slate-200/70 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                    CHƯA KIỂM KÊ
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase block">
                  Ngày kiểm kê cuối
                </span>
                <strong className="text-slate-800 dark:text-slate-200 block font-mono text-xs sm:text-sm">
                  {item.auditDate || 'Chưa ghi nhận'}
                </strong>
              </div>
            </div>

            {item.auditNote && (
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs font-extrabold text-slate-400 block uppercase tracking-wider">
                  Ghi chú kiểm định:
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed italic">
                  "{item.auditNote}"
                </p>
              </div>
            )}
          </div>

          {/* History Timeline */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <Clock className="w-4.5 h-4.5 text-indigo-500" />
              <span className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider">
                LỊCH SỬ KIỂM KÊ GẦN ĐÂY
              </span>
            </div>

            {!item.history || item.history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Chưa có hoạt động kiểm kê lịch sử được lưu vết cho mã này.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3.5 pl-5 space-y-4.5">
                {item.history.map((hist) => (
                  <div key={hist.id} className="relative text-xs sm:text-sm">
                    <div
                      className={`absolute left-[-28px] top-1 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 ${
                        hist.status === 'OK' ? 'border-emerald-500' : 'border-rose-500'
                      }`}
                    ></div>

                    <div className="flex justify-between items-start">
                      <strong
                        className={
                          hist.status === 'OK'
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-rose-600 dark:text-rose-400 font-bold'
                        }
                      >
                        {hist.status === 'OK' ? '● ĐỦ / HOẠT ĐỘNG TỐT' : '▲ THIẾU THIẾT BỊ'}
                      </strong>
                      <span className="text-xs text-slate-400 font-semibold">{hist.date}</span>
                    </div>
                    {hist.note && (
                      <p className="text-slate-600 dark:text-slate-300 text-xs font-medium leading-relaxed mt-1">
                        {hist.note}
                      </p>
                    )}
                    <div className="text-xs text-slate-400 italic mt-1 font-semibold block">
                      Người kiểm tra: {hist.user.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer footer */}
        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              if (role === 'admin') onEdit(item);
            }}
            disabled={role !== 'admin'}
            className="flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Edit3 className="w-4 h-4" />
            <span>Chỉnh sửa</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onUsage(item);
            }}
            className="flex-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/45 dark:hover:bg-amber-900/35 text-amber-700 dark:text-amber-400 font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Báo sử dụng</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
