import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Mail, Send, Paperclip, CheckCircle2, AlertCircle, Loader2,
  FileText, Layers, User, Building2, ShieldCheck, ExternalLink,
  RefreshCw, AlertTriangle, Plus, Trash2, Check, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { InventoryItem, UsageSlip, DispatchedRecord, Role } from '../types.ts';
import {
  sendEmailViaGmail,
  openMailtoClient,
  PRESET_CONTACTS,
  PresetContact,
  EmailAttachment,
  SendEmailResult
} from '../services/gmailService.ts';
import { getAccessToken, googleSignIn } from '../services/authService.ts';
import {
  renderHtmlToPdfBlob,
  getHandoverHtml,
  getUsageSlipHtml,
  getDispatchedRegistryHtml,
  getAuditReportHtml,
  getInventoryReportHtml
} from '../utils/pdfExporter.ts';
import {
  getInventoryReportDocxDocument,
  getHandoverDocxDocument,
  getUsageSlipDocxDocument,
  getDispatchedRegistryDocxDocument,
  generateDocxBlob
} from '../utils/docxExporter.ts';

export type ReportType = 'INVENTORY_AUDIT' | 'HANDOVER' | 'USAGE_SLIP' | 'DISPATCHED_REGISTRY' | 'FULL_BACKUP';
export type AttachmentFormat = 'PDF' | 'DOCX' | 'BOTH';

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: ReportType;
  inventory: InventoryItem[];
  dispatchedRecords: DispatchedRecord[];
  usageSlips?: UsageSlip[];
  selectedHandover?: {
    meta: any;
    rows: any[];
  } | null;
  selectedHandoverData?: {
    meta: any;
    rows: any[];
  } | null;
  selectedUsageSlip?: UsageSlip | null;
  role: Role | null;
  currentUsername?: string;
  onAddToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const EmailReportModal: React.FC<EmailReportModalProps> = ({
  isOpen,
  onClose,
  defaultReportType = 'INVENTORY_AUDIT',
  inventory,
  dispatchedRecords,
  usageSlips = [],
  selectedHandover,
  selectedHandoverData,
  selectedUsageSlip,
  role,
  currentUsername = 'admin',
  onAddToast
}) => {
  const activeHandover = selectedHandover || selectedHandoverData || null;
  // Form State
  const [reportType, setReportType] = useState<ReportType>(defaultReportType);
  const [format, setFormat] = useState<AttachmentFormat>('PDF');
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [ccList, setCcList] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [includeSummaryTable, setIncludeSummaryTable] = useState(true);

  // Status & Progress
  const [status, setStatus] = useState<'IDLE' | 'GENERATING' | 'CONFIRMING' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusDetail, setStatusDetail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sentMessageId, setSentMessageId] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string>('');
  const [isAuthChecking, setIsAuthChecking] = useState(false);

  // Synchronize default report type when modal opens
  useEffect(() => {
    if (isOpen) {
      setReportType(defaultReportType);
      setStatus('IDLE');
      setErrorMessage('');
      setSentMessageId(null);
      
      // Check cached email if available
      const storedEmail = localStorage.getItem('cns_current_email') || 'TAILIEUTBTT@gmail.com';
      setGoogleUserEmail(storedEmail);

      // Default recipient if empty
      if (recipients.length === 0) {
        setRecipients([storedEmail || 'lanhdao.thongtin@cns.example.com']);
      }
    }
  }, [isOpen, defaultReportType]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (typeof onAddToast === 'function') {
      onAddToast(msg, type);
    }
  };

  // Add recipient helper
  const handleAddRecipient = (email: string) => {
    const trimmed = email.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients([...recipients, trimmed]);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter(r => r !== emailToRemove));
  };

  const handleAddCc = (email: string) => {
    const trimmed = email.trim();
    if (trimmed && !ccList.includes(trimmed)) {
      setCcList([...ccList, trimmed]);
      setCcInput('');
    }
  };

  const handleRemoveCc = (emailToRemove: string) => {
    setCcList(ccList.filter(c => c !== emailToRemove));
  };

  // Pre-calculated Subject
  const defaultSubject = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    switch (reportType) {
      case 'INVENTORY_AUDIT':
        return `[ĐỘI THÔNG TIN] Báo Cáo Kiểm Kê & Hiện Trạng Vật Tư Dự Phòng CNS/ATM - Ngày ${dateStr}`;
      case 'HANDOVER':
        return `[ĐỘI THÔNG TIN] Biên Bản Bàn Giao Thiết Bị Kỹ Thuật Hàng Không - ${selectedHandover?.meta?.handoverNo || 'BBBG'}`;
      case 'USAGE_SLIP':
        return `[ĐỘI THÔNG TIN] Phiếu Báo Sử Dụng Trang Thiết Bị Dự Phòng - ${selectedUsageSlip?.docNumber || 'PBSD'}`;
      case 'DISPATCHED_REGISTRY':
        return `[ĐỘI THÔNG TIN] Sổ Tổng Hợp Theo Dõi Thiết Bị Đã Bàn Giao & Đưa Vào Sử Dụng - Ngày ${dateStr}`;
      case 'FULL_BACKUP':
        return `[ĐỘI THÔNG TIN] Dữ Liệu Sao Lưu Kho Thiết Bị Hàng Không - Ngày ${dateStr}`;
      default:
        return `[ĐỘI THÔNG TIN] Báo Cáo Trang Thiết Bị CNS/ATM - ${dateStr}`;
    }
  }, [reportType, selectedHandover, selectedUsageSlip]);

  const activeSubject = customSubject.trim() || defaultSubject;

  // Compute Statistics for Summary
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const lowStockCount = inventory.filter(item => (Number(item.qty) || 0) <= 1).length;
    const okItems = inventory.filter(item => item.auditStatus === 'OK').length;
    const activeDeployed = dispatchedRecords.filter(r => r.status === 'DEPLOYED').length;
    return { totalItems, totalQty, lowStockCount, okItems, activeDeployed };
  }, [inventory, dispatchedRecords]);

  // Construct Email HTML Body
  const emailHtmlBody = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const sender = currentUsername ? `${currentUsername.toUpperCase()}` : 'Nhân viên Phụ trách Kho';

    let contentHtml = '';

    if (reportType === 'INVENTORY_AUDIT') {
      contentHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px;">
            📊 TỔNG HỢP HIỆN TRẠNG KHO VẬT TƯ DỰ PHÒNG
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #475569;">Tổng số mã danh mục:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${stats.totalItems} thiết bị/vật tư</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;">Tổng số lượng thực tế:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0f172a;">${stats.totalQty} cái/bộ</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;">Đã đối soát kiểm kê (OK):</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #16a34a;">${stats.okItems} / ${stats.totalItems} mã</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;">Cảnh báo mức dự phòng tối thiểu (≤ 1 bộ):</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: ${stats.lowStockCount > 0 ? '#dc2626' : '#16a34a'};">
                ${stats.lowStockCount} mã ${stats.lowStockCount > 0 ? '⚠️' : '✓'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;">Thiết bị đang bàn giao ngoài hệ thống:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2563eb;">${stats.activeDeployed} thiết bị</td>
            </tr>
          </table>
        </div>
      `;
    } else if (reportType === 'HANDOVER' && activeHandover) {
      const { meta, rows } = activeHandover;
      const rowsTable = rows.map((r, i) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold;">${r.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${r.unit || 'Cái'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold;">${r.qty}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace;">${r.sn || 'N/A'}</td>
        </tr>
      `).join('');

      contentHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px;">
            📑 THÔNG TIN BIÊN BẢN BÀN GIAO: ${meta.handoverNo || 'BBBG'}
          </h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Bên giao:</strong> ${meta.handoverGiverName} (${meta.handoverGiverDept})</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Bên nhận:</strong> ${meta.handoverReceiverName} (${meta.handoverReceiverDept})</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Lý do bàn giao:</strong> ${meta.handoverReason || 'Phục vụ nhiệm vụ vận hành kỹ thuật'}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
            <thead>
              <tr style="background-color: #e2e8f0; font-weight: bold;">
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">STT</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">Tên thiết bị</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">ĐVT</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">SL</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">S/N</th>
              </tr>
            </thead>
            <tbody>
              ${rowsTable}
            </tbody>
          </table>
        </div>
      `;
    } else if (reportType === 'USAGE_SLIP' && selectedUsageSlip) {
      contentHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px;">
            🎫 PHIẾU BÁO SỬ DỤNG VẬT TƯ: ${selectedUsageSlip.docNumber || 'PBSD'}
          </h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Thiết bị:</strong> ${selectedUsageSlip.itemName} (S/N: ${selectedUsageSlip.sn})</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Số lượng:</strong> ${selectedUsageSlip.qtyUsed} ${selectedUsageSlip.unit}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Người nhận:</strong> ${selectedUsageSlip.user} (${selectedUsageSlip.receiverDept || 'Tổ Vận Hành'})</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Vị trí lắp đặt:</strong> ${selectedUsageSlip.targetLocation || 'Đài trạm'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Mục đích:</strong> ${selectedUsageSlip.purpose}</p>
        </div>
      `;
    } else if (reportType === 'DISPATCHED_REGISTRY') {
      contentHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px;">
            📋 SỔ THEO DÕI THIẾT BỊ ĐÃ BÀN GIAO & ĐƯA VÀO SỬ DỤNG
          </h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Tổng số hồ sơ theo dõi:</strong> ${dispatchedRecords.length} bản ghi</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Thiết bị đang hoạt động:</strong> ${dispatchedRecords.filter(r => r.status === 'DEPLOYED').length} thiết bị</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Thiết bị đã hoàn kho:</strong> ${dispatchedRecords.filter(r => r.status === 'RETURNED').length} thiết bị</p>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; }
          .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px; }
          .subtitle { font-size: 13px; opacity: 0.9; margin: 0; }
          .body-content { padding: 20px 0; font-size: 14px; }
          .note-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CÔNG TY QUẢN LÝ BAY MIỀN NAM</div>
          <div class="subtitle">TRUNG TÂM BẢO ĐẢM KỸ THUẬT • ĐỘI THÔNG TIN</div>
        </div>
        
        <div class="body-content">
          <p>Kính gửi: <strong>Quý Lãnh đạo và các Bộ phận liên quan</strong>,</p>
          
          <p>Hệ thống Quản lý Vật tư Dự phòng Đội Thông Tin xin trân trọng gửi báo cáo kỹ thuật được trích xuất tự động vào hồi <strong>${timeStr} ngày ${dateStr}</strong>.</p>
          
          ${includeSummaryTable ? contentHtml : ''}

          ${customNote.trim() ? `<div class="note-box"><strong>Ghi chú bổ sung:</strong> ${customNote.trim()}</div>` : ''}

          <p>Tài liệu đính kèm chi tiết định dạng <strong>${format === 'BOTH' ? 'PDF & Word (.docx)' : format}</strong> đã được đính kèm trực tiếp trong thư này để phục vụ công tác lưu trữ, kiểm tra và ký duyệt.</p>

          <p style="margin-top: 24px;">Trân trọng,<br/>
          <strong>${sender}</strong><br/>
          Đội Thông Tin – Trung Tâm Bảo Đảm Kỹ Thuật CNS/ATM</p>
        </div>

        <div class="footer">
          Thư điện tử được tạo tự động từ Hệ thống Quản lý Trang thiết bị CNS/ATM • Xác thực số: CNS-SYS-${Date.now().toString(36).toUpperCase()}
        </div>
      </body>
      </html>
    `;
  }, [reportType, format, stats, activeHandover, selectedUsageSlip, customNote, includeSummaryTable, currentUsername, dispatchedRecords]);

  // Generate File Attachments
  const generateAttachments = async (): Promise<EmailAttachment[]> => {
    const attachments: EmailAttachment[] = [];
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/[\/\\]/g, '-');

    setStatusDetail('Đang kết xuất tài liệu PDF & Word...');

    try {
      if (reportType === 'INVENTORY_AUDIT') {
        const title = `BaoCao_KiemKe_TonKho_CNS_${dateStr}`;

        if (format === 'PDF' || format === 'BOTH') {
          const auditHtml = getInventoryReportHtml(inventory, {
            currentUsername,
            reportTitle: 'BÁO CÁO KIỂM KÊ TỒN KHO & HIỆN TRẠNG VẬT TƯ DỰ PHÒNG',
            reportDate: now.toLocaleDateString('vi-VN')
          });
          const pdfBlob = await renderHtmlToPdfBlob(auditHtml, true); // Landscape A4
          attachments.push({
            filename: `${title}.pdf`,
            contentType: 'application/pdf',
            data: pdfBlob
          });
        }

        if (format === 'DOCX' || format === 'BOTH') {
          const doc = getInventoryReportDocxDocument(inventory, {
            currentUsername,
            reportDate: now.toLocaleDateString('vi-VN')
          });
          const docxBlob = await generateDocxBlob(doc);
          attachments.push({
            filename: `${title}.docx`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: docxBlob
          });
        }
      } else if (reportType === 'HANDOVER') {
        const handoverMeta = activeHandover?.meta || {
          handoverNo: `BBBG-${now.getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
          handoverLocation: 'Kho Vật Tư Đội Thông Tin - Trung Tâm BĐKT',
          handoverDay: String(now.getDate()).padStart(2, '0'),
          handoverMonth: String(now.getMonth() + 1).padStart(2, '0'),
          handoverYear: String(now.getFullYear()),
          handoverReason: 'Bàn giao thiết bị kỹ thuật phục vụ vận hành',
          handoverGiverDept: 'Đội Thông Tin – Trung tâm BĐKT',
          handoverGiverName: currentUsername ? currentUsername.toUpperCase() : 'Nhân viên Phụ trách Kho',
          handoverGiverPos: 'Nhân viên Phụ trách Kho',
          handoverReceiverDept: 'Tổ Vận Hành CNS/ATM',
          handoverReceiverName: 'Kỹ Sư Trực Ban',
          handoverReceiverPos: 'Kỹ Sư Vận Hành'
        };
        const handoverRows = activeHandover?.rows || inventory.slice(0, 5).map(item => ({
          name: item.name,
          unit: 'Cái',
          qty: item.qty || 1,
          quality: 'Tốt (Mới 100%)',
          specs: item.pn || 'N/A',
          sn: item.sn,
          note: item.loc || ''
        }));

        const safeNo = (handoverMeta.handoverNo || 'BBBG').replace(/[\/\\]/g, '-');
        const title = `BienBan_BanGiao_${safeNo}_${dateStr}`;

        if (format === 'PDF' || format === 'BOTH') {
          const handoverHtml = getHandoverHtml(handoverMeta, handoverRows);
          const pdfBlob = await renderHtmlToPdfBlob(handoverHtml, false); // Portrait A4
          attachments.push({
            filename: `${title}.pdf`,
            contentType: 'application/pdf',
            data: pdfBlob
          });
        }

        if (format === 'DOCX' || format === 'BOTH') {
          const doc = getHandoverDocxDocument(handoverMeta, handoverRows);
          const docxBlob = await generateDocxBlob(doc);
          attachments.push({
            filename: `${title}.docx`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: docxBlob
          });
        }
      } else if (reportType === 'USAGE_SLIP') {
        const slip = selectedUsageSlip || (usageSlips.length > 0 ? usageSlips[usageSlips.length - 1] : {
          id: `PBS-${Date.now()}`,
          docNumber: `PBSD-${now.getFullYear()}/001`,
          date: now.toLocaleDateString('vi-VN'),
          time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          itemId: inventory[0]?.id || 'item-1',
          itemName: inventory[0]?.name || 'Module nguồn Switch Cisco',
          category: inventory[0]?.category || 'Vật tư CNS',
          sn: inventory[0]?.sn || 'SN-DEFAULT',
          qtyUsed: 1,
          unit: 'Cái',
          user: 'Kỹ sư Vận hành',
          targetLocation: 'MUX MP4100 VSAT',
          purpose: 'Thay thế dự phòng định kỳ',
          giverName: currentUsername,
          giverDept: 'Đội Thông Tin – Trung tâm BĐKT',
          receiverDept: 'Tổ Vận Hành CNS/ATM'
        } as UsageSlip);

        const safeNo = (slip.docNumber || `PBSD-${slip.id.slice(-4)}`).replace(/[\/\\]/g, '-');
        const title = `PhieuBaoSuDung_${safeNo}_${dateStr}`;

        if (format === 'PDF' || format === 'BOTH') {
          const slipHtml = getUsageSlipHtml(slip, currentUsername);
          const pdfBlob = await renderHtmlToPdfBlob(slipHtml, false); // Portrait A4
          attachments.push({
            filename: `${title}.pdf`,
            contentType: 'application/pdf',
            data: pdfBlob
          });
        }

        if (format === 'DOCX' || format === 'BOTH') {
          const doc = getUsageSlipDocxDocument(slip, currentUsername);
          const docxBlob = await generateDocxBlob(doc);
          attachments.push({
            filename: `${title}.docx`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: docxBlob
          });
        }
      } else if (reportType === 'DISPATCHED_REGISTRY') {
        const title = `SoTheoDoi_BanGiao_SuDung_${dateStr}`;

        if (format === 'PDF' || format === 'BOTH') {
          const registryHtml = getDispatchedRegistryHtml(dispatchedRecords, currentUsername);
          const pdfBlob = await renderHtmlToPdfBlob(registryHtml, true); // Landscape A4
          attachments.push({
            filename: `${title}.pdf`,
            contentType: 'application/pdf',
            data: pdfBlob
          });
        }

        if (format === 'DOCX' || format === 'BOTH') {
          const doc = getDispatchedRegistryDocxDocument(dispatchedRecords, currentUsername);
          const docxBlob = await generateDocxBlob(doc);
          attachments.push({
            filename: `${title}.docx`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: docxBlob
          });
        }
      } else if (reportType === 'FULL_BACKUP') {
        const backupData = {
          exportDate: new Date().toISOString(),
          version: '3.6-enterprise',
          inventory,
          dispatchedRecords,
          usageSlips,
          stats
        };
        const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        attachments.push({
          filename: `CNS_Backup_Data_${dateStr}.json`,
          contentType: 'application/json',
          data: jsonBlob
        });

        // Also attach Inventory PDF summary for convenience
        const summaryHtml = getInventoryReportHtml(inventory, {
          currentUsername,
          reportTitle: 'BÁO CÁO SAO LƯU TỒN KHO & HIỆN TRẠNG THIẾT BỊ',
          reportDate: now.toLocaleDateString('vi-VN')
        });
        const summaryPdfBlob = await renderHtmlToPdfBlob(summaryHtml, true);
        attachments.push({
          filename: `BaoCao_TongHop_DinhKem_${dateStr}.pdf`,
          contentType: 'application/pdf',
          data: summaryPdfBlob
        });
      }

      return attachments;
    } catch (err) {
      console.error('Lỗi khi tạo tệp đính kèm email:', err);
      throw new Error('Không thể khởi tạo tệp đính kèm báo cáo. Chi tiết: ' + (err as any)?.message);
    }
  };

  // Trigger Confirmation Step
  const handleProceedToConfirm = () => {
    if (recipients.length === 0) {
      showToast('Vui lòng nhập ít nhất một địa chỉ email người nhận!', 'error');
      return;
    }
    setStatus('CONFIRMING');
  };

  // Perform Final Send
  const handleSendEmail = async () => {
    setStatus('SENDING');
    setStatusDetail('Đang chuẩn bị tệp đính kèm và gửi email qua Gmail...');
    setErrorMessage('');

    try {
      // 1. Build attachments
      const attachments = await generateAttachments();

      setStatusDetail(`Đang kết nối Gmail API gửi đến ${recipients.join(', ')}...`);

      // 2. Call Gmail API
      const result = await sendEmailViaGmail({
        to: recipients,
        cc: ccList.length > 0 ? ccList : undefined,
        subject: activeSubject,
        bodyHtml: emailHtmlBody,
        bodyText: `Báo cáo Đội Thông Tin - Ngày ${new Date().toLocaleDateString('vi-VN')}`,
        attachments: attachments.length > 0 ? attachments : undefined,
        senderName: `Đội Thông Tin (${currentUsername})`
      });

      if (result.success) {
        setStatus('SUCCESS');
        setSentMessageId(result.messageId || 'SENT_OK');
        showToast(`Đã gửi email báo cáo thành công đến ${recipients.join(', ')}!`, 'success');
      } else {
        setStatus('ERROR');
        setErrorMessage(result.error || 'Lỗi không xác định khi gửi email.');
        showToast(result.error || 'Gửi email thất bại!', 'error');
      }
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMessage(err.message || 'Lỗi xử lý khi gửi thư.');
      showToast('Lỗi gửi email: ' + err.message, 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[95000] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131B2E] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto animate-scale-in">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Gửi Email Báo Cáo Kỹ Thuật
                <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-white/20 text-white rounded-full border border-white/20">
                  Gmail API
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Tự động kết xuất biểu mẫu, đính kèm PDF/Word & gửi báo cáo trực tiếp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto custom-scrollbar space-y-5">
          
          {/* SUCCESS STATE */}
          {status === 'SUCCESS' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Đã Gửi Email Báo Cáo Thành Công!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Email đã được gửi trực tiếp từ hộp thư Gmail với đầy đủ nội dung tóm tắt và tệp đính kèm.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left max-w-lg mx-auto text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Người nhận:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{recipients.join(', ')}</span>
                </div>
                {ccList.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đồng kính gửi (Cc):</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{ccList.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiêu đề:</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[280px]">{activeSubject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Định dạng tệp:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{format === 'BOTH' ? 'PDF + Word (.docx)' : format}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <a
                  href="https://mail.google.com/mail/u/0/#sent"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Xem trong Hộp thư gửi Gmail
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 text-xs font-bold transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          )}

          {/* CONFIRMATION STATE (Workspace Compliance Requirement) */}
          {status === 'CONFIRMING' && (
            <div className="space-y-4 animate-scale-in">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-1">
                    Xác nhận gửi thư qua tài khoản Gmail
                  </h4>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Hệ thống sẽ gửi email chính thức đại diện cho Đội Thông Tin kèm theo các tài liệu kỹ thuật được chọn. Vui lòng xác nhận thông tin trước khi thực hiện.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Người gửi:</span>
                  <span className="sm:col-span-2 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Kỹ sư {currentUsername.toUpperCase()} (Tài khoản Google đang đăng nhập)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Danh sách nhận (To):</span>
                  <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                    {recipients.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300 font-mono text-[11px] rounded-lg font-bold">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {ccList.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Đồng kính gửi (Cc):</span>
                    <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                      {ccList.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] rounded-lg font-bold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Tiêu đề thư:</span>
                  <span className="sm:col-span-2 font-black text-slate-900 dark:text-white">
                    {activeSubject}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <span className="text-slate-500">Tệp đính kèm:</span>
                  <span className="sm:col-span-2 font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    {format === 'BOTH' ? 'Báo cáo PDF chuẩn A4 + Bản Word (.docx)' : `Báo cáo chuẩn ${format}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatus('IDLE')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Quay lại chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Xác nhận gửi ngay
                </button>
              </div>
            </div>
          )}

          {/* SENDING / ERROR STATE */}
          {(status === 'SENDING' || status === 'GENERATING') && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Đang tiến hành gửi email báo cáo...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {statusDetail || 'Đang tạo tệp đính kèm và mã hóa dữ liệu theo chuẩn RFC 2822...'}
                </p>
              </div>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs flex-1">
                <h4 className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider mb-1">
                  Gửi email không thành công
                </h4>
                <p className="text-rose-800 dark:text-rose-300/90 leading-relaxed mb-3">
                  {errorMessage}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('IDLE');
                      setErrorMessage('');
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    Thử lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openMailtoClient({
                        to: recipients.join(','),
                        subject: activeSubject,
                        body: `Báo cáo vật tư Đội Thông Tin - Xem chi tiết trên hệ thống CNS.`
                      });
                    }}
                    className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    Mở ứng dụng Mail (mailto)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDITING & COMPOSITION FORM (IDLE) */}
          {status === 'IDLE' && (
            <div className="space-y-5">
              
              {/* 1. Report Type Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Chọn loại báo cáo kỹ thuật cần gửi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReportType('INVENTORY_AUDIT')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      reportType === 'INVENTORY_AUDIT'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Báo Cáo Tồn Kho & Kiểm Kê</span>
                        {reportType === 'INVENTORY_AUDIT' && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {inventory.length} mã vật tư ({stats.totalQty} cái/bộ)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType('DISPATCHED_REGISTRY')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      reportType === 'DISPATCHED_REGISTRY'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                      <Layers className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Sổ Theo Dõi Thiết Bị Bàn Giao</span>
                        {reportType === 'DISPATCHED_REGISTRY' && <Check className="w-4 h-4 text-purple-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {dispatchedRecords.length} hồ sơ theo dõi
                      </p>
                    </div>
                  </button>

                  {activeHandover && (
                    <button
                      type="button"
                      onClick={() => setReportType('HANDOVER')}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        reportType === 'HANDOVER'
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Biên Bản Bàn Giao Hiện Tại</span>
                          {reportType === 'HANDOVER' && <Check className="w-4 h-4 text-rose-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Số: {activeHandover.meta.handoverNo || 'BBBG'} ({activeHandover.rows.length} mục)
                        </p>
                      </div>
                    </button>
                  )}

                  {selectedUsageSlip && (
                    <button
                      type="button"
                      onClick={() => setReportType('USAGE_SLIP')}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        reportType === 'USAGE_SLIP'
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Phiếu Báo Sử Dụng Hiện Tại</span>
                          {reportType === 'USAGE_SLIP' && <Check className="w-4 h-4 text-amber-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {selectedUsageSlip.docNumber} ({selectedUsageSlip.itemName})
                        </p>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setReportType('FULL_BACKUP')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      reportType === 'FULL_BACKUP'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Dữ Liệu Sao Lưu Kho (JSON)</span>
                        {reportType === 'FULL_BACKUP' && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        Sao lưu dữ liệu toàn diện
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Format Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  2. Định dạng tệp đính kèm
                </label>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormat('PDF')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      format === 'PDF'
                        ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Tệp PDF (.pdf) chuẩn A4
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('DOCX')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      format === 'DOCX'
                        ? 'bg-blue-50 text-[#2563EB] border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Tệp Word Docs (.docx)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('BOTH')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      format === 'BOTH'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Đính kèm cả 2 (PDF + Word .docx)
                  </button>
                </div>
              </div>

              {/* 3. Recipients Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    3. Người nhận báo cáo (To)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className="text-[11px] text-[#2563EB] dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    {showCc ? 'Ẩn Cc' : '+ Thêm Đồng kính gửi (Cc)'}
                  </button>
                </div>

                {/* Recipient Tags */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[44px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {recipients.map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300 rounded-lg text-xs font-medium"
                    >
                      <span className="font-mono">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="hover:text-rose-600 cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <input
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddRecipient(recipientInput);
                      }
                    }}
                    onBlur={() => {
                      if (recipientInput.trim()) {
                        handleAddRecipient(recipientInput);
                      }
                    }}
                    placeholder={recipients.length === 0 ? "Nhập địa chỉ email và nhấn Enter..." : "Thêm email..."}
                    className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 py-1"
                  />
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] text-slate-400 font-medium mr-1">Gợi ý danh bạ:</span>
                  {PRESET_CONTACTS.map(contact => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleAddRecipient(contact.email)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                        recipients.includes(contact.email)
                          ? 'bg-blue-50 text-[#2563EB] border-blue-300 dark:bg-blue-950 dark:border-blue-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                      }`}
                    >
                      + {contact.name}
                    </button>
                  ))}
                </div>

                {/* CC Section */}
                {showCc && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase">
                      Đồng kính gửi (Cc)
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[40px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                      {ccList.map((email, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                        >
                          <span className="font-mono">{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCc(email)}
                            className="hover:text-rose-600 cursor-pointer p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <input
                        type="email"
                        value={ccInput}
                        onChange={(e) => setCcInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddCc(ccInput);
                          }
                        }}
                        onBlur={() => {
                          if (ccInput.trim()) {
                            handleAddCc(ccInput);
                          }
                        }}
                        placeholder="Nhập email Cc..."
                        className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 py-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Subject & Additional Notes */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  4. Tiêu đề thư (Subject)
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={defaultSubject}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  5. Ghi chú bổ sung trong nội dung email (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Nhập thêm lưu ý về đợt kiểm kê, tình trạng hoạt động thiết bị hoặc chỉ đạo của Lãnh đạo Đội..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Toggle Summary Table */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="includeSummary"
                  checked={includeSummaryTable}
                  onChange={(e) => setIncludeSummaryTable(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeSummary" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                  Tự động chèn bảng thống kê số liệu tổng quan vào phần thân email
                </label>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        {status === 'IDLE' && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Chuẩn hóa giao thức hàng không CNS/ATM</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleProceedToConfirm}
                disabled={recipients.length === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" /> Tiếp tục & Xem lại
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
