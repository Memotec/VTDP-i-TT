import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Eye, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen,
  Calendar,
  Layers,
  ArrowRight,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';
import { InventoryItem } from '../types.ts';
import { 
  listAppGoogleDocs, 
  createBlankGoogleDoc, 
  getGoogleDocContent, 
  deleteGoogleDoc, 
  exportInventoryReportToGoogleDoc,
  GoogleDocFile, 
  GoogleDocContent 
} from '../services/googleDocsService.ts';
import { getAccessToken, googleSignIn, googleLogout, initAuthListener } from '../services/authService.ts';
import { User } from 'firebase/auth';

interface GoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  selectedCategory?: string;
  currentUsername?: string;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const GoogleDocsModal: React.FC<GoogleDocsModalProps> = ({
  isOpen,
  onClose,
  inventory,
  selectedCategory = 'ALL',
  currentUsername = 'Kỹ sư Quản lý Kho',
  onAddToast
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [docsList, setDocsList] = useState<GoogleDocFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<GoogleDocContent | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // New Doc Form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocTemplate, setNewDocTemplate] = useState('BLANK');

  // Confirmation dialog for deletion
  const [deleteTarget, setDeleteTarget] = useState<GoogleDocFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Init auth listener
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

  useEffect(() => {
    if (isOpen) {
      if (token) {
        loadDocs(token);
      } else {
        // Try getting cached token if available without triggering popup
        getAccessToken().then(tok => {
          if (tok) {
            setToken(tok);
            loadDocs(tok);
          }
        });
      }
    }
  }, [isOpen, token]);

  const loadDocs = async (activeToken?: string) => {
    const tok = activeToken || token;
    if (!tok) return;

    try {
      setIsLoading(true);
      const docs = await listAppGoogleDocs(tok);
      setDocsList(docs);
    } catch (err: any) {
      console.error('Lỗi tải danh sách Google Docs:', err);
      onAddToast(err.message || 'Không thể tải danh sách Google Docs. Vui lòng kiểm tra quyền tài khoản!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        onAddToast(`Đã kết nối Google Workspace với tài khoản ${res.user.email}!`, 'success');
        loadDocs(res.accessToken);
      }
    } catch (err: any) {
      console.error('Đăng nhập thất bại:', err);
      onAddToast(`Đăng nhập Google thất bại: ${err.message || 'Vui lòng thử lại'}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setToken(null);
      setDocsList([]);
      setSelectedDocPreview(null);
      onAddToast('Đã đăng xuất tài khoản Google.', 'info');
    } catch (err: any) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  const ensureToken = async (): Promise<string | null> => {
    if (token) return token;
    const cached = await getAccessToken();
    if (cached) {
      setToken(cached);
      return cached;
    }
    const res = await googleSignIn();
    if (res?.accessToken) {
      setCurrentUser(res.user);
      setToken(res.accessToken);
      return res.accessToken;
    }
    return null;
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      onAddToast('Vui lòng nhập tên tài liệu Google Doc!', 'error');
      return;
    }

    try {
      setIsCreating(true);
      const activeToken = await ensureToken();
      if (!activeToken) {
        // User canceled login popup or closed window
        return;
      }

      let initialContent = '';
      if (newDocTemplate === 'INVENTORY') {
        const filtered = selectedCategory === 'ALL' 
          ? inventory 
          : inventory.filter(item => item.category === selectedCategory);
        const res = await exportInventoryReportToGoogleDoc(activeToken, filtered, {
          currentUsername,
          categoryFilter: selectedCategory,
          reportDate: new Date().toLocaleDateString('vi-VN')
        });
        onAddToast(`Đã tạo Google Doc "${res.title}" thành công!`, 'success');
        window.open(res.webViewLink, '_blank');
      } else if (newDocTemplate === 'INCIDENT') {
        initialContent = 
`TỔNG CÔNG TY QUẢN LÝ BAY VIỆT NAM
CÔNG TY QUẢN LÝ BAY MIỀN NAM - TRUNG TÂM BẢO ĐẢM KỸ THUẬT
ĐỘI THÔNG TIN (CNS/ATM)
------------------------------------------------------------
BIÊN BẢN XỬ LÝ SỰ CỐ & THAY THẾ VẬT TƯ DỰ PHÒNG TẠI CHỖ

1. Thời gian ghi nhận sự cố: ${new Date().toLocaleString('vi-VN')}
2. Địa điểm / Đài trạm: ................................................................
3. Hệ thống bị ảnh hưởng: .............................................................
4. Mô tả hiện tượng sự cố:
...........................................................................................
5. Phương án xử lý & Vật tư dự phòng thay thế:
- Thiết bị thay thế: ...................................................................
- Serial Number (S/N): .................................................................
- Part Number (P/N): ...................................................................
6. Kết quả sau khi thay thế:
- Tình trạng hoạt động: [ ] Bình thường   [ ] Cần theo dõi thêm
7. Kỹ sư thực hiện: ${currentUsername}
`;
        const res = await createBlankGoogleDoc(activeToken, newDocTitle.trim(), initialContent);
        onAddToast(`Đã tạo Google Doc "${res.title}" thành công!`, 'success');
        window.open(res.webViewLink, '_blank');
      } else {
        const res = await createBlankGoogleDoc(activeToken, newDocTitle.trim(), '');
        onAddToast(`Đã tạo Google Doc "${res.title}" thành công!`, 'success');
        window.open(res.webViewLink, '_blank');
      }

      setNewDocTitle('');
      setNewDocTemplate('BLANK');
      await loadDocs(activeToken);
    } catch (err: any) {
      console.error('Lỗi tạo Google Doc:', err);
      onAddToast(err.message || 'Lỗi khi tạo Google Doc', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreviewDoc = async (docFile: GoogleDocFile) => {
    try {
      setIsLoadingPreview(true);
      setSelectedDocPreview(null);
      const activeToken = await ensureToken();
      if (activeToken) {
        const content = await getGoogleDocContent(activeToken, docFile.id);
        setSelectedDocPreview(content);
      }
    } catch (err: any) {
      console.error('Lỗi đọc nội dung Google Doc:', err);
      onAddToast('Không thể tải bản xem trước tài liệu.', 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExportQuickInventoryDoc = async () => {
    try {
      setIsCreating(true);
      const activeToken = await ensureToken();
      if (!activeToken) return;

      const filtered = selectedCategory === 'ALL' 
        ? inventory 
        : inventory.filter(item => item.category === selectedCategory);

      onAddToast(`Đang tạo Google Doc cho ${filtered.length} thiết bị...`, 'info');
      const res = await exportInventoryReportToGoogleDoc(activeToken, filtered, {
        currentUsername,
        categoryFilter: selectedCategory,
        reportDate: new Date().toLocaleDateString('vi-VN')
      });
      onAddToast(`Đã xuất báo cáo thành công sang Google Docs: "${res.title}"`, 'success');
      window.open(res.webViewLink, '_blank');
      await loadDocs(activeToken);
    } catch (err: any) {
      console.error('Lỗi xuất Google Doc:', err);
      onAddToast(err.message || 'Lỗi xuất Google Doc', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const executeDeleteDoc = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const activeToken = await ensureToken();
      if (activeToken) {
        await deleteGoogleDoc(activeToken, deleteTarget.id);
        onAddToast(`Đã xóa tệp "${deleteTarget.name}" khỏi Google Drive!`, 'success');
        setDeleteTarget(null);
        if (selectedDocPreview?.documentId === deleteTarget.id) {
          setSelectedDocPreview(null);
        }
        await loadDocs(activeToken);
      }
    } catch (err: any) {
      console.error('Lỗi xóa Google Doc:', err);
      onAddToast(err.message || 'Không thể xóa tài liệu', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 w-full max-w-5xl relative max-h-[90vh] overflow-y-auto my-6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/60 dark:border-blue-800/60 shadow-sm">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  Quản lý Tài liệu Google Docs
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Google Workspace
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Tạo, chỉnh sửa văn bản, xuất biên bản và báo cáo trực tiếp vào Google Docs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 max-w-[140px] sm:max-w-[200px] truncate">
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 text-emerald-700 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                  title="Đăng xuất Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Đang kết nối...' : 'Đăng nhập Google'}</span>
              </button>
            )}

            <button
              onClick={() => loadDocs()}
              disabled={isLoading || !token}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!currentUser && (
          <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Chưa kết nối tài khoản Google Workspace. Đăng nhập để tự động lưu & đồng bộ tài liệu Google Docs trực tiếp vào Google Drive.</span>
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shrink-0 transition-all cursor-pointer"
            >
              {isLoggingIn ? 'Đang mở...' : 'Đăng Nhập Ngay'}
            </button>
          </div>
        )}

        {/* Quick Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Xuất nhanh tồn kho</span>
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Tạo Google Doc danh mục {inventory.length} thiết bị đang quản lý
            </p>
            <button
              onClick={handleExportQuickInventoryDoc}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isCreating ? 'Đang xuất...' : 'Xuất Báo Cáo Google Doc'}
            </button>
          </div>

          <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              Tạo tài liệu Google Doc mới
            </span>
            <form onSubmit={handleCreateDoc} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Nhập tiêu đề tài liệu..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newDocTemplate}
                onChange={(e) => setNewDocTemplate(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BLANK">Tài liệu trắng</option>
                <option value="INVENTORY">Mẫu Báo cáo Tồn kho</option>
                <option value="INCIDENT">Mẫu Biên bản Sự cố</option>
              </select>
              <button
                type="submit"
                disabled={isCreating || !newDocTitle.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Đang tạo...' : 'Tạo Doc'}
              </button>
            </form>
          </div>
        </div>

        {/* Content Layout: Left list / Right preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[360px]">
          
          {/* Docs List */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Danh sách tài liệu ({docsList.length})
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Thư mục Google Drive QLVT_Backup
              </span>
            </div>

            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40 p-2 space-y-2 max-h-[380px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2 text-blue-500" />
                  <span className="text-xs">Đang đồng bộ Google Docs...</span>
                </div>
              ) : docsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mb-2 opacity-30 text-blue-500" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có tài liệu Google Doc nào</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Tạo tài liệu mới hoặc xuất báo cáo kho sang Google Docs để bắt đầu làm việc trực tuyến.
                  </p>
                </div>
              ) : (
                docsList.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center justify-between group shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span>{doc.modifiedTime ? new Date(doc.modifiedTime).toLocaleDateString('vi-VN') : 'Gần đây'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePreviewDoc(doc)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                        title="Xem trước nội dung"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={doc.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors flex items-center gap-1"
                        title="Mở trong Google Docs"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Preview Panel */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Xem trước nội dung
              </span>
              {selectedDocPreview && (
                <a
                  href={`https://docs.google.com/document/d/${selectedDocPreview.documentId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Mở Google Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 overflow-y-auto max-h-[380px] font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <RefreshCw className="w-5 h-5 animate-spin mb-2 text-blue-500" />
                  <span>Đang tải nội dung văn bản...</span>
                </div>
              ) : selectedDocPreview ? (
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 font-sans">
                    {selectedDocPreview.title}
                  </h3>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 dark:text-slate-200">
                    {selectedDocPreview.bodyText || '(Tài liệu trống)'}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-12">
                  <Eye className="w-8 h-8 mb-2 opacity-30 text-blue-400" />
                  <p className="text-xs text-slate-500">Chọn một tài liệu bên trái để xem nhanh văn bản</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Explicit Confirmation Dialog for Deleting Google Doc (Skill Requirement) */}
        {deleteTarget && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa tài liệu Google Doc
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Bạn có chắc chắn muốn xóa tài liệu <strong className="text-slate-900 dark:text-white">"{deleteTarget.name}"</strong> khỏi Google Drive? Hành động này sẽ loại bỏ tệp vĩnh viễn hoặc chuyển vào thùng rác Google Drive.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDeleteDoc}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
