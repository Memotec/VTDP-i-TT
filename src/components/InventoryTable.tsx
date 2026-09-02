import React from 'react';
import {
  Layers, MapPin, AlertCircle, Clock, CheckSquare, XCircle,
  History, FileText, Edit, Trash2, Camera, Box, Cpu, Download, Plus
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
  onExportCsv: () => void;
  onAddNewItem?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  filteredInventory,
  role,
  onResetAuditStatus,
  onQuickAuditStatus,
  onSelectDetail,
  onOpenUsage,
  onEditItem,
  onDeleteItem,
  onOpenScanTarget,
  onExportCsv,
  onAddNewItem
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col min-h-[400px] w-full">
      <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-indigo-500" />
          <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            DANH MỤC THIẾT BỊ & VẬT TƯ ({filteredInventory.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && onAddNewItem && (
            <button
              onClick={onAddNewItem}
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
              title="Mở form thêm thiết bị mới vào kho"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Mới Thiết Bị</span>
            </button>
          )}

          <button
            onClick={onExportCsv}
            className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900 shadow-xs"
            title="Xuất danh sách thiết bị đang hiển thị ra file CSV"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={onResetAuditStatus}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-400 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/40"
              title="Hủy kiểm kê toàn bộ thiết bị về ban đầu"
            >
              Reset Kiểm kê
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block table-container overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm text-left whitespace-nowrap min-w-[850px]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3.5 w-[5%] text-center">STT</th>
              <th className="px-5 py-3.5 w-[38%] text-left">Tên Thiết Bị & Quy Cách</th>
              <th className="px-4 py-3.5 w-[16%] text-left">Serial (S/N)</th>
              <th className="px-4 py-3.5 w-[12%] text-center">Mã Kho (QR)</th>
              <th className="px-4 py-3.5 w-[8%] text-center">Số Lượng</th>
              <th className="px-4 py-3.5 w-[11%] text-center">Tình Trạng</th>
              <th className="px-4 py-3.5 w-[10%] text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-400 max-w-sm mx-auto font-medium text-sm leading-relaxed">
                    Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại. Thử xóa hoặc thay đổi từ khóa tìm kiếm.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInventory.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/20'} hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-all group`}
                >
                  <td className="px-4 py-4 text-center font-bold text-slate-400 text-sm">{idx + 1}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 cursor-pointer shadow-xs hover:scale-105 transition-transform"
                        onClick={() => onSelectDetail(item)}
                        title="Xem chi tiết thiết bị"
                      >
                        <Box className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-sm sm:text-base leading-snug"
                            onClick={() => onSelectDetail(item)}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold text-xs">{item.category || 'Khác'}</span>
                          {item.pn && (
                            <>
                              <span>•</span>
                              <span>P/N: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{item.pn}</strong></span>
                            </>
                          )}
                          {item.loc && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {item.loc}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm tracking-wide">{item.sn}</td>
                  <td className="px-4 py-4 text-center">
                    {item.warehouse ? (
                      <span className="inline-block bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg font-black text-xs border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-wider">
                        {item.warehouse}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">- Chưa cấp -</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {item.qty === 0 ? (
                      <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full font-black text-xs border border-rose-300 dark:border-rose-800 animate-pulse" title="Đã hết hàng tồn kho (0 cái)">
                        0 (Hết hàng)
                      </span>
                    ) : item.qty === 1 ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full font-black text-xs border border-amber-300 dark:border-amber-700" title="Dưới ngưỡng an toàn dự phòng (<= 1)">
                        1 (Sắp hết ⚠️)
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 dark:text-white text-base">{item.qty}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
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
                      {item.auditDate && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.auditDate.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700">
                        <button
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            item.auditStatus === 'OK'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                          }`}
                          title="Duyệt nhanh: Đủ / Tốt"
                        >
                          Đủ
                        </button>
                        <button
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            item.auditStatus === 'MISSING'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                          }`}
                          title="Duyệt nhanh: Thiếu hụt"
                        >
                          Thiếu
                        </button>
                      </div>

                      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700"></div>

                      <button
                        onClick={() => onSelectDetail(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Xem lịch sử kiểm kê & chi tiết"
                      >
                        <History className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() => onOpenUsage(item)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Sử dụng thiết bị này (Xuất phiếu PDF báo cáo)"
                      >
                        <FileText className="w-4.5 h-4.5" />
                      </button>

                      {role === 'admin' && (
                        <>
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa thông số máy"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xóa thiết bị này"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
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
      <div className="block md:hidden flex-1 p-4 space-y-4 max-h-[650px] overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-950/10">
        {filteredInventory.length === 0 ? (
          <div className="px-6 py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          filteredInventory.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-black">
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

              <div className="flex items-start gap-3.5 cursor-pointer" onClick={() => onSelectDetail(item)}>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                  <Box className="w-5.5 h-5.5" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-snug break-words">
                    {item.name}
                  </h4>
                  {item.auditDate && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Kiểm lần cuối: {item.auditDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs border border-slate-100 dark:border-slate-800/40 font-semibold text-slate-500">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Mã Serial S/N</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-black text-xs block truncate">{item.sn}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Part Number</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block font-bold text-xs">{item.pn || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Mã Kho (QR)</span>
                  {item.warehouse ? (
                    <span className="inline-block bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-black border border-indigo-100 dark:border-indigo-900/40 uppercase">
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
                        0 cái (Hết hàng)
                      </span>
                    ) : item.qty === 1 ? (
                      <span className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-black text-xs border border-amber-300 dark:border-amber-700">
                        x1 bộ (Sắp hết ⚠️)
                      </span>
                    ) : (
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">x{item.qty} bộ</span>
                    )}
                    {item.loc && <span className="text-xs font-normal truncate max-w-[75px] text-slate-500" title={item.loc}>({item.loc})</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 justify-between flex-wrap">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700">
                  <button
                    onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                    className={`h-9 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      item.auditStatus === 'OK'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15'
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Đủ
                  </button>
                  <button
                    onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                    className={`h-9 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      item.auditStatus === 'MISSING'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/15'
                        : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Thiếu
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenScanTarget(item)}
                    className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                    title="Quét camera nhanh thiết bị này"
                  >
                    <Camera className="w-4.5 h-4.5 animate-pulse" />
                  </button>

                  <button
                    onClick={() => onSelectDetail(item)}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Xem lịch sử kiểm kê"
                  >
                    <History className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={() => onOpenUsage(item)}
                    className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                    title="Sử dụng thiết bị này (Xuất phiếu PDF báo cáo)"
                  >
                    <FileText className="w-4.5 h-4.5" />
                  </button>

                  {role === 'admin' && (
                    <>
                      <button
                        onClick={() => onEditItem(item)}
                        className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 transition-colors cursor-pointer"
                        title="Sửa thiết bị"
                      >
                        <Edit className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/50 dark:bg-rose-950/40 dark:hover:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Xóa thiết bị"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 flex justify-between items-center flex-wrap gap-2">
        <span>
          Hiển thị <strong className="text-slate-800 dark:text-slate-200 font-bold">{filteredInventory.length}</strong> dòng vật tư (Tổng số lượng: <strong className="text-slate-800 dark:text-slate-200 font-bold">{filteredInventory.reduce((s, i) => s + i.qty, 0)}</strong> bộ)
        </span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Cơ sở bộ nhớ an toàn</span>
      </div>
    </div>
  );
};
