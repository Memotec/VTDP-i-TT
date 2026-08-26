import React from 'react';
import { X, ArrowRightLeft, Trash2, Printer } from 'lucide-react';
import { InventoryItem } from '../types.ts';

export interface HandoverRow {
  id: string;
  name: string;
  unit: string;
  qty: number;
  quality: string;
  specs: string;
  sn: string;
  note: string;
}

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  handoverNo: string;
  setHandoverNo: (val: string) => void;
  handoverLocation: string;
  setHandoverLocation: (val: string) => void;
  handoverDay: string;
  setHandoverDay: (val: string) => void;
  handoverMonth: string;
  setHandoverMonth: (val: string) => void;
  handoverYear: string;
  setHandoverYear: (val: string) => void;
  handoverReason: string;
  setHandoverReason: (val: string) => void;
  handoverGiverDept: string;
  setHandoverGiverDept: (val: string) => void;
  handoverGiverName: string;
  setHandoverGiverName: (val: string) => void;
  handoverGiverPos: string;
  setHandoverGiverPos: (val: string) => void;
  handoverReceiverDept: string;
  setHandoverReceiverDept: (val: string) => void;
  handoverReceiverName: string;
  setHandoverReceiverName: (val: string) => void;
  handoverReceiverPos: string;
  setHandoverReceiverPos: (val: string) => void;
  handoverRows: HandoverRow[];
  setHandoverRows: React.Dispatch<React.SetStateAction<HandoverRow[]>>;
  onPrintHandover: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  isOpen,
  onClose,
  inventory,
  handoverNo,
  setHandoverNo,
  handoverLocation,
  setHandoverLocation,
  handoverDay,
  setHandoverDay,
  handoverMonth,
  setHandoverMonth,
  handoverYear,
  setHandoverYear,
  handoverReason,
  setHandoverReason,
  handoverGiverDept,
  setHandoverGiverDept,
  handoverGiverName,
  setHandoverGiverName,
  handoverGiverPos,
  setHandoverGiverPos,
  handoverReceiverDept,
  setHandoverReceiverDept,
  handoverReceiverName,
  setHandoverReceiverName,
  handoverReceiverPos,
  setHandoverReceiverPos,
  handoverRows,
  setHandoverRows,
  onPrintHandover,
  onAddToast
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-5xl relative max-h-[92vh] overflow-y-auto my-8 flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-150 dark:border-slate-800 pb-5 mb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-wider">
              Lập Biên Bản Bàn Giao Thiết Bị
            </h3>
            <p className="text-xs text-slate-400 font-semibold uppercase">
              Biên bản giao, nhận tài sản, công cụ chuyên ngành kỹ thuật và hàng không
            </p>
          </div>
        </div>

        {/* Config metadata fields card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5 bg-slate-50/50 dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-150 dark:border-slate-800/80">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest block font-bold">Số hiệu biên bản:</label>
            <input
              type="text"
              value={handoverNo}
              onChange={(e) => setHandoverNo(e.target.value)}
              placeholder="Ví dụ: 125/KT"
              className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-extrabold focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Nơi ký biên bản:</label>
            <input
              type="text"
              value={handoverLocation}
              onChange={(e) => setHandoverLocation(e.target.value)}
              placeholder="Ví dụ: Trung tâm Bảo đảm Kỹ thuật"
              className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Ngày tháng năm lập biên bản:</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold">Ngày</span>
                <input
                  type="text"
                  value={handoverDay}
                  onChange={(e) => setHandoverDay(e.target.value)}
                  className="w-full text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-2 text-xs text-slate-800 dark:text-white font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold">Tháng</span>
                <input
                  type="text"
                  value={handoverMonth}
                  onChange={(e) => setHandoverMonth(e.target.value)}
                  className="w-full text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-2 text-xs text-slate-800 dark:text-white font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold">Năm</span>
                <input
                  type="text"
                  value={handoverYear}
                  onChange={(e) => setHandoverYear(e.target.value)}
                  className="w-full text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-2 text-xs text-slate-800 dark:text-white font-bold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 md:col-span-4 mt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Lý do bàn giao tài sản, công cụ:</label>
            <input
              type="text"
              value={handoverReason}
              onChange={(e) => setHandoverReason(e.target.value)}
              placeholder="Ví dụ: Đảm bảo trang thiết bị kỹ thuật dự phòng và vận hành ổn định hệ thống"
              className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Side-by-side Giver and Receiver editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 shrink-0">
          <div className="bg-rose-500/5 dark:bg-rose-500/10 p-5 rounded-[2rem] border border-rose-500/10 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/35 dark:border-rose-950/30">
              <h4 className="text-[11px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                🟢 BÊN GIAO
              </h4>
              <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-rose-500/10 text-rose-500 uppercase">Đội kỹ thuật</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block font-bold">Đơn vị chủ quản bên giao:</label>
              <input
                type="text"
                value={handoverGiverDept}
                onChange={(e) => setHandoverGiverDept(e.target.value)}
                placeholder="Ví dụ: Đội Thông tin – Trung tâm BĐKT"
                className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block font-bold">Đại diện (Ông/bà):</label>
                <input
                  type="text"
                  value={handoverGiverName}
                  onChange={(e) => setHandoverGiverName(e.target.value)}
                  placeholder="Tên người bàn giao"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block font-bold">Chức vụ:</label>
                <input
                  type="text"
                  value={handoverGiverPos}
                  onChange={(e) => setHandoverGiverPos(e.target.value)}
                  placeholder="Ví dụ: Đội trưởng"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-5 rounded-[2rem] border border-indigo-500/10 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200/35 dark:border-indigo-950/30">
              <h4 className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                🔵 BÊN NHẬN
              </h4>
              <span className="text-[9px] font-bold py-0.5 px-2 rounded-full bg-indigo-500/10 text-indigo-500 uppercase">Đối tác tiếp nhận</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block font-bold">Đơn vị tiếp nhận bên nhận:</label>
              <input
                type="text"
                value={handoverReceiverDept}
                onChange={(e) => setHandoverReceiverDept(e.target.value)}
                placeholder="Ví dụ: Tổ Kỹ thuật Không lưu"
                className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block font-bold">Đại diện (Ông/bà):</label>
                <input
                  type="text"
                  value={handoverReceiverName}
                  onChange={(e) => setHandoverReceiverName(e.target.value)}
                  placeholder="Tên đối tác tiếp nhận"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block font-bold">Chức vụ:</label>
                <input
                  type="text"
                  value={handoverReceiverPos}
                  onChange={(e) => setHandoverReceiverPos(e.target.value)}
                  placeholder="Ví dụ: Kỹ sư trực ban"
                  className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Items row */}
        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/10 mb-5 text-slate-800 dark:text-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
            <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-bold">
              🛒 THÊM THIẾT BỊ TỪ KHO VẬT TƯ VÀO BIÊN BẢN:
            </label>
            <button
              type="button"
              onClick={() => {
                const allList: HandoverRow[] = inventory.map(item => ({
                  id: item.id,
                  name: item.name,
                  unit: 'Cái',
                  qty: 1,
                  quality: 'Tốt (Mới 100%)',
                  specs: `${item.pn ? 'P/N: ' + item.pn + '. ' : ''}Quy cách chuẩn`,
                  sn: item.sn || 'N/A',
                  note: ''
                }));
                setHandoverRows(allList);
                onAddToast('Đã thêm toàn bộ kho vào biên bản bàn giao!', 'success');
              }}
              className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline uppercase font-bold cursor-pointer"
            >
              [ Thêm toàn bộ vật tư từ hệ thống ]
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const matched = inventory.find(x => x.id === id);
                if (matched) {
                  if (handoverRows.some(row => row.id === matched.id)) {
                    onAddToast('Thiết bị này đã được thêm vào biên bản!', 'info');
                    return;
                  }
                  setHandoverRows(prev => [...prev, {
                    id: matched.id,
                    name: matched.name,
                    unit: 'Cái',
                    qty: 1,
                    quality: 'Tốt (Mới 100%)',
                    specs: `${matched.pn ? 'P/N: ' + matched.pn + '. ' : ''}Quy cách chuẩn`,
                    sn: matched.sn || 'N/A',
                    note: ''
                  }]);
                  onAddToast(`Đã thêm "${matched.name}"`, 'success');
                }
              }}
              className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-none"
            >
              <option value="">-- Chọn một thiết bị từ kho để thêm vào danh sách ... --</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (S/N: {item.sn} | PN: {item.pn || '-'})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                const randId = 'custom_' + Math.random().toString(36).substring(2, 9);
                setHandoverRows(prev => [...prev, {
                  id: randId,
                  name: 'Thiết bị tự phát sinh ngoài kho',
                  unit: 'Cái',
                  qty: 1,
                  quality: 'Tốt (Mới 100%)',
                  specs: 'Quy cách chuẩn kỹ thuật CNS/ATM',
                  sn: 'SN-' + Math.floor(1000 + Math.random() * 9000),
                  note: ''
                }]);
                onAddToast('Đã tạo dòng thiết bị tự nhập mới!', 'success');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4.5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all text-center flex items-center justify-center font-bold"
            >
              + Tự Gõ Ngoài
            </button>
          </div>
        </div>

        {/* List of items table in Handover editor */}
        <div className="flex-1 overflow-y-auto max-h-[250px] pr-1 mb-4 border border-slate-150 dark:border-slate-800 rounded-3xl">
          <table className="w-full text-[11px] font-semibold text-slate-800 dark:text-white text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-150 dark:border-slate-700">
              <tr className="text-[9.5px] uppercase text-slate-400 font-extrabold tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3">Tên tài sản, công cụ</th>
                <th className="py-2.5 px-3 w-16 text-center">ĐVT</th>
                <th className="py-2.5 px-3 w-20 text-center">Số lượng</th>
                <th className="py-2.5 px-3 w-32">Chất lượng</th>
                <th className="py-2.5 px-3">Nhãn hiệu, quy cách, xuất xứ</th>
                <th className="py-2.5 px-3 w-28 text-center">S/N</th>
                <th className="py-2.5 px-3">Ghi chú</th>
                <th className="py-2.5 px-3 w-10 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {handoverRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 uppercase font-black text-[10px]">
                    Danh sách rỗng. Vui lòng thêm thiết bị từ mục chọn ở trên!
                  </td>
                </tr>
              ) : (
                handoverRows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/25">
                    <td className="py-2 px-3 text-center text-slate-400 font-extrabold">{index + 1}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, name: val } : r));
                        }}
                        className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none font-bold py-0.5"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, unit: val } : r));
                        }}
                        className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none text-center font-bold"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, qty: val } : r));
                        }}
                        className="bg-transparent text-center text-slate-900 dark:text-white w-20 border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none font-black"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.quality}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, quality: val } : r));
                        }}
                        className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none font-semibold text-xs"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.specs}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, specs: val } : r));
                        }}
                        className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none text-xs"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.sn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, sn: val } : r));
                        }}
                        className="bg-transparent text-center font-mono text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none font-extrabold"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.note || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHandoverRows(prev => prev.map(r => r.id === row.id ? { ...r, note: val } : r));
                        }}
                        className="bg-transparent text-slate-800 dark:text-white w-full border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-rose-500 focus:outline-none text-xs"
                        placeholder="Ghi chú..."
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setHandoverRows(prev => prev.filter(r => r.id !== row.id));
                          onAddToast('Đã xóa một thiết bị khỏi biên bản', 'info');
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-150 dark:border-slate-800 mt-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setHandoverRows([]);
              onAddToast('Đã xóa sạch danh sách biên bản!', 'info');
            }}
            disabled={handoverRows.length === 0}
            className="text-[10px] font-black uppercase text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 px-4 py-2.5 rounded-2xl border border-rose-500/10 disabled:opacity-40 transition-all cursor-pointer"
          >
            Xóa tất cả mặt hàng
          </button>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold px-6 py-3 rounded-2xl text-xs transition-colors cursor-pointer text-center"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={onPrintHandover}
              disabled={handoverRows.length === 0}
              className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-8 py-3 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/15 disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" />
              XUẤT IN BIÊN BẢN CHUẨN FORM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
