import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Key,
  Lock,
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  X,
  Check,
  RotateCcw,
  Clock,
  Database,
  Layers,
  Save,
  AlertTriangle,
  History,
  Trash2,
  DownloadCloud,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Edit3,
  Search,
  Plus,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { InventoryItem, AdminSnapshot, UserAccount, Role } from '../types.ts';
import { playScanBeep } from '../utils/audio.ts';

interface AdminAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onRestoreSnapshot: (items: InventoryItem[]) => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onLogout: () => void;
  users: UserAccount[];
  onUpdateUsers: (newUsers: UserAccount[]) => void;
  currentUsername: string;
}

export const AdminAccountModal: React.FC<AdminAccountModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onRestoreSnapshot,
  onAddToast,
  onLogout,
  users,
  onUpdateUsers,
  currentUsername
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'USERS' | 'CREDENTIALS' | 'PERMISSIONS' | 'SNAPSHOTS' | 'SECURITY'>('USERS');

  // User management state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'admin' | 'guest'>('ALL');
  
  // User creation/editing modal form
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null); // null = new user, string = edit
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<Role>('guest');
  const [formStatus, setFormStatus] = useState<'active' | 'locked'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Self password management state (for current logged-in admin)
  const [currentAdminPassInput, setCurrentAdminPassInput] = useState('');
  const [newAdminPassInput, setNewAdminPassInput] = useState('');
  const [confirmAdminPassInput, setConfirmAdminPassInput] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Admin display name & security state
  const [adminName, setAdminName] = useState(() => {
    return localStorage.getItem('cns_admin_name') || 'Trưởng ca Kỹ thuật CNS';
  });
  const [autoLockMin, setAutoLockMin] = useState(() => {
    return Number(localStorage.getItem('cns_admin_autolock') || '0');
  });

  // Snapshots state
  const [snapshots, setSnapshots] = useState<AdminSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('cns_admin_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newSnapshotName, setNewSnapshotName] = useState('');

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const q = userSearchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      (u.notes && u.notes.toLowerCase().includes(q));
    return matchRole && matchSearch;
  });

  // Open form to create new user
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setFormUsername('');
    setFormFullName('');
    setFormPassword('');
    setFormRole('guest');
    setFormStatus('active');
    setFormNotes('');
    setShowFormPassword(false);
    setIsEditingUser(true);
  };

  // Open form to edit user
  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUserId(user.id);
    setFormUsername(user.username);
    setFormFullName(user.fullName);
    setFormPassword(user.password);
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormNotes(user.notes || '');
    setShowFormPassword(false);
    setIsEditingUser(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = formUsername.toLowerCase().trim();
    const trimmedFullName = formFullName.trim();
    const trimmedPass = formPassword.trim();

    if (!trimmedUsername) {
      onAddToast('Vui lòng nhập tên đăng nhập (Username)!', 'error');
      return;
    }

    if (!trimmedFullName) {
      onAddToast('Vui lòng nhập họ và tên người dùng!', 'error');
      return;
    }

    if (!trimmedPass || trimmedPass.length < 3) {
      onAddToast('Mật khẩu phải có tối thiểu 3 ký tự!', 'error');
      return;
    }

    if (editingUserId === null) {
      // Create new user: check unique username
      if (users.some(u => u.username.toLowerCase() === trimmedUsername)) {
        onAddToast(`Tên đăng nhập "${trimmedUsername}" đã tồn tại! Vui lòng chọn tên khác.`, 'error');
        playScanBeep(300, 0.2);
        return;
      }

      const newUser: UserAccount = {
        id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: trimmedUsername,
        fullName: trimmedFullName,
        password: trimmedPass,
        role: formRole,
        status: formStatus,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        notes: formNotes.trim() || undefined
      };

      const updatedUsers = [...users, newUser];
      onUpdateUsers(updatedUsers);
      setIsEditingUser(false);
      onAddToast(`Đã thêm thành công người dùng "${trimmedFullName}" (${trimmedUsername})!`, 'success');
      playScanBeep(1000, 0.15);
    } else {
      // Edit existing user
      // Check username collision with others
      if (users.some(u => u.id !== editingUserId && u.username.toLowerCase() === trimmedUsername)) {
        onAddToast(`Tên đăng nhập "${trimmedUsername}" đã được tài khoản khác sử dụng!`, 'error');
        playScanBeep(300, 0.2);
        return;
      }

      const updatedUsers = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            username: trimmedUsername,
            fullName: trimmedFullName,
            password: trimmedPass,
            role: formRole,
            status: formStatus,
            notes: formNotes.trim() || undefined
          };
        }
        return u;
      });

      onUpdateUsers(updatedUsers);
      setIsEditingUser(false);
      onAddToast(`Đã cập nhật thông tin tài khoản "${trimmedFullName}"!`, 'success');
      playScanBeep(1000, 0.15);
    }
  };

  // Toggle user lock status
  const handleToggleLockUser = (user: UserAccount) => {
    if (user.username.toLowerCase() === 'admin' && user.status === 'active') {
      onAddToast('Không thể khóa tài khoản Quản trị viên chính (admin)!', 'error');
      playScanBeep(300, 0.2);
      return;
    }

    if (user.username.toLowerCase() === currentUsername.toLowerCase() && user.status === 'active') {
      onAddToast('Bạn không thể tự khóa tài khoản đang đăng nhập của chính mình!', 'error');
      playScanBeep(300, 0.2);
      return;
    }

    const nextStatus = user.status === 'active' ? 'locked' : 'active';
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, status: nextStatus } : u);
    onUpdateUsers(updatedUsers);
    onAddToast(
      nextStatus === 'locked'
        ? `Đã khóa tài khoản "${user.username}". Người này sẽ không thể đăng nhập!`
        : `Đã mở khóa tài khoản "${user.username}" thành công!`,
      nextStatus === 'locked' ? 'info' : 'success'
    );
    playScanBeep(nextStatus === 'locked' ? 400 : 900, 0.15);
  };

  // Delete user
  const handleDeleteUser = (user: UserAccount) => {
    if (user.username.toLowerCase() === 'admin') {
      onAddToast('Không thể xóa tài khoản Quản trị viên hệ thống mặc định (admin)!', 'error');
      playScanBeep(300, 0.25);
      return;
    }

    if (user.username.toLowerCase() === currentUsername.toLowerCase()) {
      onAddToast('Không thể xóa tài khoản bạn đang trực tiếp đăng nhập!', 'error');
      playScanBeep(300, 0.25);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.fullName}" (@${user.username}) khỏi hệ thống?`)) {
      const updatedUsers = users.filter(u => u.id !== user.id);
      onUpdateUsers(updatedUsers);
      onAddToast(`Đã xóa vĩnh viễn tài khoản @${user.username}.`, 'info');
      playScanBeep(600, 0.15);
    }
  };

  // Reset user password to quick default
  const handleResetUserPassword = (user: UserAccount) => {
    const defaultPass = user.role === 'admin' ? 'admin' : '123456';
    if (window.confirm(`Đặt lại mật khẩu cho tài khoản "${user.username}" về mặc định "${defaultPass}"?`)) {
      const updatedUsers = users.map(u => u.id === user.id ? { ...u, password: defaultPass } : u);
      onUpdateUsers(updatedUsers);
      onAddToast(`Đã đặt lại mật khẩu cho @${user.username} thành "${defaultPass}"`, 'success');
      playScanBeep(1000, 0.15);
    }
  };

  // Handle Self Admin Password Change
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentAdminUser = users.find(u => u.username.toLowerCase() === currentUsername.toLowerCase()) ||
      users.find(u => u.username.toLowerCase() === 'admin');

    const actualPass = currentAdminUser ? currentAdminUser.password : (localStorage.getItem('cns_admin_password') || 'admin');

    if (currentAdminPassInput !== actualPass) {
      onAddToast('Mật khẩu hiện tại không chính xác!', 'error');
      playScanBeep(300, 0.25);
      return;
    }

    if (newAdminPassInput.length < 3) {
      onAddToast('Mật khẩu mới phải có tối thiểu 3 ký tự.', 'error');
      return;
    }

    if (newAdminPassInput !== confirmAdminPassInput) {
      onAddToast('Mật khẩu xác nhận không khớp!', 'error');
      return;
    }

    // Update in users list
    const updatedUsers = users.map(u => {
      if (u.username.toLowerCase() === (currentAdminUser ? currentAdminUser.username.toLowerCase() : 'admin')) {
        return { ...u, password: newAdminPassInput };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
    localStorage.setItem('cns_admin_password', newAdminPassInput);

    setCurrentAdminPassInput('');
    setNewAdminPassInput('');
    setConfirmAdminPassInput('');
    onAddToast('Đã nâng cấp và đổi mật khẩu Admin thành công!', 'success');
    playScanBeep(1000, 0.2);
  };

  // Save Display Name
  const handleSaveProfile = () => {
    localStorage.setItem('cns_admin_name', adminName.trim());
    // Also update current admin's full name in users list
    const updatedUsers = users.map(u => {
      if (u.username.toLowerCase() === currentUsername.toLowerCase() || u.username.toLowerCase() === 'admin') {
        return { ...u, fullName: adminName.trim() };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
    onAddToast('Đã cập nhật thông tin hồ sơ Admin thành công!', 'success');
    playScanBeep(1000, 0.12);
  };

  // Snapshot Management
  const handleCreateSnapshot = () => {
    const title = newSnapshotName.trim() || `Bản sao lưu ${new Date().toLocaleTimeString('vi-VN')} (${inventory.length} thiết bị)`;
    const newSnap: AdminSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      name: title,
      itemCount: inventory.length,
      data: JSON.parse(JSON.stringify(inventory))
    };
    const nextSnapshots = [newSnap, ...snapshots.slice(0, 7)]; // Keep max 8
    setSnapshots(nextSnapshots);
    localStorage.setItem('cns_admin_snapshots', JSON.stringify(nextSnapshots));
    setNewSnapshotName('');
    onAddToast(`Đã tạo bản Snapshot dự phòng: "${title}"`, 'success');
    playScanBeep(1100, 0.18);
  };

  const handleApplySnapshot = (snap: AdminSnapshot) => {
    if (window.confirm(`Xác nhận khôi phục cơ sở dữ liệu về bản Snapshot "${snap.name}" (${snap.itemCount} thiết bị - thời điểm ${snap.timestamp})?`)) {
      onRestoreSnapshot(snap.data);
      onAddToast(`Đã khôi phục thành công từ Snapshot "${snap.name}"!`, 'success');
      playScanBeep(1000, 0.2);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const next = snapshots.filter(s => s.id !== id);
    setSnapshots(next);
    localStorage.setItem('cns_admin_snapshots', JSON.stringify(next));
    onAddToast('Đã xóa bản Snapshot.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[80000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl w-full max-w-2xl border border-slate-150 dark:border-slate-800 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent dark:from-amber-950/30 dark:via-indigo-950/30 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Trung Tâm Quản Trị Hệ Thống
                </h3>
                <span className="text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Thêm bớt người dùng, quản trị phân quyền, mật khẩu & Snapshot an toàn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3.5 pb-1 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-150 dark:border-slate-800 flex gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab('USERS');
              setIsEditingUser(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'USERS'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Quản Trị Người Dùng ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREDENTIALS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'CREDENTIALS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Hồ Sơ & Đổi Mật Khẩu Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'PERMISSIONS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Phân Quyền</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SNAPSHOTS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'SNAPSHOTS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Snapshot ({snapshots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'SECURITY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bảo Mật</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* ======================================================== */}
          {/* TAB 1: USER MANAGEMENT (ADD, EDIT, DELETE, LOCK USERS)   */}
          {/* ======================================================== */}
          {activeTab === 'USERS' && (
            <div className="space-y-4 animate-fade-in">
              {/* If editing or creating a user */}
              {isEditingUser ? (
                <form onSubmit={handleSaveUser} className="p-5 bg-gradient-to-br from-amber-500/5 via-slate-50 to-indigo-50/20 dark:from-amber-950/20 dark:via-slate-800/60 dark:to-indigo-950/20 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500 text-white">
                        {editingUserId ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {editingUserId ? 'Chỉnh Sửa Thông Tin Người Dùng' : 'Thêm Tài Khoản Người Dùng Mới'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingUser(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        Tên đăng nhập (Username) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="VD: kisu_cns, truongca2..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        Họ và tên người dùng *
                      </label>
                      <input
                        type="text"
                        required
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="VD: Nguyễn Văn A (Trực ban CNS)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                          Mật khẩu đăng nhập *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(!showFormPassword)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold"
                        >
                          {showFormPassword ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Tối thiểu 3 ký tự"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        Vai trò & Phân quyền *
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as Role)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="guest">Kiểm kê viên / Guest (Chỉ quét mã & xem kho)</option>
                        <option value="admin">Quản trị viên / Admin (Toàn quyền quản lý kho & user)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        Trạng thái tài khoản *
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'active' | 'locked')}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="active">🟢 Đang hoạt động (Active)</option>
                        <option value="locked">🔴 Khóa truy cập (Locked)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        Ghi chú phòng ban / chức vụ
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="VD: Ca trực đêm / Đội Thông tin..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setIsEditingUser(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingUserId ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Action Bar: Search, Filter, Add User */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                    <div className="flex-1 flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Tìm theo tên, username, ghi chú..."
                          className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-medium outline-none focus:border-amber-500"
                        />
                      </div>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value as any)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="ALL">Tất cả vai trò</option>
                        <option value="admin">Chỉ Admin</option>
                        <option value="guest">Chỉ Kiểm kê viên</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddUser}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-amber-600/20 flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Thêm Người Dùng</span>
                    </button>
                  </div>

                  {/* Users List Cards */}
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-1">
                        <p className="font-bold">Không tìm thấy người dùng phù hợp.</p>
                        <p className="text-[11px]">Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "+ Thêm Người Dùng" ở trên.</p>
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isMainAdmin = u.username.toLowerCase() === 'admin';
                        const isCurrentActive = u.username.toLowerCase() === currentUsername.toLowerCase();
                        const isLocked = u.status === 'locked';

                        return (
                          <div
                            key={u.id}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              isLocked
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-75'
                                : u.role === 'admin'
                                ? 'bg-gradient-to-r from-amber-50/60 to-white dark:from-amber-950/30 dark:to-slate-800/60 border-amber-200/80 dark:border-amber-900/50'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
                            }`}
                          >
                            {/* User details */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm ${
                                  isLocked
                                    ? 'bg-rose-500'
                                    : u.role === 'admin'
                                    ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                                    : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
                                }`}
                              >
                                {u.role === 'admin' ? <Crown className="w-5 h-5" /> : <User className="w-5 h-5" />}
                              </div>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                    {u.fullName}
                                  </h4>
                                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/80 px-1.5 py-0.2 rounded-md">
                                    @{u.username}
                                  </span>
                                  {u.role === 'admin' ? (
                                    <span className="text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded-md">
                                      ADMIN
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded-md">
                                      KIỂM KÊ VIÊN
                                    </span>
                                  )}

                                  {isLocked ? (
                                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5" /> ĐÃ KHÓA
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded-md">
                                      Hoạt động
                                    </span>
                                  )}

                                  {isCurrentActive && (
                                    <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-950 px-1.5 py-0.2 rounded-md">
                                      (Bạn)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-[10.5px] text-slate-400">
                                  {u.notes && (
                                    <span className="truncate max-w-xs italic text-slate-500 dark:text-slate-300">
                                      "{u.notes}"
                                    </span>
                                  )}
                                  <span>Ngày tạo: {u.createdAt || 'N/A'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-500">Pass: ••••••</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                title="Sửa thông tin tài khoản"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResetUserPassword(u)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                title="Đặt lại mật khẩu mặc định"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleLockUser(u)}
                                disabled={isMainAdmin}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 ${
                                  isLocked
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                }`}
                                title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản này'}
                              >
                                {isLocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>

                              {!isMainAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="Xóa tài khoản vĩnh viễn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SELF ADMIN PROFILE & PASSWORD                     */}
          {/* ======================================================== */}
          {activeTab === 'CREDENTIALS' && (
            <div className="space-y-5 animate-fade-in">
              {/* Profile Card */}
              <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white dark:from-amber-950/30 dark:via-slate-900/60 dark:to-slate-800/60 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20">
                    AD
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      {adminName}
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tên đăng nhập: <strong className="text-slate-800 dark:text-slate-200 font-mono">{currentUsername || 'admin'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-xl">
                    Quyền hạn: Cấp cao nhất (Level 1)
                  </span>
                </div>
              </div>

              {/* Edit Admin Display Name */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-2.5">
                <label className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">
                  Tên hiển thị Quản trị viên
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="VD: Trưởng ca CNS / Nguyễn Văn A"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu
                  </button>
                </div>
              </div>

              {/* Change Admin Password */}
              <form onSubmit={handleChangeAdminPassword} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Đổi mật khẩu tài khoản Admin
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showAdminPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showAdminPass ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Mật khẩu Admin hiện tại *
                    </label>
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      value={currentAdminPassInput}
                      onChange={(e) => setCurrentAdminPassInput(e.target.value)}
                      placeholder="Mật khẩu hiện tại (Mặc định: admin)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Mật khẩu mới *
                      </label>
                      <input
                        type={showAdminPass ? 'text' : 'password'}
                        required
                        value={newAdminPassInput}
                        onChange={(e) => setNewAdminPassInput(e.target.value)}
                        placeholder="Tối thiểu 3 ký tự"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Xác nhận mật khẩu mới *
                      </label>
                      <input
                        type={showAdminPass ? 'text' : 'password'}
                        required
                        value={confirmAdminPassInput}
                        onChange={(e) => setConfirmAdminPassInput(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm shadow-amber-600/20 flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Cập Nhật Mật Khẩu Admin
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: PERMISSIONS MATRIX                                */}
          {/* ======================================================== */}
          {activeTab === 'PERMISSIONS' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/40 rounded-2xl">
                <span className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-400 tracking-wider block mb-1">
                  Đặc quyền bảo mật & Hệ thống phân cấp:
                </span>
                <p className="text-[11.5px] text-indigo-750 dark:text-indigo-350 leading-relaxed">
                  Tài khoản Quản trị viên (Admin) có toàn quyền thêm/xóa/sửa người dùng, phân quyền, cấu trúc danh mục, sao lưu Snapshot và quản lý hệ thống.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3.5 py-2.5">Tính năng & Tác vụ</th>
                      <th className="px-3 py-2.5 text-center text-amber-600 dark:text-amber-400">ADMIN (Quản trị)</th>
                      <th className="px-3 py-2.5 text-center text-slate-400">GUEST (Kiểm kê)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Thêm, Xóa, Khóa & Quản lý User</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗ Khóa</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Thêm & Chỉnh sửa thông số thiết bị</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗ Khóa</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Xóa thiết bị khỏi cơ sở dữ liệu</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗ Khóa</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Reset toàn bộ trạng thái kiểm kê</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗ Khóa</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Quét mã QR kiểm kê & Cập nhật tình trạng</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓ Có</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Lập phiếu sử dụng & In biên bản bàn giao</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓ Có</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Đồng bộ Cloud Google Sheets (Push/Pull)</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓ Có</td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200 font-semibold">Tạo & Khôi phục Snapshot khẩn cấp</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 font-black">✓ Có</td>
                      <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗ Khóa</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SNAPSHOTS RESTORE                                 */}
          {/* ======================================================== */}
          {activeTab === 'SNAPSHOTS' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> Tạo bản Snapshot tức thì
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    Kho hiện có: <strong>{inventory.length} thiết bị</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Lưu lại trạng thái toàn bộ danh mục thiết bị tại thời điểm này. Nếu lỡ xóa hoặc cập nhật nhầm, bạn có thể khôi phục lại ngay tức thì.
                </p>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    placeholder="Đặt tên bản Snapshot (VD: Trước khi xuất kho đợt 1)..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    + Tạo Snapshot
                  </button>
                </div>
              </div>

              {/* Snapshots List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Các điểm khôi phục đã lưu ({snapshots.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Tối đa lưu trữ 8 điểm gần nhất</span>
                </div>

                {snapshots.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    Chưa có bản Snapshot nào. Bấm nút "Tạo Snapshot" ở trên để lưu điểm an toàn.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {snap.name}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-400" /> {snap.timestamp}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {snap.itemCount} thiết bị
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApplySnapshot(snap)}
                            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-900 flex items-center gap-1"
                            title="Khôi phục lại dữ liệu này"
                          >
                            <DownloadCloud className="w-3 h-3" />
                            Khôi phục
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Xóa bản snapshot này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: SESSION & SECURITY                                */}
          {/* ======================================================== */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Tự động khóa màn hình Admin
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                    {autoLockMin === 0 ? 'Tắt' : `${autoLockMin} phút`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tự động đăng xuất tài khoản Admin khi không có thao tác chuột hoặc bàn phím để đảm bảo an toàn thiết bị.
                </p>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { value: 0, label: 'Không khóa' },
                    { value: 15, label: '15 phút' },
                    { value: 30, label: '30 phút' },
                    { value: 60, label: '1 tiếng' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAutoLockMin(opt.value);
                        localStorage.setItem('cns_admin_autolock', String(opt.value));
                        onAddToast(`Đã đổi tự động khóa Admin: ${opt.label}`, 'info');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                        autoLockMin === opt.value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Session Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 space-y-2 text-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Thông tin phiên làm việc hiện tại:
                </span>
                <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span>Tài khoản hoạt động:</span>
                    <strong className="font-mono text-amber-600 dark:text-amber-400">@{currentUsername || 'admin'} (Super Administrator)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng số người dùng:</span>
                    <strong className="font-mono text-indigo-600 dark:text-indigo-400">{users.length} tài khoản</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Giao thức lưu trữ:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">LocalStorage v3.0 + Cloud WebApp</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái bảo mật:</span>
                    <strong className="text-slate-800 dark:text-slate-200">Đã kích hoạt bảo vệ chống mất dữ liệu</strong>
                  </div>
                </div>
              </div>

              {/* Logout Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer text-center border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đăng Xuất Tài Khoản Admin Ngay</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
