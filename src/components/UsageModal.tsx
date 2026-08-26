import React, { useState } from 'react';
import { X, FileText, History, Printer, Trash2, Search } from 'lucide-react';
import { InventoryItem, UsageSlip, Role } from '../types.ts';

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
  const [usageUser, setUsageUser] = useState(role === 'admin' ? 'Kỹ sư Đội Thông Tin' : 'Kỹ sư ' + (role || 'Guest'));
  const [usageQty, setUsageQty] = useState(1);
  const [usagePurpose, setUsagePurpose] = useState('Bảo dưỡng định kỳ / Thay thế dự phòng');
  const [usageNotes, setUsageNotes] = useState('');
  const [usageTargetLoc, setUsageTargetLoc] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);

  // History search state
  const [usageSearchQuery, setUsageSearchQuery] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForUsage) return;
    if (!usageUser.trim()) return;

    const todayStr = new Date().toLocaleString('vi-VN');
    const newSlip: UsageSlip = {
      id: `slip-${Date.now()}`,
      itemId: selectedItemForUsage.id,
      itemName: selectedItemForUsage.name,
      sn: selectedItemForUsage.sn,
      pn: selectedItemForUsage.pn || '',
      category: selectedItemForUsage.category || 'Khác',
      warehouse: selectedItemForUsage.warehouse || '',
      originalLoc: selectedItemForUsage.loc || '',
      user: usageUser.trim(),
      qtyUsed: usageQty,
      purpose: usagePurpose,
      notes: usageNotes.trim(),
      targetLocation: usageTargetLoc.trim(),
      date: todayStr
    };

    onSubmitUsage(newSlip, deductInventory);
  };

  return (
    <>
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

            {/* Target Item summary banner */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-150 dark:border-slate-700 mb-6 space-y-1.5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị bốc dỡ:</div>
              <div className="text-xs font-black text-slate-800 dark:text-white truncate">
                {selectedItemForUsage.name}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400">S/N:</span> <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedItemForUsage.sn}</strong>
                </div>
                <div>
                  <span className="text-slate-400">P/N:</span> <strong className="text-slate-700 dark:text-slate-300">{selectedItemForUsage.pn || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Kho hàng:</span> <strong className="text-slate-700 dark:text-slate-300">{selectedItemForUsage.warehouse || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Tồn hiện tại:</span> <strong className="text-amber-600 dark:text-amber-400">x{selectedItemForUsage.qty} chiếc</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Kỹ sư thực hiện tiếp nhận *
                </label>
                <input
                  type="text"
                  required
                  value={usageUser}
                  onChange={(e) => setUsageUser(e.target.value)}
                  placeholder="Nhập tên kỹ sư nhận bàn giao"
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Số lượng sử dụng *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedItemForUsage.qty}
                      value={usageQty}
                      onChange={(e) => setUsageQty(Math.min(selectedItemForUsage.qty, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 pl-4 pr-12 py-3 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-4 top-3 text-[11px] text-slate-400 font-extrabold uppercase">
                      Chiếc
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setUsageQty(1)}
                      className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                      x1
                    </button>
                    {selectedItemForUsage.qty >= 2 && (
                      <button
                        type="button"
                        onClick={() => setUsageQty(2)}
                        className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                      >
                        x2
                      </button>
                    )}
                    {selectedItemForUsage.qty > 2 && (
                      <button
                        type="button"
                        onClick={() => setUsageQty(selectedItemForUsage.qty)}
                        className="text-[10px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Địa điểm lắp đặt mới *
                  </label>
                  <input
                    type="text"
                    required
                    value={usageTargetLoc}
                    onChange={(e) => setUsageTargetLoc(e.target.value)}
                    placeholder="Ví dụ: Phòng máy ATM / Đài KSV"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Mục đích sử dụng chuyên ngành
                </label>
                <select
                  value={usagePurpose}
                  onChange={(e) => setUsagePurpose(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 font-semibold resize-none"
                >
                  <option value="Thay thế dự phòng khẩn cấp">Thay thế dự phòng khẩn cấp</option>
                  <option value="Bảo dưỡng định kỳ / Sửa chữa căn chỉnh">Bảo dưỡng định kỳ / Sửa chữa căn chỉnh</option>
                  <option value="Trang bị mở rộng hệ thống">Trang bị mở rộng hệ thống</option>
                  <option value="Đo đạc kiểm thử phòng Lab kỹ thuật">Đo đạc kiểm thử phòng Lab kỹ thuật</option>
                  <option value="Bốc dỡ học cụ đào tạo">Bốc dỡ học cụ đào tạo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Mô tả kỹ thuật bàn giao / Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  placeholder="Kiểm tra các tham số kỹ thuật đạt chuẩn trước khi thay thế lắp đặt..."
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-semibold resize-none"
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-2xl cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={deductInventory}
                  onChange={(e) => setDeductInventory(e.target.checked)}
                  disabled={selectedItemForUsage.qty === 0}
                  className="w-4.5 h-4.5 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase block">
                    Đăng ký cập nhật trừ kho vật tư
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Tự động giảm tồn kho thiết bị này và chèn vào nhật ký lịch sử kỹ thuật.
                  </span>
                </div>
              </label>

              <div className="flex gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCloseUsageForm}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold py-3 rounded-2xl text-xs transition-colors cursor-pointer text-center"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-2xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Xác nhận & Xuất PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {isUsageHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto my-8 flex flex-col">
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
                    Quản lý tài liệu và in ấn biên bản rút kho chuyên dụng
                  </p>
                </div>
              </div>

              {usageSlips.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="sm:self-center self-start text-[10px] font-black tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/20 transition-all uppercase cursor-pointer"
                >
                  Xóa tất cả phiếu
                </button>
              )}
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
                    slip.user.toLowerCase().includes(q) ||
                    slip.sn.toLowerCase().includes(q) ||
                    slip.itemName.toLowerCase().includes(q) ||
                    slip.purpose.toLowerCase().includes(q) ||
                    (slip.targetLocation || '').toLowerCase().includes(q) ||
                    slip.id.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-24 text-slate-400 font-semibold text-xs space-y-2">
                      <div className="text-3xl">📭</div>
                      <p>Không tìm thấy bản ghi phiếu báo sử dụng nào phù hợp.</p>
                      <p className="text-[10px] font-normal text-slate-400 uppercase">Mẹo: Thử nhập số S/N hoặc hệ thống lắp đặt</p>
                    </div>
                  );
                }

                return (
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-semibold">
                      <thead>
                        <tr className="border-b border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">Thời điểm / Mã</th>
                          <th className="py-3 px-3">Thiết bị bốc dỡ</th>
                          <th className="py-3 px-3">Kỹ sư trích dỡ</th>
                          <th className="py-3 px-3">Nơi lắp đặt mới</th>
                          <th className="py-3 px-3 text-center">SL</th>
                          <th className="py-3 px-3 text-right">Tác Vụ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((slip) => (
                          <tr key={slip.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300 transition-colors">
                            <td className="py-3 px-3">
                              <div className="text-[11px] text-slate-800 dark:text-slate-200">{slip.date.split(' ')[1] || slip.date}</div>
                              <div className="text-[9px] text-slate-400 font-mono lowercase tracking-wide mt-0.5">{slip.date.split(' ')[0] || ''} • #{slip.id.slice(-6)}</div>
                            </td>
                            <td className="py-3 px-3 max-w-[200px]">
                              <div className="truncate text-slate-900 dark:text-white font-extrabold" title={slip.itemName}>{slip.itemName}</div>
                              <div className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">S/N: {slip.sn}</div>
                            </td>
                            <td className="py-3 px-3 uppercase text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">
                              {slip.user}
                            </td>
                            <td className="py-3 px-3">
                              <div className="truncate text-slate-800 dark:text-slate-200" title={slip.targetLocation}>{slip.targetLocation || '-'}</div>
                              <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px] italic mt-0.5" title={slip.purpose}>{slip.purpose}</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="bg-amber-100/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-black">x{slip.qtyUsed}</span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => onPrintSlip(slip)}
                                  className="p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/5 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                                  title="In lại phiếu báo bàn giao (PDF)"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteSlip(slip.id)}
                                  className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-500/5 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
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
                );
              })()}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-150 dark:border-slate-800 shrink-0 text-right">
              <button
                type="button"
                onClick={onCloseHistory}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-6 py-3 rounded-2xl cursor-pointer"
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
