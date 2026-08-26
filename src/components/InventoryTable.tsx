import React from 'react';
import {
  Layers, MapPin, AlertCircle, Clock, CheckSquare, XCircle,
  History, FileText, Edit, Trash2, Camera, Box, Cpu
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
  onOpenScanTarget
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col min-h-[350px] w-full">
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
            DANH MỤC THIẾT BỊ ({filteredInventory.length})
          </span>
        </div>

        {role === 'admin' && (
          <button
            onClick={onResetAuditStatus}
            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer border border-dashed border-slate-200 dark:border-slate-700 hover:border-rose-400 px-2.5 py-1 rounded-lg"
            title="Hủy kiểm kê toàn bộ thiết bị về ban đầu"
          >
            Reset Kiểm kê
          </button>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block table-container overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-xs text-left whitespace-nowrap min-w-[750px]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 w-[6%] text-center">STT</th>
              <th className="px-4 py-3 w-[37%] text-left">Danh xưng & Thông số</th>
              <th className="px-4 py-3 w-[17%] text-left">Serial (S/N)</th>
              <th className="px-4 py-3 w-[13%] text-center">Mã Kho (QR)</th>
              <th className="px-4 py-3 w-[7%] text-center">SL</th>
              <th className="px-4 py-3 w-[10%] text-center">Tình hình (Kiểm)</th>
              <th className="px-4 py-3 w-[10%] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-400 max-w-sm mx-auto font-medium text-xs leading-relaxed">
                    Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại. Thử xóa hoặc thay đổi từ khóa tìm kiếm.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInventory.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/15'} hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all group`}
                >
                  <td className="px-4 py-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40 cursor-pointer shadow-xs hover:scale-105 transition-transform"
                        onClick={() => onSelectDetail(item)}
                        title="Xem chi tiết thiết bị"
                      >
                        <Box className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors cursor-pointer truncate max-w-[280px]"
                            onClick={() => onSelectDetail(item)}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">{item.category || 'Khác'}</span>
                          {item.pn && (
                            <>
                              <span>•</span>
                              <span>P/N: <strong className="text-slate-600 dark:text-slate-300 font-medium">{item.pn}</strong></span>
                            </>
                          )}
                          {item.loc && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-indigo-400" /> {item.loc}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">{item.sn}</td>
                  <td className="px-4 py-3.5 text-center">
                    {item.warehouse ? (
                      <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-black text-[10px] border border-indigo-100/50 dark:border-indigo-900/35 uppercase">
                        {item.warehouse}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">- Chưa cấp -</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center font-black text-slate-800 dark:text-slate-200">{item.qty}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {item.auditStatus === 'OK' ? (
                        <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-extrabold text-[10px] border border-emerald-100 dark:border-emerald-900/30">
                          ● ĐỦ / TỐT
                        </span>
                      ) : item.auditStatus === 'MISSING' ? (
                        <span className="inline-flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-extrabold text-[10px] border border-rose-100 dark:border-rose-900/30">
                          ▲ THIẾU
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                          Chưa kiểm
                        </span>
                      )}
                      {item.auditDate && (
                        <span className="text-[8px] text-slate-400 font-normal">
                          {item.auditDate.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5 justify-center">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-700">
                        <button
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                          className={`p-1 rounded text-[9px] font-bold cursor-pointer transition-all ${
                            item.auditStatus === 'OK'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'text-slate-500 hover:text-emerald-500'
                          }`}
                          title="Duyệt nhanh: Đủ / Tốt"
                        >
                          Đủ
                        </button>
                        <button
                          onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                          className={`p-1 rounded text-[9px] font-bold cursor-pointer transition-all ${
                            item.auditStatus === 'MISSING'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'text-slate-500 hover:text-rose-500'
                          }`}
                          title="Duyệt nhanh: Thiếu hụt"
                        >
                          Thiếu
                        </button>
                      </div>

                      <div className="h-4 w-px bg-slate-200 dark:border-slate-700"></div>

                      <button
                        onClick={() => onSelectDetail(item)}
                        className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
                        title="Xem lịch sử kiểm kê"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenUsage(item)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                        title="Sử dụng thiết bị này (Xuất phiếu PDF báo cáo)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {role === 'admin' && (
                        <>
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông số máy"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Xóa thiết bị này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      <div className="block md:hidden flex-1 p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-950/10">
        {filteredInventory.length === 0 ? (
          <div className="px-6 py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 font-medium text-xs leading-relaxed">
              Không có thiết bị vật tư nào thỏa mãn bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          filteredInventory.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col gap-3.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase">
                    {item.category || 'Khác'}
                  </span>
                </div>

                <div>
                  {item.auditStatus === 'OK' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg font-black text-[9px] border border-emerald-100 dark:border-emerald-900/30">
                      ● ĐỦ / TỐT
                    </span>
                  ) : item.auditStatus === 'MISSING' ? (
                    <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg font-black text-[9px] border border-rose-100 dark:border-rose-900/30">
                      ▲ THIẾU
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg font-bold text-[9px] border border-slate-200 dark:border-slate-700">
                      Chưa kiểm
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 cursor-pointer" onClick={() => onSelectDetail(item)}>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
                  <Box className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug break-words">
                    {item.name}
                  </h4>
                  {item.auditDate && (
                    <p className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-indigo-400" /> Kiểm lần cuối: {item.auditDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-[10.5px] border border-slate-100 dark:border-slate-800/40 font-semibold text-slate-500">
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Mã Serial S/N</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-black">{item.sn}</span>
                </div>
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Part Number</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block font-bold">{item.pn || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Mã Kho (QR)</span>
                  {item.warehouse ? (
                    <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100 dark:border-indigo-900/30 uppercase">
                      {item.warehouse}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic font-normal text-[9.5px]">- Chưa cấp -</span>
                  )}
                </div>
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Số Lượng & Vị trí</span>
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-bold">
                    <span className="font-black text-indigo-600 dark:text-indigo-400">x{item.qty} bộ</span>
                    {item.loc && <span className="text-[9px] font-normal truncate max-w-[65px]" title={item.loc}>({item.loc})</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1.5 justify-between">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/50 dark:border-slate-700">
                  <button
                    onClick={() => onQuickAuditStatus(item, item.auditStatus === 'OK' ? null : 'OK')}
                    className={`h-9 px-3.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      item.auditStatus === 'OK'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15'
                        : 'text-slate-500 hover:text-emerald-500'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Đủ
                  </button>
                  <button
                    onClick={() => onQuickAuditStatus(item, item.auditStatus === 'MISSING' ? null : 'MISSING')}
                    className={`h-9 px-3.5 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      item.auditStatus === 'MISSING'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/15'
                        : 'text-slate-500 hover:text-rose-500'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Thiếu
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenScanTarget(item)}
                    className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200/55 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                    title="Quét camera nhanh thiết bị này"
                  >
                    <Camera className="w-4 h-4 animate-pulse" />
                  </button>

                  <button
                    onClick={() => onSelectDetail(item)}
                    className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Xem lịch sử kiểm kê"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenUsage(item)}
                    className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 border border-amber-200/55 dark:border-amber-900/35 flex items-center justify-center text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                    title="Sử dụng thiết bị này (Xuất phiếu PDF báo cáo)"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {role === 'admin' && (
                    <>
                      <button
                        onClick={() => onEditItem(item)}
                        className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/30 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 transition-colors cursor-pointer"
                        title="Sửa thiết bị"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100/30 dark:bg-rose-950/40 dark:hover:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
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

      <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 flex justify-between items-center flex-wrap gap-2">
        <span>
          Hiển thị <strong className="text-slate-700 dark:text-slate-300">{filteredInventory.length}</strong> dòng vật tư (Tổng số lượng: <strong className="text-slate-700 dark:text-slate-300">{filteredInventory.reduce((s, i) => s + i.qty, 0)}</strong> bộ)
        </span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cơ sở bộ nhớ an toàn</span>
      </div>
    </div>
  );
};
