import React, { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { InventoryItem } from '../types.ts';
import { playScanBeep } from '../utils/audio.ts';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  scanTargetItem: InventoryItem | null;
  onScanned: (code: string, status: 'OK' | 'MISSING', note: string) => boolean;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  scanTargetItem,
  onScanned
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [scanInputCode, setScanInputCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'OK' | 'MISSING'>('OK');
  const [scanNote, setScanNote] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scanStatusRef = useRef<'OK' | 'MISSING'>('OK');
  const scanNoteRef = useRef<string>('');

  useEffect(() => {
    scanStatusRef.current = scanStatus;
  }, [scanStatus]);

  useEffect(() => {
    scanNoteRef.current = scanNote;
  }, [scanNote]);

  useEffect(() => {
    if (scanTargetItem) {
      setScanInputCode(scanTargetItem.warehouse || scanTargetItem.sn);
    }
  }, [scanTargetItem]);

  useEffect(() => {
    let active = true;
    if (isOpen && scanMode === 'camera') {
      const timer = setTimeout(() => {
        if (!active) return;
        setCameraError(null);
        try {
          const scanner = new Html5Qrcode('qr-reader');
          qrScannerRef.current = scanner;

          scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: (width, height) => {
                const side = Math.min(width, height) * 0.7;
                return { width: Math.min(side, 250), height: Math.min(side, 180) };
              }
            },
            (decodedText) => {
              const curStatus = scanStatusRef.current;
              const curNote = scanNoteRef.current;
              setScanInputCode(decodedText);
              const success = onScanned(decodedText, curStatus, curNote);
              if (success) {
                setScanMessage({ text: `Đã quét thành công mã: ${decodedText}`, type: 'success' });
              }
            },
            () => {
              // frame ignore
            }
          ).catch((err) => {
            console.warn('Camera init failed:', err);
            if (active) {
              setCameraError('Không thể kích hoạt Camera. Vui lòng chuyển sang chế độ nhập mã thủ công.');
              setScanMode('manual');
            }
          });
        } catch (e: unknown) {
          console.warn('Html5Qrcode runtime error:', e);
          if (active) {
            setCameraError('Lỗi khởi chạy camera.');
            setScanMode('manual');
          }
        }
      }, 350);

      return () => {
        active = false;
        clearTimeout(timer);
        if (qrScannerRef.current) {
          const scanner = qrScannerRef.current;
          if (scanner.isScanning) {
            scanner.stop()
              .then(() => {
                try { scanner.clear(); } catch { /* ignore */ }
              })
              .catch(() => { /* ignore */ });
          }
          qrScannerRef.current = null;
        }
      };
    }
  }, [isOpen, scanMode, onScanned]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const success = onScanned(scanInputCode, scanStatus, scanNote);
    if (success) {
      setScanMessage({ text: `Đã xử lý mã ${scanInputCode}`, type: 'success' });
      setScanInputCode('');
      setScanNote('');
    } else {
      setScanMessage({ text: `Không tìm thấy thiết bị có mã "${scanInputCode}"`, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-black/95 backdrop-blur-md flex items-center justify-center z-[80000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl w-full max-w-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-500 animate-pulse" />
              Kiểm Kê Thiết Bị Qua Quét Mã
            </h3>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Sử dụng Camera trực tiếp hoặc nhập tay</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode selection tabs */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => {
              setScanMode('camera');
              setScanMessage(null);
            }}
            className={`pb-3 text-xs font-bold relative transition-all uppercase tracking-wider px-3 cursor-pointer flex items-center gap-1.5 ${
              scanMode === 'camera'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Quét Camera Thật
          </button>
          <button
            type="button"
            onClick={() => {
              setScanMode('manual');
              setScanMessage(null);
            }}
            className={`pb-3 text-xs font-bold relative transition-all uppercase tracking-wider px-3 cursor-pointer flex items-center gap-1.5 ${
              scanMode === 'manual'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Dùng Mã Có Sẵn / Nhập Tay
          </button>
        </div>

        {/* Target item indicator if applicable */}
        {scanTargetItem && (
          <div className="mx-6 mt-4 p-3.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/40 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-400 tracking-wider">MỤC TIÊU KIỂM TIẾP:</span>
            </div>
            <div className="text-right min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{scanTargetItem.name}</p>
              <p className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 truncate">
                S/N: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{scanTargetItem.sn}</span>
                {scanTargetItem.warehouse && <> | Mã Kho: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{scanTargetItem.warehouse}</span></>}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {scanMode === 'camera' ? (
            <div className="space-y-3">
              <div className="relative bg-black rounded-2xl h-56 flex flex-col items-center justify-center overflow-hidden border border-slate-700">
                <div id="qr-reader" className="w-full h-full"></div>

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-44 h-36 border-2 border-dashed border-indigo-500/40 rounded-xl flex items-center justify-center">
                    <div className="absolute top-[-3px] left-[-3px] w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                    <div className="absolute top-[-3px] right-[-3px] w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-[-3px] left-[-3px] w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-[-3px] right-[-3px] w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                    <QrCode className="w-12 h-12 text-indigo-400/20 animate-pulse" />
                  </div>
                  <div className="scanner-laser"></div>
                </div>

                <div className="absolute bottom-3 left-4 text-[9px] font-mono text-emerald-400 tracking-widest flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  <span>CAMERA ĐANG HOẠT ĐỘNG</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
                Hãy cho phép quyền truy cập Camera, đưa mã QR hoặc tem dán trên thiết bị vào khung quét.
              </p>

              {cameraError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/35 text-[11px] font-medium leading-relaxed flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    {cameraError}
                    <span className="block mt-1 font-bold text-indigo-500 dark:text-indigo-400 cursor-pointer" onClick={() => setScanMode('manual')}>
                      👉 Bấm vào đây để chuyển sang chế độ nhập mã tay!
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="relative bg-slate-900 h-36 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-700">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.4)_100%)]"></div>
                <div className="absolute w-32 h-24 border border-indigo-500/25 rounded-xl flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-indigo-400/20" />
                </div>
                <div className="scanner-laser"></div>
                <div className="absolute top-3 left-4 text-[8.5px] font-mono text-amber-400 tracking-widest flex items-center gap-1 bg-black/60 px-2 py-1 rounded-md">
                  <span>CHẾ ĐỘ MÔ PHỎNG / NHẬP TAY</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase ml-1">
                  Nhập mã quét thiết bị (Mã Kho hoặc S/N) *
                </label>
                <input
                  type="text"
                  required={scanMode === 'manual'}
                  value={scanInputCode}
                  onChange={(e) => {
                    setScanInputCode(e.target.value);
                    if (scanMessage) setScanMessage(null);
                  }}
                  placeholder="VD: KHO-VHF-01 hoặc JT2024-88410"
                  className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-sm font-mono font-bold"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                  Nhấp vào thiết bị để chọn nhanh mã quét:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar justify-center">
                  {inventory.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setScanInputCode(item.warehouse || item.sn);
                        setScanMessage(null);
                        playScanBeep(600, 0.05);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold hover:border-indigo-400 transition-colors shrink-0 cursor-pointer"
                    >
                      {item.warehouse || item.sn.slice(0, 6) + '...'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status selection */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">
              Đánh dấu trạng thái kiểm kê sau khi quét *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold font-sans tracking-wide bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent has-checked:border-emerald-500 has-checked:bg-emerald-50/20 dark:has-checked:bg-emerald-950/20">
                <input
                  type="radio"
                  name="scanStatus"
                  checked={scanStatus === 'OK'}
                  onChange={() => setScanStatus('OK')}
                  className="sr-only"
                />
                <CheckCircle2 className={`w-4 h-4 ${scanStatus === 'OK' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className={scanStatus === 'OK' ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}>ĐỦ / TỐT (OK)</span>
              </label>

              <label className="flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold font-sans tracking-wide bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent has-checked:border-rose-500 has-checked:bg-rose-50/20 dark:has-checked:bg-rose-950/20">
                <input
                  type="radio"
                  name="scanStatus"
                  checked={scanStatus === 'MISSING'}
                  onChange={() => setScanStatus('MISSING')}
                  className="sr-only"
                />
                <XCircle className={`w-4 h-4 ${scanStatus === 'MISSING' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span className={scanStatus === 'MISSING' ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}>THIẾU / HỎNG</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase ml-1">
              Đánh giá chi tiết (Ghi chú tùy chọn)
            </label>
            <input
              type="text"
              value={scanNote}
              onChange={(e) => setScanNote(e.target.value)}
              placeholder="Nhập tình hình máy, ghi chú kíp trực..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs placeholder:text-slate-400"
            />
          </div>

          {scanMessage && (
            <div className={`px-4 py-3 rounded-xl text-xs font-medium border ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/35'
                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/35'
            }`}>
              {scanMessage.text}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-indigo-600/10 cursor-pointer transition-colors"
            >
              XÁC NHẬN GHI KIỂM KÊ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
