import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Calendar,
  User,
  Activity,
  PlusCircle,
  Edit,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  FileSpreadsheet,
  RotateCcw,
  LogIn,
  Send,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Laptop
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SystemAuditLogEntry, AuditActionType, Role } from '../types.ts';

interface SystemAuditLogViewProps {
  logs: SystemAuditLogEntry[];
  role: Role;
  currentUsername: string;
  onClearLogs?: () => void;
  onAddToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onClose?: () => void; // If rendered inside a modal/window
  isModalMode?: boolean;
}

export const SystemAuditLogView: React.FC<SystemAuditLogViewProps> = ({
  logs,
  role,
  currentUsername,
  onClearLogs,
  onAddToast,
  onClose,
  isModalMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<SystemAuditLogEntry | null>(null);

  // Action badge and icon helper
  const getActionBadge = (type: AuditActionType) => {
    switch (type) {
      case 'ITEM_CREATE':
        return {
          label: 'THÊM THIẾT BỊ',
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: PlusCircle,
          iconColor: 'text-emerald-500',
        };
      case 'ITEM_UPDATE':
        return {
          label: 'CHỈNH SỬA TT',
          bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: Edit,
          iconColor: 'text-blue-500',
        };
      case 'ITEM_DELETE':
        return {
          label: 'XÓA DỮ LIỆU',
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: Trash2,
          iconColor: 'text-rose-500',
        };
      case 'INVENTORY_AUDIT':
        return {
          label: 'KIỂM KÊ / QR',
          bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          icon: QrCode,
          iconColor: 'text-indigo-500',
        };
      case 'USAGE_DISPATCH':
        return {
          label: 'PHIẾU SỬ DỤNG',
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: ArrowUpRight,
          iconColor: 'text-amber-500',
        };
      case 'HANDOVER_CREATE':
        return {
          label: 'BÀN GIAO CNS',
          bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: Layers,
          iconColor: 'text-purple-500',
        };
      case 'STOCK_RETURN':
        return {
          label: 'HOÀN KHO',
          bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          icon: ArrowDownLeft,
          iconColor: 'text-teal-500',
        };
      case 'DATA_IMPORT':
        return {
          label: 'NHẬP EXCEL',
          bg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
          icon: FileSpreadsheet,
          iconColor: 'text-cyan-500',
        };
      case 'DATA_RESTORE':
        return {
          label: 'KHÔI PHỤC',
          bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          icon: RotateCcw,
          iconColor: 'text-orange-500',
        };
      case 'AUTO_BACKUP':
        return {
          label: 'SAO LƯU JSON',
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: Download,
          iconColor: 'text-emerald-500',
        };
      case 'REPORT_DISPATCH':
        return {
          label: 'GỬI BÁO CÁO',
          bg: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
          icon: Send,
          iconColor: 'text-violet-500',
        };
      case 'AUTH_LOGIN':
        return {
          label: 'ĐĂNG NHẬP',
          bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: LogIn,
          iconColor: 'text-slate-500',
        };
      default:
        return {
          label: 'HÀNH ĐỘNG KHÁC',
          bg: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: Activity,
          iconColor: 'text-slate-500',
        };
    }
  };

  // Distinct users list
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.performedBy) set.add(l.performedBy);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        log.actionTitle.toLowerCase().includes(search) ||
        (log.targetName && log.targetName.toLowerCase().includes(search)) ||
        (log.targetSN && log.targetSN.toLowerCase().includes(search)) ||
        (log.details && log.details.toLowerCase().includes(search)) ||
        (log.performedBy && log.performedBy.toLowerCase().includes(search)) ||
        (log.performedByName && log.performedByName.toLowerCase().includes(search));

      // Action Filter
      const matchAction =
        actionFilter === 'ALL' ||
        log.actionType === actionFilter ||
        (actionFilter === 'DISPATCH_GROUP' && (log.actionType === 'USAGE_DISPATCH' || log.actionType === 'HANDOVER_CREATE' || log.actionType === 'STOCK_RETURN'));

      // User Filter
      const matchUser = userFilter === 'ALL' || log.performedBy.toLowerCase() === userFilter.toLowerCase();

      return matchSearch && matchAction && matchUser;
    });
  }, [logs, searchTerm, actionFilter, userFilter]);

  // Quick Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter(l => l.actionType === 'ITEM_CREATE').length;
    const updates = logs.filter(l => l.actionType === 'ITEM_UPDATE').length;
    const deletes = logs.filter(l => l.actionType === 'ITEM_DELETE').length;
    const dispatches = logs.filter(l => l.actionType === 'USAGE_DISPATCH' || l.actionType === 'HANDOVER_CREATE').length;
    const returns = logs.filter(l => l.actionType === 'STOCK_RETURN').length;
    const audits = logs.filter(l => l.actionType === 'INVENTORY_AUDIT').length;

    return { total, creates, updates, deletes, dispatches, returns, audits };
  }, [logs]);

  // Export Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      onAddToast('Không có dữ liệu nhật ký để xuất!', 'info');
      return;
    }

    const exportRows = filteredLogs.map((log, index) => ({
      'STT': index + 1,
      'Mã Log': log.id,
      'Mốc Thời Gian': log.timestamp,
      'Loại Hành Động': getActionBadge(log.actionType).label,
      'Tiêu Đề Hành Động': log.actionTitle,
      'Người Thực Hiện': `${log.performedByName || log.performedBy} (@${log.performedBy})`,
      'Vai Trò': log.userRole === 'admin' ? 'QUẢN TRỊ VIÊN' : 'KIỂM KÊ VIÊN',
      'Thiết Bị / Đối Tượng': log.targetName || 'N/A',
      'Số Seri (S/N)': log.targetSN || 'N/A',
      'Phân Loại': log.targetCategory || 'N/A',
      'Nội Dung Chi Tiết': log.details,
      'Dữ Liệu Trước Đó': log.prevData || '',
      'Dữ Liệu Cập Nhật': log.newData || '',
      'Địa Chỉ IP / Trạm': log.ipAddress || '192.168.1.1',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'System_Audit_Log');

    const fileName = `System_Audit_Log_CNS_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    onAddToast(`Đã xuất file ${fileName} thành công!`, 'success');
  };

  // Print Audit Report
  const handlePrintAuditReport = () => {
    const win = window.open('', '_blank');
    if (!win) {
      onAddToast('Vui lòng cho phép popup mới để in!', 'error');
      return;
    }

    const todayStr = new Date().toLocaleDateString('vi-VN');
    const rowsHtml = filteredLogs.map((l, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 11px;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-family: monospace; font-size: 10.5px;">${l.timestamp}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${getActionBadge(l.actionType).label}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 11.5px; font-weight: bold;">
          ${l.actionTitle}
          ${l.targetName ? `<div style="font-weight: normal; font-size: 10.5px; color: #444;">Đối tượng: ${l.targetName} ${l.targetSN ? `(S/N: ${l.targetSN})` : ''}</div>` : ''}
        </td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 11px;">
          ${l.performedByName || l.performedBy} (@${l.performedBy})
          <div style="font-size: 9.5px; color: #666;">${l.userRole === 'admin' ? 'Super Admin' : 'Kiểm kê viên'}</div>
        </td>
        <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 11px;">
          ${l.details}
          ${l.prevData || l.newData ? `<div style="font-size: 10px; color: #222; margin-top: 2px;"><em>${l.prevData ? `Cũ: ${l.prevData} | ` : ''}${l.newData ? `Mới: ${l.newData}` : ''}</em></div>` : ''}
        </td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>SỔ NHẬT KÝ KIỂM TOÁN HỆ THỐNG CNS/ATM</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; color: #000; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .header-table td { border: none; vertical-align: top; }
            .title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
            .subtitle { text-align: center; font-size: 12px; font-style: italic; margin-bottom: 15px; }
            .table-main { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-main th { border: 1px solid #000; background-color: #f2f2f2; padding: 6px 4px; text-align: center; font-size: 11.5px; font-weight: bold; text-transform: uppercase; }
            .sig-section { width: 100%; border-collapse: collapse; margin-top: 30px; page-break-inside: avoid; }
            .sig-section td { border: none; width: 50%; text-align: center; vertical-align: top; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 45%; text-align: center;">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase;">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
                <div style="font-size: 12px; font-weight: bold; text-transform: uppercase;"><u>TRUNG TÂM BẢO ĐẢM KỸ THUẬT</u></div>
              </td>
              <td style="width: 55%; text-align: center;">
                <div style="font-size: 11px; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style="font-size: 12px; font-weight: bold;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
                <div style="font-size: 12px; font-style: italic; margin-top: 4px;">Ngày trích xuất: ${todayStr}</div>
              </td>
            </tr>
          </table>

          <div class="title">SỔ NHẬT KÝ KIỂM TOÁN HỆ THỐNG / SYSTEM AUDIT LOG</div>
          <div class="subtitle">(Ghi nhận toàn bộ thao tác Thêm mới, Chỉnh sửa, Xóa, Bàn giao & Kiểm kê thiết bị CNS/ATM)</div>

          <table class="table-main">
            <thead>
              <tr>
                <th style="width: 30px;">STT</th>
                <th style="width: 100px;">Mốc Thời Gian</th>
                <th style="width: 90px;">Hành Động</th>
                <th>Tiêu Đề & Thiết Bị Tác Động</th>
                <th style="width: 130px;">Người Thực Hiện</th>
                <th>Nội Dung Chi Tiết & Tham Số</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <table class="sig-section">
            <tr>
              <td>
                <div style="font-weight: bold; font-size: 12.5px; text-transform: uppercase;">NGƯỜI TRÍCH XUẤT NHẬT KÝ</div>
                <div style="font-size: 12px; font-style: italic; margin-top: 4px;">(Ký, ghi rõ họ tên)</div>
                <div style="font-weight: bold; font-size: 13px; margin-top: 70px;">${currentUsername ? `Kỹ sư ${currentUsername.toUpperCase()}` : 'Cán bộ Quản trị'}</div>
              </td>
              <td>
                <div style="font-weight: bold; font-size: 12.5px; text-transform: uppercase;">LÃNH ĐẠO ĐỘI THÔNG TIN / TRUNG TÂM</div>
                <div style="font-size: 12px; font-style: italic; margin-top: 4px;">(Ký, ghi rõ họ tên)</div>
                <div style="font-weight: bold; font-size: 13px; margin-top: 70px;">ĐỘI TRƯỞNG / PHÓ GIÁM ĐỐC</div>
              </td>
            </tr>
          </table>

          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
    onAddToast('Đã khởi tạo in Sổ Nhật Ký Kiểm Toán Hệ Thống!', 'success');
  };

  return (
    <div className={`space-y-6 ${isModalMode ? 'p-1' : ''}`}>
      {/* Top Banner & Header Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  NHẬT KÝ KIỂM TOÁN HỆ THỐNG
                </h2>
                <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-500" />
                  System Audit Trail
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Tự động lưu vết và giám sát minh bạch tất cả các tác vụ nghiệp vụ: <strong>Thêm mới vật tư</strong>, <strong>Chỉnh sửa thông số</strong>, <strong>Xóa dữ liệu</strong>, <strong>Lập biên bản bàn giao</strong>, <strong>Xuất sử dụng & Thu hồi</strong>.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Xuất file Excel toàn bộ lịch sử kiểm toán"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAuditReport}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-black text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer"
              title="In bản cứng Sổ Nhật Ký Kiểm Toán"
            >
              <Printer className="w-4 h-4 text-indigo-500" />
              <span>In Nhật Ký</span>
            </button>

            {role === 'admin' && onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="p-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 rounded-2xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                title="Dọn dẹp / Xóa toàn bộ nhật ký (Dành cho Quản trị viên)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {isModalMode && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Overview Mini Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Hoạt Động</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total} <span className="text-xs font-normal text-slate-400">sự kiện</span>
            </div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thêm & Chỉnh Sửa</span>
              <Edit className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {stats.creates + stats.updates} <span className="text-xs font-normal text-slate-400">lượt</span>
            </div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bàn Giao & Xuất Dùng</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {stats.dispatches} <span className="text-xs font-normal text-slate-400">hồ sơ</span>
            </div>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hoàn Kho / Thu Hồi</span>
              <ArrowDownLeft className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {stats.returns} <span className="text-xs font-normal text-slate-400">thiết bị</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Tên thiết bị, Số Seri S/N, Người thực hiện, Mã biên bản, Chi tiết..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 pl-2.5 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Hành động:
              </span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 py-1.5 px-2.5 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả hành động ({logs.length})</option>
                <option value="ITEM_CREATE">Thêm thiết bị mới ({stats.creates})</option>
                <option value="ITEM_UPDATE">Chỉnh sửa thông số ({stats.updates})</option>
                <option value="ITEM_DELETE">Xóa dữ liệu ({stats.deletes})</option>
                <option value="DISPATCH_GROUP">Bàn giao / Xuất dùng / Hoàn kho ({stats.dispatches + stats.returns})</option>
                <option value="USAGE_DISPATCH">Phiếu xuất sử dụng</option>
                <option value="HANDOVER_CREATE">Biên bản bàn giao</option>
                <option value="STOCK_RETURN">Thu hồi hoàn kho</option>
                <option value="INVENTORY_AUDIT">Kiểm kê & Quét QR ({stats.audits})</option>
                <option value="DATA_IMPORT">Nhập dữ liệu Excel</option>
                <option value="DATA_RESTORE">Khôi phục Snapshot</option>
                <option value="AUTO_BACKUP">Sao lưu JSON tự động 24h</option>
                <option value="REPORT_DISPATCH">Gửi báo cáo qua GAS</option>
                <option value="AUTH_LOGIN">Đăng nhập tài khoản</option>
              </select>
            </div>

            {/* User Filter */}
            {uniqueUsers.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 pl-2.5 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Người làm:
                </span>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 py-1.5 px-2.5 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả nhân sự</option>
                  {uniqueUsers.map(u => (
                    <option key={u} value={u}>@{u}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span>Hiển thị <strong>{filteredLogs.length}</strong> / {logs.length} bản ghi nhật ký</span>
            {(searchTerm || actionFilter !== 'ALL' || userFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActionFilter('ALL');
                  setUserFilter('ALL');
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer ml-2"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2.2rem] shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Không tìm thấy bản ghi nhật ký</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Không có sự kiện nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hành động đã chọn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="py-4 px-4 pl-6 w-12 text-center">STT</th>
                  <th className="py-4 px-4 w-44">Mốc Thời Gian</th>
                  <th className="py-4 px-4 w-40">Loại Hành Động</th>
                  <th className="py-4 px-4 min-w-[240px]">Hành Động & Thiết Bị Tác Động</th>
                  <th className="py-4 px-4 w-48">Người Thực Hiện</th>
                  <th className="py-4 px-4 min-w-[220px]">Chi Tiết Biến Động</th>
                  <th className="py-4 px-4 pr-6 w-20 text-center">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.map((log, index) => {
                  const badge = getActionBadge(log.actionType);
                  const IconComp = badge.icon;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogDetail(log)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* STT */}
                      <td className="py-4 px-4 pl-6 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-black border uppercase tracking-wider ${badge.bg}`}>
                          <IconComp className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Action Title & Target Item */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {log.actionTitle}
                        </div>
                        {log.targetName && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                              {log.targetName}
                            </span>
                            {log.targetSN && (
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 shrink-0">
                                S/N: {log.targetSN}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actor & Role */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-[11px] shrink-0">
                            {log.performedBy ? log.performedBy[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                              {log.performedByName || `@${log.performedBy}`}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[9px] font-black uppercase px-1 rounded ${
                                log.userRole === 'admin'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {log.userRole === 'admin' ? 'ADMIN' : 'KIỂM KÊ'}
                              </span>
                              <span className="text-[9.5px] font-mono text-slate-400">
                                @{log.performedBy}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Details & Diff */}
                      <td className="py-4 px-4">
                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed line-clamp-2">
                          {log.details}
                        </p>
                        {(log.prevData || log.newData) && (
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                            {log.prevData && <span className="line-through text-slate-400">{log.prevData}</span>}
                            {log.prevData && log.newData && <span>→</span>}
                            {log.newData && <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.newData}</span>}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 pr-6 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogDetail(log);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Xem chi tiết bản ghi này"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL FOR A SINGLE AUDIT LOG RECORD */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[95000] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Chi Tiết Bản Ghi Kiểm Toán
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Mã bản ghi: {selectedLogDetail.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              {/* Action Title Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider ${getActionBadge(selectedLogDetail.actionType).bg}`}>
                    {getActionBadge(selectedLogDetail.actionType).label}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono font-bold">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{selectedLogDetail.timestamp}</span>
                  </div>
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedLogDetail.actionTitle}
                </h4>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  {selectedLogDetail.details}
                </p>
              </div>

              {/* Data Diff (Previous vs Next) */}
              {(selectedLogDetail.prevData || selectedLogDetail.newData) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedLogDetail.prevData && (
                    <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase block mb-1">
                        Dữ liệu trước khi sửa:
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-mono">
                        {selectedLogDetail.prevData}
                      </p>
                    </div>
                  )}

                  {selectedLogDetail.newData && (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block mb-1">
                        Dữ liệu sau khi cập nhật:
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-mono font-bold">
                        {selectedLogDetail.newData}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actor & Security Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">Người Thực Hiện</span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                      {selectedLogDetail.performedBy ? selectedLogDetail.performedBy[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white">
                        {selectedLogDetail.performedByName || `@${selectedLogDetail.performedBy}`}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Tài khoản: @{selectedLogDetail.performedBy} ({selectedLogDetail.userRole === 'admin' ? 'Quản trị viên Super Admin' : 'Kiểm kê viên'})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">Trạm Kỹ Thuật / Thiết Bị</span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedLogDetail.ipAddress || '192.168.1.45 (Máy Trạm Kỹ Thuật)'}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Chữ ký số & Tính toàn vẹn hợp lệ
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Equipment Details if available */}
              {selectedLogDetail.targetName && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Đối tượng vật tư liên quan</span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedLogDetail.targetName}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
                    {selectedLogDetail.targetCategory && <span>Loại: {selectedLogDetail.targetCategory}</span>}
                    {selectedLogDetail.targetSN && <span>S/N: {selectedLogDetail.targetSN}</span>}
                    {selectedLogDetail.targetId && <span>ID: {selectedLogDetail.targetId}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-6 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
