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
  Info,
  FileText,
  FileDown,
  Sparkles,
  Eye,
  LayoutGrid
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem, Role } from '../types.ts';
import { getEquipmentLookupUrl, getEquipmentScanCode, findMatchingInventoryItems } from '../utils/qrParser.ts';
import { exportItemProfileToPDF, printItemProfilePDF } from '../utils/pdfExporter.ts';

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
  const [qrSize, setQrSize] = useState<number>(160);
  const [viewMode, setViewMode] = useState<'pdf' | 'card'>('pdf');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentItem = item;
  const qrLookupUrl = currentItem ? getEquipmentLookupUrl(currentItem) : '';
  const scanCode = currentItem ? (currentItem.warehouse || currentItem.sn || currentItem.id || 'CNS-EQUIP') : '';

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const getQrDataUrl = (): string | undefined => {
    try {
      const svgElement = document.getElementById('public-lookup-qr-svg');
      if (!svgElement) return undefined;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 160;
      canvas.height = 160;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 160, 160);
        // Note: synchronously we might just return undefined and let pdfExporter render via SVG
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentItem) return;
    try {
      setIsExportingPdf(true);
      await exportItemProfileToPDF(currentItem);
      setExportSuccessMsg('Đã tạo và tải tệp PDF thành công!');
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Lỗi khi tải file PDF:', err);
      alert('Không thể tạo file PDF. Vui lòng thử chức năng In Phiếu.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintPdf = () => {
    if (!currentItem) return;
    printItemProfilePDF(currentItem);
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

  const currentDateStr = new Date().toLocaleDateString('vi-VN');

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in no-print">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-scale-up flex flex-col max-h-[94vh]">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shadow-md relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shrink-0 shadow-inner">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-200">
                CÔNG TY QUẢN LÝ BAY MIỀN NAM • ĐỘI THÔNG TIN
              </div>
              <h2 className="text-xs sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                HỒ SƠ TRA CỨU THIẾT BỊ VẬT TƯ
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

        {/* View Mode Tabs & Quick Action Bar */}
        {currentItem && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="inline-flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'pdf'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Phiếu PDF Chuẩn</span>
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 bg-blue-500/30 rounded-full">
                  Gọn gàng
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ Giao Diện</span>
              </button>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Tải tệp PDF chính thức về điện thoại / máy tính"
              >
                {isExportingPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Tải File PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="In trực tiếp hoặc xuất PDF qua trình duyệt"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline">In Phiếu</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {exportSuccessMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          
          {/* Quick Search & Switch Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tra cứu mã khác (Nhập S/N, P/N hoặc Mã Kho)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tra Cứu</span>
            </button>
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Quét camera trực tiếp"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Quét QR</span>
              </button>
            )}
          </form>

          {/* ITEM DETAILS VIEW */}
          {currentItem ? (
            <div>
              {/* MODE 1: PDF DOCUMENT PREVIEW (Phiếu Lý Lịch PDF Gọn Gàng & Rõ Ràng) */}
              {viewMode === 'pdf' ? (
                <div className="space-y-3">
                  
                  {/* Floating Action Hint */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Hồ sơ kỹ thuật hiển thị theo <strong>định dạng văn bản chuẩn PDF</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isExportingPdf}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Lưu File PDF (.pdf)</span>
                    </button>
                  </div>

                  {/* Paper Document Container */}
                  <div className="bg-slate-200/80 dark:bg-slate-900/90 p-2 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-800 overflow-x-auto shadow-inner">
                    <div 
                      id="item-pdf-document-sheet"
                      className="bg-white text-black p-4 sm:p-8 rounded-xl shadow-xl border border-slate-300 max-w-[720px] mx-auto space-y-4 font-serif text-[13px] sm:text-[14px] leading-normal"
                      style={{ minWidth: '320px', fontFamily: "'Times New Roman', Times, 'DejaVu Sans', serif" }}
                    >
                      
                      {/* Document Header Table */}
                      <div className="border-b-2 border-slate-900 pb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center sm:text-left">
                          <div className="text-center">
                            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-700 font-normal">
                              TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM
                            </div>
                            <div className="text-[11px] sm:text-[12px] font-bold uppercase text-slate-900">
                              CÔNG TY QUẢN LÝ BAY MIỀN NAM
                            </div>
                            <div className="text-[11px] sm:text-[12px] font-bold uppercase text-slate-900">
                              TRUNG TÂM BẢO ĐẢM KỸ THUẬT
                            </div>
                            <div className="text-[12px] sm:text-[13px] font-bold uppercase underline text-slate-950 mt-0.5">
                              ĐỘI THÔNG TIN
                            </div>
                            <div className="text-[11px] italic text-slate-700 mt-1">
                              Số hồ sơ: <strong className="font-mono text-blue-900">LLTB-{scanCode}</strong>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-[11px] sm:text-[12px] font-bold uppercase text-slate-900">
                              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                            </div>
                            <div className="text-[12px] sm:text-[13px] font-bold underline text-slate-950 mt-0.5">
                              Độc lập - Tự do - Hạnh phúc
                            </div>
                            <div className="text-[11px] italic text-slate-700 mt-1">
                              TP. Hồ Chí Minh, ngày {currentDateStr}
                            </div>
                            <div className="mt-2 inline-block px-2.5 py-0.5 border border-blue-300 bg-blue-50 text-blue-900 text-[10px] font-bold rounded-sm uppercase tracking-wide">
                              Hồ Sơ Kỹ Thuật Số Tra Cứu Qua QR
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Title */}
                      <div className="text-center py-2 border-b border-slate-300">
                        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-950">
                          PHIẾU LÝ LỊCH & THÔNG TIN KỸ THUẬT THIẾT BỊ VẬT TƯ
                        </h1>
                      </div>

                      {/* Section I: Core Identification & Integrated QR */}
                      <div>
                        <div className="font-bold text-[12px] sm:text-[13px] uppercase text-slate-950 mb-1.5 flex items-center gap-1.5">
                          <span>I. THÔNG TIN ĐỊNH DANH THIẾT BỊ & MÃ QR TRA CỨU:</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                          {/* Left 2 Cols: Details Table */}
                          <div className="md:col-span-2 border border-slate-900 overflow-hidden">
                            <table className="w-full text-left border-collapse text-[12px] sm:text-[13px]">
                              <tbody>
                                <tr className="border-b border-slate-400 bg-slate-100">
                                  <td className="p-2 font-bold w-1/3 border-r border-slate-400">Tên trang thiết bị:</td>
                                  <td className="p-2 font-bold text-slate-950">{currentItem.name}</td>
                                </tr>
                                <tr className="border-b border-slate-400">
                                  <td className="p-2 font-bold border-r border-slate-400">Mã kho quản lý:</td>
                                  <td className="p-2 font-mono font-bold text-blue-700">
                                    {currentItem.warehouse || 'Chưa cấp mã kho'}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-400 bg-slate-50">
                                  <td className="p-2 font-bold border-r border-slate-400">Phân loại hệ thống:</td>
                                  <td className="p-2 font-bold">{currentItem.category || 'Vật tư CNS/ATM'}</td>
                                </tr>
                                <tr className="border-b border-slate-400">
                                  <td className="p-2 font-bold border-r border-slate-400">Số Serial (S/N):</td>
                                  <td className="p-2 font-mono font-bold">{currentItem.sn || 'N/A'}</td>
                                </tr>
                                <tr className="border-b border-slate-400 bg-slate-50">
                                  <td className="p-2 font-bold border-r border-slate-400">Part Number (P/N):</td>
                                  <td className="p-2 font-mono">{currentItem.pn || 'N/A'}</td>
                                </tr>
                                <tr className="border-b border-slate-400">
                                  <td className="p-2 font-bold border-r border-slate-400">Vị trí lưu kho:</td>
                                  <td className="p-2 font-bold text-amber-800">{currentItem.loc || 'Kho Dự Phòng'}</td>
                                </tr>
                                <tr className="bg-slate-50">
                                  <td className="p-2 font-bold border-r border-slate-400">Số lượng tồn kho:</td>
                                  <td className="p-2 font-bold">
                                    {currentItem.qty} {currentItem.unit || 'Bộ / Cái'}
                                    <span className="ml-2 font-normal text-[11px] italic text-slate-600">
                                      ({currentItem.qty > 0 ? 'Sẵn sàng cấp phát' : 'Hết hàng dự phòng'})
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Right 1 Col: Live QR Display */}
                          <div className="border border-slate-900 bg-slate-50 p-3 text-center flex flex-col items-center justify-center">
                            <div className="text-[10px] font-bold uppercase text-blue-900 tracking-wider mb-1.5">
                              MÃ QR ĐIỆN TỬ
                            </div>
                            <div className="p-2 bg-white border border-slate-300 rounded shadow-2xs">
                              <QRCodeSVG
                                id="public-lookup-qr-svg"
                                value={qrLookupUrl || scanCode}
                                size={120}
                                level="M"
                                includeMargin={true}
                              />
                            </div>
                            <div className="font-mono text-[11px] font-bold text-slate-900 mt-2">
                              {scanCode}
                            </div>
                            <div className="text-[9px] text-slate-500 italic mt-1 leading-tight">
                              Quét bằng Camera điện thoại hoặc Zalo để tra cứu trực tuyến
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section II: Technical State & Audit */}
                      <div>
                        <div className="font-bold text-[12px] sm:text-[13px] uppercase text-slate-950 mb-1.5">
                          II. HIỆN TRẠNG KỸ THUẬT & KIỂM ĐỊNH CHẤT LƯỢNG:
                        </div>

                        <div className="border border-slate-900 overflow-hidden">
                          <table className="w-full text-left border-collapse text-[12px] sm:text-[13px]">
                            <tbody>
                              <tr className="border-b border-slate-400">
                                <td className="p-2 font-bold w-1/3 border-r border-slate-400 bg-slate-100">
                                  Tình trạng sẵn sàng:
                                </td>
                                <td className="p-2 font-bold">
                                  {currentItem.qty === 0 ? (
                                    <span className="text-rose-700">HẾT HÀNG (0 BỘ) - CẦN ĐỀ XUẤT MUA SẮM BỔ SUNG</span>
                                  ) : currentItem.qty === 1 ? (
                                    <span className="text-amber-700">CẢNH BÁO: CÒN 1 BỘ DỰ PHÒNG CUỐI CÙNG</span>
                                  ) : (
                                    <span className="text-emerald-700">SẴN SÀNG THAY THẾ NÓNG ({currentItem.qty} BỘ/CÁI ĐỦ TIÊU CHUẨN)</span>
                                  )}
                                </td>
                              </tr>
                              <tr className="border-b border-slate-400 bg-slate-50">
                                <td className="p-2 font-bold border-r border-slate-400 bg-slate-100">
                                  Trạng thái kiểm kê:
                                </td>
                                <td className="p-2">
                                  {currentItem.auditStatus === 'OK' ? (
                                    <span className="font-bold text-emerald-800">
                                      ✓ ĐÃ KIỂM KÊ ĐỐI SOÁT THỰC TẾ TRÙNG KHỚP
                                    </span>
                                  ) : (
                                    <span>Đang lưu kho dự phòng tiêu chuẩn</span>
                                  )}
                                  {currentItem.auditDate && (
                                    <span className="text-slate-600 italic ml-1.5">
                                      (Ngày đối soát: <strong>{currentItem.auditDate}</strong>)
                                    </span>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2 font-bold border-r border-slate-400 bg-slate-100">
                                  Ghi chú & Ứng dụng:
                                </td>
                                <td className="p-2 leading-relaxed text-slate-800">
                                  {currentItem.notes || 'Vật tư linh kiện dự phòng phục vụ bảo đảm kỹ thuật hệ thống CNS/ATM - Đội Thông Tin.'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section III: Storage Standards */}
                      <div>
                        <div className="font-bold text-[12px] sm:text-[13px] uppercase text-slate-950 mb-1.5">
                          III. TIÊU CHUẨN BẢO QUẢN & AN TOÀN HÀNG KHÔNG:
                        </div>
                        <div className="border border-slate-900 p-2.5 bg-slate-50 text-[11px] sm:text-[12px] leading-relaxed space-y-1">
                          <p>
                            • <strong>Môi trường lưu kho:</strong> Nhiệt độ phòng kho 20°C - 25°C, độ ẩm tương đối ≤ 65% RH, hệ thống máy lạnh và hút ẩm chạy 24/7.
                          </p>
                          <p>
                            • <strong>An toàn tĩnh điện (ESD):</strong> Thiết bị điện tử nhạy cảm, chỉ thao tác bốc dỡ khi sử dụng dụng cụ chống tĩnh điện hoặc vòng tay tiếp địa.
                          </p>
                          <p>
                            • <strong>Quy trình luân chuyển:</strong> Mọi thao tác xuất dùng, điều động hoặc bàn giao bắt buộc phải lập Phiếu báo sử dụng theo quy định.
                          </p>
                        </div>
                      </div>

                      {/* Section IV: Signatures & System Certification */}
                      <div className="pt-2 border-t border-slate-300">
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-[12px]">
                          <div>
                            <div className="font-bold uppercase text-slate-900">NGƯỜI TRA CỨU</div>
                            <div className="italic text-[10px] text-slate-500">(Ký & ghi rõ họ tên)</div>
                            <div className="h-12 sm:h-14"></div>
                            <div className="text-[10px] text-slate-600">(Đã đối chiếu thực tế)</div>
                          </div>

                          <div>
                            <div className="font-bold uppercase text-slate-900">NHÂN VIÊN PHỤ TRÁCH KHO</div>
                            <div className="italic text-[10px] text-slate-500">(Ký & ghi rõ họ tên)</div>
                            <div className="h-12 sm:h-14"></div>
                            <div className="font-bold text-slate-900">Nhân viên Phụ trách Kho</div>
                          </div>

                          <div>
                            <div className="font-bold uppercase text-slate-900">XÁC THỰC KỸ THUẬT SỐ</div>
                            <div className="italic text-[10px] text-emerald-800">HỆ THỐNG CNS INVENTORY</div>
                            <div className="mt-1.5 p-1.5 border border-emerald-600 bg-emerald-50 rounded text-center inline-block">
                              <div className="font-bold text-[9px] text-emerald-800 uppercase">
                                ✓ ĐÃ XÁC THỰC
                              </div>
                              <div className="font-mono text-[8.5px] text-emerald-900 font-bold mt-0.5">
                                CNS-{scanCode.slice(0, 10).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Footer */}
                      <div className="border-t border-dashed border-slate-400 pt-2 text-center text-[10px] italic text-slate-500">
                        Tài liệu kỹ thuật số trích xuất tự động qua mã QR • Công ty Quản lý bay miền Nam • {currentDateStr}
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                /* MODE 2: MODERN CARD VIEW */
                <div className="space-y-4">
                  {/* Main Card Header */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-xs">
                    
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
                    <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
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

                      {/* Mã Kho */}
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
                          <span>Tải Ảnh QR</span>
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
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Kho Vật tư Dự phòng Đội Thông Tin • Quản lý bay miền Nam</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentItem && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Xuất Tệp PDF</span>
              </button>
            )}

            {onEnterApp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Hệ Thống Kho</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Đóng</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
