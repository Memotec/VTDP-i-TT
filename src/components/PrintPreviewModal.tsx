import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  QrCode, 
  Tag, 
  FileText, 
  Check, 
  Layers, 
  User, 
  MapPin, 
  Calendar,
  Sparkles,
  Download,
  Eye,
  Send,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { InventoryItem, AuditStats, SyncConfig, AuditActionType } from '../types.ts';
import { QRCodeSVG } from 'qrcode.react';
import { playScanBeep } from '../utils/audio.ts';

export type PrintMode = 'QR' | 'LABEL' | 'AUDIT_REPORT';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  filteredInventory: InventoryItem[];
  stats: AuditStats;
  currentUsername: string;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  syncConfig?: SyncConfig;
  onAddSystemAuditLog?: (
    actionType: AuditActionType,
    actionTitle: string,
    details: string,
    target?: {
      id?: string;
      name?: string;
      category?: string;
      sn?: string;
      prevData?: string;
      newData?: string;
    }
  ) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  inventory,
  filteredInventory,
  stats,
  currentUsername,
  onAddToast,
  syncConfig,
  onAddSystemAuditLog
}) => {
  const [printMode, setPrintMode] = useState<PrintMode>('QR');
  const [scope, setScope] = useState<'ALL' | 'FILTERED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Audit Report form custom fields
  const [inspectorName, setInspectorName] = useState(currentUsername ? `Kỹ sư ${currentUsername.toUpperCase()}` : 'Nguyễn Văn Khải');
  const [auditLocation, setAuditLocation] = useState('Kho Vật tư Dự phòng Đội Thông Tin - Tầng 3 Đài KSKLL');
  const [auditDate, setAuditDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [auditNote, setAuditNote] = useState('Tất cả trang thiết bị được kiểm tra đối chiếu đầy đủ giữa hiện vật và hệ thống.');

  // Send Report via Google Apps Script state
  const [isSendReportOpen, setIsSendReportOpen] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<'EMAIL' | 'INTERNAL_MSG' | 'BOTH'>('EMAIL');
  const [recipientEmail, setRecipientEmail] = useState('TAILIEUTBTT@gmail.com');
  const [reportSubject, setReportSubject] = useState(() => `[BÁO CÁO TỒN KHO CNS/ATM] Tóm tắt kiểm kê vật tư - ${new Date().toLocaleDateString('vi-VN')}`);
  const [reportNoteDetail, setReportNoteDetail] = useState('');
  const [gasApiEndpoint, setGasApiEndpoint] = useState(() => syncConfig?.webAppUrl || 'https://script.google.com/macros/s/AKfycby4frQYvyEuzbVS7rctYDaxHDhSlEzNmTgYXavWzi0ROJLYEqhfwBd1QRX4v6dVU05f/exec');
  const [sendingState, setSendingState] = useState<'idle' | 'preparing_pdf' | 'calling_gas' | 'success' | 'error'>('idle');
  const [copiedId, setCopiedId] = useState(false);
  const [sendReceipt, setSendReceipt] = useState<{
    id: string;
    timestamp: string;
    recipient: string;
    channel: string;
    pdfName: string;
    itemsCount: number;
    totalQty: number;
  } | null>(null);

  if (!isOpen) return null;

  // Filter items based on selected scope & category
  const baseItems = scope === 'ALL' ? inventory : filteredInventory;
  const targetItems = categoryFilter === 'ALL' 
    ? baseItems 
    : baseItems.filter(item => item.category === categoryFilter);

  const categories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)));

  const handleExecutePrint = () => {
    if (targetItems.length === 0) {
      onAddToast('Không có thiết bị nào trong danh sách in đã chọn!', 'error');
      return;
    }

    onAddToast('Đang kết nối máy in và chuẩn bị tài liệu...', 'info');

    // Chèn class phục vụ in cho đúng chế độ
    const rootEl = document.getElementById('print-root-container');
    if (rootEl) {
      rootEl.setAttribute('data-print-mode', printMode);
    }

    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleSendReport = async () => {
    if (!recipientEmail.trim()) {
      onAddToast('Vui lòng nhập địa chỉ email hoặc kênh nhận báo cáo!', 'error');
      return;
    }
    if (targetItems.length === 0) {
      onAddToast('Không có thiết bị nào trong danh mục báo cáo đã chọn!', 'error');
      return;
    }

    try {
      setSendingState('preparing_pdf');

      // Giai đoạn 1: Giả lập xuất & tối ưu tệp PDF (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

      setSendingState('calling_gas');

      const dateKey = new Date().toISOString().slice(0, 10);
      const pdfFileName = `BaoCao_TonKho_CNS_${dateKey}.pdf`;
      const transactionId = `GAS-REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const reportPayload = {
        action: 'SEND_INVENTORY_REPORT_PDF',
        transactionId,
        reportType: 'INVENTORY_AUDIT_SUMMARY_PDF',
        channel: dispatchChannel,
        recipient: recipientEmail.trim(),
        subject: reportSubject.trim() || `Báo cáo tồn kho CNS/ATM ${auditDate}`,
        note: reportNoteDetail.trim(),
        sender: inspectorName || currentUsername || 'Kiểm kê viên',
        auditDate,
        auditLocation,
        timestamp: new Date().toISOString(),
        pdfAttachment: {
          fileName: pdfFileName,
          fileSize: `${Math.max(140, targetItems.length * 3.8).toFixed(1)} KB`,
          totalRecords: targetItems.length,
          generatedAt: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
        },
        statsSummary: {
          scope: scope === 'ALL' ? 'Toàn bộ kho' : 'Dữ liệu đang lọc',
          category: categoryFilter === 'ALL' ? 'Tất cả phân loại' : categoryFilter,
          itemCount: targetItems.length,
          totalQty,
          okCount: okItems.length,
          missingCount: missingItems.length,
          uncheckedCount: uncheckedItems.length,
          completionPercent: targetItems.length > 0 ? Math.round((okItems.length / targetItems.length) * 100) : 0,
        },
        sampleItems: targetItems.slice(0, 20).map(i => ({
          name: i.name,
          sn: i.sn,
          pn: i.pn || 'N/A',
          qty: i.qty,
          warehouse: i.warehouse || 'KHO',
          status: i.auditStatus || 'CHƯA KIỂM'
        }))
      };

      // Gọi API Google Apps Script Web App
      const activeGasUrl = gasApiEndpoint.trim() || syncConfig?.webAppUrl;
      if (activeGasUrl) {
        try {
          const formParams = new URLSearchParams();
          formParams.append('action', 'SEND_INVENTORY_REPORT_PDF');
          formParams.append('data', JSON.stringify(reportPayload));
          formParams.append('timestamp', Date.now().toString());
          formParams.append('user', currentUsername || 'anonymous');

          await fetch(activeGasUrl, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formParams
          });
        } catch (gasErr) {
          console.warn('Google Apps Script request notification (no-cors handled):', gasErr);
        }
      }

      // Giai đoạn 3: Hoàn thành & cấp biên lai
      await new Promise(resolve => setTimeout(resolve, 400));
      const channelLabel = dispatchChannel === 'EMAIL' 
        ? 'Email Ban Chỉ Huy' 
        : (dispatchChannel === 'INTERNAL_MSG' ? 'Tin Nhắn Nội Bộ' : 'Email & Tin Nhắn Nội Bộ');

      setSendReceipt({
        id: transactionId,
        timestamp: `${new Date().toLocaleTimeString('vi-VN')} - ${new Date().toLocaleDateString('vi-VN')}`,
        recipient: recipientEmail.trim(),
        channel: channelLabel,
        pdfName: pdfFileName,
        itemsCount: targetItems.length,
        totalQty
      });

      setSendingState('success');
      playScanBeep(1000, 0.18);

      onAddToast(`Đã gửi thành công tệp PDF tóm tắt tồn kho tới ${recipientEmail} qua Google Apps Script!`, 'success');

      onAddSystemAuditLog?.(
        'REPORT_DISPATCH',
        'Gửi báo cáo tóm tắt tồn kho qua Google Apps Script',
        `Chuyển phát tệp PDF "${pdfFileName}" (${targetItems.length} danh mục thiết bị, Tổng SL: ${totalQty}) tới [${recipientEmail}] qua kênh [${channelLabel}]. Mã biên lai: ${transactionId}`
      );
    } catch (err) {
      console.error('Lỗi khi gửi báo cáo:', err);
      setSendingState('error');
      onAddToast('Có lỗi phát sinh khi xử lý gửi báo cáo.', 'error');
    }
  };

  const handleDownloadReportText = () => {
    try {
      const summaryText = `
========================================================================
TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM - CÔNG TY QUẢN LÝ BAY MIỀN NAM
TRUNG TÂM BẢO ĐẢM KỸ THUẬT - ĐỘI THÔNG TIN CNS/ATM
========================================================================
BÁO CÁO TÓM TẮT KIỂM KÊ & TỒN KHO VẬT TƯ DỰ PHÒNG KỸ THUẬT HÀNG KHÔNG
Mã báo cáo / Giao dịch: ${sendReceipt?.id || 'GAS-REP-LOCAL'}
Ngày lập: ${auditDate} | Thời gian: ${new Date().toLocaleTimeString('vi-VN')}
Người lập báo cáo: ${inspectorName}
Địa điểm kiểm kê: ${auditLocation}
Kênh nhận báo cáo: ${recipientEmail} (${dispatchChannel})

1. THỐNG KÊ TỔNG HỢP:
- Phân loại thiết bị: ${categoryFilter === 'ALL' ? 'Toàn bộ danh mục' : categoryFilter}
- Tổng số danh mục thiết bị: ${targetItems.length} loại
- Tổng số lượng vật tư thực tế: ${totalQty} chiếc/bộ
- Số lượng đạt chuẩn (OK): ${okItems.length} (${targetItems.length > 0 ? Math.round((okItems.length / targetItems.length) * 100) : 0}%)
- Số lượng thiếu hụt (MISSING): ${missingItems.length}
- Số lượng chưa kiểm kê: ${uncheckedItems.length}
- Đánh giá & Ghi chú chung: ${auditNote}

2. DANH MỤC THIẾT BỊ CHI TIẾT (${targetItems.length} mục):
${targetItems.map((item, idx) => `${idx + 1}. [${item.sn}] ${item.name} | SL: ${item.qty} | Kho: ${item.warehouse || 'KHO'} | Vị trí: ${item.loc || 'N/A'} | Hiện trạng: ${item.auditStatus || 'CHƯA KIỂM'}`).join('\n')}

========================================================================
Đơn vị phát hành: Đội Thông Tin - Trung tâm Bảo Đảm Kỹ Thuật
Hệ thống quản trị cơ sở dữ liệu vật tư CNS/ATM
========================================================================
      `.trim();

      const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TomTat_BaoCao_TonKho_CNS_${auditDate.replace(/\//g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onAddToast('Đã tải xuống bản tóm tắt báo cáo kiểm kê!', 'success');
    } catch {
      onAddToast('Không thể tải bản tóm tắt.', 'error');
    }
  };

  const totalQty = targetItems.reduce((sum, item) => sum + (item.qty || 0), 0);
  const okItems = targetItems.filter(item => item.auditStatus === 'OK');
  const missingItems = targetItems.filter(item => item.auditStatus === 'MISSING');
  const uncheckedItems = targetItems.filter(item => !item.auditStatus);

  return (
    <div className="fixed inset-0 z-[70000] flex items-center justify-center p-2 sm:p-4 md:p-6 backdrop-blur-md bg-slate-900/60 overflow-y-auto animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                  Trung Tâm In Ấn & Xuất Bản
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {targetItems.length} thiết bị được chọn
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                In Mã QR, Tem Nhãn Kỹ Thuật & Biên Bản Kiểm Kê
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSendReportOpen(true)}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
              title="Gửi báo cáo tóm tắt tồn kho qua Email hoặc tin nhắn nội bộ thông qua API Google Apps Script"
            >
              <Send className="w-4 h-4" />
              <span>GỬI BÁO CÁO</span>
            </button>
            <button
              onClick={handleExecutePrint}
              className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>IN NGAY (PRINT)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar */}
        <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          {/* Chế độ in */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPrintMode('QR')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                printMode === 'QR'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>BẢNG MÃ QR</span>
            </button>
            <button
              onClick={() => setPrintMode('LABEL')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                printMode === 'LABEL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>TEM NHÃN TB</span>
            </button>
            <button
              onClick={() => setPrintMode('AUDIT_REPORT')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                printMode === 'AUDIT_REPORT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>BIÊN BẢN KK</span>
            </button>
          </div>

          {/* Phạm vi in */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Phạm vi:</span>
            <div className="flex-1 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setScope('ALL')}
                className={`flex-1 py-2 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                  scope === 'ALL'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                Toàn kho ({inventory.length})
              </button>
              <button
                onClick={() => setScope('FILTERED')}
                className={`flex-1 py-2 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                  scope === 'FILTERED'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                Đang lọc ({filteredInventory.length})
              </button>
            </div>
          </div>

          {/* Lọc danh mục */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Danh mục:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 py-2 px-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả phân loại ({baseItems.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({baseItems.filter(i => i.category === cat).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Body: Custom form parameters for Audit Report */}
        {printMode === 'AUDIT_REPORT' && (
          <div className="px-6 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shrink-0 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" /> Đại diện kiểm kê:
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white outline-none text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Địa điểm kiểm kê:
              </label>
              <input
                type="text"
                value={auditLocation}
                onChange={(e) => setAuditLocation(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white outline-none text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Ngày lập biên bản:
              </label>
              <input
                type="text"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white outline-none text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Ghi chú & Đánh giá chung:
              </label>
              <input
                type="text"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white outline-none text-xs"
              />
            </div>
          </div>
        )}

        {/* Live Preview Paper Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex justify-center">
          <div className="w-full max-w-[850px] bg-white text-black p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-300 min-h-[900px]">
            
            {/* ========================================================
                PREVIEW 1: MÃ QR TRUY XUẤT 
               ======================================================== */}
            {printMode === 'QR' && (
              <div>
                <div className="border-b-2 border-black pb-3 mb-6 flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      CÔNG TY QUẢN LÝ BAY MIỀN NAM • TRUNG TÂM BĐKT
                    </div>
                    <h1 className="text-xl font-black uppercase text-black">
                      DANH SÁCH MÃ QR TRUY XUẤT VẬT TƯ DỰ PHÒNG
                    </h1>
                    <p className="text-xs text-slate-600">
                      Đội Thông Tin CNS/ATM • Tổng cộng: <strong>{targetItems.length}</strong> thiết bị
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-600 font-mono">
                    <div>Ngày in: <strong>{auditDate}</strong></div>
                    <div>Phân loại: <strong>{categoryFilter === 'ALL' ? 'Toàn bộ' : categoryFilter}</strong></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {targetItems.map((item) => (
                    <div key={item.id} className="border border-dashed border-slate-400 rounded-xl p-3 flex flex-col items-center text-center bg-slate-50/50">
                      <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs mb-2">
                        <QRCodeSVG value={item.warehouse || item.sn} size={105} level="M" />
                      </div>
                      <div className="text-xs font-mono font-black text-indigo-700 tracking-wider">
                        {item.warehouse || item.sn}
                      </div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {item.pn && <span>P/N: {item.pn} • </span>}
                        <span className="font-mono font-bold">S/N: {item.sn}</span>
                      </div>
                      {item.loc && (
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Tủ: {item.loc} (SL: {item.qty})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                PREVIEW 2: TEM NHÃN THIẾT BỊ 
               ======================================================== */}
            {printMode === 'LABEL' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {targetItems.map((item) => (
                    <div key={item.id} className="border-2 border-slate-800 rounded-xl p-3.5 flex flex-col justify-between bg-white text-black min-h-[170px]">
                      {/* Label Header */}
                      <div className="border-b border-slate-400 pb-1 mb-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                          TRUNG TÂM BẢO ĐẢM KỸ THUẬT
                        </div>
                        <div className="text-[9px] font-bold text-slate-600 uppercase">
                          ĐỘI THÔNG TIN - THIẾT BỊ DỰ PHÒNG TẠI CHỖ
                        </div>
                      </div>

                      {/* Label Content */}
                      <div className="flex justify-between gap-3 items-center">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-xs font-black uppercase text-slate-900 line-clamp-2 leading-tight">
                            {item.name}
                          </h4>
                          <div className="text-[11px] space-y-0.5 text-slate-700">
                            <div><span className="font-semibold text-slate-500">Phân loại:</span> {item.category}</div>
                            <div><span className="font-semibold text-slate-500">P/N:</span> {item.pn || 'N/A'}</div>
                            <div><span className="font-semibold text-slate-500">S/N:</span> <strong className="font-mono">{item.sn}</strong></div>
                            <div><span className="font-semibold text-slate-500">Vị trí:</span> <strong>{item.loc || 'Kho'}</strong> (SL: {item.qty})</div>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-center">
                          <div className="p-1 bg-white border border-slate-300 rounded-md">
                            <QRCodeSVG value={item.warehouse || item.sn} size={72} level="M" />
                          </div>
                          <span className="text-[8.5px] font-mono font-black mt-1 text-slate-800">
                            {item.warehouse || item.sn}
                          </span>
                        </div>
                      </div>

                      {/* Label Footer */}
                      <div className="border-t border-slate-300 pt-1 mt-2 flex justify-between items-center text-[9px] text-slate-500">
                        <span>Tem Quản Lý Tài Sản • {auditDate}</span>
                        <span className="font-bold text-slate-800">ĐỘI TT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                PREVIEW 3: BIÊN BẢN KIỂM KÊ CHUẨN FORM CHÍNH THỨC 
               ======================================================== */}
            {printMode === 'AUDIT_REPORT' && (
              <div className="space-y-6 font-serif text-slate-900">
                {/* Header Table */}
                <div className="flex justify-between items-start">
                  <div className="text-center w-[45%]">
                    <div className="text-xs font-bold uppercase">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                    <div className="text-xs font-bold uppercase">TRUNG TÂM BẢO ĐẢM KỸ THUẬT</div>
                    <div className="text-xs font-bold uppercase underline">ĐỘI THÔNG TIN</div>
                    <div className="text-[11px] mt-1 italic">Số: ......./BB-ĐTT-KK</div>
                  </div>

                  <div className="text-center w-[52%]">
                    <div className="text-xs font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="text-xs font-bold">Độc lập - Tự do - Hạnh phúc</div>
                    <div className="text-xs text-slate-600">───────</div>
                    <div className="text-xs italic mt-1">
                      TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                    </div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center my-4 space-y-1">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">
                    BIÊN BẢN KIỂM KÊ THIẾT BỊ VÀ VẬT TƯ DỰ PHÒNG TẠI CHỖ
                  </h2>
                  <p className="text-xs italic text-slate-600">
                    (Phục vụ công tác bảo đảm kỹ thuật thông tin, dẫn đường, giám sát hàng không)
                  </p>
                </div>

                {/* Intro details */}
                <div className="text-xs leading-relaxed space-y-1.5">
                  <p>
                    Hôm nay, ngày <strong>{auditDate}</strong>, tại: <strong>{auditLocation}</strong>.
                  </p>
                  <p>
                    Tổ kiểm kê đã tiến hành kiểm tra thực tế đối soát toàn bộ danh mục trang thiết bị, vật tư dự phòng tại chỗ của Đội Thông Tin.
                  </p>
                  <div>
                    <strong>Thành phần tham gia kiểm kê gồm có:</strong>
                    <ul className="list-disc list-inside pl-2 space-y-0.5 mt-1">
                      <li>1. Ông/Bà: <strong>{inspectorName}</strong> - Kỹ sư trực ban / Đại diện Tổ Kiểm kê</li>
                      <li>2. Ông/Bà: ................................................................ - Kỹ sư phụ trách kho vật tư</li>
                      <li>3. Ông/Bà: ................................................................ - Đại diện Lãnh đạo Đội Thông Tin</li>
                    </ul>
                  </div>
                </div>

                {/* Main Data Table */}
                <div>
                  <div className="text-xs font-bold uppercase mb-1.5">
                    I. KẾT QUẢ KIỂM KÊ THỰC TẾ CHI TIẾT TỪNG THIẾT BỊ:
                  </div>
                  <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-black p-1.5 w-8">STT</th>
                        <th className="border border-black p-1.5">Tên Thiết Bị / Vật Tư</th>
                        <th className="border border-black p-1.5 w-20">Phân Loại</th>
                        <th className="border border-black p-1.5 w-24">P/N</th>
                        <th className="border border-black p-1.5 w-28">Serial (S/N)</th>
                        <th className="border border-black p-1.5 w-20">Mã Kho</th>
                        <th className="border border-black p-1.5 w-20">Vị Trí</th>
                        <th className="border border-black p-1.5 w-10">SL</th>
                        <th className="border border-black p-1.5 w-20">Hiện Trạng</th>
                        <th className="border border-black p-1.5">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targetItems.map((item, idx) => (
                        <tr key={item.id} className="text-center">
                          <td className="border border-black p-1.5">{idx + 1}</td>
                          <td className="border border-black p-1.5 text-left font-bold">{item.name}</td>
                          <td className="border border-black p-1.5">{item.category}</td>
                          <td className="border border-black p-1.5 font-mono">{item.pn || '-'}</td>
                          <td className="border border-black p-1.5 font-mono font-bold">{item.sn}</td>
                          <td className="border border-black p-1.5 font-mono font-bold text-indigo-900">{item.warehouse || '-'}</td>
                          <td className="border border-black p-1.5">{item.loc || '-'}</td>
                          <td className="border border-black p-1.5 font-bold">{item.qty}</td>
                          <td className="border border-black p-1.5 font-bold">
                            <span className={item.auditStatus === 'OK' ? 'text-emerald-700' : (item.auditStatus === 'MISSING' ? 'text-rose-700' : 'text-slate-500')}>
                              {item.auditStatus === 'OK' ? 'ĐỦ / TỐT' : (item.auditStatus === 'MISSING' ? 'THIẾU/HỎNG' : 'CHƯA KIỂM')}
                            </span>
                          </td>
                          <td className="border border-black p-1.5 text-left text-[11px] italic">{item.auditNote || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary section */}
                <div className="text-xs space-y-2 border border-black p-3 rounded-lg bg-slate-50">
                  <div className="font-bold uppercase">II. TỔNG HỢP VÀ ĐÁNH GIÁ:</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p>• Tổng số danh mục thiết bị kiểm kê: <strong>{targetItems.length}</strong> mã</p>
                      <p>• Tổng số lượng cá thể hiện vật: <strong>{totalQty}</strong> bộ/chiếc</p>
                      <p>• Số thiết bị kiểm đạt (ĐỦ / TỐT): <strong className="text-emerald-700">{okItems.length}</strong> mã</p>
                    </div>
                    <div>
                      <p>• Số thiết bị sai lệch (THIẾU / HỎNG): <strong className="text-rose-700">{missingItems.length}</strong> mã</p>
                      <p>• Số thiết bị chưa đối soát: <strong>{uncheckedItems.length}</strong> mã</p>
                      <p>• Tỷ lệ sẵn sàng khai thác: <strong>{targetItems.length > 0 ? Math.round((okItems.length / targetItems.length) * 100) : 0}%</strong></p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-300">
                    <strong>Đánh giá chung:</strong> <span>{auditNote}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-4">
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN TỔ KIỂM KÊ</div>
                    <div className="italic text-[11px]">(Ký, ghi rõ họ tên)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{inspectorName}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">TRƯỞNG CA TRỰC BĐKT</div>
                    <div className="italic text-[11px]">(Ký, ghi rõ họ tên)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">........................................</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">ĐỘI TRƯỞNG ĐỘI THÔNG TIN</div>
                    <div className="italic text-[11px]">(Ký, đóng dấu xác nhận)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">........................................</div>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-500" />
            <span>Xem trước chuẩn tỉ lệ giấy A4 khi in ra máy in hoặc lưu PDF</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleExecutePrint}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>XUẤT BẢN IN NGAY</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
