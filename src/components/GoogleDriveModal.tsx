import React, { useState, useEffect } from 'react';
import { 
  X, HardDrive, Upload, Download, Trash2, RefreshCw, CheckCircle2, 
  ExternalLink, LogIn, LogOut, FileText, FileSpreadsheet, ShieldAlert,
  Folder, Loader2, Database
} from 'lucide-react';
import { googleSignIn, googleLogout, initAuthListener, getAccessToken } from '../services/authService.ts';
import { 
  listDriveBackups, uploadToDrive, downloadFromDrive, deleteFromDrive, DriveFileItem 
} from '../services/googleDriveService.ts';
import { InventoryItem, DispatchedRecord } from '../types.ts';
import * as XLSX from 'xlsx';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  dispatchedRecords: DispatchedRecord[];
  onRestoreFromBackup: (data: { inventory?: InventoryItem[]; dispatchedRecords?: DispatchedRecord[] }) => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  inventory,
  dispatchedRecords,
  onRestoreFromBackup,
  onAddToast
}) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = initAuthListener(
      (user, tok) => {
        setCurrentUser(user);
        setToken(tok);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch drive files when token changes or modal opens
  useEffect(() => {
    if (isOpen && token) {
      loadDriveFiles(token);
    }
  }, [isOpen, token]);

  const loadDriveFiles = async (tok: string) => {
    try {
      setIsLoadingFiles(true);
      const files = await listDriveBackups(tok);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Lỗi tải tệp Drive:', err);
      onAddToast(`Lỗi tải danh sách tệp từ Google Drive: ${err.message || 'Chưa được cấp quyền'}`, 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setToken(result.accessToken);
        onAddToast(`Đăng nhập thành công với tài khoản ${result.user.email}!`, 'success');
        loadDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Đăng nhập thất bại:', err);
      onAddToast(`Đăng nhập Google thất bại: ${err.message || 'Đã hủy'}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setToken(null);
      setDriveFiles([]);
      onAddToast('Đã đăng xuất tài khoản Google Drive.', 'info');
    } catch (err: any) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  // Upload JSON Backup
  const handleUploadJsonBackup = async () => {
    if (!token) {
      onAddToast('Vui lòng đăng nhập Google Drive trước khi lưu!', 'info');
      return;
    }

    try {
      setIsUploading(true);
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `CNS_Inventory_Backup_${dateStr}.json`;

      const backupData = {
        app: 'CNS Equipment Inventory Management',
        version: '2.5.0',
        exportedAt: now.toISOString(),
        itemCount: inventory.length,
        dispatchedCount: dispatchedRecords.length,
        inventory,
        dispatchedRecords
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      await uploadToDrive(token, fileName, jsonStr, 'application/json');

      onAddToast(`Đã tải bản sao lưu JSON [${fileName}] lên Google Drive thành công!`, 'success');
      loadDriveFiles(token);
    } catch (err: any) {
      console.error('Lỗi sao lưu JSON:', err);
      onAddToast(`Lỗi sao lưu JSON lên Google Drive: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload Excel Backup
  const handleUploadExcelBackup = async () => {
    if (!token) {
      onAddToast('Vui lòng đăng nhập Google Drive trước khi lưu!', 'info');
      return;
    }

    try {
      setIsUploading(true);
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `Danh_Sach_Vat_Tu_CNS_${dateStr}.xlsx`;

      const excelRows = inventory.map((item, index) => ({
        'STT': index + 1,
        'Mã định danh': item.id,
        'Tên vật tư / Thiết bị': item.name,
        'Ký hiệu / P/N': item.pn || '',
        'Số sê-ri / S/N': item.sn,
        'Số lượng': item.qty,
        'Vị trí lưu kho': item.warehouse || '',
        'Phân loại danh mục': item.category,
        'Trạng thái': item.status === 'READY' ? 'Sẵn sàng' : item.status === 'DEPLOYED' ? 'Đã bàn giao' : 'Cần bảo dưỡng'
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Vật Tư CNS');

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      await uploadToDrive(token, fileName, blob, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      onAddToast(`Đã tải bản sao lưu Excel [${fileName}] lên Google Drive!`, 'success');
      loadDriveFiles(token);
    } catch (err: any) {
      console.error('Lỗi tải Excel lên Drive:', err);
      onAddToast(`Lỗi lưu Excel lên Google Drive: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Restore from Drive JSON file
  const handleRestoreFile = async (file: DriveFileItem) => {
    if (!token) return;

    if (!window.confirm(`XÁC NHẬN PHỤC HỒI:\nBạn có chắc chắn muốn nạp dữ liệu từ tệp "${file.name}" trên Google Drive về hệ thống không? Dữ liệu hiện tại sẽ được cập nhật.`)) {
      return;
    }

    try {
      setRestoringFileId(file.id);
      const jsonContent = await downloadFromDrive(token, file.id);
      const parsed = JSON.parse(jsonContent);

      if (!parsed.inventory && !Array.isArray(parsed)) {
        throw new Error('Định dạng tệp JSON không hợp lệ!');
      }

      const invData = parsed.inventory || (Array.isArray(parsed) ? parsed : []);
      const dispData = parsed.dispatchedRecords || [];

      onRestoreFromBackup({
        inventory: invData,
        dispatchedRecords: dispData
      });

      onAddToast(`Phục hồi thành công ${invData.length} thiết bị từ tệp Google Drive!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Lỗi phục hồi tệp Drive:', err);
      onAddToast(`Lỗi phục hồi từ tệp Drive: ${err.message}`, 'error');
    } finally {
      setRestoringFileId(null);
    }
  };

  // Delete Drive file with MANDATORY user confirmation
  const handleDeleteFile = async (file: DriveFileItem) => {
    if (!token) return;

    // MANDATORY USER CONFIRMATION DIALOG (per SKILL.md guidelines)
    const confirmed = window.confirm(
      `XÁC NHẬN XÓA TỆP DRIVE:\nBạn có chắc chắn muốn xóa vĩnh viễn tệp "${file.name}" khỏi Google Drive?\nThao tác này không thể hoàn tác!`
    );

    if (!confirmed) return;

    try {
      setDeletingFileId(file.id);
      await deleteFromDrive(token, file.id);
      onAddToast(`Đã xóa tệp "${file.name}" khỏi Google Drive thành công.`, 'info');
      setDriveFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err: any) {
      console.error('Lỗi xóa tệp Drive:', err);
      onAddToast(`Lỗi xóa tệp Drive: ${err.message}`, 'error');
    } finally {
      setDeletingFileId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/50 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-150 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto my-8 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                Đồng Bộ & Sao Lưu Google Drive
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ đám mây an toàn, sao lưu khẩn cấp và phục hồi dữ liệu từ tài khoản Google của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-5 flex-1 custom-scrollbar">
          
          {/* Account Status Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                Tài khoản Google kết nối
              </span>
              {currentUser ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-emerald-100/80 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Đã đăng nhập
                </span>
              ) : (
                <span className="text-[10.5px] font-bold text-slate-400">Chưa liên kết</span>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      {currentUser.displayName || 'Người dùng Google'}
                    </strong>
                    <span className="text-[11px] text-slate-400 block">{currentUser.email}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-900"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-3 space-y-2 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Đăng nhập tài khoản Google để bật tính năng sao lưu tự động vào Google Drive cá nhân
                </p>

                {/* Standard Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="mt-1 px-5 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2.5 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>Đăng nhập với Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          {token && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 space-y-3">
              <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider block">
                Thao tác tạo bản sao lưu lên Google Drive
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleUploadJsonBackup}
                  disabled={isUploading}
                  className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-indigo-200 dark:border-slate-700 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 shadow-xs disabled:opacity-50"
                >
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-extrabold text-slate-800 dark:text-white block">Tải sao lưu JSON</strong>
                    <span className="text-[10px] text-slate-400 block">Lưu toàn bộ dữ liệu hệ thống</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleUploadExcelBackup}
                  disabled={isUploading}
                  className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-emerald-200 dark:border-slate-700 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 shadow-xs disabled:opacity-50"
                >
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs font-extrabold text-slate-800 dark:text-white block">Tải Báo Cáo Excel</strong>
                    <span className="text-[10px] text-slate-400 block">Xuất bảng Excel kho lên Drive</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Drive Files List */}
          {token && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Các tệp bản sao lưu trên Google Drive
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadDriveFiles(token)}
                    disabled={isLoadingFiles}
                    className="p-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Làm mới danh sách tệp"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>

                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Mở Google Drive <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {isLoadingFiles ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                  <span className="text-xs text-slate-400">Đang tải danh sách tệp từ Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                  <Folder className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Chưa có bản sao lưu nào trong thư mục CNS_Equipment_Backups</p>
                  <p className="text-[11px] text-slate-400">Nhấn "Tải sao lưu JSON" ở trên để tạo bản lưu đầu tiên.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {driveFiles.map((file) => (
                    <div 
                      key={file.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shrink-0">
                          {file.mimeType.includes('spreadsheet') ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="truncate">
                          <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate" title={file.name}>
                            {file.name}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">
                            Cập nhật: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('vi-VN') : 'Không rõ'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {file.name.endsWith('.json') && (
                          <button
                            type="button"
                            onClick={() => handleRestoreFile(file)}
                            disabled={restoringFileId === file.id}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
                            title="Phục hồi dữ liệu hệ thống từ tệp này"
                          >
                            {restoringFileId === file.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            Nạp lại
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file)}
                          disabled={deletingFileId === file.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                          title="Xóa tệp khỏi Google Drive"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
};
