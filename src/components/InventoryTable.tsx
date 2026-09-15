import React, { useState, useMemo } from 'react';
import {
  Layers, MapPin, AlertCircle, Clock, CheckSquare, XCircle,
  History, FileText, Edit, Trash2, Camera, Box, Download, Plus,
  QrCode, Copy, Check, AlertTriangle, ShieldCheck, Tag, Sparkles
} from 'lucide-react';
import { InventoryItem, Role } from '../types.ts';

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
  onAddNewItem
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySn = (sn: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sn) return;
    navigator.clipboard.writeText(sn);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
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

  return (
    <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs flex flex-col min-h-[420px] w-full transition-all">
      {/* Table Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 gap-3.5 bg-slate-50/50 dark:bg-slate-900/30">
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
                {filteredInventory.length} mã
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {totalQty} hiện vật
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Kho vật tư dự phòng tại chỗ Đội Thông Tin • Trực quan hoá thông số & quản lý kiểm kê
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
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
      <div className="bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 px-5 py-2 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Tiến Độ Kiểm Kê:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-900/40">
              ● Đủ: {okCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[11px] border border-rose-200 dark:border-rose-900/40">
              ▲ Thiếu: {missingCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
              Chưa kiểm: {uncheckedCount}
            </span>
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[11px] border border-amber-200 dark:border-amber-900/40">
                <AlertTriangle className="w-3 h-3" /> Sắp hết: {lowStockCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${auditPercent}%` }}
            />
          </div>
          <span className="text-xs font-black text-slate-700 dark:text-slate-300 min-w-[36px] text-right">
            {auditPercent}%
          </span>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block table-container overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm text-left whitespace-nowrap min-w-[900px]">
          <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 border-b border-[#E2E8F0] dark:border-slate-800 text-xs uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 z-10">
            <tr>
              <th className="px-3.5 py-3.5 w-[5%] text-center">STT</th>
              <th className="px-4 py-3.5 w-[36%] text-left">Tên Trang Thiết Bị & Vật Tư</th>
              <th className="px-3.5 py-3.5 w-[16%] text-left">Số Serial (S/N)</th>
              <th className="px-3.5 py-3.5 w-[13%] text-center">Mã Kho (QR)</th>
              <th className="px-3.5 py-3.5 w-[10%] text-center">Số Lượng</th>
              <th className="px-3.5 py-3.5 w-[10%] text-center">Kiểm Kê</th>
              <th className="px-4 py-3.5 w-[10%] text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
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
              filteredInventory.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`${idx % 2 === 0 ? 'bg-white dark:bg-[#131B2E]' : 'bg-slate-50/40 dark:bg-slate-800/20'} hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors group`}
                >
                  {/* STT */}
                  <td className="px-3.5 py-3.5 text-center font-bold text-slate-400 text-xs">
                    {idx + 1}
                  </td>

                  {/* TÊN THIẾT BỊ */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50 cursor-pointer shadow-xs group-hover:scale-105 group-hover:bg-[#2563EB] group-hover:text-white transition-all"
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
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold text-[11px] border border-slate-200/60 dark:border-slate-700/60">
                            {item.category || 'Khác'}
                          </span>
                          {item.pn && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <strong className="text-slate-700 dark:text-slate-300 font-mono font-semibold">{item.pn}</strong>
                            </span>
                          )}
                          {item.loc && (
                            <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
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
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm tracking-wide bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 truncate max-w-[140px]" title={item.sn}>
                        {item.sn || 'N/A'}
                      </span>
                      {item.sn && (
                        <button
                          type="button"
                          onClick={(e) => handleCopySn(item.sn, item.id, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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

                  {/* MÃ KHO (QR) */}
                  <td className="px-3.5 py-3.5 text-center">
                    {item.warehouse ? (
                      <button
                        type="button"
                        onClick={() => onOpenScanTarget(item)}
                        className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 px-2.5 py-1 rounded-lg font-black text-xs border border-blue-200/80 dark:border-blue-900/50 uppercase tracking-wider cursor-pointer transition-all group/qr shadow-2xs"
                        title="Xem mã định danh QR thiết bị"
                      >
                        <QrCode className="w-3.5 h-3.5 group-hover/qr:scale-110 transition-transform" />
                        <span>{item.warehouse}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 italic text-xs">- Chưa cấp -</span>
                    )}
                  </td>

                  {/* SỐ LƯỢNG */}
                  <td className="px-3.5 py-3.5 text-center">
                    {item.qty === 0 ? (
                      <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg font-black text-xs border border-rose-300 dark:border-rose-800 animate-pulse" title="Hết hàng tồn kho">
                        0 (Hết)
                      </span>
                    ) : item.qty === 1 ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg font-black text-xs border border-amber-300 dark:border-amber-700" title="Dưới ngưỡng an toàn dự phòng">
                        1 (Sắp hết ⚠️)
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        {item.qty} bộ
                      </span>
                    )}
                  </td>

                  {/* TÌNH TRẠNG KIỂM KÊ */}
                  <td className="px-3.5 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      {item.auditStatus === 'OK' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-extrabold text-xs border border-emerald-200 dark:border-emerald-900/40 shadow-2xs">
                          ● ĐỦ / TỐT
                        </span>
                      ) : item.auditStatus === 'MISSING' ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg font-extrabold text-xs border border-rose-200 dark:border-rose-900/40 shadow-2xs">
                          ▲ THIẾU
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg font-bold text-xs border border-slate-200 dark:border-slate-700">
                          Chưa kiểm
                        </span>
                      )}
                      {item.auditDate && (
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[90px]">
                          {item.auditDate.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* THAO TÁC NHANH */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      {/* Fast Audit Toggle */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                          className={`px-2 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                            item.auditStatus === 'OK'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
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
                              : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                          }`}
                          title="Duyệt nhanh: Thiếu hụt"
                        >
                          Thiếu
                        </button>
                      </div>

                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                      {/* QR Modal Quick Trigger */}
                      <button
                        type="button"
                        onClick={() => (onOpenQrModal ? onOpenQrModal(item) : onSelectDetail(item))}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Xem & Quét mã QR tra cứu điện thoại"
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="block md:hidden flex-1 p-3.5 space-y-3.5 max-h-[650px] overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-950/10">
        {filteredInventory.length === 0 ? (
          <div className="px-6 py-12 text-center bg-white dark:bg-[#131B2E] rounded-2xl border border-[#E2E8F0] dark:border-slate-800">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          filteredInventory.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#131B2E] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs flex flex-col gap-3 relative overflow-hidden"
            >
              {/* Card Top Row */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-50 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-black">
                    {idx + 1}
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase">
                    {item.category || 'Khác'}
                  </span>
                </div>

                <div>
                  {item.auditStatus === 'OK' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-extrabold text-xs border border-emerald-200 dark:border-emerald-900/40">
                      ● ĐỦ / TỐT
                    </span>
                  ) : item.auditStatus === 'MISSING' ? (
                    <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg font-extrabold text-xs border border-rose-200 dark:border-rose-900/40">
                      ▲ THIẾU
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg font-bold text-xs border border-slate-200 dark:border-slate-700">
                      Chưa kiểm
                    </span>
                  )}
                </div>
              </div>

              {/* Card Title & Icon */}
              <div className="flex items-start gap-3 cursor-pointer" onClick={() => onSelectDetail(item)}>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50 shadow-xs">
                  <Box className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-snug break-words">
                    {item.name}
                  </h4>
                  {item.auditDate && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" /> Kiểm gần nhất: {item.auditDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs border border-slate-100 dark:border-slate-800/40 font-semibold text-slate-500">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Mã Serial S/N</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-black text-xs block truncate">{item.sn || 'N/A'}</span>
                    {item.sn && (
                      <button
                        type="button"
                        onClick={(e) => handleCopySn(item.sn, item.id, e)}
                        className="p-0.5 text-slate-400 hover:text-[#2563EB]"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Part Number</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block font-bold text-xs">{item.pn || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Mã Kho (QR)</span>
                  {item.warehouse ? (
                    <span className="inline-block bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-300 px-2 py-0.5 rounded text-xs font-black border border-blue-100 dark:border-blue-900/40 uppercase">
                      {item.warehouse}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic font-normal text-xs">- Chưa cấp -</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Số Lượng & Vị trí</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {item.qty === 0 ? (
                      <span className="inline-flex items-center gap-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-black text-xs border border-rose-300 dark:border-rose-800 animate-pulse">
                        0 cái (Hết)
                      </span>
                    ) : item.qty === 1 ? (
                      <span className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-black text-xs border border-amber-300 dark:border-amber-700">
                        x1 bộ (⚠️)
                      </span>
                    ) : (
                      <span className="font-black text-[#2563EB] dark:text-blue-400 text-xs">x{item.qty} bộ</span>
                    )}
                    {item.loc && <span className="text-xs font-normal truncate max-w-[70px] text-slate-500" title={item.loc}>({item.loc})</span>}
                  </div>
                </div>
              </div>

              {/* Card Action Row */}
              <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5 justify-between flex-wrap">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                    className={`h-8 px-3 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      item.auditStatus === 'OK'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Đủ
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                    className={`h-8 px-3 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      item.auditStatus === 'MISSING'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Thiếu
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => (onOpenQrModal ? onOpenQrModal(item) : onSelectDetail(item))}
                    className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 cursor-pointer"
                    title="Mã QR tra cứu điện thoại"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenScanTarget(item)}
                    className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 cursor-pointer"
                    title="Quét camera kiểm kê"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectDetail(item)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer"
                    title="Chi tiết & Lịch sử"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenUsage(item)}
                    className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 cursor-pointer"
                    title="Lập phiếu sử dụng"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {role === 'admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/50 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 flex items-center justify-center text-[#2563EB] dark:text-blue-400 cursor-pointer"
                        title="Sửa thiết bị"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item)}
                        className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200/50 dark:bg-rose-950/40 dark:hover:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 cursor-pointer"
                        title="Xóa thiết bị"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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

