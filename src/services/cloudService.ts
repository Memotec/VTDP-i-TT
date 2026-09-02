/**
 * CLOUD SERVICE LAYER
 * Handles HTTP requests to Google Apps Script / Cloud REST endpoint.
 * Safe timeout handling, response parsing, and error encapsulation.
 */

import { InventoryItem, SyncQueueItem } from '../types.ts';

export interface CloudPushResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface CloudPullResult {
  success: boolean;
  items?: InventoryItem[];
  error?: string;
  empty?: boolean;
}

export class CloudService {
  /**
   * Push full inventory or batch changes to Google Apps Script
   */
  static async pushToCloud(
    webAppUrl: string,
    inventory: InventoryItem[],
    queueItems: SyncQueueItem[],
    user: string
  ): Promise<CloudPushResult> {
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return { success: false, error: 'Đường dẫn Cloud API (Google Apps Script) chưa được cấu hình hợp lệ.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const params = new URLSearchParams();
      params.append('action', 'AUTO_SYNC_BATCH');
      params.append('data', JSON.stringify(inventory));
      params.append('queue', JSON.stringify(queueItems));
      params.append('timestamp', Date.now().toString());
      params.append('user', user || 'guest');
      params.append('clientVersion', '3.0-enterprise');

      // Use standard POST with form urlencoded
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        success: true,
        message: 'Đồng bộ dữ liệu lên Cloud thành công',
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi mạng khi kết nối Cloud API';
      return {
        success: false,
        error: errMsg
      };
    }
  }

  /**
   * Pull inventory data from Google Apps Script
   */
  static async pullFromCloud(webAppUrl: string): Promise<CloudPullResult> {
    if (!webAppUrl || !webAppUrl.startsWith('http')) {
      return { success: false, error: 'Đường dẫn Cloud API (Google Apps Script) chưa hợp lệ.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const url = `${webAppUrl}${webAppUrl.includes('?') ? '&' : '?'}t=${Date.now()}&source=auto_sync`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, error: `Phản hồi máy chủ lỗi (HTTP ${res.status})` };
      }

      const text = await res.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return {
          success: false,
          error: 'Phản hồi dạng HTML. Vui lòng kiểm tra quyền chia sẻ Web App (Anyone).'
        };
      }

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return { success: true, items: [], empty: true };
        }
        const formatted: InventoryItem[] = parsed.map((item: Partial<InventoryItem>, idx: number) => ({
          id: item.id || `cloud-item-${idx}-${Date.now()}`,
          name: item.name || 'Thiết bị không tên',
          pn: item.pn || '',
          sn: item.sn || `SN-${idx}`,
          warehouse: item.warehouse || '',
          loc: item.loc || '',
          qty: Number(item.qty) || 1,
          auditStatus: item.auditStatus === 'OK' ? 'OK' : (item.auditStatus === 'MISSING' ? 'MISSING' : null),
          auditDate: item.auditDate || null,
          auditNote: item.auditNote || '',
          category: item.category || 'Khác',
          history: item.history || [],
          syncStatus: 'synced',
          version: typeof item.version === 'number' ? item.version : 1,
          updatedAt: item.updatedAt || new Date().toISOString(),
          updatedBy: item.updatedBy || 'cloud'
        }));
        return { success: true, items: formatted };
      }

      return { success: false, error: 'Dữ liệu trả về từ Cloud không phải là mảng danh sách hợp lệ.' };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ Cloud';
      return { success: false, error: errMsg };
    }
  }
}
