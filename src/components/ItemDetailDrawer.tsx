import React, { useState } from 'react';
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
  Printer,
  ExternalLink,
  Share2,
  Check,
  Smartphone,
  Download,
  Box,
  ShieldCheck,
  XCircle,
  Copy,
  Info,
  History
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem, Role } from '../types.ts';
import { getEquipmentLookupUrl } from '../utils/qrParser.ts';

interface ItemDetailDrawerProps {
  item: InventoryItem | null;
  role: Role | null;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onUsage: (item: InventoryItem) => void;
  onPrintQr?: (item: InventoryItem) => void;
  onPrintLabel?: (item: InventoryItem) => void;
  onOpenQrModal?: (item: InventoryItem) => void;
  onOpenPublicLookup?: (item: InventoryItem) => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  item,
  role,
  onClose,
  onEdit,
  onUsage,
  onPrintQr,
  onPrintLabel,
  onOpenQrModal,
  onOpenPublicLookup,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  if (!item) return null;

  const lookupUrl = getEquipmentLookupUrl(item);
  const scanCode = item.warehouse || item.sn || item.id || '';

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleDownloadQrPng = () => {
    const svgElement = document.getElementById('item-window-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const fileName = `QR_${scanCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        downloadLink.download = fileName;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  return (
    <div className="fixed inset-0 z-[80000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fade-in no-print">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Cửa sổ Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shadow-md relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shrink-0 shadow-inner">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-200">
                  THÔNG TIN CHI TIẾT THIẾT BỊ / VẬT TƯ
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {item.category || 'Vật tư CNS'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white line-clamp-1">
                {item.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation sub-tabs (Thông tin chung & Lịch sử) */}
        <div className="px-5 sm:px-6 pt-3 pb-2 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'info'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Thông Số Kỹ Thuật & QR</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch Sử Kiểm Kê ({item.history?.length || 0})</span>
            </button>
          </div>

          {/* Quick status badge in subbar */}
          <div className="hidden sm:flex items-center gap-2">
            {item.qty === 0 ? (
              <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-black flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Hết hàng (0)
              </span>
            ) : item.qty === 1 ? (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-lg text-xs font-black flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Còn 1 bộ
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs font-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tồn kho: {item.qty} bộ
              </span>
            )}
          </div>
        </div>

        {/* Cửa sổ Thân Nội Dung (Scrollable Body) */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4.5 flex-1">
          {activeTab === 'info' ? (
            <div className="space-y-4.5">
              
              {/* Tên Thiết Bị & Khối Tổng Quan */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/70 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                      TÊN THIẾT BỊ / VẬT TƯ:
                    </span>
                  </div>
                  {item.auditStatus === 'OK' && (
                    <span className="px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40 rounded-lg text-xs font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Khớp thực tế
                    </span>
                  )}
                </div>

                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {item.name}
                </h1>

                {/* Vị trí và thời gian kiểm kê */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Vị trí kho: <strong>{item.loc || 'Kho dự phòng'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Kiểm tra: {item.auditDate || 'Chưa ghi nhận'}</span>
                  </div>
                </div>
              </div>

              {/* Bố Cục 2 Cột: Thông Số Kỹ Thuật (Trái) & Mã QR (Phải) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Cột Trái: Bảng Thông Số Định Danh */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                  <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>THÔNG SỐ ĐỊNH DANH</span>
                  </h3>

                  {/* Mã Kho */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mã Kho / Định Danh</span>
                      <strong className="text-xs sm:text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                        {item.warehouse || 'Chưa cấp'}
                      </strong>
                    </div>
                    {item.warehouse && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.warehouse!, 'warehouse')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Sao chép"
                      >
                        {copiedField === 'warehouse' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Serial (S/N) */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Số Serial (S/N)</span>
                      <strong className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white">
                        {item.sn || 'N/A'}
                      </strong>
                    </div>
                    {item.sn && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.sn, 'sn')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Sao chép"
                      >
                        {copiedField === 'sn' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Part Number (P/N) */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Part Number (P/N)</span>
                      <strong className="text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {item.pn || 'N/A'}
                      </strong>
                    </div>
                    {item.pn && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.pn!, 'pn')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Sao chép"
                      >
                        {copiedField === 'pn' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Số lượng tồn kho */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Số Lượng Tồn Thực Tế</span>
                      <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {item.qty} bộ / chiếc
                      </strong>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 rounded">
                      Khả dụng
                    </span>
                  </div>
                </div>

                {/* Cột Phải: Mã QR Định Danh Trực Quan */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-slate-800/70 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">
                      MÃ QR TRA CỨU ĐIỆN THOẠI
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quét trực tiếp bằng camera điện thoại
                    </p>
                  </div>

                  {/* Mã QR SVG */}
                  <div 
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => onOpenQrModal?.(item)}
                    title="Bấm để phóng to hoặc tải mã QR"
                  >
                    <QRCodeSVG
                      id="item-window-qr-svg"
                      value={lookupUrl || scanCode}
                      size={140}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  {/* Mã hiển thị */}
                  <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {scanCode}
                  </div>

                  {/* Các nút thao tác với mã QR */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 w-full pt-0.5">
                    <button
                      type="button"
                      onClick={handleDownloadQrPng}
                      className="py-1 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Tải ảnh QR PNG"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tải QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(lookupUrl, 'url')}
                      className="py-1 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Sao chép link tra cứu"
                    >
                      {copiedField === 'url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    {onOpenPublicLookup && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPublicLookup(item);
                        }}
                        className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Xem trang tra cứu điện thoại"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem Tra Cứu</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ghi chú & Công dụng */}
              {item.notes && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase block">Ghi chú & Công dụng:</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {item.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Tab Lịch Sử Kiểm Kê */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>DÒNG THỜI GIAN KIỂM KÊ & ĐIỀU CHUYỂN</span>
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Tổng {item.history?.length || 0} lần ghi nhận
                </span>
              </div>

              {!item.history || item.history.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Chưa có hoạt động kiểm kê lịch sử được lưu vết cho thiết bị này.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 pl-5 space-y-4">
                  {item.history.map((hist) => (
                    <div key={hist.id} className="relative text-xs sm:text-sm">
                      <div
                        className={`absolute left-[-26px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 ${
                          hist.status === 'OK' ? 'border-emerald-500 bg-emerald-500' : 'border-rose-500 bg-rose-500'
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
                          {hist.status === 'OK' ? '● ĐỦ / HOẠT ĐỘNG TỐT' : '▲ THIẾU / HỎNG'}
                        </strong>
                        <span className="text-xs text-slate-400 font-semibold">{hist.date}</span>
                      </div>
                      {hist.note && (
                        <p className="text-slate-600 dark:text-slate-300 text-xs font-medium leading-relaxed mt-1">
                          {hist.note}
                        </p>
                      )}
                      <div className="text-[11px] text-slate-400 italic mt-0.5 font-semibold">
                        Cán bộ kiểm tra: {hist.user.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cửa sổ Footer: Các nút thao tác nghiệp vụ */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {onPrintLabel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintLabel(item);
                }}
                className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="In tem nhãn dán thiết bị"
              >
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">In Tem Nhãn</span>
                <span className="sm:hidden">In Tem</span>
              </button>
            )}

            {onPrintQr && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintQr(item);
                }}
                className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="In mã QR"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">In Mã QR</span>
                <span className="sm:hidden">In QR</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onUsage(item);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Lập phiếu báo sử dụng hoặc điều chuyển thiết bị này"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Báo Sử Dụng</span>
            </button>

            {role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Chỉnh sửa thông số thiết bị"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

