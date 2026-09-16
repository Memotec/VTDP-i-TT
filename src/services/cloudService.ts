/**
 * CLOUD SERVICE LAYER
 * Handles resilient HTTP requests to Google Apps Script / Cloud REST endpoint.
 * Safe timeout handling, response parsing, Vietnamese header aliasing, and error encapsulation.
 */

import { InventoryItem, SyncQueueItem, DispatchedRecord } from '../types.ts';

export interface CloudPushResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
  itemCount?: number;
  scriptErrorCode?: string;
  raw?: string;
}

export interface CloudPullResult {
  success: boolean;
  items?: InventoryItem[];
  dispatched?: DispatchedRecord[];
  error?: string;
  empty?: boolean;
}

/**
 * Normalizes various audit status representations into 'OK' | 'MISSING' | null
 */
export function normalizeAuditStatus(raw: any): 'OK' | 'MISSING' | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim().toUpperCase();
  if (
    s === 'OK' ||
    s === 'ĐỦ' ||
    s === 'TỐT' ||
    s === 'ĐỦ/TỐT' ||
    s === 'ĐỦ / TỐT' ||
    s === 'ĐẠT' ||
    s === 'TRUE' ||
    s === '1' ||
    s === 'ĐẠT CHUẨN'
  ) {
    return 'OK';
  }
  if (
    s === 'MISSING' ||
    s === 'THIẾU' ||
    s === 'HỎNG' ||
    s === 'THIẾU/HỎNG' ||
    s === 'THIẾU / HỎNG' ||
    s === 'LỖI' ||
    s === 'FALSE' ||
    s === '0' ||
    s === 'CẦN XỬ LÝ'
  ) {
    return 'MISSING';
  }
  return null;
}

/**
 * Extracts and maps item fields from raw Cloud JSON or Google Sheets row object
 */
export function extractInventoryItem(raw: any, idx: number): InventoryItem {
  const name = String(raw.name || raw['Tên thiết bị'] || raw['Tên Thiết Bị'] || raw['Tên'] || 'Thiết bị không tên').trim();
  const sn = String(raw.sn || raw['Serial Number (S/N)'] || raw['Serial Number'] || raw['S/N'] || raw['Số serial'] || raw['Serial'] || '').trim();
  const pn = String(raw.pn || raw['Part Number (P/N)'] || raw['Part Number'] || raw['P/N'] || raw['Mã vật tư'] || '').trim();
  const warehouse = String(raw.warehouse || raw['Mã Kho (QR)'] || raw['Mã Kho'] || raw['Kho'] || '').trim().toUpperCase();
  const loc = String(raw.loc || raw['Vị trí / Tủ'] || raw['Vị trí'] || raw['Tủ'] || raw['location'] || '').trim();
  
  // Safe quantity parsing - Preserves 0 (hết hàng) instead of defaulting to 1
  const rawQty = raw.qty !== undefined ? raw.qty : (raw['Số lượng'] !== undefined ? raw['Số lượng'] : (raw.quantity !== undefined ? raw.quantity : 1));
  const parsedQty = Number(rawQty);
  const qty = !isNaN(parsedQty) && parsedQty >= 0 ? parsedQty : 1;

  const rawStatus = raw.auditStatus !== undefined ? raw.auditStatus : (raw['Trạng thái kiểm kê'] !== undefined ? raw['Trạng thái kiểm kê'] : raw['Trạng thái']);
  const auditStatus = normalizeAuditStatus(rawStatus);

  const auditDate = raw.auditDate || raw['Ngày kiểm gần nhất'] || raw['Ngày kiểm'] || null;
  const auditNote = raw.auditNote || raw['Ghi chú kiểm kê'] || raw['Ghi chú'] || '';
  const category = raw.category || raw['Phân loại'] || raw['Loại'] || 'Khác';

  // Stable deterministic ID
  const cleanSn = sn.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const id = raw.id || (cleanSn ? `sn_${cleanSn}` : `cloud_item_${idx + 1}`);

  return {
    id,
    name,
    pn,
    sn: sn || `SN-${idx + 1}`,
    warehouse,
    loc,
    qty,
    auditStatus,
    auditDate,
    auditNote,
    category,
    history: Array.isArray(raw.history) ? raw.history : [],
    syncStatus: 'synced',
    version: typeof raw.version === 'number' ? raw.version : 1,
    updatedAt: raw.updatedAt || undefined,
    updatedBy: raw.updatedBy || 'cloud'
  };
}

export class CloudService {
  public static readonly DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwPYEY6_0ng5msNsNrddYbvkYKx3NNIDWWNbxDxCwkMw0GdtCYEMFsE0hfJVROWsVcs/exec';

  /**
   * Push full inventory, dispatched records, and change queue to Google Apps Script
   */
  static async pushToCloud(
    webAppUrl: string,
    inventory: InventoryItem[],
    dispatchedRecords: DispatchedRecord[] = [],
    queueItems: SyncQueueItem[] = [],
    user: string = 'guest',
    categories: string[] = []
  ): Promise<CloudPushResult> {
    const rawUrl = (webAppUrl || '').trim();
    const cleanUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : CloudService.DEFAULT_GAS_URL;

    // Step 1: Try server-side Cloud Proxy first (avoids browser CORS & inspects true Apps Script errors)
    try {
      const proxyRes = await fetch('/api/cloud-proxy/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          data: inventory,
          inventory,
          dispatched: dispatchedRecords,
          queue: queueItems,
          user: user || 'guest',
          categories
        })
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.scriptErrorCode === 'NON_FROZEN_ROWS_EXCEPTION') {
          return {
            success: false,
            error: proxyData.error || 'Google Apps Script gặp lỗi: "Sorry, it is not possible to delete all non-frozen rows".',
            scriptErrorCode: 'NON_FROZEN_ROWS_EXCEPTION',
            raw: proxyData.raw
          };
        }
        if (!proxyData.success) {
          return {
            success: false,
            error: proxyData.error || 'Lỗi gửi dữ liệu qua Cloud Proxy',
            scriptErrorCode: proxyData.scriptErrorCode,
            raw: proxyData.raw
          };
        }
        return {
          success: true,
          message: proxyData.message || `Đồng bộ thành công ${inventory.length} thiết bị lên Google Sheet!`,
          timestamp: new Date().toISOString(),
          itemCount: inventory.length
        };
      }
    } catch {
      // If local proxy fails or not available, gracefully fall back to direct browser fetch
    }

    // Step 2: Direct browser fetch fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s safe timeout

      const params = new URLSearchParams();
      params.append('action', 'AUTO_SYNC_BATCH');
      params.append('type', 'full_sync');
      params.append('data', JSON.stringify(inventory));
      params.append('inventory', JSON.stringify(inventory));
      params.append('dispatched', JSON.stringify(dispatchedRecords));
      params.append('categories', JSON.stringify(categories));
      params.append('queue', JSON.stringify(queueItems));
      params.append('timestamp', Date.now().toString());
      params.append('user', user || 'guest');
      params.append('clientVersion', '3.6-enterprise');

      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const resText = (await res.text()).trim();

      if (resText.includes('Sorry, it is not possible to delete all non-frozen rows')) {
        return {
          success: false,
          error: 'Google Sheet đang bị lỗi mã Apps Script: "Sorry, it is not possible to delete all non-frozen rows". Cần cập nhật Code.gs trong Cài đặt.',
          scriptErrorCode: 'NON_FROZEN_ROWS_EXCEPTION',
          raw: resText
        };
      }

      if (resText.startsWith('ERROR:') || resText.includes('Exception:')) {
        return {
          success: false,
          error: `Google Apps Script gặp lỗi: ${resText}`,
          scriptErrorCode: 'APPS_SCRIPT_EXCEPTION',
          raw: resText
        };
      }

      return {
        success: true,
        message: `Đồng bộ thành công ${inventory.length} thiết bị và ${dispatchedRecords.length} hồ sơ lên Cloud`,
        timestamp: new Date().toISOString(),
        itemCount: inventory.length
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return {
          success: false,
          error: 'Hết thời gian chờ kết nối (Timeout 45s). Google Apps Script phản hồi chậm hoặc đang bận, vui lòng thử lại.'
        };
      }
      const errMsg = err instanceof Error ? err.message : 'Lỗi mạng khi kết nối Cloud API';
      return {
        success: false,
        error: errMsg
      };
    }
  }

  /**
   * Pull inventory data & dispatched records from Google Apps Script
   */
  static async pullFromCloud(webAppUrl: string): Promise<CloudPullResult> {
    const rawUrl = (webAppUrl || '').trim();
    const cleanUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : CloudService.DEFAULT_GAS_URL;

    // Step 1: Try server-side Cloud Proxy first
    try {
      const proxyRes = await fetch('/api/cloud-proxy/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.success && proxyData.data) {
          const parsed = proxyData.data;
          let rawItems: any[] = [];
          let rawDispatched: any[] = [];

          if (Array.isArray(parsed)) {
            rawItems = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.items)) rawItems = parsed.items;
            else if (Array.isArray(parsed.data)) rawItems = parsed.data;
            else if (Array.isArray(parsed.inventory)) rawItems = parsed.inventory;
            else if (Array.isArray(parsed.result)) rawItems = parsed.result;
            else if (Array.isArray(parsed.records)) rawItems = parsed.records;

            if (Array.isArray(parsed.dispatched)) rawDispatched = parsed.dispatched;
            else if (Array.isArray(parsed.dispatchedRecords)) rawDispatched = parsed.dispatchedRecords;
          }

          if (rawItems.length === 0 && rawDispatched.length === 0) {
            return { success: true, items: [], dispatched: [], empty: true };
          }

          const formattedItems: InventoryItem[] = rawItems.map((raw, idx) => extractInventoryItem(raw, idx));
          return {
            success: true,
            items: formattedItems,
            dispatched: rawDispatched
          };
        }
      }
    } catch {
      // Fall back to direct fetch
    }

    // Step 2: Direct browser fetch fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s safe timeout for Google Apps Script cold starts

      // Cache-busting parameter to guarantee fresh data
      const url = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}t=${Date.now()}&source=auto_sync`;
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, error: `Máy chủ phản hồi mã lỗi HTTP ${res.status}` };
      }

      const text = await res.text();
      const trimmed = text.trim();

      // Check if Apps Script returned an HTML authorization / error page
      if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        return {
          success: false,
          error: 'Phản hồi dạng HTML. Vui lòng cấp quyền truy cập Web App là "Anyone" (Bất kỳ ai).'
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return {
          success: false,
          error: 'Dữ liệu từ Google Sheet không đúng định dạng JSON. Vui lòng kiểm tra hàm doGet() trong Apps Script.'
        };
      }

      // Handle diverse response wrappers: array, { items: [] }, { data: [] }, { inventory: [] }, { result: [] }
      let rawItems: any[] = [];
      let rawDispatched: any[] = [];

      if (Array.isArray(parsed)) {
        rawItems = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.items)) rawItems = parsed.items;
        else if (Array.isArray(parsed.data)) rawItems = parsed.data;
        else if (Array.isArray(parsed.inventory)) rawItems = parsed.inventory;
        else if (Array.isArray(parsed.result)) rawItems = parsed.result;
        else if (Array.isArray(parsed.records)) rawItems = parsed.records;

        if (Array.isArray(parsed.dispatched)) rawDispatched = parsed.dispatched;
        else if (Array.isArray(parsed.dispatchedRecords)) rawDispatched = parsed.dispatchedRecords;
      } else {
        return { success: false, error: 'Dữ liệu trả về từ Cloud không phải là danh sách hợp lệ.' };
      }

      if (rawItems.length === 0 && rawDispatched.length === 0) {
        return { success: true, items: [], dispatched: [], empty: true };
      }

      const formattedItems: InventoryItem[] = rawItems.map((raw, idx) => extractInventoryItem(raw, idx));

      return {
        success: true,
        items: formattedItems,
        dispatched: rawDispatched
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return {
          success: false,
          error: 'Hết thời gian chờ kết nối (Timeout 45s) khi kéo dữ liệu từ Google Sheets. Vui lòng thử lại hoặc kiểm tra đường dẫn Web App.'
        };
      }
      const errMsg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ Cloud';
      return { success: false, error: errMsg };
    }
  }
}

