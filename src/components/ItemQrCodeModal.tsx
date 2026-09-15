import React, { useState } from 'react';
import {
  QrCode,
  Download,
  Share2,
  Printer,
  X,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  MapPin,
  Tag,
  Box,
  Layers,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem } from '../types.ts';
import { getEquipmentLookupUrl } from '../utils/qrParser.ts';

interface ItemQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onPrintQr?: (item: InventoryItem) => void;
  onPrintLabel?: (item: InventoryItem) => void;
  onOpenPublicLookup?: (item: InventoryItem) => void;
}

export const ItemQrCodeModal: React.FC<ItemQrCodeModalProps> = ({
  isOpen,
  onClose,
  item,
  onPrintQr,
  onPrintLabel,
  onOpenPublicLookup
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrSize, setQrSize] = useState<number>(220);

  if (!isOpen || !item) return null;

  const lookupUrl = getEquipmentLookupUrl(item);
  const scanCode = item.warehouse || item.sn || item.id;

  const handleCopyUrl = () => {
    if (!lookupUrl) return;
    navigator.clipboard.writeText(lookupUrl);
    setCopiedUrl(true);
    setTimeout(() => {
      setCopiedUrl(false);
    }, 2000);
  };

  const handleDownloadPng = () => {
    const svgElement = document.getElementById('item-qr-svg-code');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 60;
      canvas.height = img.height + 100;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Header Text
        ctx.fillStyle = '#1E3A8A';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ĐỘI THÔNG TIN CNS - VẬT TƯ DỰ PHÒNG', canvas.width / 2, 24);

        // Draw Image
        ctx.drawImage(img, 30, 35);

        // Draw Code
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(scanCode, canvas.width / 2, canvas.height - 35);

        // Draw Name
        ctx.fillStyle = '#475569';
        ctx.font = '10px sans-serif';
        const truncatedName = item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name;
        ctx.fillText(truncatedName, canvas.width / 2, canvas.height - 18);

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
    <div className="fixed inset-0 z-[95000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in no-print">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-scale-up flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">
                MÃ QR ĐỊNH DANH TRA CỨU
              </h3>
              <p className="text-[11px] text-blue-100">
                Quét bằng Camera điện thoại bất kỳ để xem thông tin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center flex flex-col items-center">
          
          {/* Item Basic Summary */}
          <div className="space-y-1 w-full text-left bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {item.category || 'Vật tư CNS'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                SL: <strong>{item.qty} bộ</strong>
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2">
              {item.name}
            </h4>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              <span>S/N: <strong className="font-mono text-slate-800 dark:text-slate-200">{item.sn}</strong></span>
              {item.loc && <span>Vị trí: <strong>{item.loc}</strong></span>}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-indigo-100 dark:border-slate-700 inline-block">
            <QRCodeSVG
              id="item-qr-svg-code"
              value={lookupUrl || scanCode}
              size={qrSize}
              level="M"
              includeMargin={true}
            />
          </div>

          {/* Code badge */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs font-mono font-black text-indigo-700 dark:text-indigo-300">
              <QrCode className="w-3.5 h-3.5" />
              <span>{scanCode}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Người dùng bất kỳ khi dùng điện thoại quét mã QR này sẽ được chuyển ngay đến trang hiển thị đầy đủ thông số của thiết bị.
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-1">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Tải ảnh QR PNG độ nét cao"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Tải Ảnh QR</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Sao chép liên kết URL tra cứu"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-indigo-600" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {onPrintLabel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintLabel(item);
                }}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                title="In tem nhãn dán thiết bị"
              >
                <Printer className="w-4 h-4 text-amber-600" />
                <span>In Tem Nhãn</span>
              </button>
            )}

            {onOpenPublicLookup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublicLookup(item);
                }}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                title="Mở xem giao diện tra cứu trên điện thoại"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Xem Tra Cứu</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
