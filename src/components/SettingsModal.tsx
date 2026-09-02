import React, { useState } from 'react';
import {
  Settings,
  X,
  Check,
  Layers,
  Laptop,
  FileText,
  History,
  HardDrive,
  Cloud,
  ShieldCheck,
  Clock,
  Save,
  Database,
  RotateCcw,
  CheckCircle2,
  Download
} from 'lucide-react';
import { SyncConfig, StorageConfig } from '../types.ts';
import { playScanBeep } from '../utils/audio.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  setSyncConfig: React.Dispatch<React.SetStateAction<SyncConfig>>;
  storageConfig: StorageConfig;
  setStorageConfig: React.Dispatch<React.SetStateAction<StorageConfig>>;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncStatusDetail: string;
  categories: string[];
  saveCategoriesLocally: (cats: string[]) => void;
  onPullCloud: () => void;
  onPushCloud: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualSaveLocalStorage: () => void;
  onResetToDefault: () => void;
  itemCount: number;
  usageCount: number;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  setSyncConfig,
  storageConfig,
  setStorageConfig,
  syncStatus,
  syncStatusDetail,
  categories,
  saveCategoriesLocally,
  onPullCloud,
  onPushCloud,
  onExportJSON,
  onImportJSON,
  onManualSaveLocalStorage,
  onResetToDefault,
  itemCount,
  usageCount,
  onAddToast
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'STORAGE' | 'CLOUD' | 'CATEGORIES'>('STORAGE');
  const [justSaved, setJustSaved] = useState(false);

  const autoSaveOptions = [
    { value: 0, label: 'Tức thì (Realtime)', desc: 'Lưu ngay khi sửa đổi (Khuyên nghị)' },
    { value: 5, label: '5 giây', desc: 'Lưu định kỳ mỗi 5s' },
    { value: 10, label: '10 giây', desc: 'Lưu định kỳ mỗi 10s' },
    { value: 30, label: '30 giây', desc: 'Lưu định kỳ mỗi 30s' },
    { value: 60, label: '1 phút', desc: 'Lưu định kỳ mỗi 60s' },
    { value: 300, label: '5 phút', desc: 'Lưu định kỳ mỗi 5 phút' },
  ];

  const handleIntervalChange = (val: number) => {
    setStorageConfig(prev => ({ ...prev, autoSaveInterval: val }));
    localStorage.setItem('cns_autosave_interval', String(val));
    const label = autoSaveOptions.find(o => o.value === val)?.label || `${val}s`;
    onAddToast(`Đã đổi tần suất tự động lưu LocalStorage: ${label}`, 'success');
    playScanBeep(900, 0.1);
  };

  const handleToggleWarnOnClose = (checked: boolean) => {
    setStorageConfig(prev => ({ ...prev, warnOnClose: checked }));
    localStorage.setItem('cns_autosave_warn_close', String(checked));
    onAddToast(
      checked
        ? 'Đã bật bảo vệ: Tự động ghi an toàn & cảnh báo khi đóng trình duyệt.'
        : 'Đã tắt cảnh báo khi đóng trình duyệt.',
      'info'
    );
  };

  const handleToggleShowToast = (checked: boolean) => {
    setStorageConfig(prev => ({ ...prev, showAutoSaveToast: checked }));
    localStorage.setItem('cns_autosave_show_toast', String(checked));
    onAddToast(
      checked ? 'Sẽ hiển thị thông báo khi tự động lưu.' : 'Đã ẩn thông báo khi tự động lưu.',
      'info'
    );
  };

  const handleToggleAutoBackup24h = (checked: boolean) => {
    setStorageConfig(prev => ({ ...prev, autoBackup24h: checked }));
    localStorage.setItem('cns_auto_backup_24h', String(checked));
    onAddToast(
      checked
        ? 'Đã kích hoạt: Tự động tải về bản sao lưu JSON định kỳ 24 giờ.'
        : 'Đã tắt tính năng tự động tải về bản sao lưu JSON 24 giờ.',
      checked ? 'success' : 'info'
    );
  };

  const formatLastBackup = (timestamp?: number) => {
    if (!timestamp) return 'Chưa ghi nhận lượt sao lưu nào';
    const d = new Date(timestamp);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  const formatNextBackup = (timestamp?: number) => {
    if (!timestamp) return 'Sẽ tự động sao lưu sau 24h hoạt động';
    const nextMs = timestamp + 24 * 60 * 60 * 1000;
    const diffMs = nextMs - Date.now();
    if (diffMs <= 0) return 'Đang đến hạn sao lưu tiếp theo';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Khoảng ${hours} giờ ${mins} phút nữa`;
  };

  const handleManualSave = () => {
    onManualSaveLocalStorage();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const saveSettingsConfig = (newUrl: string) => {
    setSyncConfig(prev => ({ ...prev, webAppUrl: newUrl }));
    localStorage.setItem('cns_sync_url', newUrl);
  };

  const trimSettingsConfigUrl = () => {
    setSyncConfig(prev => {
      const trimmedUrl = prev.webAppUrl.trim();
      localStorage.setItem('cns_sync_url', trimmedUrl);
      return { ...prev, webAppUrl: trimmedUrl };
    });
  };

  // Estimate storage usage
  const estimateStorageSize = () => {
    try {
      const invStr = localStorage.getItem('cns_inventory_v30_stable') || '';
      const usageStr = localStorage.getItem('cns_usage_slips_v1') || '';
      const catStr = localStorage.getItem('cns_categories_v30') || '';
      const totalBytes = (invStr.length + usageStr.length + catStr.length) * 2;
      return (totalBytes / 1024).toFixed(1);
    } catch {
      return '12.4';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[80000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                Cài Đặt Hệ Thống & Lưu Trữ
              </h3>
              <p className="text-[10.5px] text-slate-400">
                Cấu hình lưu trữ bộ nhớ LocalStorage & Đồng bộ Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3.5 pb-1 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-150 dark:border-slate-800 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('STORAGE')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'STORAGE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Bộ nhớ LocalStorage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CLOUD')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CLOUD'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Google Sheets Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Danh Mục & Tệp</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* TAB 1: LOCALSTORAGE & AUTO-SAVE CONFIGURATION */}
          {activeTab === 'STORAGE' && (
            <div className="space-y-4 animate-fade-in">
              {/* Storage Overview Card */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-slate-800/60 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Trạng thái bộ nhớ trình duyệt
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                    <ShieldCheck className="w-3 h-3" /> ĐÃ BẢO VỆ
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-center">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Thiết bị</span>
                    <strong className="text-sm font-black text-slate-800 dark:text-white">{itemCount}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-center">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Phiếu sử dụng</span>
                    <strong className="text-sm font-black text-slate-800 dark:text-white">{usageCount}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-center">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Dung lượng</span>
                    <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">~{estimateStorageSize()} KB</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lần lưu LocalStorage cuối:</span>
                  </div>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">
                    {storageConfig.lastSavedTime || 'Vừa xong'}
                  </strong>
                </div>
              </div>

              {/* Auto-Save Frequency Config */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-3">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Tần suất tự động lưu (Auto-Save Interval)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                      {storageConfig.autoSaveInterval === 0 ? 'Tức thì (Realtime)' : `${storageConfig.autoSaveInterval} giây`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Chọn khoảng thời gian hệ thống tự động đồng bộ và ghi đè an toàn vào bộ nhớ máy LocalStorage.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {autoSaveOptions.map((opt) => {
                    const isSelected = storageConfig.autoSaveInterval === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleIntervalChange(opt.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[11px] font-black">{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <span className="text-[9px] text-slate-400 leading-tight line-clamp-1">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data Loss Prevention Toggles */}
              <div className="space-y-2.5">
                {/* Sudden Close / Tab Exit Protection */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Bảo vệ khi tắt/tải lại trình duyệt đột ngột
                    </span>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed">
                      Tự động kích hoạt ghi khẩn cấp toàn bộ dữ liệu vào LocalStorage ngay khi đóng tab hoặc tải lại trang.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={storageConfig.warnOnClose}
                      onChange={(e) => handleToggleWarnOnClose(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Auto-Save Toast Feedback Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                      Thông báo khi tự động lưu
                    </span>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed">
                      Hiển thị thông báo nhỏ mỗi khi bộ đếm tự động ghi dữ liệu thành công.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={storageConfig.showAutoSaveToast}
                      onChange={(e) => handleToggleShowToast(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* 24-Hour Periodic Auto-Backup JSON */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 border border-indigo-200/80 dark:border-slate-700 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-indigo-500" />
                        Tự động tải về bản sao lưu JSON định kỳ (24 giờ)
                      </span>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Tự động kích hoạt tải xuống tệp JSON kho vật tư mỗi 24 giờ khi ứng dụng đang hoạt động để lưu trữ ngoại tuyến.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={storageConfig.autoBackup24h !== false}
                        onChange={(e) => handleToggleAutoBackup24h(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] pt-1 border-t border-indigo-100 dark:border-slate-700/60">
                    <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-150 dark:border-slate-700">
                      <span className="text-slate-400 block mb-0.5 font-medium">Lần sao lưu gần nhất:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px] block truncate">
                        {formatLastBackup(storageConfig.lastAutoBackupTime)}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-150 dark:border-slate-700">
                      <span className="text-slate-400 block mb-0.5 font-medium">Kỳ sao lưu kế tiếp:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] block truncate">
                        {storageConfig.autoBackup24h === false ? 'Đang tạm dừng' : formatNextBackup(storageConfig.lastAutoBackupTime)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onExportJSON();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-all cursor-pointer border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Kích hoạt tải ngay bản sao lưu JSON (Đặt lại chu kỳ 24h)
                  </button>
                </div>
              </div>

              {/* Actions: Save Now & Reset Defaults */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleManualSave}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black text-white transition-all cursor-pointer shadow-md ${
                    justSaved
                      ? 'bg-emerald-600 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {justSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ĐÃ LƯU AN TOÀN VÀO MÁY!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>LƯU VÀO LOCALSTORAGE NGAY</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onResetToDefault}
                  className="flex items-center justify-center gap-1.5 py-3 px-3.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Khôi phục danh sách mẫu thiết bị CNS tiêu chuẩn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mẫu CNS</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS / APPS SCRIPT CLOUD SYNC */}
          {activeTab === 'CLOUD' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-400 tracking-wider">Lưu ý chuyên nghiệp:</span>
                <p className="text-[11.5px] text-indigo-750 dark:text-indigo-350 leading-relaxed">
                  Đường dẫn này kết nối trực tiếp đến Macro triển khai dịch vụ Web App của Google Sheets. Khi đẩy (PUSH) hoặc kéo (PULL), cơ sở dữ liệu sẽ tự động đồng bộ hóa thời gian thực.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase ml-1 flex justify-between items-center">
                  <span>Đường dẫn triển khai Google Web App *</span>
                  <span className="text-emerald-500 font-extrabold text-[9.5px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Tự động ghi nhớ
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={syncConfig.webAppUrl}
                  onChange={(e) => saveSettingsConfig(e.target.value)}
                  onBlur={trimSettingsConfigUrl}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-indigo-400 resize-none leading-relaxed"
                  placeholder="https://script.google.com/macros/s/..."
                />
              </div>

              {/* Autosync config */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white">Tự động đồng bộ Cloud</span>
                  <p className="text-[10px] text-slate-400">Đồng bộ Cloud lập tức khi quét kiểm kê hàng hoàn thành</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSync}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSyncConfig(prev => ({ ...prev, autoSync: checked }));
                      localStorage.setItem('cns_auto_sync', String(checked));
                      onAddToast(checked ? 'Đã bật tự động đồng bộ lên Cloud.' : 'Đã tắt tự động đồng bộ.', 'info');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Auto download startup */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white">Tải dữ liệu khi mở Web</span>
                  <p className="text-[10px] text-slate-400">Tự động kết nối Cloud kéo cơ sở dữ liệu khi vừa tải trang</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncConfig.autoLoadOnStartup}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSyncConfig(prev => ({ ...prev, autoLoadOnStartup: checked }));
                      localStorage.setItem('cns_auto_load_startup', String(checked));
                      onAddToast(checked ? 'Đã bật tự động kéo dữ liệu khi tải trang Web.' : 'Đã tắt tự động tải khi mở Web.', 'info');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {syncStatusDetail && (
                <div className={`p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed border ${
                  syncStatus === 'syncing' ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-100/30' :
                  syncStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100' :
                  'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100'
                }`}>
                  <strong className="block uppercase text-[9px] font-extrabold tracking-wider mb-0.5">Phản hồi log:</strong>
                  {syncStatusDetail}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onPullCloud}
                  disabled={syncStatus === 'syncing'}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer text-center disabled:opacity-50"
                >
                  PULL / TẢI CLOUD
                </button>
                <button
                  type="button"
                  onClick={onPushCloud}
                  disabled={syncStatus === 'syncing'}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md shadow-indigo-600/10 transition-colors cursor-pointer text-center disabled:opacity-50"
                >
                  PUSH / ĐẨY CLOUD
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES & OFFLINE BACKUP */}
          {activeTab === 'CATEGORIES' && (
            <div className="space-y-4 animate-fade-in">
              {/* Categories management */}
              <div className="p-4 rounded-2xl bg-indigo-50/10 dark:bg-slate-800/40 border border-indigo-100/20 dark:border-slate-700 space-y-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Quản Lý Danh Mục Phân Loại
                  </span>
                  <p className="text-[10.5px] text-slate-400">Xem và sửa đổi các phân loại trang thiết bị đã lưu.</p>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    id="new-global-category"
                    placeholder="Thêm phân loại mới..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-400 font-bold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          if (!categories.includes(val)) {
                            const updated = [...categories, val];
                            saveCategoriesLocally(updated);
                            onAddToast(`Đã thêm phân loại: ${val}`, 'success');
                            playScanBeep(1000, 0.12);
                            (e.target as HTMLInputElement).value = '';
                          } else {
                            onAddToast('Phân loại này đã tồn tại!', 'info');
                          }
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-global-category') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const val = input.value.trim();
                        if (!categories.includes(val)) {
                          const updated = [...categories, val];
                          saveCategoriesLocally(updated);
                          onAddToast(`Đã thêm phân loại: ${val}`, 'success');
                          playScanBeep(1000, 0.12);
                          input.value = '';
                        } else {
                          onAddToast('Phân loại này đã tồn tại!', 'info');
                        }
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 custom-scrollbar">
                  {categories.map(cat => {
                    const isDefault = ['Tất cả loại', 'VHF AM', 'VCCS', 'GPS & Ăng-ten', 'Ghi âm & Lưu trữ', 'Nguồn & UPS', 'Mạng & Truyền dẫn', 'Khác'].includes(cat);
                    return (
                      <div
                        key={cat}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9.5px] font-extrabold ${
                          isDefault
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30'
                        }`}
                      >
                        {cat}
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = categories.filter(c => c !== cat);
                              saveCategoriesLocally(updated);
                              onAddToast(`Đã xóa phân loại: ${cat}`, 'info');
                              playScanBeep(700, 0.12);
                            }}
                            className="text-indigo-400 hover:text-rose-600 font-extrabold ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Offline backup files */}
              <div className="p-4 rounded-2xl bg-indigo-50/25 dark:bg-slate-800/40 border border-indigo-100/30 dark:border-slate-700 space-y-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-indigo-500" />
                    Truyền Tệp / Sao Lưu Ngoại Tuyến (Offline)
                  </span>
                  <p className="text-[10.5px] text-slate-400">Trích xuất thành tệp JSON hoặc nạp trực tiếp cơ sở dữ liệu vật tư giữa các máy tính nội bộ.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onExportJSON}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-colors cursor-pointer text-center"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Xuất JSON Backup
                  </button>

                  <label className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-colors cursor-pointer text-center border border-indigo-200/30">
                    <History className="w-3.5 h-3.5" />
                    Nhập JSON Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={onImportJSON}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-indigo-150/40 dark:border-slate-700 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3 text-indigo-500" />
                    Tự động tải về mỗi 24 giờ:
                  </span>
                  <span className={`font-bold ${storageConfig.autoBackup24h !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {storageConfig.autoBackup24h !== false ? 'Đang kích hoạt' : 'Tạm tắt'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

