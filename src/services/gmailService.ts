/**
 * GMAIL SERVICE LAYER
 * Integrates Google Workspace Gmail API (https://gmail.googleapis.com/gmail/v1/users/me/messages/send)
 * with MIME multipart/mixed attachment encoding, RFC 2822 formatting, and recipient management.
 */

import { getAccessToken, googleSignIn } from './authService.ts';

export interface EmailAttachment {
  filename: string;
  contentType: string; // e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json'
  data: Blob | ArrayBuffer | string; // Blob, ArrayBuffer, or Base64 string
}

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: EmailAttachment[];
  senderName?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
  needsAuth?: boolean;
}

export interface PresetContact {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export const PRESET_CONTACTS: PresetContact[] = [
  {
    id: 'ld-dtt',
    name: 'Lãnh Đạo Đội Thông Tin',
    email: 'lanhdao.thongtin@cns.example.com',
    role: 'Đội Trưởng',
    department: 'Đội Thông Tin – Trung tâm BĐKT'
  },
  {
    id: 'to-vh',
    name: 'Tổ Vận Hành CNS/ATM',
    email: 'to.vanhanh.cns@cns.example.com',
    role: 'Tổ Trưởng Vận Hành',
    department: 'Tổ Vận Hành Đài Trạm'
  },
  {
    id: 'truc-ban',
    name: 'Kỹ Sư Trực Ban Kỹ Thuật (24/7)',
    email: 'trucban.kt.cns@cns.example.com',
    role: 'Trực Ban Kỹ Thuật',
    department: 'Trung tâm Bảo Đảm Kỹ Thuật'
  },
  {
    id: 'dai-twr',
    name: 'Đài Kiểm Soát Tại Sân (TWR)',
    email: 'dai.twr.cns@cns.example.com',
    role: 'Đài Trưởng TWR',
    department: 'Trung Tâm Quản Lý Bay'
  },
  {
    id: 'kho-tb',
    name: 'Thủ Kho & Quản Lý Trang Thiết Bị',
    email: 'quanlykho.cns@cns.example.com',
    role: 'Nhân viên Phụ trách Kho',
    department: 'Đội Thông Tin – Trung tâm BĐKT'
  }
];

/**
 * Helper: Convert Blob or ArrayBuffer to pure Base64 string (without data: URL prefix)
 */
export async function dataToBase64(data: Blob | ArrayBuffer | string): Promise<string> {
  if (typeof data === 'string') {
    // If it's a data URL, strip prefix
    if (data.includes('base64,')) {
      return data.split('base64,')[1];
    }
    return data;
  }

  if (data instanceof Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(data);
    });
  }

  if (data instanceof ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  return '';
}

/**
 * UTF-8 Base64 encoder for RFC 2047 headers (e.g., Subject: =?UTF-8?B?...?=)
 */
function encodeRfc2047(text: string): string {
  try {
    const utf8Bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64 = window.btoa(binary);
    return `=?UTF-8?B?${base64}?=`;
  } catch {
    return text;
  }
}

/**
 * Convert standard base64 to URL-safe Base64 required by Gmail API
 */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build RFC 2822 MIME multipart/mixed message
 */
export async function buildRfc2822Message(options: SendEmailOptions): Promise<string> {
  const boundary = `====_CNS_MIME_BOUNDARY_${Date.now()}_${Math.random().toString(36).substring(2, 9)}====`;
  const altBoundary = `====_CNS_ALT_BOUNDARY_${Date.now()}_${Math.random().toString(36).substring(2, 9)}====`;

  const toList = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const ccList = options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : '';
  const bccList = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : '';

  const headers: string[] = [
    'MIME-Version: 1.0',
    `To: ${toList}`,
    `Subject: ${encodeRfc2047(options.subject)}`,
  ];

  if (options.senderName) {
    headers.push(`From: ${encodeRfc2047(options.senderName)} <me>`);
  }

  if (ccList) {
    headers.push(`Cc: ${ccList}`);
  }
  if (bccList) {
    headers.push(`Bcc: ${bccList}`);
  }

  const hasAttachments = options.attachments && options.attachments.length > 0;

  let messageRaw = '';

  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    messageRaw = headers.join('\r\n') + '\r\n\r\n';

    // Body part (alternative multipart or html)
    messageRaw += `--${boundary}\r\n`;
    messageRaw += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;

    // Plain text version
    const plainBody = options.bodyText || options.bodyHtml?.replace(/<[^>]*>/g, '') || 'Báo cáo trang thiết bị Đội Thông Tin';
    const utf8Plain = new TextEncoder().encode(plainBody);
    let plainBinary = '';
    for (let i = 0; i < utf8Plain.length; i++) plainBinary += String.fromCharCode(utf8Plain[i]);
    const plainBase64 = window.btoa(plainBinary);

    messageRaw += `--${altBoundary}\r\n`;
    messageRaw += 'Content-Type: text/plain; charset="UTF-8"\r\n';
    messageRaw += 'Content-Transfer-Encoding: base64\r\n\r\n';
    messageRaw += plainBase64.match(/.{1,76}/g)?.join('\r\n') || plainBase64;
    messageRaw += '\r\n\r\n';

    // HTML version
    if (options.bodyHtml) {
      const utf8Html = new TextEncoder().encode(options.bodyHtml);
      let htmlBinary = '';
      for (let i = 0; i < utf8Html.length; i++) htmlBinary += String.fromCharCode(utf8Html[i]);
      const htmlBase64 = window.btoa(htmlBinary);

      messageRaw += `--${altBoundary}\r\n`;
      messageRaw += 'Content-Type: text/html; charset="UTF-8"\r\n';
      messageRaw += 'Content-Transfer-Encoding: base64\r\n\r\n';
      messageRaw += htmlBase64.match(/.{1,76}/g)?.join('\r\n') || htmlBase64;
      messageRaw += '\r\n\r\n';
    }

    messageRaw += `--${altBoundary}--\r\n\r\n`;

    // Attachments
    for (const att of options.attachments!) {
      const base64Data = await dataToBase64(att.data);
      const safeFilename = encodeRfc2047(att.filename);

      messageRaw += `--${boundary}\r\n`;
      messageRaw += `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${safeFilename}"\r\n`;
      messageRaw += 'Content-Transfer-Encoding: base64\r\n';
      messageRaw += `Content-Disposition: attachment; filename="${safeFilename}"\r\n\r\n`;
      messageRaw += base64Data.match(/.{1,76}/g)?.join('\r\n') || base64Data;
      messageRaw += '\r\n\r\n';
    }

    messageRaw += `--${boundary}--`;
  } else {
    // Single body (HTML)
    if (options.bodyHtml) {
      headers.push('Content-Type: text/html; charset="UTF-8"');
      headers.push('Content-Transfer-Encoding: base64');
      messageRaw = headers.join('\r\n') + '\r\n\r\n';

      const utf8Html = new TextEncoder().encode(options.bodyHtml);
      let htmlBinary = '';
      for (let i = 0; i < utf8Html.length; i++) htmlBinary += String.fromCharCode(utf8Html[i]);
      const htmlBase64 = window.btoa(htmlBinary);
      messageRaw += htmlBase64.match(/.{1,76}/g)?.join('\r\n') || htmlBase64;
    } else {
      headers.push('Content-Type: text/plain; charset="UTF-8"');
      headers.push('Content-Transfer-Encoding: base64');
      messageRaw = headers.join('\r\n') + '\r\n\r\n';

      const plainBody = options.bodyText || '';
      const utf8Plain = new TextEncoder().encode(plainBody);
      let plainBinary = '';
      for (let i = 0; i < utf8Plain.length; i++) plainBinary += String.fromCharCode(utf8Plain[i]);
      const plainBase64 = window.btoa(plainBinary);
      messageRaw += plainBase64.match(/.{1,76}/g)?.join('\r\n') || plainBase64;
    }
  }

  return messageRaw;
}

/**
 * Send email via Gmail REST API (users.messages.send)
 */
export async function sendEmailViaGmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    let token = await getAccessToken();

    if (!token) {
      // Attempt sign-in with Google if no token is cached in-memory
      const signResult = await googleSignIn();
      token = signResult?.accessToken || null;
    }

    if (!token) {
      return {
        success: false,
        needsAuth: true,
        error: 'Chưa đăng nhập tài khoản Google có quyền gửi email (Gmail).'
      };
    }

    // Build RFC 2822 message
    const rawMime = await buildRfc2822Message(options);

    // Convert raw string to base64url
    // Use TextEncoder to handle all UTF-8 characters safely
    const rawBytes = new TextEncoder().encode(rawMime);
    let binary = '';
    for (let i = 0; i < rawBytes.length; i++) {
      binary += String.fromCharCode(rawBytes[i]);
    }
    const base64 = window.btoa(binary);
    const rawBase64Url = toBase64Url(base64);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: rawBase64Url
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          needsAuth: true,
          error: `Quyền Gmail bị từ chối (${errMsg}). Vui lòng cấp lại quyền gửi thư Gmail.`
        };
      }

      return {
        success: false,
        error: `Lỗi gửi thư từ Gmail API: ${errMsg}`
      };
    }

    const resJson = await response.json();
    return {
      success: true,
      messageId: resJson.id,
      threadId: resJson.threadId
    };
  } catch (err: any) {
    console.error('Lỗi khi gửi email qua Gmail API:', err);
    return {
      success: false,
      error: err.message || 'Không thể gửi email. Vui lòng kiểm tra lại kết nối mạng.'
    };
  }
}

/**
 * Fallback: Open system mail client with mailto URL
 */
export function openMailtoClient(options: { to?: string; subject?: string; body?: string }): void {
  const to = options.to || '';
  const subject = encodeURIComponent(options.subject || '');
  const body = encodeURIComponent(options.body || '');
  const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
  window.open(mailtoUrl, '_blank');
}
