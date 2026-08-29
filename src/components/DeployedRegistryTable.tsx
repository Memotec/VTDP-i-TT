import React, { useState, useMemo } from 'react';
import { 
  FileText, ArrowRightLeft, Search, Filter, Printer, FileSpreadsheet, 
  RotateCcw, Trash2, CheckCircle2, MapPin, Plus,
  Layers, Building2, User, Eye
} from 'lucide-react';
import { DispatchedRecord, Role } from '../types.ts';
import * as XLSX from 'xlsx';

interface DeployedRegistryTableProps {
  records: DispatchedRecord[];
  role: Role | null;
  onViewDetail: (record: DispatchedRecord) => void;
  onPrintRecord: (record: DispatchedRecord) => void;
  onReturnRecord: (record: DispatchedRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onCreateUsageSlip: () => void;
  onCreateHandover: () => void;
  onPrintFullRegistry: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DeployedRegistryTable: React.FC<DeployedRegistryTableProps> = ({
  records,
  role,
  onViewDetail,
  onPrintRecord,
  onReturnRecord,
  onDeleteRecord,
  onCreateUsageSlip,
  onCreateHandover,
  onPrintFullRegistry,
  onAddToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'USAGE_SLIP' | 'HANDOVER_DOC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEPLOYED' | 'RETURNED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

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
    return records.filter(record => {
      // Type filter
      if (typeFilter !== 'ALL' && record.type !== typeFilter) return false;
      
      // Status filter
      if (statusFilter !== 'ALL' && record.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && record.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText = [
          record.itemName,
          record.sn,
          record.pn || '',
          record.docNumber || '',
          record.receiverName,
          record.receiverDept || '',
          record.giverName || '',
          record.giverDept || '',
          record.targetLocation,
          record.purpose,
          record.notes || ''
        ].join(' ').toLowerCase();

        return matchText.includes(q);
      }

      return true;
    });
  }, [records, typeFilter, statusFilter, categoryFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalDeployedQty = records
      .filter(r => r.status === 'DEPLOYED')
      .reduce((sum, r) => sum + r.qty, 0);

    const totalReturnedQty = records
      .filter(r => r.status === 'RETURNED')
      .reduce((sum, r) => sum + (r.returnedQty || r.qty), 0);

    const usageCount = records.filter(r => r.type === 'USAGE_SLIP').length;
    const handoverCount = records.filter(r => r.type === 'HANDOVER_DOC').length;

    // Distinct locations
    const locations = Array.from(new Set(records.map(r => r.targetLocation).filter(Boolean)));

    return {
      totalRecords: records.length,
      activeDeployedCount: records.filter(r => r.status === 'DEPLOYED').length,
      totalDeployedQty,
      totalReturnedQty,
      usageCount,
      handoverCount,
      uniqueLocationsCount: locations.length
    };
  }, [records]);

  // Export Excel specifically for deployed and handed-over equipment
  const handleExportExcel = () => {
    if (records.length === 0) {
      onAddToast('Không có dữ liệu thiết bị đã bàn giao để xuất Excel!', 'error');
      return;
    }

    try {
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
      onAddToast('Đã xuất Excel Sổ theo dõi thiết bị bàn giao & sử dụng thành công!', 'success');
    } catch {
      onAddToast('Có lỗi xảy ra khi tạo file Excel!', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Active Deployed */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Đang Sử Dụng / Vận Hành
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalDeployedQty}
              </span>
              <span className="text-[11px] font-bold text-slate-400">bộ/chiếc</span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block truncate">
              Trong {stats.activeDeployedCount} lượt xuất kho
            </span>
          </div>
        </div>

        {/* Card 2: Handover vs Usage */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Hồ Sơ Bàn Giao & Phiếu
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalRecords}
              </span>
              <span className="text-[11px] font-bold text-slate-400">hồ sơ</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
              {stats.handoverCount} Biên bản • {stats.usageCount} Phiếu
            </span>
          </div>
        </div>

        {/* Card 3: Returned to Stock */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Đã Thu Hồi / Hoàn Kho
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalReturnedQty}
              </span>
              <span className="text-[11px] font-bold text-slate-400">bộ đã nhập lại</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
              Đã hoàn tất thử nghiệm/thay thế
            </span>
          </div>
        </div>

        {/* Card 4: Locations */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Vị Trí & Hệ Thống Đích
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.uniqueLocationsCount}
              </span>
              <span className="text-[11px] font-bold text-slate-400">địa điểm tiếp nhận</span>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block truncate">
              Đài KSV, Phòng máy ATM, Lab...
            </span>
          </div>
        </div>
      </div>

      {/* Main Toolbar & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.2rem] p-4.5 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm: Tên thiết bị, S/N, P/N, Số hiệu, Kỹ sư nhận, Nơi lắp đặt, Mục đích..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-xs sm:text-sm font-medium placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Xuất Sổ theo dõi thiết bị bàn giao sang Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>XUẤT EXCEL</span>
            </button>

            <button
              onClick={onPrintFullRegistry}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="In Sổ Tổng Hợp Theo Dõi Thiết Bị Đã Bàn Giao (Chuẩn A4)"
            >
              <Printer className="w-4 h-4 text-indigo-500" />
              <span>IN SỔ THEO DÕI</span>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5"></div>

            <button
              onClick={onCreateHandover}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              title="Lập biên bản bàn giao tài sản, công cụ mới"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>+ LẬP BB BÀN GIAO</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-150 dark:border-slate-800/80 text-xs font-bold">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-indigo-500" /> Lọc theo:
          </span>

          {/* Type filters */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Tất cả loại ({records.length})
            </button>
            <button
              onClick={() => setTypeFilter('USAGE_SLIP')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'USAGE_SLIP'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-amber-600'
              }`}
            >
              Phiếu sử dụng ({records.filter(r => r.type === 'USAGE_SLIP').length})
            </button>
            <button
              onClick={() => setTypeFilter('HANDOVER_DOC')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'HANDOVER_DOC'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              BB Bàn giao ({records.filter(r => r.type === 'HANDOVER_DOC').length})
            </button>
          </div>

          {/* Status filters */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Mọi trạng thái
            </button>
            <button
              onClick={() => setStatusFilter('DEPLOYED')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'DEPLOYED'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              Đang hoạt động ({records.filter(r => r.status === 'DEPLOYED').length})
            </button>
            <button
              onClick={() => setStatusFilter('RETURNED')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'RETURNED'
                  ? 'bg-slate-700 text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Đã thu hồi kho ({records.filter(r => r.status === 'RETURNED').length})
            </button>
          </div>

          {/* Category Dropdown Filter if needed */}
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-none rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
              className="text-[10px] text-rose-500 hover:underline font-extrabold uppercase ml-auto cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.2rem] overflow-hidden shadow-sm">
        {filteredRecords.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-3xl">
              📋
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Chưa có bản ghi thiết bị bàn giao / sử dụng nào phù hợp
            </h4>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              Khi bạn lập Phiếu Báo Sử Dụng hoặc Biên Bản Bàn Giao Thiết Bị, toàn bộ thông tin chi tiết sẽ được tự động tổng hợp và lưu vết tại bảng này.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onCreateHandover}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Lập Biên Bản Bàn Giao
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-4 w-12 text-center">STT</th>
                  <th className="py-4 px-4">Hồ Sơ / Loại</th>
                  <th className="py-4 px-4 min-w-[220px]">Thiết Bị & Thông Số</th>
                  <th className="py-4 px-4 text-center">SL Xuất</th>
                  <th className="py-4 px-4 min-w-[180px]">Bên Nhận / Kỹ Sư</th>
                  <th className="py-4 px-4 min-w-[200px]">Nơi Lắp Đặt & Mục Đích</th>
                  <th className="py-4 px-4 text-center">Trạng Thái</th>
                  <th className="py-4 px-4 text-right min-w-[150px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredRecords.map((record, index) => {
                  const isHandover = record.type === 'HANDOVER_DOC';

                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* 1. STT */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-bold text-[11px]">
                        {index + 1}
                      </td>

                      {/* 2. Document & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isHandover 
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          }`}>
                            {isHandover ? <ArrowRightLeft className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {isHandover ? 'BB Bàn Giao' : 'Phiếu Sử Dụng'}
                          </span>
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                            {record.docNumber || `#${record.id.slice(-6)}`}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-semibold">
                            {record.date}
                          </span>
                        </div>
                      </td>

                      {/* 3. Item Name & Tech Specs */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => onViewDetail(record)}
                            className="font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left line-clamp-2 transition-colors cursor-pointer"
                          >
                            {record.itemName}
                          </button>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              S/N: {record.sn}
                            </span>
                            {record.pn && (
                              <span className="text-slate-400">
                                • P/N: {record.pn}
                              </span>
                            )}
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-500 dark:text-slate-400">
                              {record.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                          x{record.qty} {record.unit || 'chiếc'}
                        </span>
                      </td>

                      {/* 5. Receiver */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{record.receiverName}</span>
                          </div>
                          {record.receiverDept && (
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate" title={record.receiverDept}>
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{record.receiverDept}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Target Location & Purpose */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-[260px]">
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11.5px] truncate" title={record.targetLocation}>
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{record.targetLocation}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate italic" title={record.purpose}>
                            {record.purpose}
                          </p>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 text-center">
                        {record.status === 'DEPLOYED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" /> Đang dùng
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <RotateCcw className="w-2.5 h-2.5" /> Đã hoàn kho
                            </span>
                            {record.returnedDate && (
                              <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
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
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết hồ sơ bàn giao/sử dụng"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print record */}
                          <button
                            type="button"
                            onClick={() => onPrintRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                            title="In lại phiếu / biên bản này"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Return to Stock if currently deployed */}
                          {record.status === 'DEPLOYED' && (
                            <button
                              type="button"
                              onClick={() => onReturnRecord(record)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
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
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
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
};
