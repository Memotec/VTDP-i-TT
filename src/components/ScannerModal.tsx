import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  QrCode,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  ArrowRight,
  PlusCircle,
  Search,
  ExternalLink
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { InventoryItem } from '../types.ts';
import { playScanBeep } from '../utils/audio.ts';

export interface ScanFeedbackResult {
  success: boolean;
  item?: InventoryItem;
  message: string;
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  scanTargetItem: InventoryItem | null;
  onScanned: (code: string, status: 'OK' | 'MISSING', note: string) => ScanFeedbackResult | boolean;
  onAddNewWithCode?: (code: string) => void;
  onViewItemDetail?: (item: InventoryItem) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  scanTargetItem,
  onScanned,
  onAddNewWithCode,
  onViewItemDetail
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scanInputCode, setScanInputCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'OK' | 'MISSING'>('OK');
  const [scanNote, setScanNote] = useState('');
  const [scanMessage, setScanMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
    code?: string;
    item?: InventoryItem;
  } | null>(null);

  // Camera states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isScanFlashing, setIsScanFlashing] = useState(false);

  // File upload state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual search filter
  const [manualFilterText, setManualFilterText] = useState('');

  // Scanner references
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scanStatusRef = useRef<'OK' | 'MISSING'>('OK');
  const scanNoteRef = useRef<string>('');
  const onScannedRef = useRef(onScanned);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    scanStatusRef.current = scanStatus;
  }, [scanStatus]);

  useEffect(() => {
    scanNoteRef.current = scanNote;
  }, [scanNote]);

  useEffect(() => {
    onScannedRef.current = onScanned;
  }, [onScanned]);

  useEffect(() => {
    if (scanTargetItem) {
      setScanInputCode(scanTargetItem.warehouse || scanTargetItem.sn);
    }
  }, [scanTargetItem]);

  // Handle scanned code with debouncing and feedback
  const handleCodeScanned = useCallback((decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;
    const clean = decodedText.trim();
    const now = Date.now();

    // 2.5 second cooldown for the exact same code to prevent frame spamming
    if (clean === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    lastScannedCodeRef.current = clean;
    lastScannedTimeRef.current = now;

    setScanInputCode(clean);
    setIsScanFlashing(true);
    setTimeout(() => setIsScanFlashing(false), 600);

    const curStatus = scanStatusRef.current;
    const curNote = scanNoteRef.current;

    const res = onScannedRef.current(clean, curStatus, curNote);
    const isSuccess = typeof res === 'boolean' ? res : res.success;
    const matchedItem = typeof res === 'object' ? res.item : undefined;
    const msgText = typeof res === 'object'
      ? res.message
      : isSuccess
        ? `Đã quét và ghi nhận thành công mã: ${clean}`
        : `Không tìm thấy thiết bị nào khớp với mã "${clean}"`;

    if (isSuccess) {
      setScanMessage({
        type: 'success',
        text: msgText,
        code: clean,
        item: matchedItem
      });
    } else {
      setScanMessage({
        type: 'error',
        text: msgText,
        code: clean
      });
    }
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (qrScannerRef.current) {
      const scanner = qrScannerRef.current;
      qrScannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        try {
          scanner.clear();
        } catch {
          // ignore clear error
        }
      } catch {
        // ignore stop error
      }
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async (cameraIdToUse?: string) => {
    const el = document.getElementById('qr-reader');
    if (!el) return;

    setIsCameraStarting(true);
    setCameraError(null);

    // Stop any running scanner
    await stopCamera();

    try {
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });
      qrScannerRef.current = scanner;

      // Query available cameras if not yet retrieved
      try {
        const devs = await Html5Qrcode.getCameras();
        if (devs && devs.length > 0) {
          setCameras(devs);
        }
      } catch {
        // cameras query might be restricted in some iframes, proceed with facingMode
      }

      const qrBoxSize = (w: number, h: number) => {
        const side = Math.min(w, h) * 0.75;
        return {
          width: Math.max(180, Math.min(Math.round(side), 300)),
          height: Math.max(160, Math.min(Math.round(side * 0.85), 260))
        };
      };

      const qrConfig = {
        fps: 15,
        qrbox: qrBoxSize,
        aspectRatio: 1.333333
      };

      // Determine which camera to start
      let targetConfig: string | { facingMode: string } = { facingMode: 'environment' };
      if (cameraIdToUse) {
        targetConfig = cameraIdToUse;
      } else if (selectedCameraId) {
        targetConfig = selectedCameraId;
      }

      try {
        await scanner.start(targetConfig, qrConfig, handleCodeScanned, () => {});
        setIsCameraActive(true);
        setIsCameraStarting(false);
      } catch (e1) {
        console.warn('Initial camera start failed with targetConfig, attempting user/front facing:', e1);
        // Fallback 1: FacingMode user (front camera / laptop webcam)
        try {
          await scanner.start({ facingMode: 'user' }, qrConfig, handleCodeScanned, () => {});
          setIsCameraActive(true);
          setIsCameraStarting(false);
        } catch (e2) {
          console.warn('Fallback facingMode user failed, trying first available camera device:', e2);
          // Fallback 2: First device ID from getCameras
          const devices = await Html5Qrcode.getCameras().catch(() => []);
          if (devices.length > 0) {
            await scanner.start(devices[0].id, qrConfig, handleCodeScanned, () => {});
            setSelectedCameraId(devices[0].id);
            setIsCameraActive(true);
            setIsCameraStarting(false);
          } else {
            throw e2;
          }
        }
      }

      // Check torch capability
      try {
        const track = (scanner as unknown as { getRunningTrackCameraCapabilities?: () => { torch?: boolean } }).getRunningTrackCameraCapabilities?.();
        if (track && track.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setIsCameraActive(false);
      setIsCameraStarting(false);
      const str = String(err);
      if (str.includes('NotAllowedError') || str.includes('Permission')) {
        setCameraError('Trình duyệt chưa được cấp quyền truy cập Camera. Vui lòng bấm vào biểu tượng Ổ khóa / Camera trên thanh địa chỉ URL để chọn "Cho phép", sau đó bấm "Thử lại Camera".');
      } else if (str.includes('NotFoundError') || str.includes('DevicesNotFoundError')) {
        setCameraError('Không phát hiện thấy mắt Camera trên thiết bị này. Bạn có thể sử dụng tab "Tải ảnh mã QR" hoặc "Nhập tay".');
      } else {
        setCameraError('Không thể khởi động luồng Camera trực tiếp. Vui lòng kiểm tra quyền truy cập hoặc sử dụng tính năng Tải ảnh mã QR / Nhập tay.');
      }
    }
  }, [selectedCameraId, handleCodeScanned, stopCamera]);

  // Switch camera toggle (cycles available cameras)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) {
      // Toggle facing mode
      const nextFacing = selectedCameraId === 'user' ? 'environment' : 'user';
      setSelectedCameraId(nextFacing);
      await startCamera(nextFacing);
      return;
    }

    const currentIdx = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    const nextCam = cameras[nextIdx];
    setSelectedCameraId(nextCam.id);
    await startCamera(nextCam.id);
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!qrScannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      const scanner = qrScannerRef.current as unknown as { applyVideoConstraints?: (c: unknown) => Promise<void> };
      if (scanner.applyVideoConstraints) {
        await scanner.applyVideoConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Lifecycle effect when modal opens or scanMode changes
  useEffect(() => {
    let mounted = true;
    if (isOpen && scanMode === 'camera') {
      const timer = setTimeout(() => {
        if (mounted) {
          startCamera();
        }
      }, 250);

      return () => {
        mounted = false;
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, scanMode, startCamera, stopCamera]);

  // Handle image file scan
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setScanMessage(null);

    try {
      let scanner = qrScannerRef.current;
      let tempCreated = false;
      if (!scanner) {
        scanner = new Html5Qrcode('qr-reader-file-temp', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.DATA_MATRIX
          ],
          verbose: false
        });
        tempCreated = true;
      }

      const decodedText = await scanner.scanFile(file, false);
      if (tempCreated) {
        try {
          scanner.clear();
        } catch {
          // ignore
        }
      }

      if (decodedText) {
        handleCodeScanned(decodedText);
      }
    } catch (err) {
      console.warn('Scan file error:', err);
      playScanBeep(200, 0.3);
      setScanMessage({
        type: 'error',
        text: 'Không nhận diện được mã QR hoặc Barcode từ file ảnh này. Vui lòng tải ảnh chụp trực diện, sắc nét và đủ độ sáng.',
        code: file.name
      });
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Manual submit handler
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInputCode.trim()) return;
    handleCodeScanned(scanInputCode.trim());
  };

  if (!isOpen) return null;

  // Filter items for quick-pick
  const filteredQuickPick = inventory.filter(item => {
    if (!manualFilterText.trim()) return true;
    const q = manualFilterText.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sn.toLowerCase().includes(q) ||
      (item.warehouse && item.warehouse.toLowerCase().includes(q)) ||
      (item.loc && item.loc.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-950/75 dark:bg-black/90 backdrop-blur-md flex items-center justify-center z-[80000] p-3 sm:p-4 animate-fade-in">
      {/* Hidden container for image file scanning fallback */}
      <div id="qr-reader-file-temp" className="hidden"></div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-xl border border-slate-150 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                Quét QR Code & Barcode Kiểm Kê
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Nhận diện nhanh thiết bị, tự động ghi nhận nhật ký kiểm kê
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 flex items-center justify-center transition-all"
            title="Đóng (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="px-5 pt-3 flex gap-2 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={() => {
              setScanMode('camera');
              setScanMessage(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all tracking-wide px-3 cursor-pointer flex items-center gap-1.5 border-b-2 ${
              scanMode === 'camera'
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Trực Tiếp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScanMode('upload');
              setScanMessage(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all tracking-wide px-3 cursor-pointer flex items-center gap-1.5 border-b-2 ${
              scanMode === 'upload'
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Tải Ảnh Mã QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScanMode('manual');
              setScanMessage(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all tracking-wide px-3 cursor-pointer flex items-center gap-1.5 border-b-2 ${
              scanMode === 'manual'
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-black'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Nhập Tay / Chọn Kho</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Scan Target Item Banner (if opened for a specific item) */}
          {scanTargetItem && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
                <span className="text-[10.5px] uppercase font-black text-indigo-700 dark:text-indigo-300 tracking-wider">
                  MỤC TIÊU KIỂM KÊ:
                </span>
              </div>
              <div className="text-right min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{scanTargetItem.name}</p>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  S/N: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{scanTargetItem.sn}</span>
                  {scanTargetItem.warehouse && (
                    <> • Mã Kho: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{scanTargetItem.warehouse}</span></>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA */}
          {scanMode === 'camera' && (
            <div className="space-y-3">
              <div
                className={`relative bg-black rounded-2xl h-64 sm:h-72 flex flex-col items-center justify-center overflow-hidden border-2 transition-colors duration-300 ${
                  isScanFlashing
                    ? 'border-emerald-400 shadow-lg shadow-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* HTML5-QRCode Reader Element */}
                <div id="qr-reader" className="w-full h-full"></div>

                {/* Overlaid Viewfinder Aim Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="relative w-52 h-44 sm:w-60 sm:h-52 border-2 border-dashed border-indigo-400/40 rounded-2xl flex items-center justify-center">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>

                    <QrCode className="w-12 h-12 text-indigo-400/25 animate-pulse" />
                  </div>
                  <div className="scanner-laser"></div>
                </div>

                {/* Top Controls Overlay: Camera Switch & Torch */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                        torchOn
                          ? 'bg-amber-500 text-black shadow-amber-500/30'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={torchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
                    >
                      {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    title="Đổi camera trước / sau hoặc webcam khác"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span className="hidden sm:inline text-[10px]">Đổi Cam</span>
                  </button>
                </div>

                {/* Bottom Status Tag */}
                <div className="absolute bottom-3 left-3 z-20 text-[9.5px] font-mono text-emerald-400 tracking-wider flex items-center gap-1.5 bg-black/75 backdrop-blur-xs px-2.5 py-1.2 rounded-lg border border-emerald-500/30">
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                  <span>{isCameraStarting ? 'ĐANG KÍCH HOẠT...' : isCameraActive ? 'CAMERA HOẠT ĐỘNG' : 'CHỜ CAMERA...'}</span>
                </div>
              </div>

              {/* Camera Error / Instructions */}
              {cameraError ? (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-xs font-medium space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <p className="leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử lại Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('upload')}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tải ảnh mã QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('manual')}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Nhập mã tay</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium">
                  Đưa tem mã QR hoặc Barcode trên thiết bị vào khung ngắm để hệ thống tự động quét và xác nhận kiểm kê.
                </p>
              )}
            </div>
          )}

          {/* TAB 2: IMAGE FILE UPLOAD */}
          {scanMode === 'upload' && (
            <div className="space-y-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                id="qr-file-input"
              />

              <label
                htmlFor="qr-file-input"
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  {isUploadingFile ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  {isUploadingFile ? 'Đang nhận diện mã...' : 'Nhấn để chọn ảnh hoặc chụp ảnh mã QR'}
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  Hỗ trợ định dạng PNG, JPG, JPEG, WEBP. Thích hợp khi thiết bị không có camera trực tiếp hoặc mã ở góc chụp khó.
                </p>
              </label>
            </div>
          )}

          {/* TAB 3: MANUAL INPUT & QUICK PICK */}
          {scanMode === 'manual' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase ml-1">
                  Nhập mã thiết bị (Mã Kho hoặc Số S/N) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanInputCode}
                    onChange={(e) => {
                      setScanInputCode(e.target.value);
                      if (scanMessage) setScanMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleManualSubmit();
                      }
                    }}
                    placeholder="VD: KHO-VHF-01 hoặc JT2024-88410"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono font-bold text-sm tracking-wide"
                  />
                  <button
                    type="button"
                    onClick={() => handleManualSubmit()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                  >
                    Kiểm Kê
                  </button>
                </div>
              </div>

              {/* Quick Pick device chips */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Chọn nhanh từ kho ({filteredQuickPick.length} thiết bị):
                  </span>
                  <div className="relative w-36 sm:w-44">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={manualFilterText}
                      onChange={(e) => setManualFilterText(e.target.value)}
                      placeholder="Tìm thiết bị..."
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pt-1">
                  {filteredQuickPick.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const code = item.warehouse || item.sn;
                        setScanInputCode(code);
                        handleCodeScanned(code);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-[10.5px] font-mono text-slate-700 dark:text-slate-200 font-bold hover:border-indigo-400 transition-colors shrink-0 cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span className="text-indigo-600 dark:text-indigo-400">{item.warehouse || item.sn}</span>
                      <span className="text-slate-400 truncate max-w-[120px]">({item.name})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit Status selection radio buttons */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
              Đánh dấu trạng thái kiểm kê sau khi quét *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold tracking-wide bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent has-checked:border-emerald-500 has-checked:bg-emerald-50/30 dark:has-checked:bg-emerald-950/20">
                <input
                  type="radio"
                  name="scanStatus"
                  checked={scanStatus === 'OK'}
                  onChange={() => setScanStatus('OK')}
                  className="sr-only"
                />
                <CheckCircle2 className={`w-4 h-4 ${scanStatus === 'OK' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className={scanStatus === 'OK' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}>
                  ĐỦ / TỐT (OK)
                </span>
              </label>

              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold tracking-wide bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent has-checked:border-rose-500 has-checked:bg-rose-50/30 dark:has-checked:bg-rose-950/20">
                <input
                  type="radio"
                  name="scanStatus"
                  checked={scanStatus === 'MISSING'}
                  onChange={() => setScanStatus('MISSING')}
                  className="sr-only"
                />
                <XCircle className={`w-4 h-4 ${scanStatus === 'MISSING' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span className={scanStatus === 'MISSING' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>
                  THIẾU / HỎNG
                </span>
              </label>
            </div>
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase ml-1">
              Ghi chú kíp trực / đánh giá tình trạng (Tùy chọn)
            </label>
            <input
              type="text"
              value={scanNote}
              onChange={(e) => setScanNote(e.target.value)}
              placeholder="VD: Kiểm tra RF ổn định, tem niêm phong nguyên vẹn..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs placeholder:text-slate-400"
            />
          </div>

          {/* Scan result feedback banner */}
          {scanMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium border animate-scale-in space-y-2 ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900/50'
              }`}
            >
              <div className="flex items-start gap-2">
                {scanMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold leading-relaxed">{scanMessage.text}</p>
                  {scanMessage.item && (
                    <div className="mt-1 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 text-[11px] text-emerald-700 dark:text-emerald-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Vị trí: <b>{scanMessage.item.loc || 'Chưa định vị'}</b></span>
                      <span>S/N: <b>{scanMessage.item.sn}</b></span>
                      <span>Trạng thái: <b>{scanStatus === 'OK' ? 'ĐẠT CHUẨN (OK)' : 'CẦN XỬ LÝ (THIẾU)'}</b></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons for matched item or missing item */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {scanMessage.item && onViewItemDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewItemDetail(scanMessage.item!);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem chi tiết thiết bị</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {scanMessage.type === 'error' && scanMessage.code && onAddNewWithCode && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNewWithCode(scanMessage.code!);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm thiết bị mới vào kho với mã này</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Hỗ trợ QR Code & 1D Barcode (Code 128, Code 39)
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {scanMode === 'manual' && (
              <button
                type="button"
                onClick={() => handleManualSubmit()}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                Ghi Kiểm Kê
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
