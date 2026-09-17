import React, { useState, useMemo } from 'react';
import {
  Layers, MapPin, AlertCircle, Clock, CheckSquare, XCircle,
  History, FileText, Edit, Trash2, Camera, Box, Download, Plus,
  QrCode, Copy, Check, AlertTriangle, ShieldCheck, Tag, Sparkles,
  LayoutGrid, Table as TableIcon, ExternalLink, ArrowRightLeft, Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem, Role } from '../types.ts';
import { getEquipmentLookupUrl } from '../utils/qrParser.ts';
import { exportInventoryReportToDocx } from '../utils/docxExporter.ts';

interface InventoryTableProps {
  filteredInventory: InventoryItem[];
  role: Role | null;
  onResetAuditStatus: () => void;
  onQuickAuditStatus: (item: InventoryItem, nextStatus: 'OK' | 'MISSING' | null) => void;
  onSelectDetail: (item: InventoryItem) => void;
  onOpenUsage: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onOpenScanTarget: (item: InventoryItem) => void;
  onOpenQrModal?: (item: InventoryItem) => void;
  onOpenPublicLookup?: (item: InventoryItem) => void;
  onExportCsv: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  onAddNewItem?: () => void;
  onOpenPrintCenter?: (mode: 'QR' | 'LABEL' | 'AUDIT_REPORT', defaultScope?: 'ALL' | 'FILTERED', selectedItems?: InventoryItem[]) => void;
  dispatchedCount?: number;
  onOpenDispatchedRegistry?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = React.memo(({
  filteredInventory,
  role,
  onResetAuditStatus,
  onQuickAuditStatus,
  onSelectDetail,
  onOpenUsage,
  onEditItem,
  onDeleteItem,
  onOpenScanTarget,
  onOpenQrModal,
  onOpenPublicLookup,
  onExportCsv,
  onExportPdf,
  isExportingPdf = false,
  onAddNewItem,
  onOpenPrintCenter,
  dispatchedCount = 0,
  onOpenDispatchedRegistry
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cns_inventory_view_mode');
        if (saved === 'grid' || saved === 'table') return saved;
        // Auto-detect mobile devices & screens under 768px to default to responsive Cards
        if (window.innerWidth < 768) return 'grid';
      } catch {
        // ignore
      }
    }
    return 'table';
  });

  const handleSetViewMode = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cns_inventory_view_mode', mode);
      } catch {
        // ignore
      }
    }
  };

  const handleCopySn = (sn: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sn) return;
    navigator.clipboard.writeText(sn);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredInventory.length && filteredInventory.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredInventory.forEach(item => next.add(item.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedItemsList = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return filteredInventory.filter(item => selectedIds.has(item.id));
  }, [filteredInventory, selectedIds]);

  const handleTriggerBatchPrint = (mode: 'QR' | 'LABEL' | 'AUDIT_REPORT', useSelectionOnly = false) => {
    setIsPrintMenuOpen(false);
    if (!onOpenPrintCenter) return;
    if (useSelectionOnly && selectedItemsList.length > 0) {
      onOpenPrintCenter(mode, 'FILTERED', selectedItemsList);
    } else {
      onOpenPrintCenter(mode, 'FILTERED', filteredInventory);
    }
  };


  const { totalQty, okCount, missingCount, uncheckedCount, lowStockCount, auditPercent } = useMemo(() => {
    let tQty = 0;
    let ok = 0;
    let missing = 0;
    let unchecked = 0;
    let low = 0;

    for (let i = 0; i < filteredInventory.length; i++) {
      const item = filteredInventory[i];
      const q = Number(item.qty) || 0;
      tQty += q;
      if (item.auditStatus === 'OK') ok++;
      else if (item.auditStatus === 'MISSING') missing++;
      else unchecked++;

      if (q <= 1) low++;
    }

    const percent = filteredInventory.length > 0 ? Math.round(((ok + missing) / filteredInventory.length) * 100) : 0;
    return {
      totalQty: tQty,
      okCount: ok,
      missingCount: missing,
      uncheckedCount: unchecked,
      lowStockCount: low,
      auditPercent: percent
    };
  }, [filteredInventory]);

  const handleExportDocx = async () => {
    if (filteredInventory.length === 0) return;
    try {
      setIsExportingDocx(true);
      await exportInventoryReportToDocx(filteredInventory, {
        reportTitle: 'BÁO CÁO TỒN KHO & HIỆN TRẠNG THIẾT BỊ DỰ PHÒNG CNS/ATM'
      });
    } catch (err) {
      console.error('Lỗi xuất Word tồn kho:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-300/80 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col min-h-[420px] w-full transition-all scroll-smooth" id="inventory-table-container">
      {/* Table Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800 gap-3.5 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                DANH MỤC THIẾT BỊ & VẬT TƯ
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60">
                Tổng: {filteredInventory.length} / mã vật tư
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Tổng: {totalQty} / hiện vật
              </span>
              {dispatchedCount > 0 && onOpenDispatchedRegistry && (
                <button
                  type="button"
                  onClick={onOpenDispatchedRegistry}
                  className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Chuyển sang xem Mục Thống Kê & Quản Lý Vật Tư Đã Báo Sử Dụng & Bàn Giao"
                >
                  <ArrowRightLeft className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Đã báo SD & bàn giao: {dispatchedCount} hồ sơ</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {onOpenDispatchedRegistry && (
            <button
              type="button"
              onClick={onOpenDispatchedRegistry}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Mở Mục Thống Kê & Quản Lý Thiết Bị Đã Báo Sử Dụng & Bàn Giao"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>SỔ ĐÃ BÀN GIAO ({dispatchedCount})</span>
            </button>
          )}

          {/* View Mode Toggle: Table vs Grid */}
          <div className="flex items-center bg-slate-200/90 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                  : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white'
              }`}
              title="Chuyển sang dạng BẢNG (Table view) chi tiết"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Dạng Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                  : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white'
              }`}
              title="Chuyển sang dạng LƯỚI (Grid view) trực quan kèm mã QR"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dạng Lưới Trực Quan</span>
            </button>
          </div>

          {/* Batch Print Dropdown */}
          {onOpenPrintCenter && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200/80 dark:border-indigo-800 shadow-xs active:scale-95"
                title="In ấn tem nhãn / mã QR hàng loạt theo danh sách đã lọc hoặc các mục đã chọn"
              >
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>IN TEM HÀNG LOẠT ({selectedIds.size > 0 ? `${selectedIds.size} mục` : `${filteredInventory.length}`})</span>
              </button>

              {isPrintMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPrintMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-scale-in space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Tùy chọn in hàng loạt ({selectedIds.size > 0 ? `${selectedIds.size} mục đã chọn` : `${filteredInventory.length} mục đã lọc`})
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerBatchPrint('QR', selectedIds.size > 0)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <div className="flex flex-col">
                        <span>In Bảng Mã QR Định Danh</span>
                        <span className="text-[10px] text-slate-400 font-normal">Tập hợp mã QR dán quản lý thiết bị</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerBatchPrint('LABEL', selectedIds.size > 0)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Tag className="w-4 h-4 text-indigo-600" />
                      <div className="flex flex-col">
                        <span>In Tem Nhãn Kỹ Thuật</span>
                        <span className="text-[10px] text-slate-400 font-normal">Bao gồm tên thiết bị, S/N, P/N và QR</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerBatchPrint('AUDIT_REPORT', selectedIds.size > 0)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span>In Biên Bản Kiểm Kê</span>
                        <span className="text-[10px] text-slate-400 font-normal">Xuất biểu mẫu kiểm kê chính thức</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {role === 'admin' && onAddNewItem && (
            <button
              type="button"
              onClick={onAddNewItem}
              className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-blue-500/20 active:scale-95"
              title="Mở biểu mẫu thêm thiết bị mới vào kho"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Thiết Bị</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExportingDocx || filteredInventory.length === 0}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200/80 dark:border-blue-900/60 shadow-xs active:scale-95 disabled:opacity-60"
            title="Tải toàn bộ danh sách thiết bị thành tệp Word Docs (.docx)"
          >
            {isExportingDocx ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span>{isExportingDocx ? 'Đang tạo Word...' : 'Tải Báo Cáo Word (.docx)'}</span>
          </button>

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-rose-200/80 dark:border-rose-900/60 shadow-xs active:scale-95 disabled:opacity-60"
              title="Xuất danh sách thiết bị đang lọc thành tệp PDF chuyên nghiệp có logo Đội Thông Tin"
            >
              <FileText className={`w-4 h-4 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-pulse' : ''}`} />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Xuất Báo Cáo PDF'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            title="Xuất danh sách thiết bị đang lọc ra file CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>

          {role === 'admin' && (
            <button
              type="button"
              onClick={onResetAuditStatus}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-400 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40"
              title="Hủy kết quả kiểm kê toàn bộ danh mục về Chưa kiểm"
            >
              <History className="w-3.5 h-3.5" />
              <span>Reset Kiểm Kê</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Progress Mini Strip */}
      <div className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-300/80 dark:border-slate-800 px-5 py-2 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Tiến Độ Kiểm Kê:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-[11px] border border-emerald-300 dark:border-emerald-800">
              ● Đủ: {okCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-black text-[11px] border border-rose-300 dark:border-rose-800">
              ▲ Thiếu: {missingCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-black text-[11px] border border-slate-300 dark:border-slate-700">
              Chưa kiểm: {uncheckedCount}
            </span>
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-[11px] border border-amber-300 dark:border-amber-700">
                <AlertTriangle className="w-3 h-3" /> Sắp hết: {lowStockCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Mã QR tra cứu điện thoại trực quan</span>
          </div>

          <div className="flex items-center gap-2 min-w-[150px]">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${auditPercent}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 min-w-[36px] text-right">
              {auditPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* View Mode Indicator Strip & Batch Selection Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-300/80 dark:border-slate-800 px-5 py-2.5 flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filteredInventory.length > 0 && selectedIds.size === filteredInventory.length}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
            />
            <span>
              {selectedIds.size > 0 
                ? `Đã tích chọn ${selectedIds.size}/${filteredInventory.length} thiết bị` 
                : `Chọn tất cả (${filteredInventory.length})`}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <button
                type="button"
                onClick={() => handleTriggerBatchPrint('LABEL', true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                title="In tem nhãn cho các thiết bị đã tích chọn"
              >
                <Tag className="w-3 h-3" />
                <span>In {selectedIds.size} Tem Nhãn</span>
              </button>
              <button
                type="button"
                onClick={() => handleTriggerBatchPrint('QR', true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                title="In mã QR cho các thiết bị đã tích chọn"
              >
                <QrCode className="w-3 h-3" />
                <span>In {selectedIds.size} Mã QR</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] hidden sm:inline">Chuyển đổi giao diện:</span>
          <button
            type="button"
            onClick={() => handleSetViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs cursor-pointer transition-all hover:border-blue-300"
          >
            {viewMode === 'grid' ? (
              <>
                <TableIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Xem Dạng Bảng</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                <span>Xem Dạng Lưới Trực Quan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CONDITIONAL RENDERING: GRID VIEW VS TABLE VIEW */}
      {viewMode === 'grid' ? (
        /* DẠNG LƯỚI (GRID VIEW) */
        <div className="flex-1 p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/20 max-h-[750px] overflow-y-auto custom-scrollbar">
          {filteredInventory.length === 0 ? (
            <div className="px-6 py-20 text-center bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                Không tìm thấy thiết bị phù hợp
              </h4>
              <p className="text-slate-400 max-w-sm mx-auto font-medium text-xs leading-relaxed">
                Không có vật tư nào thỏa mãn điều kiện tìm kiếm hoặc bộ lọc hiện tại. Hãy thử chọn phân loại khác hoặc xóa từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5">
              {filteredInventory.map((item, idx) => {
                const lookupUrl = getEquipmentLookupUrl(item);
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#131B2E] rounded-2xl p-4 border border-slate-300 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-700 transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      {/* Card Header: Category, Selection Checkbox & Audit Status */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => handleToggleSelectItem(item.id, e)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                            title="Tích chọn in tem / thao tác hàng loạt"
                          />
                          <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0 border border-blue-200 dark:border-blue-900/60">
                            {idx + 1}
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider truncate border border-slate-300 dark:border-slate-700">
                            {item.category || 'Khác'}
                          </span>
                        </div>

                        <div className="shrink-0">
                          {item.auditStatus === 'OK' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg font-black text-[11px] border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                              ● ĐỦ / TỐT
                            </span>
                          ) : item.auditStatus === 'MISSING' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-2.5 py-0.5 rounded-lg font-black text-[11px] border border-rose-300 dark:border-rose-800 shadow-2xs">
                              ▲ THIẾU
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-lg font-bold text-[11px] border border-slate-300 dark:border-slate-700">
                              Chưa kiểm
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equipment Name */}
                      <div className="mb-2.5">
                        <h4
                          onClick={() => onSelectDetail(item)}
                          className="font-black text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors cursor-pointer"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                        {item.auditDate && (
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-[#2563EB]" /> {item.auditDate.split(' ')[0]}
                          </span>
                        )}
                      </div>

                      {/* Specs and stock metadata */}
                      <div className="space-y-1.5 text-xs bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-3">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400">Số Serial S/N:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs truncate max-w-[125px]">
                              {item.sn || 'N/A'}
                            </span>
                            {item.sn && (
                              <button
                                type="button"
                                onClick={(e) => handleCopySn(item.sn, item.id, e)}
                                className="p-0.5 text-slate-500 hover:text-blue-600 rounded cursor-pointer"
                                title="Sao chép S/N"
                              >
                                {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {item.pn && (
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400">P/N:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.pn}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400">Vị trí kho:</span>
                          <span className="text-blue-700 dark:text-blue-400 font-bold truncate max-w-[140px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {item.loc || 'Kho Dự Phòng'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400">Tồn kho:</span>
                          <div>
                            {item.qty === 0 ? (
                              <span className="text-rose-700 dark:text-rose-400 font-black text-xs">0 cái (Hết)</span>
                            ) : item.qty === 1 ? (
                              <span className="text-amber-700 dark:text-amber-400 font-black text-xs">1 bộ (Sắp hết ⚠️)</span>
                            ) : (
                              <span className="text-slate-900 dark:text-white font-black text-xs">{item.qty} bộ</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interactive QR Code Card */}
                      <div className="p-2.5 bg-indigo-50/70 dark:bg-slate-800/80 rounded-xl border border-indigo-200/80 dark:border-slate-700 mb-3 flex items-center gap-3 shadow-2xs">
                        <div
                          onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onSelectDetail(item))}
                          className="p-1 bg-white rounded-lg shadow-2xs cursor-pointer hover:scale-105 transition-transform shrink-0 border border-slate-200 dark:border-slate-600"
                          title="Nhấn để mở Popup thông tin tra cứu trực quan"
                        >
                          <QRCodeSVG
                            value={lookupUrl || item.warehouse || item.sn}
                            size={56}
                            level="M"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-400 tracking-wider block">
                            Mã QR Tra Cứu
                          </span>
                          <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.warehouse || item.sn}
                          </div>
                          <button
                            type="button"
                            onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onSelectDetail(item))}
                            className="mt-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Mở Popup Tra Cứu</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Row */}
                    <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap">
                      {/* Fast Audit Toggle */}
                      <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-300 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                          className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer transition-all ${
                            item.auditStatus === 'OK'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                          }`}
                          title="Xác nhận Đủ"
                        >
                          Đủ
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                          className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer transition-all ${
                            item.auditStatus === 'MISSING'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                          }`}
                          title="Xác nhận Thiếu"
                        >
                          Thiếu
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Popup Tra Cứu */}
                        <button
                          type="button"
                          onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onSelectDetail(item))}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 cursor-pointer transition-colors"
                          title="Mở Popup tra cứu trực quan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Phóng to QR */}
                        <button
                          type="button"
                          onClick={() => (onOpenQrModal ? onOpenQrModal(item) : onSelectDetail(item))}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/60 cursor-pointer transition-colors"
                          title="Phóng to mã QR cho điện thoại quét"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* History */}
                        <button
                          type="button"
                          onClick={() => onSelectDetail(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Chi tiết & Lịch sử"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Usage */}
                        <button
                          type="button"
                          onClick={() => onOpenUsage(item)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Lập phiếu sử dụng"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {role === 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                              title="Sửa thiết bị"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                              title="Xóa thiết bị"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* DẠNG BẢNG (TABLE VIEW) */
        <div className="table-container overflow-x-auto flex-1 custom-scrollbar scroll-smooth">
          {/* Mobile Swipe Hint */}
          <div className="md:hidden bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold px-4 py-2 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 truncate">
              <span>⇄</span> Cuộn ngang để xem đầy đủ các cột (STT, S/N, QR, Kiểm Kê, Thao tác)
            </span>
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className="text-blue-600 dark:text-blue-400 font-black hover:underline cursor-pointer shrink-0 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-2xs"
            >
              Xem Lưới
            </button>
          </div>
          <table className="w-full text-sm text-left whitespace-nowrap min-w-[900px]">
              <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 border-b-2 border-slate-300 dark:border-slate-700 text-xs uppercase font-black tracking-wider text-slate-800 dark:text-slate-200 z-10 shadow-2xs">
                <tr>
                  <th className="px-3 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredInventory.length > 0 && selectedIds.size === filteredInventory.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      title="Chọn tất cả danh sách đang lọc"
                    />
                  </th>
                  <th className="px-3 py-3.5 w-[5%] text-center">STT</th>
                  <th className="px-4 py-3.5 w-[34%] text-left">Tên Trang Thiết Bị & Vật Tư</th>
                  <th className="px-3.5 py-3.5 w-[16%] text-left">Số Serial (S/N)</th>
                  <th className="px-3.5 py-3.5 w-[13%] text-center">Mã Kho (QR)</th>
                  <th className="px-3.5 py-3.5 w-[10%] text-center">Số Lượng</th>
                  <th className="px-3.5 py-3.5 w-[10%] text-center">Kiểm Kê</th>
                  <th className="px-4 py-3.5 w-[10%] text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Không tìm thấy thiết bị phù hợp
                      </h4>
                      <p className="text-slate-400 max-w-sm mx-auto font-medium text-xs leading-relaxed">
                        Không có vật tư nào thỏa mãn điều kiện tìm kiếm hoặc bộ lọc hiện tại. Hãy thử chọn phân loại khác hoặc xóa từ khóa tìm kiếm.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item, idx) => {
                    const lookupUrl = getEquipmentLookupUrl(item);
                    return (
                      <tr
                        key={item.id}
                        className={`${idx % 2 === 0 ? 'bg-white dark:bg-[#131B2E]' : 'bg-slate-50 dark:bg-slate-900/30'} hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition-colors group`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => handleToggleSelectItem(item.id, e)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                            title="Tích chọn in tem / thao tác hàng loạt"
                          />
                        </td>

                        {/* STT */}
                        <td className="px-3 py-3.5 text-center font-black text-slate-600 dark:text-slate-400 text-xs">
                          {idx + 1}
                        </td>

                        {/* TÊN THIẾT BỊ */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/50 cursor-pointer shadow-xs group-hover:scale-105 group-hover:bg-[#2563EB] group-hover:text-white transition-all"
                              onClick={() => onSelectDetail(item)}
                              title="Xem chi tiết & lịch sử thiết bị"
                            >
                              <Box className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0 max-w-md">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-black text-slate-900 dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors cursor-pointer text-sm leading-snug truncate"
                                  onClick={() => onSelectDetail(item)}
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md font-bold text-[11px] border border-slate-300 dark:border-slate-700">
                                  {item.category || 'Khác'}
                                </span>
                                {item.pn && (
                                  <span className="flex items-center gap-1 text-[11px]">
                                    <Tag className="w-3 h-3 text-slate-500" />
                                    <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">{item.pn}</strong>
                                  </span>
                                )}
                                {item.loc && (
                                  <span className="flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                                    <MapPin className="w-3 h-3" /> {item.loc}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* S/N WITH ONE-CLICK COPY */}
                        <td className="px-3.5 py-3.5">
                          <div className="flex items-center gap-1.5 group/sn">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-wide bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 truncate max-w-[140px]" title={item.sn}>
                              {item.sn || 'N/A'}
                            </span>
                            {item.sn && (
                              <button
                                type="button"
                                onClick={(e) => handleCopySn(item.sn, item.id, e)}
                                className="p-1 rounded-md text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Sao chép số Serial (S/N)"
                              >
                                {copiedId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* MÃ KHO (QR) VỚI HÌNH ẢNH MÃ QR TRỰC QUAN */}
                        <td className="px-3.5 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div
                              onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onOpenQrModal ? onOpenQrModal(item) : onSelectDetail(item))}
                              className="p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer hover:scale-110 hover:border-blue-400 transition-all shrink-0"
                              title="Nhấn để quét / mở tra cứu nhanh điện thoại"
                            >
                              <QRCodeSVG value={lookupUrl || item.warehouse || item.sn} size={28} level="L" />
                            </div>
                            {item.warehouse ? (
                              <button
                                type="button"
                                onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onOpenQrModal ? onOpenQrModal(item) : onOpenScanTarget(item))}
                                className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 px-2 py-1 rounded-lg font-black text-xs border border-blue-200/80 dark:border-blue-900/50 uppercase tracking-wider cursor-pointer transition-all group/qr shadow-2xs"
                                title="Mở Popup tra cứu & mã QR thiết bị"
                              >
                                <span>{item.warehouse}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onSelectDetail(item))}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 italic text-xs cursor-pointer transition-colors"
                                title="Xem popup tra cứu"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>Tra cứu</span>
                              </button>
                            )}
                          </div>
                        </td>

                      {/* SỐ LƯỢNG */}
                      <td className="px-3.5 py-3.5 text-center">
                        {item.qty === 0 ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-lg font-black text-xs border border-rose-300 dark:border-rose-800 animate-pulse" title="Hết hàng tồn kho">
                            0 (Hết)
                          </span>
                        ) : item.qty === 1 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 px-2.5 py-1 rounded-lg font-black text-xs border border-amber-300 dark:border-amber-700" title="Dưới ngưỡng an toàn dự phòng">
                            1 (Sắp hết ⚠️)
                          </span>
                        ) : (
                          <span className="font-black text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
                            {item.qty} bộ
                          </span>
                        )}
                      </td>

                      {/* TÌNH TRẠNG KIỂM KÊ */}
                      <td className="px-3.5 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {item.auditStatus === 'OK' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-black text-xs border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                              ● ĐỦ / TỐT
                            </span>
                          ) : item.auditStatus === 'MISSING' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-lg font-black text-xs border border-rose-300 dark:border-rose-800 shadow-2xs">
                              ▲ THIẾU
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-lg font-bold text-xs border border-slate-300 dark:border-slate-700">
                              Chưa kiểm
                            </span>
                          )}
                          {item.auditDate && (
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[90px]">
                              {item.auditDate.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* THAO TÁC NHANH */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          {/* Fast Audit Toggle */}
                          <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                              className={`px-2 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                item.auditStatus === 'OK'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:text-emerald-600'
                              }`}
                              title="Duyệt nhanh: Đủ / Tốt"
                            >
                              Đủ
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                              className={`px-2 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                item.auditStatus === 'MISSING'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:text-rose-600'
                              }`}
                              title="Duyệt nhanh: Thiếu hụt"
                            >
                              Thiếu
                            </button>
                          </div>

                          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                          {/* Public Quick Popup Lookup Trigger */}
                          <button
                            type="button"
                            onClick={() => (onOpenPublicLookup ? onOpenPublicLookup(item) : onSelectDetail(item))}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer border border-blue-200/60 dark:border-blue-900/40"
                            title="Bật Popup Tra Cứu Nhanh (Giao diện hiển thị trực quan khi quét QR)"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* QR Modal Quick Trigger */}
                          <button
                            type="button"
                            onClick={() => (onOpenQrModal ? onOpenQrModal(item) : onSelectDetail(item))}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-900/40"
                            title="Xem & Phóng to mã QR tra cứu điện thoại"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Detail / History */}
                          <button
                            type="button"
                            onClick={() => onSelectDetail(item)}
                            className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xem lịch sử kiểm kê & chi tiết thiết bị"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Usage slip */}
                          <button
                            type="button"
                            onClick={() => onOpenUsage(item)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Lập phiếu sử dụng thiết bị"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Admin edit & delete */}
                          {role === 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditItem(item)}
                                className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa thông tin thiết bị"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteItem(item)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Xóa thiết bị này khỏi danh mục"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-[#E2E8F0] dark:border-slate-800 text-xs font-semibold text-slate-500 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span>
            Hiển thị <strong className="text-slate-800 dark:text-slate-200 font-bold">{filteredInventory.length}</strong> danh mục thiết bị
          </span>
          <span>•</span>
          <span>
            Tổng hiện vật: <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalQty}</strong> bộ/chiếc
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cơ sở dữ liệu hoạt động ổn định
          </span>
        </div>
      </div>
    </div>
  );
});

