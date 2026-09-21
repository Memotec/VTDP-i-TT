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
  ExternalLink,
  CameraOff,
  Smartphone,
  FileDown,
  Volume2,
  VolumeX,
  Zap,
  Layers,
  ZoomIn,
  ZoomOut,
  Clock,
  History,
  Check,
  FileSpreadsheet,
  FileText,
  Trash2,
  Keyboard,
  Info
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { InventoryItem } from '../types.ts';
import {
  playScanBeep,
  playScanSuccessTone,
  playScanErrorTone,
  triggerScanHaptic
} from '../utils/audio.ts';
import { exportItemProfileToPDF, exportAuditReportToPDF } from '../utils/pdfExporter.ts';
import { exportAuditReportToDocx } from '../utils/docxExporter.ts';

export interface ScanFeedbackResult {
  success: boolean;
  item?: InventoryItem;
  message: string;
}

interface ScannedSessionItem {
  id: string;
  code: string;
  timestamp: string;
  status: 'OK' | 'MISSING';
  note: string;
  item?: InventoryItem;
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  scanTargetItem: InventoryItem | null;
  onScanned: (code: string, status: 'OK' | 'MISSING', note: string) => ScanFeedbackResult | boolean;
  onAddNewWithCode?: (code: string) => void;
  onViewItemDetail?: (item: InventoryItem) => void;
  currentUsername?: string;
}

const QUICK_NOTE_PRESETS = [
  'Đạt chuẩn hoạt động',
  'Tem niêm phong nguyên vẹn',
  'Dự phòng sẵn sàng đài trạm',
  'Cần hiệu chuẩn định kỳ',
  'Bàn giao ca trực'
];

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  scanTargetItem,
  onScanned,
  onAddNewWithCode,
  onViewItemDetail,
  currentUsername = 'Kiểm kê viên'
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scanInputCode, setScanInputCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'OK' | 'MISSING'>('OK');
  const [scanNote, setScanNote] = useState('');
  
  // Continuous / Batch scanning options
  const [isContinuousMode, setIsContinuousMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sessionScannedList, setSessionScannedList] = useState<ScannedSessionItem[]>([]);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  
  // HUD feedback banner
  const [scanMessage, setScanMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
    code?: string;
    item?: InventoryItem;
    time?: string;
  } | null>(null);

  // Camera states & optical controls
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [hasZoom, setHasZoom] = useState(false);
  const [isScanFlashing, setIsScanFlashing] = useState(false);

  // File upload & drag drop
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual search filter
  const [manualFilterText, setManualFilterText] = useState('');

  // Scanner references
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scanStatusRef = useRef<'OK' | 'MISSING'>('OK');
  const scanNoteRef = useRef<string>('');
  const onScannedRef = useRef(onScanned);
  const soundEnabledRef = useRef(soundEnabled);
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
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (scanTargetItem) {
      setScanInputCode(scanTargetItem.warehouse || scanTargetItem.sn);
    }
  }, [scanTargetItem]);

  // Handle scanned code with intelligent debouncing, sound/haptic feedback, and session tracking
  const handleCodeScanned = useCallback((decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;
    const clean = decodedText.trim();
    const now = Date.now();

    // Fast-cooldown: 1.2s for exact same code to allow quick sequential scanning
    if (clean === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 1200) {
      return;
    }

    lastScannedCodeRef.current = clean;
    lastScannedTimeRef.current = now;

    setScanInputCode(clean);
    setIsScanFlashing(true);
    setTimeout(() => setIsScanFlashing(false), 500);

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

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (isSuccess) {
      if (soundEnabledRef.current) {
        playScanSuccessTone();
      }
      triggerScanHaptic('success');

      setScanMessage({
        type: 'success',
        text: msgText,
        code: clean,
        item: matchedItem,
        time: timeStr
      });

      // Add to session list
      setSessionScannedList(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          code: clean,
          timestamp: timeStr,
          status: curStatus,
          note: curNote || (curStatus === 'OK' ? 'Đủ / Hoạt động tốt' : 'Thiếu / Cần xử lý'),
          item: matchedItem
        },
        ...prev
      ]);
    } else {
      if (soundEnabledRef.current) {
        playScanErrorTone();
      }
      triggerScanHaptic('error');

      setScanMessage({
        type: 'error',
        text: msgText,
        code: clean,
        time: timeStr
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
    setHasZoom(false);
  }, []);

  // Start camera helper with multi-camera detection, zoom capabilities, and torch
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

      // Step 1: Detect available camera devices
      let detectedDevs: Array<{ id: string; label: string }> = [];
      try {
        detectedDevs = await Html5Qrcode.getCameras();
        if (detectedDevs && detectedDevs.length > 0) {
          setCameras(detectedDevs);
        }
      } catch (devErr) {
        console.warn('Unable to enumerate cameras prior to start:', devErr);
      }

      // Check hardware presence
      if (detectedDevs && detectedDevs.length === 0 && navigator.mediaDevices?.enumerateDevices) {
        try {
          const allMedia = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allMedia.filter(d => d.kind === 'videoinput');
          if (videoInputs.length === 0) {
            setCameraError('Không phát hiện mắt Camera hoặc Webcam nào trên thiết bị này. Bạn có thể sử dụng tab "Tải Ảnh Mã QR" hoặc "Nhập Tay / Chọn Kho".');
            setIsCameraActive(false);
            setIsCameraStarting(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      const qrBoxSize = (w: number, h: number) => {
        const side = Math.min(w, h) * 0.78;
        return {
          width: Math.max(190, Math.min(Math.round(side * 1.1), 340)),
          height: Math.max(160, Math.min(Math.round(side * 0.88), 280))
        };
      };

      const qrConfig = {
        fps: 24, // High framerate for instant continuous detection
        qrbox: qrBoxSize,
        aspectRatio: 1.333333
      };

      let startSuccess = false;

      // Helper to safely attempt starting the scanner with varied configs
      const tryStart = async (camConfig: string | { facingMode: string } | { facingMode: { exact: string } }) => {
        try {
          await scanner.start(camConfig as any, qrConfig, handleCodeScanned, () => {});
          return true;
        } catch (e) {
          console.warn('Scanner tryStart failed with config:', camConfig, e);
          return false;
        }
      };

      // Candidate 1: Specified camera ID or facing mode
      if (cameraIdToUse) {
        if (cameraIdToUse === 'environment' || cameraIdToUse === 'user') {
          if (await tryStart({ facingMode: cameraIdToUse }) || 
              await tryStart({ facingMode: { exact: cameraIdToUse } }) ||
              await tryStart(cameraIdToUse)) {
            setSelectedCameraId(cameraIdToUse);
            startSuccess = true;
          }
        } else {
          if (await tryStart(cameraIdToUse)) {
            setSelectedCameraId(cameraIdToUse);
            startSuccess = true;
          }
        }
      }

      // Candidate 2: Current selectedCameraId
      if (!startSuccess && selectedCameraId) {
        if (selectedCameraId === 'environment' || selectedCameraId === 'user') {
          if (await tryStart({ facingMode: selectedCameraId }) || 
              await tryStart({ facingMode: { exact: selectedCameraId } }) ||
              await tryStart(selectedCameraId)) {
            startSuccess = true;
          }
        } else {
          if (await tryStart(selectedCameraId)) {
            startSuccess = true;
          }
        }
      }

      // Candidate 3: Prefer rear/back camera from detected devices
      if (!startSuccess && detectedDevs.length > 0) {
        const backCam = detectedDevs.find(c => /back|rear|sau|environment/i.test(c.label));
        const ordered = backCam ? [backCam, ...detectedDevs.filter(c => c.id !== backCam.id)] : detectedDevs;
        
        for (const dev of ordered) {
          if (dev.id && await tryStart(dev.id)) {
            setSelectedCameraId(dev.id);
            startSuccess = true;
            break;
          }
        }
      }

      // Candidate 4: facingMode 'environment'
      if (!startSuccess) {
        if (await tryStart({ facingMode: 'environment' }) || 
            await tryStart({ facingMode: { exact: 'environment' } }) ||
            await tryStart('environment')) {
          setSelectedCameraId('environment');
          startSuccess = true;
        }
      }

      // Candidate 5: facingMode 'user'
      if (!startSuccess) {
        if (await tryStart({ facingMode: 'user' }) || 
            await tryStart({ facingMode: { exact: 'user' } }) ||
            await tryStart('user')) {
          setSelectedCameraId('user');
          startSuccess = true;
        }
      }

      // Candidate 6: Enumerate devices fallback
      if (!startSuccess && navigator.mediaDevices?.enumerateDevices) {
        try {
          const allMedia = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allMedia.filter(d => d.kind === 'videoinput');
          for (const vi of videoInputs) {
            if (vi.deviceId && await tryStart(vi.deviceId)) {
              setSelectedCameraId(vi.deviceId);
              startSuccess = true;
              break;
            }
          }
        } catch {
          // ignore
        }
      }

      if (startSuccess) {
        setIsCameraActive(true);
        setIsCameraStarting(false);
      } else {
        throw new Error('NotFoundError: Requested camera device not accessible');
      }

      // Detect torch & zoom capabilities from video track
      try {
        const track = (scanner as unknown as { getRunningTrackCameraCapabilities?: () => { torch?: boolean; zoom?: { min?: number; max?: number; step?: number } } }).getRunningTrackCameraCapabilities?.();
        if (track) {
          if (track.torch) {
            setHasTorch(true);
          }
          if (track.zoom && track.zoom.max && track.zoom.max > 1) {
            setHasZoom(true);
            setMaxZoom(track.zoom.max);
            setZoomLevel(track.zoom.min || 1);
          }
        }
      } catch {
        setHasTorch(false);
        setHasZoom(false);
      }
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setIsCameraActive(false);
      setIsCameraStarting(false);
      const str = String(err);
      if (str.includes('NotAllowedError') || str.includes('Permission')) {
        setCameraError('Trình duyệt chưa được cấp quyền Camera. Vui lòng bấm vào biểu tượng Ổ khóa / Camera trên thanh địa chỉ URL chọn "Cho phép", sau đó bấm "Thử lại Camera".');
      } else if (str.includes('NotFoundError') || str.includes('DevicesNotFoundError')) {
        setCameraError('Không tìm thấy thiết bị Camera. Bạn có thể sử dụng tab "Tải Ảnh Mã QR" hoặc "Nhập Tay / Chọn Kho".');
      } else {
        setCameraError('Không thể khởi động luồng Camera trực tiếp. Vui lòng thử lại hoặc sử dụng tính năng Tải ảnh mã QR / Nhập tay.');
      }
    }
  }, [selectedCameraId, handleCodeScanned, stopCamera]);

  // Switch camera toggle
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) {
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

  // Toggle Torch
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

  // Adjust Zoom
  const handleSetZoom = async (newZoom: number) => {
    if (!qrScannerRef.current || !hasZoom) return;
    try {
      const clamped = Math.max(1, Math.min(newZoom, maxZoom || 3));
      const scanner = qrScannerRef.current as unknown as { applyVideoConstraints?: (c: unknown) => Promise<void> };
      if (scanner.applyVideoConstraints) {
        await scanner.applyVideoConstraints({
          advanced: [{ zoom: clamped }]
        });
        setZoomLevel(clamped);
      }
    } catch (e) {
      console.warn('Zoom adjustment failed:', e);
    }
  };

  // Lifecycle effect
  useEffect(() => {
    let mounted = true;
    if (isOpen && scanMode === 'camera') {
      const timer = setTimeout(() => {
        if (mounted) {
          startCamera();
        }
      }, 200);

      return () => {
        mounted = false;
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, scanMode, startCamera, stopCamera]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is in an input or textarea
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        if (e.key === 'Escape') {
          onClose();
        }
        return;
      }

      if (e.key === '1') {
        setScanStatus('OK');
        playScanBeep(880, 0.08);
      } else if (e.key === '2') {
        setScanStatus('MISSING');
        playScanBeep(440, 0.08);
      } else if (e.key === 'f' || e.key === 'F') {
        if (hasTorch) handleToggleTorch();
      } else if (e.key === 'c' || e.key === 'C') {
        handleSwitchCamera();
      } else if (e.key === 'm' || e.key === 'M') {
        setSoundEnabled(prev => !prev);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasTorch, torchOn, cameras, selectedCameraId, onClose]);

  // Clipboard Paste (Ctrl+V) handler for images or text
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleProcessImageFile(file);
            break;
          }
        } else if (item.type === 'text/plain') {
          item.getAsString(text => {
            if (text && text.trim().length > 1) {
              setScanInputCode(text.trim());
              handleCodeScanned(text.trim());
            }
          });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, handleCodeScanned]);

  // Process image file for QR decoding
  const handleProcessImageFile = async (file: File) => {
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
      if (soundEnabledRef.current) {
        playScanErrorTone();
      }
      triggerScanHaptic('error');
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleProcessImageFile(file);
    }
  };

  // Manual submit handler
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInputCode.trim()) return;
    handleCodeScanned(scanInputCode.trim());
  };

  // Export session audit report
  const handleExportSessionReport = async (format: 'pdf' | 'docx' | 'csv') => {
    if (sessionScannedList.length === 0) return;
    const items = sessionScannedList.map(s => s.item).filter(Boolean) as InventoryItem[];
    if (items.length === 0) return;

    const reportTitle = `BÁO CÁO ĐỢT QUÉT KIỂM KÊ NHANH (${items.length} THIẾT BỊ)`;
    const reportDate = new Date().toLocaleDateString('vi-VN');

    if (format === 'pdf') {
      await exportAuditReportToPDF(
        items,
        currentUsername,
        reportDate,
        'Kho Tổng Hợp / Đài Trạm Kỹ Thuật',
        `Tổng số thiết bị quét trong phiên: ${items.length} (Đạt OK: ${sessionScannedList.filter(s => s.status === 'OK').length}, Cần xử lý: ${sessionScannedList.filter(s => s.status === 'MISSING').length})`
      );
    } else if (format === 'docx') {
      await exportAuditReportToDocx(
        items,
        currentUsername,
        reportDate,
        'Kho Tổng Hợp / Đài Trạm Kỹ Thuật',
        `Tổng số thiết bị quét trong phiên: ${items.length}`
      );
    } else if (format === 'csv') {
      const headers = ['Mã Quét', 'Tên Thiết Bị', 'Số S/N', 'Mã Kho', 'Vị Trí', 'Trạng Thái', 'Thời Gian Quét', 'Ghi Chú'];
      const rows = sessionScannedList.map(s => [
        s.code,
        s.item?.name || 'N/A',
        s.item?.sn || 'N/A',
        s.item?.warehouse || 'N/A',
        s.item?.loc || 'N/A',
        s.status === 'OK' ? 'ĐẠT (OK)' : 'THIẾU / HỎNG',
        s.timestamp,
        s.note
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.map(cell => `"${cell}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Kiem_Ke_Phien_Quet_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  // Filter items for quick-pick
  const filteredQuickPick = inventory.filter(item => {
    if (!manualFilterText.trim()) return true;
    const q = manualFilterText.toLowerCase();
    return (
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.sn || '').toLowerCase().includes(q) ||
      String(item.warehouse || '').toLowerCase().includes(q) ||
      String(item.loc || '').toLowerCase().includes(q)
    );
  });

  const okCount = sessionScannedList.filter(s => s.status === 'OK').length;
  const missingCount = sessionScannedList.filter(s => s.status === 'MISSING').length;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 dark:bg-black/90 backdrop-blur-md flex items-center justify-center z-[80000] p-2.5 sm:p-4 animate-fade-in"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden container for image file scanning fallback */}
      <div id="qr-reader-file-temp" className="hidden"></div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl border border-slate-150 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] relative">
        {/* Drag Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white p-6 animate-fade-in">
            <Upload className="w-16 h-16 animate-bounce mb-3" />
            <p className="text-lg font-black tracking-wide">Thả hình ảnh vào đây để quét mã QR / Barcode</p>
            <p className="text-xs text-indigo-100">Hỗ trợ định dạng PNG, JPG, JPEG, WEBP</p>
          </div>
        )}

        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-none">
                  Quét QR Code & Barcode Kiểm Kê
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-black uppercase tracking-wider">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Siêu Tốc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Nhận diện tức thì S/N, Mã kho, tem QR và 1D Barcode • Lưu nhật ký kiểm kê
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                  : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              }`}
              title={soundEnabled ? 'Đang bật âm thanh kiểm kê (Phím M)' : 'Đang tắt âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 flex items-center justify-center transition-all"
              title="Đóng (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Navigation Tabs & Quick Status Bar */}
        <div className="px-5 pt-2.5 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setScanMode('camera');
                setScanMessage(null);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scanMode === 'camera'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Trực Tiếp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('upload');
                setScanMessage(null);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scanMode === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải / Dán Ảnh (Ctrl+V)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('manual');
                setScanMessage(null);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scanMode === 'manual'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Nhập Tay / Chọn Kho</span>
            </button>
          </div>

          {/* Session Scanned Count Badge */}
          {sessionScannedList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSessionDrawer(!showSessionDrawer)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Bấm để xem danh sách thiết bị đã quét trong phiên"
            >
              <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Đã quét: <b className="text-indigo-600 dark:text-indigo-400">{sessionScannedList.length}</b></span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">({okCount} OK</span>
              {missingCount > 0 && <span className="text-[10px] text-rose-600 dark:text-rose-400">/ {missingCount} Thiếu)</span>}
              {missingCount === 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">)</span>}
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Scan Target Item Banner (if opened from an individual item row) */}
          {scanTargetItem && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
                <span className="text-[10.5px] uppercase font-black text-indigo-700 dark:text-indigo-300 tracking-wider">
                  MỤC TIÊU CẦN QUÉT:
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

          {/* TAB 1: LIVE CAMERA VIEW */}
          {scanMode === 'camera' && (
            <div className="space-y-3">
              <div
                className={`relative bg-black rounded-2xl h-64 sm:h-76 flex flex-col items-center justify-center overflow-hidden border-2 transition-all duration-300 ${
                  isScanFlashing
                    ? 'border-emerald-400 shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-400/30'
                    : 'border-slate-800'
                }`}
              >
                {/* HTML5-QRCode Reader Element */}
                <div id="qr-reader" className="w-full h-full"></div>

                {/* Overlaid Viewfinder Aim Frame or No-Camera Placeholder */}
                {!cameraError ? (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    <div className="relative w-56 h-48 sm:w-68 sm:h-56 border-2 border-dashed border-indigo-400/40 rounded-2xl flex items-center justify-center">
                      {/* Laser Corners */}
                      <div className="absolute -top-1.5 -left-1.5 w-7 h-7 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                      <div className="absolute -top-1.5 -right-1.5 w-7 h-7 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                      <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>

                      <QrCode className="w-14 h-14 text-indigo-400/20 animate-pulse" />
                    </div>
                    <div className="scanner-laser"></div>
                  </div>
                ) : (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-900/95 text-center text-white">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30">
                      <CameraOff className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">
                      Không tìm thấy thiết bị Camera
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                      Thiết bị chưa gắn camera hoặc đang chạy trong trình duyệt bị giới hạn phần cứng.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScanMode('upload')}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải ảnh mã QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScanMode('manual')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Nhập mã tay</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Top Overlay Controls: Torch, Zoom, Camera Switcher */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1 ${
                        torchOn
                          ? 'bg-amber-400 text-slate-950 shadow-amber-400/40 ring-2 ring-amber-300'
                          : 'bg-black/65 text-white hover:bg-black/85 backdrop-blur-xs'
                      }`}
                      title={torchOn ? 'Tắt đèn Flash (Phím F)' : 'Bật đèn Flash (Phím F)'}
                    >
                      {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                    </button>
                  )}

                  {hasZoom && (
                    <div className="flex items-center bg-black/65 backdrop-blur-xs rounded-xl p-0.5 border border-white/10 text-white">
                      <button
                        type="button"
                        onClick={() => handleSetZoom(zoomLevel - 0.5)}
                        disabled={zoomLevel <= 1}
                        className="p-1.5 hover:bg-white/20 rounded-lg disabled:opacity-30 cursor-pointer"
                        title="Thu nhỏ"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono px-1 font-bold">{zoomLevel.toFixed(1)}x</span>
                      <button
                        type="button"
                        onClick={() => handleSetZoom(zoomLevel + 0.5)}
                        disabled={zoomLevel >= maxZoom}
                        className="p-1.5 hover:bg-white/20 rounded-lg disabled:opacity-30 cursor-pointer"
                        title="Phóng to"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-2 rounded-xl bg-black/65 hover:bg-black/85 text-white text-xs font-bold transition-all shadow-md backdrop-blur-xs cursor-pointer flex items-center gap-1.5 border border-white/10"
                    title="Đổi camera trước / sau hoặc webcam (Phím C)"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span className="hidden sm:inline text-[10.5px]">Đổi Cam</span>
                  </button>
                </div>

                {/* Bottom Status & Live Indicator */}
                <div className="absolute bottom-3 left-3 z-20 text-[10px] font-mono text-emerald-400 tracking-wider flex items-center gap-1.5 bg-black/80 backdrop-blur-xs px-2.5 py-1.2 rounded-xl border border-emerald-500/30">
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                  <span>{isCameraStarting ? 'ĐANG KÍCH HOẠT...' : isCameraActive ? 'CAMERA SẴN SÀNG QUÉT' : 'CHỜ CAMERA...'}</span>
                </div>
              </div>

              {/* Camera Error / Troubleshooting */}
              {cameraError && (
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
              )}
            </div>
          )}

          {/* TAB 2: IMAGE UPLOAD / CLIPBOARD PASTE */}
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
                className="border-2 border-dashed border-indigo-300 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 rounded-2xl p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-13 h-13 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                  {isUploadingFile ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  {isUploadingFile ? 'Đang nhận diện mã QR...' : 'Nhấn để chọn ảnh hoặc Kéo thả ảnh vào đây'}
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed mb-2">
                  Bạn cũng có thể chụp ảnh màn hình và nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px] text-slate-800 dark:text-slate-200">Ctrl + V</kbd> bất kỳ lúc nào để dán ảnh trực tiếp.
                </p>
                <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-extrabold">
                  Hỗ trợ PNG, JPG, JPEG, WEBP
                </span>
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
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ghi Kiểm Kê</span>
                  </button>
                </div>
              </div>

              {/* Quick Pick device chips */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Chọn nhanh từ kho ({filteredQuickPick.length} thiết bị):
                  </span>
                  <div className="relative w-40 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={manualFilterText}
                      onChange={(e) => setManualFilterText(e.target.value)}
                      placeholder="Lọc S/N, Tên, Mã kho..."
                      className="w-full pl-7 pr-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pt-1">
                  {filteredQuickPick.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const code = item.warehouse || item.sn;
                        setScanInputCode(code);
                        handleCodeScanned(code);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-[10.5px] font-mono text-slate-700 dark:text-slate-200 font-bold hover:border-indigo-400 transition-colors shrink-0 cursor-pointer text-left flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{item.warehouse || item.sn}</span>
                      <span className="text-slate-400 truncate max-w-[130px]">({item.name})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUDIT STATUS SELECTOR (1-CLICK & SHORTCUTS) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                Đánh dấu trạng thái kiểm kê sau khi quét *
              </label>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                Phím tắt: <kbd className="px-1 rounded bg-slate-200 dark:bg-slate-700">1</kbd> ĐỦ • <kbd className="px-1 rounded bg-slate-200 dark:bg-slate-700">2</kbd> THIẾU
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScanStatus('OK')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-black tracking-wide ${
                  scanStatus === 'OK'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${scanStatus === 'OK' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>ĐỦ / TỐT (OK)</span>
              </button>

              <button
                type="button"
                onClick={() => setScanStatus('MISSING')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-black tracking-wide ${
                  scanStatus === 'MISSING'
                    ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 shadow-sm shadow-rose-500/10'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <XCircle className={`w-4 h-4 ${scanStatus === 'MISSING' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span>THIẾU / HỎNG / BẢO TRÌ</span>
              </button>
            </div>
          </div>

          {/* AUDIT NOTE & 1-TOUCH PRESETS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                Ghi chú kíp trực / đánh giá tình trạng
              </label>
            </div>
            
            <input
              type="text"
              value={scanNote}
              onChange={(e) => setScanNote(e.target.value)}
              placeholder="VD: Kiểm tra RF ổn định, tem niêm phong nguyên vẹn..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs placeholder:text-slate-400"
            />

            {/* Quick Note Presets */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase py-0.5">Mẫu nhanh:</span>
              {QUICK_NOTE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setScanNote(preset)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 text-[10.5px] font-medium transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* SCAN RESULT FEEDBACK HUD */}
          {scanMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-medium border animate-scale-in space-y-2.5 shadow-sm ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800/70'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-900/70'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {scanMessage.type === 'success' ? (
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <XCircle className="w-4.5 h-4.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-xs sm:text-sm leading-snug">{scanMessage.text}</p>
                    {scanMessage.time && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {scanMessage.time}
                      </span>
                    )}
                  </div>
                  
                  {scanMessage.item && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Tên: <b>{scanMessage.item.name}</b></span>
                      <span>S/N: <b className="font-mono">{scanMessage.item.sn}</b></span>
                      <span>Vị trí: <b>{scanMessage.item.loc || 'Chưa định vị'}</b></span>
                      <span>Trạng thái: <b className={scanStatus === 'OK' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{scanStatus === 'OK' ? 'ĐẠT (OK)' : 'THIẾU / HỎNG'}</b></span>
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
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Xem lý lịch thiết bị</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {scanMessage.item && (
                  <button
                    type="button"
                    onClick={() => {
                      exportItemProfileToPDF(scanMessage.item!);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Xuất phiếu lý lịch thiết bị dạng PDF chuẩn"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>In Phiếu PDF</span>
                  </button>
                )}

                {scanMessage.type === 'error' && scanMessage.code && onAddNewWithCode && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNewWithCode(scanMessage.code!);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm thiết bị mới vào kho với mã này</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SESSION AUDIT LOG DRAWER */}
          {sessionScannedList.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Nhật ký phiên quét này ({sessionScannedList.length} lượt)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExportSessionReport('pdf')}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Xuất biên bản kiểm kê PDF đợt quét này"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSessionReport('docx')}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Xuất biên bản kiểm kê Word (.docx) đợt quét này"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSessionReport('csv')}
                    className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Xuất bảng kê Excel (CSV) đợt quét này"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionScannedList([])}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Xóa danh sách phiên quét"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {sessionScannedList.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'OK' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {entry.item?.name || entry.code}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Mã: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{entry.code}</span> • Vị trí: {entry.item?.loc || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        entry.status === 'OK'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      }`}>
                        {entry.status === 'OK' ? 'ĐẠT (OK)' : 'THIẾU'}
                      </span>
                      <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{entry.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="hidden md:inline-flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Phím tắt:</span>
              <kbd className="px-1 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">1</kbd> Đủ
              <kbd className="px-1 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">2</kbd> Thiếu
              <kbd className="px-1 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">F</kbd> Đèn
              <kbd className="px-1 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">C</kbd> Đổi Cam
            </span>
          </div>

          <div className="flex items-center gap-2">
            {scanMode === 'manual' && (
              <button
                type="button"
                onClick={() => handleManualSubmit()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              >
                Ghi Kiểm Kê
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Hoàn Thành
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
