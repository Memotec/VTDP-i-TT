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
  Laptop,
  List,
  Table,
  ChevronDown,
  FileCode,
  FileText,
  FileDown
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'LIST' | 'TABLE' | 'TIMELINE'>('LIST');
  const [selectedLogDetail, setSelectedLogDetail] = useState<SystemAuditLogEntry | null>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

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
  const handleExportExcel = async () => {
    if (filteredLogs.length === 0) {
      onAddToast('Không có dữ liệu nhật ký để xuất!', 'info');
      return;
    }

    try {
      const XLSX = await import('xlsx');
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
    } catch {
      onAddToast('Có lỗi phát sinh khi xuất file Excel nhật ký!', 'error');
    }
  };

  // Download Logs in multi-formats (JSON, CSV, MD, TXT)
  const handleDownloadAuditLogsFormat = (format: 'json' | 'csv' | 'md' | 'txt') => {
    if (filteredLogs.length === 0) {
      onAddToast('Không có dữ liệu nhật ký để tải về!', 'info');
      return;
    }

    const timestampStr = new Date().toISOString().slice(0, 10);
    let blob: Blob;
    let filename = `System_Audit_Logs_CNS_${timestampStr}`;

    if (format === 'json') {
      filename += '.json';
      const jsonContent = JSON.stringify(
        {
          appName: 'Hệ Thống Quản Lý Kho Vật Tư CNS/ATM',
          exportedAt: new Date().toISOString(),
          exportedBy: currentUsername || 'system',
          totalLogsCount: filteredLogs.length,
          logs: filteredLogs
        },
        null,
        2
      );
      blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    } else if (format === 'csv') {
      filename += '.csv';
      const headers = ['STT', 'ID Log', 'Mốc Thời Gian', 'Hành Động', 'Tiêu Đề', 'Người Thực Hiện', 'Vai Trò', 'Thiết Bị / Đối Tượng', 'S/N', 'Phân Loại', 'Chi Tiết', 'Dữ Liệu Cũ', 'Dữ Liệu Mới', 'IP Address'];
      const rows = filteredLogs.map((log, idx) => [
        idx + 1,
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${getActionBadge(log.actionType).label}"`,
        `"${(log.actionTitle || '').replace(/"/g, '""')}"`,
        `"${(log.performedByName || log.performedBy || '').replace(/"/g, '""')}"`,
        `"${log.userRole === 'admin' ? 'Quản trị viên' : 'Kiểm kê viên'}"`,
        `"${(log.targetName || 'N/A').replace(/"/g, '""')}"`,
        `"${(log.targetSN || 'N/A').replace(/"/g, '""')}"`,
        `"${(log.targetCategory || 'N/A').replace(/"/g, '""')}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        `"${(log.prevData || '').replace(/"/g, '""')}"`,
        `"${(log.newData || '').replace(/"/g, '""')}"`,
        `"${log.ipAddress || ''}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } else if (format === 'md') {
      filename += '.md';
      let mdText = `# 🛡️ HỆ THỐNG NHẬT KÝ LƯU VẾT CNS/ATM\n\n`;
      mdText += `- **Thời gian xuất file:** ${new Date().toLocaleString('vi-VN')}\n`;
      mdText += `- **Cán bộ thực hiện:** @${currentUsername || 'System'}\n`;
      mdText += `- **Tổng số bản ghi:** ${filteredLogs.length} sự kiện\n\n`;
      mdText += `--- \n\n`;
      mdText += `### 📊 Chi Tiết Sự Kiện Nhật Ký\n\n`;
      mdText += `| STT | Mốc Thời Gian | Hành Động | Tiêu Đề | Người Thực Hiện | Đối Tượng (S/N) | Chi Tiết |\n`;
      mdText += `| :---: | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

      filteredLogs.forEach((log, idx) => {
        const badge = getActionBadge(log.actionType);
        const userStr = `${log.performedByName || log.performedBy} (@${log.performedBy})`;
        const targetStr = log.targetName ? `${log.targetName} ${log.targetSN ? `\`${log.targetSN}\`` : ''}` : '-';
        const detailsClean = (log.details || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
        mdText += `| ${idx + 1} | \`${log.timestamp}\` | **${badge.label}** | ${log.actionTitle} | ${userStr} | ${targetStr} | ${detailsClean} |\n`;
      });

      blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
    } else {
      // txt format
      filename += '.txt';
      let txtText = `================================================================================\n`;
      txtText += `HỆ THỐNG QUẢN LÝ KHO VẬT TƯ CNS/ATM - NHẬT KÝ HỆ THỐNG (AUDIT LOG)\n`;
      txtText += `Thời gian trích xuất: ${new Date().toLocaleString('vi-VN')}\n`;
      txtText += `Cán bộ trích xuất  : @${currentUsername || 'System'}\n`;
      txtText += `Tổng số bản ghi     : ${filteredLogs.length} bản ghi\n`;
      txtText += `================================================================================\n\n`;

      filteredLogs.forEach((log, idx) => {
        const badge = getActionBadge(log.actionType);
        txtText += `[#${idx + 1}] MỐC THỜI GIAN : ${log.timestamp}\n`;
        txtText += `     MÃ LOG        : ${log.id}\n`;
        txtText += `     LOẠI HÀNH ĐỘNG: ${badge.label} (${log.actionType})\n`;
        txtText += `     TIÊU ĐỀ       : ${log.actionTitle}\n`;
        txtText += `     NGƯỜI THỰC HIỆN: ${log.performedByName || log.performedBy} (@${log.performedBy}) [${log.userRole === 'admin' ? 'QUẢN TRỊ VIÊN' : 'KIỂM KÊ VIÊN'}]\n`;
        if (log.targetName) {
          txtText += `     ĐỐI TƯỢNG     : ${log.targetName} ${log.targetSN ? `(S/N: ${log.targetSN})` : ''}\n`;
        }
        txtText += `     CHI TIẾT      : ${log.details}\n`;
        if (log.prevData || log.newData) {
          txtText += `     BIẾN ĐỘNG     : ${log.prevData ? `Cũ: ${log.prevData} | ` : ''}${log.newData ? `Mới: ${log.newData}` : ''}\n`;
        }
        txtText += `--------------------------------------------------------------------------------\n`;
      });

      blob = new Blob([txtText], { type: 'text/plain;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onAddToast(`Đã tải xuống tập tin ${filename} thành công!`, 'success');
    setIsDownloadMenuOpen(false);
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
          <title>SỔ NHẬT KÝ HỆ THỐNG CNS/ATM</title>
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

          <div class="title">SỔ NHẬT KÝ HỆ THỐNG / SYSTEM AUDIT LOG</div>
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
    onAddToast('Đã khởi tạo in Sổ Nhật Ký Hệ Thống!', 'success');
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
                  NHẬT KÝ HỆ THỐNG
                </h2>
                <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-500" />
                  System Audit Trail
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            {/* Download Logs Dropdown Button */}
            <div className="relative flex-1 lg:flex-none">
              <button
                type="button"
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                title="Tải xuống toàn bộ nhật ký hệ thống để lưu trữ (JSON, CSV, MD, TXT)"
              >
                <FileDown className="w-4 h-4" />
                <span>Tải Nhật Ký</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDownloadMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDownloadMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Chọn định dạng lưu trữ
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadAuditLogsFormat('json')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                        <FileCode className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-extrabold">Tệp JSON (.json)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Đầy đủ cấu trúc dữ liệu / Đóng gói</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadAuditLogsFormat('csv')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-extrabold">Tệp CSV (.csv)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Hỗ trợ Unicode tiếng Việt cho Excel</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadAuditLogsFormat('md')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-extrabold">Tệp Markdown (.md)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Bảng biểu định dạng Markdown báo cáo</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadAuditLogsFormat('txt')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-extrabold">Tệp Văn Bản (.txt)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Nhật ký thuần text để lưu trữ hệ thống</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Xuất file Excel toàn bộ lịch sử hệ thống"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAuditReport}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-black text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer"
              title="In bản cứng Sổ Nhật Ký Hệ Thống"
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

        {/* Active Filter Chips & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
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

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh Sách (List)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng Chi Tiết</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'TIMELINE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Dòng Thời Gian</span>
            </button>
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
        ) : viewMode === 'LIST' ? (
          /* LIST VIEW FORMAT (Clean System Logs List) */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 p-2 sm:p-4">
            {filteredLogs.map((log, index) => {
              const badge = getActionBadge(log.actionType);
              const IconComp = badge.icon;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLogDetail(log)}
                  className="p-3.5 sm:p-4 rounded-2xl hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 cursor-pointer group border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800/80"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Index & Action Icon */}
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span className="text-[11px] font-mono font-bold text-slate-400 w-6 text-right">
                        #{index + 1}
                      </span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg} shadow-xs`}>
                        <IconComp className={`w-4.5 h-4.5 ${badge.iconColor}`} />
                      </div>
                    </div>

                    {/* Content Block */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${badge.bg}`}>
                          {badge.label}
                        </span>

                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {log.timestamp}
                        </span>

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          log.userRole === 'admin'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <User className="w-2.5 h-2.5" />
                          {log.performedByName || `@${log.performedBy}`}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {log.actionTitle}
                        {log.targetName && (
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                            ({log.targetName} {log.targetSN ? `• S/N: ${log.targetSN}` : ''})
                          </span>
                        )}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                        {log.details}
                      </p>

                      {(log.prevData || log.newData) && (
                        <div className="flex items-center gap-2 mt-1.5 text-[10.5px] font-mono bg-slate-50 dark:bg-slate-850 p-1.5 px-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 inline-flex max-w-full overflow-x-auto">
                          {log.prevData && <span className="line-through text-slate-400">{log.prevData}</span>}
                          {log.prevData && log.newData && <span className="text-slate-400">→</span>}
                          {log.newData && <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.newData}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Detail Trigger Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLogDetail(log);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200/60 dark:border-indigo-800 group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>Xem chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'TIMELINE' ? (
          /* TIMELINE VIEW FORMAT */
          <div className="p-6 space-y-6 relative before:absolute before:top-8 before:bottom-8 before:left-9 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              const IconComp = badge.icon;
              return (
                <div key={log.id} onClick={() => setSelectedLogDetail(log)} className="relative pl-10 group cursor-pointer">
                  <div className={`absolute left-0 top-1 w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 ${badge.bg}`}>
                    <IconComp className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                  </div>
                  <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{log.actionTitle}</span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{log.details}</p>
                    <div className="text-[10px] text-slate-400 mt-2 font-mono">
                      Người thực hiện: @{log.performedBy} ({log.userRole === 'admin' ? 'Admin' : 'Kiểm kê'})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW FORMAT */
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
                    Chi Tiết Bản Ghi Nhật Ký Hệ Thống
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
