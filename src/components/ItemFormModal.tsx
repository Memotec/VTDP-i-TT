import React, { useState, useEffect } from 'react';
import { X, Plus, PackagePlus, Box, Cpu, Save, RotateCcw, Tag, Hash, MapPin, Layers } from 'lucide-react';
import { InventoryItem } from '../types.ts';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: InventoryItem | null;
  categories: string[];
  onSaveCategory: (newCategory: string) => void;
  onSubmit: (formData: {
    name: string;
    pn: string;
    sn: string;
    warehouse: string;
    loc: string;
    qty: number;
    category: string;
  }) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  categories,
  onSaveCategory,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [pn, setPn] = useState('');
  const [sn, setSn] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [loc, setLoc] = useState('');
  const [qty, setQty] = useState(1);
  const [category, setCategory] = useState('VHF AM');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Sync state whenever modal opens or editingItem changes
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setName(editingItem.name || '');
        setPn(editingItem.pn || '');
        setSn(editingItem.sn || '');
        setWarehouse(editingItem.warehouse || '');
        setLoc(editingItem.loc || '');
        setQty(editingItem.qty || 1);
        setCategory(editingItem.category || categories.find(c => c !== 'Tất cả loại') || 'VHF AM');
      } else {
        setName('');
        setPn('');
        setSn('');
        setWarehouse('');
        setLoc('');
        setQty(1);
        setCategory(categories.find(c => c !== 'Tất cả loại') || 'VHF AM');
      }
      setIsAddingNewCat(false);
      setNewCatInput('');
    }
  }, [isOpen, editingItem, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sn.trim()) return;

    onSubmit({
      name: name.trim(),
      pn: pn.trim(),
      sn: sn.trim(),
      warehouse: warehouse.trim().toUpperCase(),
      loc: loc.trim(),
      qty: Math.max(1, Number(qty) || 1),
      category: category.trim() || 'VHF AM'
    });
  };

  const handleReset = () => {
    if (editingItem) {
      setName(editingItem.name || '');
      setPn(editingItem.pn || '');
      setSn(editingItem.sn || '');
      setWarehouse(editingItem.warehouse || '');
      setLoc(editingItem.loc || '');
      setQty(editingItem.qty || 1);
      setCategory(editingItem.category || 'VHF AM');
    } else {
      setName('');
      setPn('');
      setSn('');
      setWarehouse('');
      setLoc('');
      setQty(1);
      setCategory(categories.find(c => c !== 'Tất cả loại') || 'VHF AM');
    }
    setIsAddingNewCat(false);
    setNewCatInput('');
  };

  const handleAddNewCat = () => {
    const trimmed = newCatInput.trim();
    if (trimmed) {
      if (!categories.includes(trimmed)) {
        onSaveCategory(trimmed);
      }
      setCategory(trimmed);
      setIsAddingNewCat(false);
      setNewCatInput('');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-fade-in no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/75 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-900 flex items-center justify-center shadow-xs">
              {editingItem ? <Cpu className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingItem ? 'Cập Nhật Thiết Bị' : 'Thêm Mới Thiết Bị Vào Kho'}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300 rounded-md">
                  {editingItem ? 'Chỉnh sửa' : 'Nhập kho'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {editingItem 
                  ? `Chỉnh sửa thông số của S/N: ${editingItem.sn}`
                  : 'Điền thông số định danh thiết bị dự phòng CNS/ATM'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar p-6 space-y-4.5 flex-1">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center gap-1">
              <Box className="w-3.5 h-3.5 text-[#2563EB]" />
              Tên thiết bị <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Máy thu phát VHF Jotron, Card nguồn..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-semibold placeholder:text-slate-400 shadow-xs transition-colors"
            />
          </div>

          {/* Category & Quantity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                  Phân loại
                </label>
                {!isAddingNewCat ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(true)}
                    className="text-[11px] font-black text-[#2563EB] dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm loại
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setIsAddingNewCat(false); setNewCatInput(''); }}
                    className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
              {!isAddingNewCat ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-extrabold shadow-xs transition-colors"
                >
                  {categories.filter(cat => cat !== 'Tất cả loại').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nhập loại mới..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCat}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white h-[36px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    Lưu
                  </button>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
                Số lượng tồn <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-[42px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-l-xl font-black text-base border-y border-l border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  required
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="flex-1 text-center py-2.5 border-y border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-black"
                />
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  className="w-10 h-[42px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-r-xl font-black text-base border-y border-r border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Model P/N & S/N Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#2563EB]" />
                Part Number (P/N)
              </label>
              <input
                type="text"
                value={pn}
                onChange={(e) => setPn(e.target.value)}
                placeholder="VD: TR-7750, MOD-900..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-semibold placeholder:text-slate-400 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
                Serial Number (S/N) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sn}
                onChange={(e) => setSn(e.target.value)}
                placeholder="VD: SN-2026-001..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-mono font-bold placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Warehouse Code & Bin Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                Mã Kho (QR Gán)
              </label>
              <input
                type="text"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                placeholder="VD: KHO-01"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-bold placeholder:text-slate-400 uppercase shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                Vị trí tủ / kệ / ngăn
              </label>
              <input
                type="text"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="VD: Tủ 02 - Ngăn B"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-none focus:border-[#2563EB] text-sm font-semibold placeholder:text-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Preview Note */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0"></span>
            <span>Số Sê-ri (S/N) là mã định danh duy nhất để tạo mã QR, in tem nhãn và quét kiểm kê bằng camera di động.</span>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Làm mới
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md shadow-blue-500/25 cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingItem ? 'LƯU THAY ĐỔI' : 'THÊM THIẾT BỊ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
