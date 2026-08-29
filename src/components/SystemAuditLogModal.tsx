import React from 'react';
import { SystemAuditLogEntry, Role } from '../types.ts';
import { SystemAuditLogView } from './SystemAuditLogView.tsx';

interface SystemAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SystemAuditLogEntry[];
  role: Role;
  currentUsername: string;
  onClearLogs?: () => void;
  onAddToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SystemAuditLogModal: React.FC<SystemAuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  role,
  currentUsername,
  onClearLogs,
  onAddToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[90000] p-2 sm:p-4 md:p-6">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col animate-scale-in">
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <SystemAuditLogView
            logs={logs}
            role={role}
            currentUsername={currentUsername}
            onClearLogs={onClearLogs}
            onAddToast={onAddToast}
            onClose={onClose}
            isModalMode={true}
          />
        </div>
      </div>
    </div>
  );
};
