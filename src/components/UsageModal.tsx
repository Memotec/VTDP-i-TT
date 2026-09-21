import React, { useState } from 'react';
import { 
  X, FileText, History, Printer, Trash2, Search, Download, Loader2, 
  Eye, CheckCircle2, Calendar, MapPin, Building2, User, 
  Layers, ShieldCheck, QrCode, ArrowRight 
} from 'lucide-react';
import { InventoryItem, UsageSlip, Role } from '../types.ts';
import { exportUsageSlipToPDF } from '../utils/pdfExporter.ts';
import { exportUsageSlipToDocx } from '../utils/docxExporter.ts';
import { exportUsageSlipToGoogleDoc } from '../services/googleDocsService.ts';
import { getAccessToken, googleSignIn } from '../services/authService.ts';

interface UsageModalProps {
  selectedItemForUsage: InventoryItem | null;
  isUsageHistoryOpen: boolean;
  usageSlips: UsageSlip[];
  role: Role | null;
  onCloseUsageForm: () => void;
  onCloseHistory: () => void;
  onSubmitUsage: (newSlip: UsageSlip, deductInv: boolean) => void;
  onDeleteSlip: (slipId: string) => void;
  onClearHistory: () => void;
  onPrintSlip: (slip: UsageSlip) => void;
}

export const UsageModal: React.FC<UsageModalProps> = ({
  selectedItemForUsage,
  isUsageHistoryOpen,
  usageSlips,
  role,
  onCloseUsageForm,
  onCloseHistory,
  onSubmitUsage,
  onDeleteSlip,
  onClearHistory,
  onPrintSlip
}) => {
  // Usage form state
  const [usageDocNumber, setUsageDocNumber] = useState(() => `PBSD-${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`);
  const [usageUser, setUsageUser] = useState(role === 'admin' ? 'Kỹ sư Đội Thông Tin' : 'Kỹ sư ' + (role || 'Guest'));
  const [usageReceiverDept, setUsageReceiverDept] = useState('Tổ Vận Hành CNS/ATM');
  const [usageReceiverPos, setUsageReceiverPos] = useState('Kỹ sư trực ban');
  const [usageGiverName, setUsageGiverName] = useState(role === 'admin' ? 'Kỹ sư Quản lý Kho' : 'Admin Kho');
  const [usageGiverDept, setUsageGiverDept] = useState('Đội Thông Tin – Trung tâm BĐKT');
  const [usageGiverPos, setUsageGiverPos] = useState('Kỹ sư phụ trách kho');
  const [usageQty, setUsageQty] = useState(1);
  const [usageUnit, setUsageUnit] = useState('Chiếc');
  const [usagePurpose, setUsagePurpose] = useState('Bảo dưỡng định kỳ / Thay thế dự phòng');
  const [usageNotes, setUsageNotes] = useState('');
  const [usageTargetLoc, setUsageTargetLoc] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // History search & preview state
  const [usageSearchQuery, setUsageSearchQuery] = useState('');
  const [previewSlip, setPreviewSlip] = useState<UsageSlip | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingDoc, setIsExportingDoc] = useState(false);

  const handleExportDocxSlip = async (slip: UsageSlip) => {
    try {
      setIsExportingDocx(true);
      await exportUsageSlipToDocx(slip);
    } catch (err) {
      console.error('Lỗi xuất Word Docs phiếu báo sử dụng:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportGoogleDocSlip = async (slip: UsageSlip) => {
    try {
      setIsExportingDoc(true);
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        token = res?.accessToken || null;
      }
      if (!token) return;

      const docRes = await exportUsageSlipToGoogleDoc(token, slip);
      if (docRes?.webViewLink) {
        window.open(docRes.webViewLink, '_blank');
      }
    } catch (err) {
      console.error('Lỗi xuất Google Doc phiếu báo sử dụng:', err);
    } finally {
      setIsExportingDoc(false);
    }
  };

  const handleExportPDFSlip = async (slip: UsageSlip) => {
    try {
      setIsExportingPdf(true);
      await exportUsageSlipToPDF(slip);
    } catch (err) {
      console.error('Lỗi xuất PDF phiếu báo sử dụng:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getFormSlipDraft = (): UsageSlip | null => {
    if (!selectedItemForUsage) return null;
    const todayStr = new Date().toLocaleString('vi-VN');
    return {
      id: `draft-${Date.now()}`,
      docNumber: usageDocNumber.trim() || `PBSD-${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`,
      itemId: selectedItemForUsage.id,
      itemName: selectedItemForUsage.name,
      sn: selectedItemForUsage.sn,
      pn: selectedItemForUsage.pn || '',
      category: selectedItemForUsage.category || 'Khác',
      warehouse: selectedItemForUsage.warehouse || '',
      originalLoc: selectedItemForUsage.loc || '',
      user: usageUser.trim() || 'Kỹ sư tiếp nhận',
      qtyUsed: usageQty,
      unit: usageUnit.trim() || 'Chiếc',
      giverDept: usageGiverDept.trim(),
      giverName: usageGiverName.trim(),
      giverPos: usageGiverPos.trim(),
      receiverDept: usageReceiverDept.trim(),
      receiverPos: usageReceiverPos.trim(),
      purpose: usagePurpose,
      notes: usageNotes.trim(),
      targetLocation: usageTargetLoc.trim(),
      date: todayStr
    };
  };

  const handleFormSubmitWithPdf = async () => {
    if (!selectedItemForUsage) return;
    if (!usageUser.trim()) return;

    const todayStr = new Date().toLocaleString('vi-VN');
    const newSlip: UsageSlip = {
      id: `slip-${Date.now()}`,
      docNumber: usageDocNumber.trim() || `PBSD-${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`,
      itemId: selectedItemForUsage.id,
      itemName: selectedItemForUsage.name,
      sn: selectedItemForUsage.sn,
      pn: selectedItemForUsage.pn || '',
      category: selectedItemForUsage.category || 'Khác',
      warehouse: selectedItemForUsage.warehouse || '',
      originalLoc: selectedItemForUsage.loc || '',
      user: usageUser.trim(),
      qtyUsed: usageQty,
      unit: usageUnit.trim() || 'Chiếc',
      giverDept: usageGiverDept.trim(),
      giverName: usageGiverName.trim(),
      giverPos: usageGiverPos.trim(),
      receiverDept: usageReceiverDept.trim(),
      receiverPos: usageReceiverPos.trim(),
      purpose: usagePurpose,
      notes: usageNotes.trim(),
      targetLocation: usageTargetLoc.trim(),
      date: todayStr
    };

    onSubmitUsage(newSlip, deductInventory);
    await handleExportPDFSlip(newSlip);
    onCloseUsageForm();
  };

  const handleFormSubmitWithDocx = async () => {
    if (!selectedItemForUsage) return;
    if (!usageUser.trim()) return;

    const todayStr = new Date().toLocaleString('vi-VN');
    const newSlip: UsageSlip = {
      id: `slip-${Date.now()}`,
      docNumber: usageDocNumber.trim() || `PBSD-${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`,
      itemId: selectedItemForUsage.id,
      itemName: selectedItemForUsage.name,
      sn: selectedItemForUsage.sn,
      pn: selectedItemForUsage.pn || '',
      category: selectedItemForUsage.category || 'Khác',
      warehouse: selectedItemForUsage.warehouse || '',
      originalLoc: selectedItemForUsage.loc || '',
      user: usageUser.trim(),
      qtyUsed: usageQty,
      unit: usageUnit.trim() || 'Chiếc',
      giverDept: usageGiverDept.trim(),
      giverName: usageGiverName.trim(),
      giverPos: usageGiverPos.trim(),
      receiverDept: usageReceiverDept.trim(),
      receiverPos: usageReceiverPos.trim(),
      purpose: usagePurpose,
      notes: usageNotes.trim(),
      targetLocation: usageTargetLoc.trim(),
      date: todayStr
    };

    onSubmitUsage(newSlip, deductInventory);
    await handleExportDocxSlip(newSlip);
    onCloseUsageForm();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForUsage) return;
    if (!usageUser.trim()) return;

    const todayStr = new Date().toLocaleString('vi-VN');
    const newSlip: UsageSlip = {
      id: `slip-${Date.now()}`,
      docNumber: usageDocNumber.trim() || `PBSD-${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`,
      itemId: selectedItemForUsage.id,
      itemName: selectedItemForUsage.name,
      sn: selectedItemForUsage.sn,
      pn: selectedItemForUsage.pn || '',
      category: selectedItemForUsage.category || 'Khác',
      warehouse: selectedItemForUsage.warehouse || '',
      originalLoc: selectedItemForUsage.loc || '',
      user: usageUser.trim(),
      qtyUsed: usageQty,
      unit: usageUnit.trim() || 'Chiếc',
      giverDept: usageGiverDept.trim(),
      giverName: usageGiverName.trim(),
      giverPos: usageGiverPos.trim(),
      receiverDept: usageReceiverDept.trim(),
      receiverPos: usageReceiverPos.trim(),
      purpose: usagePurpose,
      notes: usageNotes.trim(),
      targetLocation: usageTargetLoc.trim(),
      date: todayStr
    };

    onSubmitUsage(newSlip, deductInventory);
    onPrintSlip(newSlip);
    onCloseUsageForm();
  };

  return (
    <>
      {/* Document Preview Modal for Usage Slip */}
      {previewSlip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-950/70 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-8 w-full max-w-3xl relative max-h-[92vh] overflow-y-auto my-auto flex flex-col">
            {/* Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Xem Trước Phiếu Báo Sử Dụng
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                    Số hiệu: {previewSlip.docNumber || previewSlip.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPrintSlip(previewSlip)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="In tài liệu này"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In Phiếu</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDFSlip(previewSlip)}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Tải tệp PDF"
                >
                  {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Tải PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDocxSlip(previewSlip)}
                  disabled={isExportingDocx}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Tải tệp Word Docs (.docx)"
                >
                  {isExportingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Tải Docs (.docx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportGoogleDocSlip(previewSlip)}
                  disabled={isExportingDoc}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Mở trên Google Docs"
                >
                  {isExportingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Google Docs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSlip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Paper Mockup View */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 my-4 text-slate-800 dark:text-slate-200 font-sans shadow-inner space-y-6">
              {/* Official Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left border-b border-slate-300 dark:border-slate-700 pb-5">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
                    TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM
                  </div>
                  <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    CÔNG TY QUẢN LÝ BAY MIỀN NAM
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    TRUNG TÂM BẢO ĐẢM KỸ THUẬT
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Số: {previewSlip.docNumber || previewSlip.id}
                  </div>
                </div>

                <div className="sm:text-center">
                  <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="w-24 h-0.5 bg-slate-400 dark:bg-slate-600 mx-auto mt-1 mb-1"></div>
                  <div className="text-[10.5px] italic text-slate-500 dark:text-slate-400">
                    TP. Hồ Chí Minh, {previewSlip.date}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white tracking-wide">
                  PHIẾU BÁO SỬ DỤNG VẬT TƯ / THIẾT BỊ KỸ THUẬT
                </h2>
                <p className="text-[11px] italic text-slate-500 dark:text-slate-400">
                  (Căn cứ nhu cầu kỹ thuật, vận hành, bảo dưỡng & thay thế dự phòng hệ thống CNS/ATM)
                </p>
              </div>

              {/* Personnel summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Đơn Vị Giao / Trích Xuất</span>
                  <div className="font-extrabold text-slate-900 dark:text-white">{previewSlip.giverDept || 'Đội Thông Tin – Trung tâm BĐKT'}</div>
                  <div className="text-slate-600 dark:text-slate-300">Người lập / Thủ kho: <span className="font-bold">{previewSlip.giverName || 'Kỹ sư quản lý kho'}</span></div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Đơn Vị / Kỹ Sư Tiếp Nhận</span>
                  <div className="font-extrabold text-indigo-600 dark:text-indigo-400">{previewSlip.receiverDept || 'Tổ Vận Hành CNS/ATM'}</div>
                  <div className="text-slate-600 dark:text-slate-300">Kỹ sư tiếp nhận: <span className="font-bold text-slate-900 dark:text-white uppercase">{previewSlip.user}</span></div>
                </div>
              </div>

              {/* Equipment Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                      <th className="p-2.5 text-center w-10">STT</th>
                      <th className="p-2.5">Tên Thiết Bị / Vật Tư</th>
                      <th className="p-2.5">Part Number / Mã</th>
                      <th className="p-2.5">Serial Number (S/N)</th>
                      <th className="p-2.5 text-center">ĐVT</th>
                      <th className="p-2.5 text-center">Số Lượng</th>
                      <th className="p-2.5">Kho Xuất / Vị Trí</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="p-2.5 text-center font-bold text-slate-400">1</td>
                      <td className="p-2.5 font-black text-slate-900 dark:text-white">{previewSlip.itemName}</td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">{previewSlip.pn || '-'}</td>
                      <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">{previewSlip.sn}</td>
                      <td className="p-2.5 text-center">{previewSlip.unit || 'Chiếc'}</td>
                      <td className="p-2.5 text-center font-black text-slate-900 dark:text-white">x{previewSlip.qtyUsed}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">{previewSlip.warehouse || 'Kho BĐKT'} {previewSlip.originalLoc ? `(${previewSlip.originalLoc})` : ''}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Operational & Installation Info */}
              <div className="space-y-2 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Vị trí lắp đặt / Hệ thống nhận:</span>
                    <strong className="text-slate-900 dark:text-white text-xs block mt-0.5">
                      {previewSlip.targetLocation || 'Hệ thống thiết bị kỹ thuật CNS/ATM'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Mục đích sử dụng:</span>
                    <span className="text-slate-800 dark:text-slate-200 text-xs block mt-0.5">
                      {previewSlip.purpose || 'Bảo dưỡng / Thay thế'}
                    </span>
                  </div>
                </div>

                {previewSlip.notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Ghi chú kèm theo:</span>
                    <p className="text-slate-700 dark:text-slate-300 italic text-xs mt-0.5">{previewSlip.notes}</p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center pt-2">
                <div className="space-y-1">
                  <div className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">KỸ SƯ TIẾP NHẬN</div>
                  <div className="text-[10px] italic text-slate-400">(Ký & ghi rõ họ tên)</div>
                  <div className="h-14 flex items-end justify-center font-bold text-xs text-slate-900 dark:text-white">
                    {previewSlip.user}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">NGƯỜI LẬP PHIẾU</div>
                  <div className="text-[10px] italic text-slate-400">(Ký & ghi rõ họ tên)</div>
                  <div className="h-14 flex items-end justify-center font-bold text-xs text-slate-900 dark:text-white">
                    {previewSlip.giverName || 'Thủ kho'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">PHỤ TRÁCH KHO</div>
                  <div className="text-[10px] italic text-slate-400">(Ký & ghi rõ họ tên)</div>
                  <div className="h-14 flex items-end justify-center font-bold text-xs text-slate-400 italic">
                    (Đã xác nhận)
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">LÃNH ĐẠO ĐỘI</div>
                  <div className="text-[10px] italic text-slate-400">(Ký duyệt)</div>
                  <div className="h-14 flex items-end justify-center font-bold text-xs text-slate-400 italic">
                    (Đã phê duyệt)
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewSlip(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black text-xs rounded-xl cursor-pointer transition-colors"
              >
                Đóng Xem Trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Usage Slip Modal */}
      {selectedItemForUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto my-8">
            <button
              onClick={onCloseUsageForm}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Tạo Phiếu Báo Sử Dụng
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">
                  BỐC DỠ VÀ LẮP ĐẶT THIẾT BỊ CNS/ATM
                </p>
              </div>
            </div>

            {/* Target Item summary banner with real-time stock & registry calculation */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 mb-5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Thiết bị xuất sử dụng:
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                  {selectedItemForUsage.category || 'Vật tư CNS'}
                </span>
              </div>

              <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                {selectedItemForUsage.name}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-medium pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400">S/N:</span> <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedItemForUsage.sn}</strong>
                </div>
                <div>
                  <span className="text-slate-400">P/N:</span> <strong className="text-slate-800 dark:text-slate-200">{selectedItemForUsage.pn || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Kho hàng:</span> <strong className="text-slate-800 dark:text-slate-200">{selectedItemForUsage.warehouse || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Vị trí lưu kho:</span> <strong className="text-slate-800 dark:text-slate-200">{selectedItemForUsage.loc || 'Kệ chính'}</strong>
                </div>
              </div>

              {/* Dynamic stock calculation bar */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Tồn hiện tại</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-xs font-black">x{selectedItemForUsage.qty}</strong>
                  </div>
                  <span className="text-amber-500 font-black">−</span>
                  <div className="text-center">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold">Xuất sử dụng</span>
                    <strong className="text-amber-700 dark:text-amber-400 text-xs font-black">x{usageQty}</strong>
                  </div>
                  <span className="text-amber-500 font-black">=</span>
                  <div className="text-center">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">Tồn kho sau xuất</span>
                    <strong className={`text-xs font-black ${selectedItemForUsage.qty - usageQty <= 1 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      x{Math.max(0, selectedItemForUsage.qty - usageQty)} {usageUnit}
                    </strong>
                  </div>
                </div>
                {selectedItemForUsage.qty - usageQty <= 1 && (
                  <p className="text-[10.5px] text-rose-600 dark:text-rose-400 font-bold mt-1 text-center">
                    ⚠️ Sau khi xuất, tồn kho sẽ còn dưới ngưỡng an toàn (≤ 1)!
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Số hiệu phiếu xuất
                  </label>
                  <input
                    type="text"
                    value={usageDocNumber}
                    onChange={(e) => setUsageDocNumber(e.target.value)}
                    placeholder="VD: PBSD-2026/025"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Kỹ sư tiếp nhận sử dụng *
                  </label>
                  <input
                    type="text"
                    required
                    value={usageUser}
                    onChange={(e) => setUsageUser(e.target.value)}
                    placeholder="Họ tên kỹ sư nhận"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Số lượng xuất ({usageUnit}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedItemForUsage.qty}
                      value={usageQty}
                      onChange={(e) => setUsageQty(Math.min(selectedItemForUsage.qty, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 pl-3.5 pr-14 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                    <select
                      value={usageUnit}
                      onChange={(e) => setUsageUnit(e.target.value)}
                      className="absolute right-1 top-1.5 bottom-1.5 bg-slate-100 dark:bg-slate-700 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 rounded-xl px-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value="Chiếc">Chiếc</option>
                      <option value="Bộ">Bộ</option>
                      <option value="Card">Card</option>
                      <option value="Khay">Khay</option>
                      <option value="Cái">Cái</option>
                    </select>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setUsageQty(1)}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                      x1
                    </button>
                    {selectedItemForUsage.qty >= 2 && (
                      <button
                        type="button"
                        onClick={() => setUsageQty(2)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                      >
                        x2
                      </button>
                    )}
                    {selectedItemForUsage.qty > 2 && (
                      <button
                        type="button"
                        onClick={() => setUsageQty(selectedItemForUsage.qty)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Vị trí lắp đặt / Hệ thống *
                  </label>
                  <input
                    type="text"
                    required
                    value={usageTargetLoc}
                    onChange={(e) => setUsageTargetLoc(e.target.value)}
                    placeholder="VD: Phòng máy ATM / Đài KSV"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Mục đích sử dụng
                </label>
                <input
                  type="text"
                  value={usagePurpose}
                  onChange={(e) => setUsagePurpose(e.target.value)}
                  placeholder="VD: Thay thế khẩn cấp card nguồn bị cháy..."
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              {/* Advanced fields expander */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {showAdvancedFields ? '− Thu gọn thông tin đơn vị/ghi chú' : '+ Thêm thông tin bên giao, đơn vị nhận & ghi chú'}
                </button>
              </div>

              {showAdvancedFields && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 uppercase block">Đơn vị nhận</label>
                      <input
                        type="text"
                        value={usageReceiverDept}
                        onChange={(e) => setUsageReceiverDept(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 uppercase block">Chức vụ người nhận</label>
                      <input
                        type="text"
                        value={usageReceiverPos}
                        onChange={(e) => setUsageReceiverPos(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 uppercase block">Người giao (Thủ kho)</label>
                      <input
                        type="text"
                        value={usageGiverName}
                        onChange={(e) => setUsageGiverName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-400 uppercase block">Đơn vị giao</label>
                      <input
                        type="text"
                        value={usageGiverDept}
                        onChange={(e) => setUsageGiverDept(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-slate-400 uppercase block">Ghi chú bổ sung</label>
                    <textarea
                      rows={2}
                      value={usageNotes}
                      onChange={(e) => setUsageNotes(e.target.value)}
                      placeholder="Tình trạng linh kiện khi bàn giao..."
                      className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Deduct inventory checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductInventory}
                  onChange={(e) => setDeductInventory(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-white block">
                    Khấu trừ số lượng trong kho & Chuyển vào Sổ Bàn Giao
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Tự động giảm tồn kho thiết bị này và lưu vào Sổ Bàn Giao & Điều Chuyển.
                  </span>
                </div>
              </label>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCloseUsageForm}
                  className="sm:w-20 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const draft = getFormSlipDraft();
                    if (draft) setPreviewSlip(draft);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300/80 dark:border-slate-700"
                >
                  <Eye className="w-4 h-4 text-amber-500" />
                  <span>XEM TRƯỚC</span>
                </button>
                <button
                  type="button"
                  onClick={handleFormSubmitWithDocx}
                  disabled={isExportingDocx}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  title="Tạo phiếu và xuất tệp Word Docs (.docx)"
                >
                  {isExportingDocx ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>XUẤT FILE DOCS (.DOCX)</span>
                </button>
                <button
                  type="button"
                  onClick={handleFormSubmitWithPdf}
                  disabled={isExportingPdf}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>XUẤT FILE PDF</span>
                </button>
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>IN PHIẾU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {isUsageHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-5 sm:p-8 w-full max-w-5xl relative max-h-[90vh] overflow-y-auto my-8 flex flex-col">
            <button
              onClick={onCloseHistory}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5 mb-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Nhật Ký Phiếu Báo Sử Dụng
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">
                    Xem trước, in ấn & theo dõi lịch sử rút kho thiết bị chuyên dụng
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {usageSlips.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-[10px] font-black tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/20 transition-all uppercase cursor-pointer"
                  >
                    Xóa tất cả phiếu
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4 shrink-0 relative">
              <input
                type="text"
                placeholder="Tìm kiếm phiếu (theo tên kỹ sư, S/N, hệ thống, tên linh kiện...)"
                value={usageSearchQuery}
                onChange={(e) => setUsageSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 px-4.5 py-3 pl-11 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-3.5" />
              {usageSearchQuery && (
                <button
                  onClick={() => setUsageSearchQuery('')}
                  className="absolute right-4.5 top-3.5 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {(() => {
                const filtered = usageSlips.filter(slip => {
                  const q = usageSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    String(slip.user || '').toLowerCase().includes(q) ||
                    String(slip.sn || '').toLowerCase().includes(q) ||
                    String(slip.itemName || '').toLowerCase().includes(q) ||
                    String(slip.purpose || '').toLowerCase().includes(q) ||
                    String(slip.targetLocation || '').toLowerCase().includes(q) ||
                    String(slip.id || '').toLowerCase().includes(q) ||
                    String(slip.docNumber || '').toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-20 text-slate-400 font-semibold text-xs space-y-2">
                      <div className="text-3xl">📭</div>
                      <p>Không tìm thấy bản ghi phiếu báo sử dụng nào phù hợp.</p>
                      <p className="text-[10px] font-normal text-slate-400 uppercase">Mẹo: Thử nhập số S/N hoặc hệ thống lắp đặt</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-semibold">
                        <thead>
                          <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-3">Thời điểm / Số Phiếu</th>
                            <th className="py-3 px-3">Thiết bị bốc dỡ</th>
                            <th className="py-3 px-3">Kỹ sư tiếp nhận</th>
                            <th className="py-3 px-3">Nơi lắp đặt / Mục đích</th>
                            <th className="py-3 px-3 text-center">SL</th>
                            <th className="py-3 px-3 text-right">Tác Vụ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((slip) => (
                            <tr key={slip.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300 transition-colors">
                              <td className="py-3 px-3">
                                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{slip.docNumber || `#${slip.id.slice(-6)}`}</div>
                                <div className="text-[9px] text-slate-400 font-mono tracking-wide mt-0.5">{slip.date}</div>
                              </td>
                              <td className="py-3 px-3 max-w-[220px]">
                                <div className="truncate text-slate-900 dark:text-white font-extrabold" title={slip.itemName}>{slip.itemName}</div>
                                <div className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">S/N: <strong className="text-slate-700 dark:text-slate-300">{slip.sn}</strong></div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="uppercase text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">{slip.user}</div>
                                <div className="text-[9.5px] text-slate-400 truncate">{slip.receiverDept || 'Tổ CNS/ATM'}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="truncate text-slate-800 dark:text-slate-200 font-bold" title={slip.targetLocation}>{slip.targetLocation || '-'}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[170px] italic mt-0.5" title={slip.purpose}>{slip.purpose}</div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[10.5px] font-black">
                                  x{slip.qtyUsed} {slip.unit || 'cái'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setPreviewSlip(slip)}
                                    className="p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/20 dark:text-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                    title="Xem trước phiếu báo sử dụng"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Xem</span>
                                  </button>
                                  <button
                                    onClick={() => handleExportDocxSlip(slip)}
                                    disabled={isExportingDocx}
                                    className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/20 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                                    title="Tải tệp Word (.docx)"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleExportGoogleDocSlip(slip)}
                                    disabled={isExportingDoc}
                                    className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white dark:bg-blue-500/20 dark:text-blue-400 rounded-lg transition-colors cursor-pointer"
                                    title="Xuất tài liệu Google Docs"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleExportPDFSlip(slip)}
                                    disabled={isExportingPdf}
                                    className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                    title="Xuất file PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onPrintSlip(slip)}
                                    className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="In trực tiếp"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteSlip(slip.id)}
                                    className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-500/20 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                    title="Xóa biên bản lưu trữ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards List */}
                    <div className="md:hidden space-y-3">
                      {filtered.map((slip) => (
                        <div key={slip.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                                {slip.docNumber || `#${slip.id.slice(-6)}`}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white">{slip.itemName}</h4>
                              <p className="text-[10px] font-mono text-slate-500">S/N: {slip.sn}</p>
                            </div>
                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                              x{slip.qtyUsed} {slip.unit || 'cái'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 text-[9.5px] block">Kỹ sư tiếp nhận:</span>
                              <strong className="text-indigo-600 dark:text-indigo-400 uppercase">{slip.user}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block">Lắp đặt tại:</span>
                              <strong className="text-slate-800 dark:text-slate-200">{slip.targetLocation || '-'}</strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/60 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewSlip(slip)}
                              className="flex-1 py-1.5 bg-amber-500 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem trước
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrintSlip(slip)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer"
                              title="In phiếu"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportDocxSlip(slip)}
                              className="p-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer"
                              title="Tải Word .docx"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportPDFSlip(slip)}
                              className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl cursor-pointer"
                              title="Tải PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSlip(slip.id)}
                              className="p-1.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-150 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Tổng cộng: <strong className="text-slate-900 dark:text-white">{usageSlips.length}</strong> phiếu báo sử dụng
              </span>
              <button
                type="button"
                onClick={onCloseHistory}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
