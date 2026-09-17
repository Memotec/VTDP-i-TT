import React, { useState, useMemo } from 'react';
import { 
  FileText, ArrowRightLeft, Search, Filter, Printer, FileSpreadsheet, 
  RotateCcw, Trash2, CheckCircle2, MapPin, Plus,
  Layers, Building2, User, Eye, Download, Loader2, QrCode, Check,
  BarChart3, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import { DispatchedRecord, Role } from '../types.ts';
import { exportDispatchedRegistryToPDF } from '../utils/pdfExporter.ts';

interface DeployedRegistryTableProps {
  records: DispatchedRecord[];
  role: Role | null;
  onViewDetail: (record: DispatchedRecord) => void;
  onPrintRecord: (record: DispatchedRecord) => void;
  onReturnRecord: (record: DispatchedRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onCreateUsageSlip?: () => void;
  onCreateHandover?: () => void;
  onCreateHandoverDoc?: () => void;
  onPrintFullRegistry?: () => void;
  onPrintRegistry?: () => void;
  onAddToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenPrintCenter?: (mode: 'QR' | 'LABEL' | 'AUDIT_REPORT', defaultScope?: 'ALL' | 'FILTERED', selectedItems?: any[]) => void;
}

export const DeployedRegistryTable: React.FC<DeployedRegistryTableProps> = React.memo(({
  records,
  role,
  onViewDetail,
  onPrintRecord,
  onReturnRecord,
  onDeleteRecord,
  onCreateUsageSlip,
  onCreateHandover,
  onCreateHandoverDoc,
  onPrintFullRegistry,
  onPrintRegistry,
  onAddToast,
  onOpenPrintCenter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'USAGE_SLIP' | 'HANDOVER_DOC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEPLOYED' | 'RETURNED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isExportingRegistryPdf, setIsExportingRegistryPdf] = useState(false);
  const [showAnalyticsBreakdown, setShowAnalyticsBreakdown] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // Safe toast helper
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (typeof onAddToast === 'function') {
      onAddToast(msg, type);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
  };

  const handleCreateHandover = () => {
    if (typeof onCreateHandover === 'function') {
      onCreateHandover();
    } else if (typeof onCreateHandoverDoc === 'function') {
      onCreateHandoverDoc();
    }
  };

  const handlePrintFull = () => {
    if (typeof onPrintFullRegistry === 'function') {
      onPrintFullRegistry();
    } else if (typeof onPrintRegistry === 'function') {
      onPrintRegistry();
    }
  };

  const handleExportPdfRegistry = async () => {
    if (filteredRecords.length === 0) {
      showToast('Không có dữ liệu sổ theo dõi nào để xuất PDF!', 'error');
      return;
    }
    try {
      setIsExportingRegistryPdf(true);
      showToast('Đang tạo tệp PDF Sổ Tổng Hợp Theo Dõi Thiết Bị...', 'info');
      await exportDispatchedRegistryToPDF(filteredRecords);
      showToast(`Đã xuất tệp PDF Sổ Theo Dõi (${filteredRecords.length} hồ sơ) thành công!`, 'success');
    } catch (err) {
      console.error('Lỗi xuất PDF sổ tổng hợp:', err);
      showToast('Có lỗi phát sinh khi tạo tệp PDF sổ tổng hợp.', 'error');
    } finally {
      setIsExportingRegistryPdf(false);
    }
  };

  // Compute categories present in records
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter(record => {
      // Type filter
      if (typeFilter !== 'ALL' && record.type !== typeFilter) return false;
      
      // Status filter
      if (statusFilter !== 'ALL' && record.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && record.category !== categoryFilter) return false;

      // Search query
      if (q) {
        return (
          record.itemName?.toLowerCase().includes(q) ||
          record.sn?.toLowerCase().includes(q) ||
          (record.pn && record.pn.toLowerCase().includes(q)) ||
          (record.docNumber && record.docNumber.toLowerCase().includes(q)) ||
          record.receiverName?.toLowerCase().includes(q) ||
          (record.receiverDept && record.receiverDept.toLowerCase().includes(q)) ||
          (record.giverName && record.giverName.toLowerCase().includes(q)) ||
          (record.targetLocation && record.targetLocation.toLowerCase().includes(q)) ||
          (record.purpose && record.purpose.toLowerCase().includes(q)) ||
          (record.notes && record.notes.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [records, typeFilter, statusFilter, categoryFilter, searchQuery]);

  // Statistics calculation - single pass
  const stats = useMemo(() => {
    let totalDeployedQty = 0;
    let totalReturnedQty = 0;
    let activeDeployedCount = 0;
    let usageCount = 0;
    let handoverCount = 0;
    const locationSet = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.status === 'DEPLOYED') {
        activeDeployedCount++;
        totalDeployedQty += (r.qty || 0);
      } else if (r.status === 'RETURNED') {
        totalReturnedQty += (r.returnedQty || r.qty || 0);
      }
      if (r.type === 'USAGE_SLIP') usageCount++;
      else if (r.type === 'HANDOVER_DOC') handoverCount++;

      if (r.targetLocation) locationSet.add(r.targetLocation);
    }

    return {
      totalRecords: records.length,
      activeDeployedCount,
      totalDeployedQty,
      totalReturnedQty,
      usageCount,
      handoverCount,
      uniqueLocationsCount: locationSet.size
    };
  }, [records]);

  // Breakdown statistics by location, department, and category
  const breakdownStats = useMemo(() => {
    const locMap: Record<string, { count: number; qty: number }> = {};
    const deptMap: Record<string, { count: number; qty: number }> = {};
    const catMap: Record<string, { count: number; qty: number }> = {};

    records.forEach(r => {
      const loc = (r.targetLocation || 'Khác / Hiện trường').trim();
      const dept = (r.receiverDept || 'Tổ kỹ thuật / Tiếp nhận').trim();
      const cat = (r.category || 'Vật tư CNS').trim();
      const qty = r.qty || 1;

      if (!locMap[loc]) locMap[loc] = { count: 0, qty: 0 };
      locMap[loc].count++;
      locMap[loc].qty += qty;

      if (!deptMap[dept]) deptMap[dept] = { count: 0, qty: 0 };
      deptMap[dept].count++;
      deptMap[dept].qty += qty;

      if (!catMap[cat]) catMap[cat] = { count: 0, qty: 0 };
      catMap[cat].count++;
      catMap[cat].qty += qty;
    });

    const topLocations = Object.entries(locMap).sort((a, b) => b[1].qty - a[1].qty);
    const topDepts = Object.entries(deptMap).sort((a, b) => b[1].qty - a[1].qty);
    const topCats = Object.entries(catMap).sort((a, b) => b[1].qty - a[1].qty);

    return { topLocations, topDepts, topCats };
  }, [records]);

  // Batch selection helper functions
  const isAllSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedRecordIds.has(r.id));
  const isPartiallySelected = filteredRecords.some(r => selectedRecordIds.has(r.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecordIds(new Set());
    } else {
      const allIds = new Set(filteredRecords.map(r => r.id));
      setSelectedRecordIds(allIds);
    }
  };

  const handleToggleSelectRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedRecordIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRecordIds(next);
  };

  // Trigger batch print with selected or filtered items
  const handleTriggerBatchPrint = (mode: 'QR' | 'LABEL' | 'AUDIT_REPORT', useSelectedOnly: boolean = false) => {
    if (typeof onOpenPrintCenter !== 'function') {
      showToast('Trung tâm in ấn tem nhãn đang tải...', 'info');
      return;
    }

    const sourceRecords = useSelectedOnly && selectedRecordIds.size > 0
      ? filteredRecords.filter(r => selectedRecordIds.has(r.id))
      : filteredRecords;

    if (sourceRecords.length === 0) {
      showToast('Không có thiết bị nào được chọn để in tem!', 'error');
      return;
    }

    const targetItems = sourceRecords.map(r => ({
      id: r.itemId || r.id,
      name: r.itemName,
      category: r.category || 'Vật tư CNS',
      sn: r.sn || 'N/A',
      pn: r.pn || '',
      warehouse: r.warehouse || 'Kho Trung tâm',
      loc: r.targetLocation || 'Tại hiện trường',
      qty: r.qty || 1,
      minQty: 1,
      unit: r.unit || 'Cái',
      auditStatus: 'OK' as const,
      auditDate: r.date,
      condition: 'GOOD' as const,
      notes: r.purpose || ''
    }));

    onOpenPrintCenter(mode, useSelectedOnly ? 'SELECTED' : 'FILTERED', targetItems);
    showToast(`Đã nạp ${targetItems.length} thiết bị vào Trung tâm in ấn!`, 'success');
  };

  // Export Excel specifically for deployed and handed-over equipment
  const handleExportExcel = async () => {
    if (records.length === 0) {
      showToast('Không có dữ liệu thiết bị đã bàn giao để xuất Excel!', 'error');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const exportRows = filteredRecords.map((r, index) => ({
        'STT': index + 1,
        'Loại hồ sơ': r.type === 'USAGE_SLIP' ? 'Phiếu Báo Sử Dụng' : 'Biên Bản Bàn Giao',
        'Số hiệu hồ sơ': r.docNumber || `#${r.id.slice(-6)}`,
        'Tên thiết bị': r.itemName,
        'Chủng loại': r.category,
        'Part Number (P/N)': r.pn || 'N/A',
        'Serial Number (S/N)': r.sn,
        'Số lượng': r.qty,
        'Đơn vị tính': r.unit || 'Chiếc',
        'Bên giao': r.giverDept || 'Đội Thông Tin – TT BĐKT',
        'Người giao': r.giverName || 'Admin / Kỹ sư kho',
        'Bên nhận': r.receiverDept || 'Tổ kỹ thuật chuyên môn',
        'Kỹ sư tiếp nhận': r.receiverName,
        'Vị trí lắp đặt mới': r.targetLocation,
        'Mục đích sử dụng / Lý do': r.purpose,
        'Thời gian xuất': r.date,
        'Trạng thái': r.status === 'DEPLOYED' ? 'Đang sử dụng' : 'Đã hoàn kho',
        'Ngày hoàn kho': r.returnedDate || '',
        'Người xác nhận hoàn': r.returnedBy || '',
        'Ghi chú': r.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'So theo doi Ban Giao & Su Dung');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `So_Theo_Doi_Thiet_Bi_Ban_Giao_Su_Dung_CNS_${dateStr}.xlsx`);
      showToast('Đã xuất Excel Sổ theo dõi thiết bị bàn giao & sử dụng thành công!', 'success');
    } catch {
      showToast('Có lỗi xảy ra khi tạo file Excel!', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Professional Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 rounded-2xl text-white shadow-md border border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
              Phân Hệ Thống Kê Riêng Biệt
            </span>
            <span className="text-xs text-blue-300 font-mono hidden sm:inline">
              CNS/ATM Dispatched & Handover Asset Registry
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
            <span>VẬT TƯ, THIẾT BỊ ĐÃ BÁO SỬ DỤNG & BÀN GIAO</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl font-medium leading-relaxed">
            Khu vực lưu vết, theo dõi và quản lý tập trung toàn bộ trang thiết bị, vật tư dự phòng đã được lập Phiếu Báo Sử Dụng xuất kho hoặc ký Biên Bản Bàn Giao đưa vào vận hành tại các đài trạm.
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowAnalyticsBreakdown(!showAnalyticsBreakdown)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              showAnalyticsBreakdown
                ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-300" />
            <span>{showAnalyticsBreakdown ? 'Thu Gọn Phân Bổ' : 'Thống Kê Phân Bổ'}</span>
            {showAnalyticsBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Visual Breakdown Drawer */}
      {showAnalyticsBreakdown && (
        <div className="bg-white dark:bg-[#131B2E] p-5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm space-y-4 animate-scale-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-[#2563EB]" />
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                Thống Kê Chi Tiết Phân Bổ Thiết Bị Đang Vận Hành Theo Vị Trí & Đơn Vị
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Tổng số: {stats.totalDeployedQty} chiếc đang triển khai
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Locations */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" /> Vị Trí / Đài Trạm Đang Lắp Đặt
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pt-1">
                {breakdownStats.topLocations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có dữ liệu vị trí</p>
                ) : (
                  breakdownStats.topLocations.map(([loc, data]) => (
                    <div key={loc} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={loc}>{loc}</span>
                      <span className="font-black text-[#2563EB] dark:text-blue-400 shrink-0 font-mono">{data.qty} cái ({data.count} hồ sơ)</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Departments */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" /> Đơn Vị / Tổ Kỹ Thuật Tiếp Nhận
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pt-1">
                {breakdownStats.topDepts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có dữ liệu đơn vị</p>
                ) : (
                  breakdownStats.topDepts.map(([dept, data]) => (
                    <div key={dept} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={dept}>{dept}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">{data.qty} cái ({data.count} hồ sơ)</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" /> Chủng Loại Thiết Bị Bàn Giao
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pt-1">
                {breakdownStats.topCats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có dữ liệu chủng loại</p>
                ) : (
                  breakdownStats.topCats.map(([cat, data]) => (
                    <div key={cat} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={cat}>{cat}</span>
                      <span className="font-black text-purple-600 dark:text-purple-400 shrink-0 font-mono">{data.qty} cái</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Active Deployed */}
        <div className="bg-white dark:bg-[#131B2E] p-4 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/50">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Đang Sử Dụng / Vận Hành
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalDeployedQty}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">bộ/chiếc</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block truncate">
              Trong {stats.activeDeployedCount} lượt xuất kho
            </span>
          </div>
        </div>

        {/* Card 2: Handover vs Usage */}
        <div className="bg-white dark:bg-[#131B2E] p-4 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
            <ArrowRightLeft className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Hồ Sơ Bàn Giao & Phiếu
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalRecords}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">hồ sơ</span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold block truncate">
              {stats.handoverCount} Biên bản • {stats.usageCount} Phiếu
            </span>
          </div>
        </div>

        {/* Card 3: Returned to Stock */}
        <div className="bg-white dark:bg-[#131B2E] p-4 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900/50">
            <RotateCcw className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Đã Thu Hồi / Hoàn Kho
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalReturnedQty}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">bộ nhập lại</span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block truncate">
              Đã hoàn tất thử nghiệm/thay thế
            </span>
          </div>
        </div>

        {/* Card 4: Locations */}
        <div className="bg-white dark:bg-[#131B2E] p-4 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/50">
            <MapPin className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Vị Trí & Hệ Thống Đích
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.uniqueLocationsCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">địa điểm</span>
            </div>
            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold block truncate">
              Đài KSV, Phòng máy ATM, Lab...
            </span>
          </div>
        </div>
      </div>

      {/* Main Toolbar & Search */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm: Tên thiết bị, S/N, P/N, Số hiệu, Kỹ sư nhận, Nơi lắp đặt, Mục đích..."
              className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-bold placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                ×
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Print Dropdown */}
            {onOpenPrintCenter && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleTriggerBatchPrint('QR', selectedRecordIds.size > 0)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200/80 dark:border-indigo-800 shadow-xs active:scale-95"
                  title="In ấn mã QR / Tem nhãn hàng loạt cho các mục đã chọn hoặc danh sách đang lọc"
                >
                  <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>IN TEM HÀNG LOẠT ({selectedRecordIds.size > 0 ? `${selectedRecordIds.size} mục` : `${filteredRecords.length}`})</span>
                </button>
              </div>
            )}

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Xuất Sổ theo dõi thiết bị bàn giao sang Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>XUẤT EXCEL</span>
            </button>

            <button
              onClick={handleExportPdfRegistry}
              disabled={isExportingRegistryPdf}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Xuất Sổ Tổng Hợp Theo Dõi Thiết Bị Đã Bàn Giao sang tệp PDF"
            >
              {isExportingRegistryPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <Download className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>XUẤT PDF SỔ</span>
            </button>

            <button
              onClick={handlePrintFull}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="In Sổ Tổng Hợp Theo Dõi Thiết Bị Đã Bàn Giao (Chuẩn A4)"
            >
              <Printer className="w-4 h-4 text-[#2563EB]" />
              <span>IN SỔ THEO DÕI</span>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5"></div>

            <button
              onClick={handleCreateHandover}
              className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              title="Lập biên bản bàn giao tài sản, công cụ mới"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>+ LẬP BB BÀN GIAO</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs font-bold">
          <span className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#2563EB]" /> Lọc theo:
          </span>

          {/* Type filters */}
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl gap-1 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tất cả ({records.length})
            </button>
            <button
              onClick={() => setTypeFilter('USAGE_SLIP')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'USAGE_SLIP'
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-amber-700'
              }`}
            >
              Phiếu sử dụng ({records.filter(r => r.type === 'USAGE_SLIP').length})
            </button>
            <button
              onClick={() => setTypeFilter('HANDOVER_DOC')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'HANDOVER_DOC'
                  ? 'bg-[#2563EB] text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-blue-700'
              }`}
            >
              BB Bàn giao ({records.filter(r => r.type === 'HANDOVER_DOC').length})
            </button>
          </div>

          {/* Status filters */}
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl gap-1 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Mọi trạng thái
            </button>
            <button
              onClick={() => setStatusFilter('DEPLOYED')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'DEPLOYED'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-emerald-700'
              }`}
            >
              Đang hoạt động ({records.filter(r => r.status === 'DEPLOYED').length})
            </button>
            <button
              onClick={() => setStatusFilter('RETURNED')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'RETURNED'
                  ? 'bg-slate-800 text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Đã thu hồi ({records.filter(r => r.status === 'RETURNED').length})
            </button>
          </div>

          {/* Category Dropdown Filter if needed */}
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 text-xs font-black focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả chủng loại</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="text-[10px] text-rose-600 hover:underline font-extrabold uppercase ml-auto cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredRecords.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-2xl">
              📋
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Chưa có bản ghi thiết bị bàn giao / sử dụng nào phù hợp
            </h4>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              Khi bạn lập Phiếu Báo Sử Dụng hoặc Biên Bản Bàn Giao Thiết Bị, toàn bộ thông tin chi tiết sẽ được tự động tổng hợp và lưu vết tại bảng này.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleCreateHandover}
                className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Lập Biên Bản Bàn Giao
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-[10.5px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={el => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Chọn tất cả danh sách đang hiển thị"
                    />
                  </th>
                  <th className="py-3.5 px-3 w-10 text-center">STT</th>
                  <th className="py-3.5 px-4">Hồ Sơ / Loại</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Thiết Bị & Thông Số</th>
                  <th className="py-3.5 px-4 text-center">SL Xuất</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Bên Nhận / Kỹ Sư</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Nơi Lắp Đặt & Mục Đích</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right min-w-[140px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredRecords.map((record, index) => {
                  const isHandover = record.type === 'HANDOVER_DOC';
                  const isSelected = selectedRecordIds.has(record.id);

                  return (
                    <tr 
                      key={record.id}
                      onClick={(e) => handleToggleSelectRecord(record.id, e)}
                      className={`${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/30'
                          : index % 2 === 0
                          ? 'bg-white dark:bg-[#131B2E]'
                          : 'bg-slate-50 dark:bg-slate-900/30'
                      } hover:bg-blue-50/70 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer`}
                    >
                      {/* 0. Checkbox */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRecord(record.id, e as unknown as React.MouseEvent)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* 1. STT */}
                      <td className="py-3.5 px-3 text-center text-slate-600 dark:text-slate-400 font-black text-xs">
                        {index + 1}
                      </td>

                      {/* 2. Document & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isHandover 
                              ? 'bg-blue-100 text-[#2563EB] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-900' 
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-900'
                          }`}>
                            {isHandover ? <ArrowRightLeft className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {isHandover ? 'BB Bàn Giao' : 'Phiếu Sử Dụng'}
                          </span>
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            {record.docNumber || `#${record.id.slice(-6)}`}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            {record.date}
                          </span>
                        </div>
                      </td>

                      {/* 3. Item Name & Tech Specs */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => onViewDetail(record)}
                            className="font-extrabold text-slate-900 dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400 text-left line-clamp-2 transition-colors cursor-pointer"
                          >
                            {record.itemName}
                          </button>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              S/N: {record.sn}
                            </span>
                            {record.pn && (
                              <span className="text-slate-500 font-mono">
                                • P/N: {record.pn}
                              </span>
                            )}
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold">
                              {record.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs">
                          x{record.qty} {record.unit || 'chiếc'}
                        </span>
                      </td>

                      {/* 5. Receiver */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>{record.receiverName}</span>
                          </div>
                          {record.receiverDept && (
                            <div className="text-[10.5px] text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1 truncate" title={record.receiverDept}>
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span>{record.receiverDept}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Target Location & Purpose */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-[260px]">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11.5px] truncate" title={record.targetLocation}>
                            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{record.targetLocation}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 truncate italic font-medium" title={record.purpose}>
                            {record.purpose}
                          </p>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 text-center">
                        {record.status === 'DEPLOYED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" /> Đang dùng
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-md">
                              <RotateCcw className="w-2.5 h-2.5" /> Đã hoàn kho
                            </span>
                            {record.returnedDate && (
                              <span className="text-[9px] text-slate-500 mt-0.5 font-mono font-semibold">
                                {record.returnedDate.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => onViewDetail(record)}
                            className="p-1.5 text-slate-600 hover:text-[#2563EB] hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            title="Xem chi tiết hồ sơ bàn giao/sử dụng"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print record (Document) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrintRecord(record);
                            }}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                            title="In lại phiếu / biên bản gốc"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Print QR / Barcode tag for this deployed item */}
                          {onOpenPrintCenter && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const singleItem = {
                                  id: record.itemId || record.id,
                                  name: record.itemName,
                                  category: record.category || 'Vật tư CNS',
                                  sn: record.sn || 'N/A',
                                  pn: record.pn || '',
                                  warehouse: record.warehouse || 'Kho Trung tâm',
                                  loc: record.targetLocation || 'Tại hiện trường',
                                  qty: record.qty || 1,
                                  minQty: 1,
                                  unit: record.unit || 'Cái',
                                  auditStatus: 'OK' as const,
                                  auditDate: record.date,
                                  condition: 'GOOD' as const,
                                  notes: record.purpose || ''
                                };
                                onOpenPrintCenter('QR', 'SELECTED', [singleItem]);
                              }}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                              title="In tem nhãn / mã QR cho thiết bị này"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}

                          {/* Return to Stock if currently deployed */}
                          {record.status === 'DEPLOYED' && (
                            <button
                              type="button"
                              onClick={() => onReturnRecord(record)}
                              className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                              title="Thu hồi và hoàn trả thiết bị này về kho dự phòng"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete if admin */}
                          {role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => onDeleteRecord(record.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              title="Xóa bản ghi lưu trữ (Admin)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
