import React, { useState, useRef } from 'react';
import {
  QrCode,
  Box,
  MapPin,
  Tag,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Search,
  Camera,
  Share2,
  Download,
  Printer,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem, Role } from '../types.ts';
import { getEquipmentLookupUrl, getEquipmentScanCode, findMatchingInventoryItems } from '../utils/qrParser.ts';

interface PublicItemLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookupCode: string;
  item: InventoryItem | null;
  inventory: InventoryItem[];
  role: Role | null;
  onSelectAnotherCode: (code: string) => void;
  onOpenScanner?: () => void;
  onEnterApp?: () => void;
  onPrintQr?: (item: InventoryItem) => void;
  onPrintLabel?: (item: InventoryItem) => void;
}

export const PublicItemLookupModal: React.FC<PublicItemLookupModalProps> = ({
  isOpen,
  onClose,
  lookupCode,
  item,
  inventory,
  role,
  onSelectAnotherCode,
  onOpenScanner,
  onEnterApp,
  onPrintQr,
  onPrintLabel
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState<number>(180);
  const [showQrDetails, setShowQrDetails] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentItem = item;
  const qrLookupUrl = currentItem ? getEquipmentLookupUrl(currentItem) : '';

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('public-lookup-qr-svg');
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
        const fileName = `QR_${currentItem?.warehouse || currentItem?.sn || 'thiet-bi'}.png`;
        downloadLink.download = fileName;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onSelectAnotherCode(searchInput.trim());
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in no-print">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shadow-md relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shrink-0 shadow-inner">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-200">
                CÔNG TY QUẢN LÝ BAY MIỀN NAM • ĐỘI THÔNG TIN
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                TRA CỨU THÔNG TIN THIẾT BỊ VẬT TƯ
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
              title="Đóng trang tra cứu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          
          {/* Quick Search & Switch Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tra cứu mã khác (Nhập S/N, P/N hoặc Mã Kho)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tra Cứu</span>
            </button>
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Quét camera trực tiếp"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Quét Camera</span>
              </button>
            )}
          </form>

          {/* ITEM DETAILS VIEW */}
          {currentItem ? (
            <div className="space-y-5">
              
              {/* Main Card Header */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-xs">
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 rounded-lg text-xs font-black uppercase tracking-wider">
                    {currentItem.category || 'Vật tư CNS'}
                  </span>

                  {currentItem.qty === 0 ? (
                    <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-black flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Hết hàng (0)
                    </span>
                  ) : currentItem.qty === 1 ? (
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-lg text-xs font-black flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Sắp hết (1 bộ)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng ({currentItem.qty} bộ)
                    </span>
                  )}

                  {currentItem.auditStatus === 'OK' && (
                    <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40 rounded-lg text-xs font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Đã kiểm kê khớp thực tế
                    </span>
                  )}
                </div>

                {/* Item Full Name */}
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                  {currentItem.name}
                </h1>

                {/* Quick Info Sub-bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  {currentItem.loc && (
                    <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>Vị trí: <strong>{currentItem.loc}</strong></span>
                    </div>
                  )}
                  {currentItem.auditDate && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Kiểm tra: {currentItem.auditDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 2 Columns: Specifications & QR Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Key Specifications */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
                  <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span>THÔNG SỐ ĐỊNH DANH KỸ THUẬT</span>
                  </h3>

                  {/* Mã Kho (QR) */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mã Kho / Định Danh</span>
                      <strong className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                        {currentItem.warehouse || 'Chưa cấp mã kho'}
                      </strong>
                    </div>
                    {currentItem.warehouse && (
                      <button
                        type="button"
                        onClick={() => handleCopy(currentItem.warehouse!, 'warehouse')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Sao chép mã kho"
                      >
                        {copiedField === 'warehouse' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Serial Number (S/N) */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Số Serial (S/N)</span>
                      <strong className="text-sm font-mono font-black text-slate-900 dark:text-white">
                        {currentItem.sn || 'N/A'}
                      </strong>
                    </div>
                    {currentItem.sn && (
                      <button
                        type="button"
                        onClick={() => handleCopy(currentItem.sn, 'sn')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Sao chép S/N"
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
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Part Number (P/N)</span>
                      <strong className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {currentItem.pn || 'N/A'}
                      </strong>
                    </div>
                    {currentItem.pn && (
                      <button
                        type="button"
                        onClick={() => handleCopy(currentItem.pn!, 'pn')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Sao chép P/N"
                      >
                        {copiedField === 'pn' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Vị trí & Số lượng */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Vị Trí Kho</span>
                      <strong className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate block">
                        {currentItem.loc || 'Kho Dự Phòng'}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Số Lượng</span>
                      <strong className="text-xs font-black text-slate-900 dark:text-white block">
                        {currentItem.qty} bộ / cái
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right: Live QR Code Card */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-slate-800/80 dark:to-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3.5 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">
                      MÃ QR TRA CỨU TỰ ĐỘNG
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quét bằng Camera điện thoại bất kỳ (iOS / Android / Zalo)
                    </p>
                  </div>

                  {/* QR SVG Element */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                    <QRCodeSVG
                      id="public-lookup-qr-svg"
                      value={qrLookupUrl || currentItem.warehouse || currentItem.sn}
                      size={qrSize}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  {/* QR Code String Display */}
                  <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {currentItem.warehouse || currentItem.sn}
                  </div>

                  {/* Quick Action Buttons for QR */}
                  <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="Tải ảnh mã QR PNG"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tải Mã QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(qrLookupUrl, 'url')}
                      className="py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="Sao chép link tra cứu điện thoại"
                    >
                      {copiedField === 'url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    {onPrintQr && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onPrintQr(currentItem);
                        }}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="In mã QR thiết bị này"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>In QR</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes or Usage purposes */}
              {currentItem.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase block">Ghi chú & Công dụng kỹ thuật:</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {currentItem.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* NOT FOUND STATE */
            <div className="py-10 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Không Tìm Thấy Thiết Bị Phù Hợp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mã quét hoặc tìm kiếm <strong className="font-mono text-slate-800 dark:text-slate-200">"{lookupCode}"</strong> hiện không có trong cơ sở dữ liệu vật tư Đội Thông Tin.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={onOpenScanner}
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Mở Camera Quét Mã Khác</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dữ liệu xác thực từ Kho Vật tư Dự phòng Đội Thông Tin CNS/ATM</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onEnterApp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Vào Hệ Thống Quản Trị</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Hoàn Tất</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
