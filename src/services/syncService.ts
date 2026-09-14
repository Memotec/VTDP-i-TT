/**
 * SYNC SERVICE LAYER
 * Coordinates Local-First database operations, the persistent Sync Queue,
 * automated change detection, network transitions, auto-retries, and conflict management.
 */

import {
  InventoryItem,
  SyncQueueItem,
  SyncActionType,
  SyncEntityType,
  GlobalSyncState,
  ConflictItem,
  DataSourceOrigin
} from '../types.ts';
import { LocalDatabase } from '../database/localDatabase.ts';
import { CloudService } from './cloudService.ts';
import { networkMonitor } from '../utils/networkMonitor.ts';
import { RetryManager } from '../utils/retryManager.ts';

export type SyncListener = (state: SyncServiceState) => void;

export interface SyncServiceState {
  globalStatus: GlobalSyncState;
  dataSourceOrigin: DataSourceOrigin;
  pendingCount: number;
  failedCount: number;
  lastSyncedTime: string;
  isOnline: boolean;
  conflicts: ConflictItem[];
  queue: SyncQueueItem[];
  detailMessage?: string;
  scriptErrorCode?: string;
}

class SyncService {
  private queue: SyncQueueItem[] = [];
  private conflicts: ConflictItem[] = [];
  private globalStatus: GlobalSyncState = 'synced';
  private dataSourceOrigin: DataSourceOrigin = 'cloud_loading';
  private lastSyncedTime: string = '';
  private detailMessage: string = 'Hệ thống sẵn sàng';
  private scriptErrorCode?: string;
  private listeners: Set<SyncListener> = new Set();
  private debounceTimer: any = null;
  private retryTimer: any = null;
  private isProcessing: boolean = false;
  private hasPendingImmediatePush: boolean = false;
  private webAppUrl: string = '';
  private currentUser: string = 'guest';

  public static readonly DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwPYEY6_0ng5msNsNrddYbvkYKx3NNIDWWNbxDxCwkMw0GdtCYEMFsE0hfJVROWsVcs/exec';

  constructor() {
    this.init();
  }

  private init() {
    // 1. Hydrate queue & conflicts from Local Storage
    this.queue = LocalDatabase.getSyncQueue();
    this.conflicts = LocalDatabase.getConflicts();

    // Auto-clean stale conflicts if there are no pending changes in queue (Cloud-First principle)
    const activePending = this.queue.filter(q => q.syncStatus === 'pending' || q.syncStatus === 'syncing');
    if (activePending.length === 0 && this.conflicts.length > 0) {
      this.conflicts = [];
      LocalDatabase.clearConflicts();
    }

    this.lastSyncedTime = localStorage.getItem('cns_last_synced_time') || '';
    const storedUrl = localStorage.getItem('cns_sync_url');
    if (!storedUrl || !storedUrl.trim() || storedUrl.includes('AKfycby4frQYvyEuzbVS7rctYDaxHDhSlEzNmTgYXavWzi0ROJLYEqhfwBd1QRX4v6dVU05f')) {
      this.webAppUrl = SyncService.DEFAULT_GAS_URL;
      localStorage.setItem('cns_sync_url', SyncService.DEFAULT_GAS_URL);
    } else {
      this.webAppUrl = storedUrl.trim();
    }

    // 2. Listen to network changes
    networkMonitor.subscribe((online) => {
      if (online) {
        this.detailMessage = 'Đã khôi phục kết nối Internet. Đang tự động xử lý hàng đợi...';
        this.notify();
        this.processQueue();
      } else {
        this.globalStatus = 'offline';
        this.detailMessage = 'Thiết bị đang Ngoại tuyến (Offline). Dữ liệu được lưu an toàn tại Local.';
        this.notify();
      }
    });

    // Initial status evaluation
    this.evaluateStatus();
  }

  public configure(url: string, user: string) {
    this.webAppUrl = (url && url.trim()) ? url.trim() : (this.webAppUrl || SyncService.DEFAULT_GAS_URL);
    this.currentUser = user || 'guest';
  }

  public getWebAppUrl(): string {
    return (this.webAppUrl && this.webAppUrl.trim()) ? this.webAppUrl.trim() : SyncService.DEFAULT_GAS_URL;
  }

  public getState(): SyncServiceState {
    const pendingCount = this.queue.filter(q => q.syncStatus === 'pending' || q.syncStatus === 'syncing').length;
    const failedCount = this.queue.filter(q => q.syncStatus === 'failed').length;

    return {
      globalStatus: this.globalStatus,
      dataSourceOrigin: this.dataSourceOrigin,
      pendingCount,
      failedCount,
      lastSyncedTime: this.lastSyncedTime,
      isOnline: networkMonitor.isOnline(),
      conflicts: this.conflicts,
      queue: [...this.queue],
      detailMessage: this.detailMessage,
      scriptErrorCode: this.scriptErrorCode
    };
  }

  public getDataSourceOrigin(): DataSourceOrigin {
    return this.dataSourceOrigin;
  }

  public setDataSourceOrigin(origin: DataSourceOrigin, message?: string): void {
    this.dataSourceOrigin = origin;
    if (message) {
      this.detailMessage = message;
    }
    this.notify();
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getScriptErrorCode(): string | undefined {
    return this.scriptErrorCode;
  }

  public clearScriptErrorCode(): void {
    this.scriptErrorCode = undefined;
    this.notify();
  }

  /**
   * Schedule debounced full push to ensure local state persists to cloud automatically
   */
  public scheduleDebouncedPush(delayMs = 1200): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerFullSync();
    }, delayMs);
  }

  /**
   * Immediately push complete local dataset to Cloud Google Sheet
   */
  public async triggerFullSync(): Promise<{ success: boolean; error?: string; scriptErrorCode?: string }> {
    if (this.isProcessing) {
      this.hasPendingImmediatePush = true;
      return { success: true };
    }
    if (!networkMonitor.isOnline()) {
      this.globalStatus = 'offline';
      this.detailMessage = 'Đang ngoại tuyến. Dữ liệu sẽ tự động đồng bộ khi có Internet.';
      this.notify();
      return { success: false, error: 'Ngoại tuyến' };
    }

    this.isProcessing = true;
    this.globalStatus = 'syncing';
    this.detailMessage = 'Đang tự động ghi dữ liệu mới lên Cloud Google Sheet...';
    this.notify();

    try {
      const currentInventory = LocalDatabase.getInventory();
      const currentDispatched = LocalDatabase.getDispatchedRecords();
      const currentCategories = LocalDatabase.getCategories();
      const pendingItems = this.queue.filter(q => q.syncStatus === 'pending' || q.syncStatus === 'failed');

      const pushResult = await CloudService.pushToCloud(
        this.getWebAppUrl(),
        currentInventory,
        currentDispatched,
        pendingItems,
        this.currentUser,
        currentCategories
      );

      if (pushResult.success) {
        this.queue = [];
        LocalDatabase.saveSyncQueue(this.queue);
        LocalDatabase.markAllItemsSyncStatus('synced');

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.lastSyncedTime = nowStr;
        localStorage.setItem('cns_last_synced_time', nowStr);

        this.globalStatus = 'synced';
        this.scriptErrorCode = undefined;
        this.detailMessage = `Đã tự động lưu lên Google Sheet lúc ${nowStr}`;
        this.notify();
        return { success: true };
      } else {
        this.scriptErrorCode = pushResult.scriptErrorCode;
        this.globalStatus = 'failed';
        this.detailMessage = pushResult.error || 'Lỗi lưu dữ liệu lên Cloud';
        this.notify();
        return { success: false, error: pushResult.error, scriptErrorCode: pushResult.scriptErrorCode };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi không xác định khi đồng bộ';
      this.globalStatus = 'failed';
      this.detailMessage = errMsg;
      this.notify();
      return { success: false, error: errMsg };
    } finally {
      this.isProcessing = false;
      this.evaluateStatus();
      this.notify();
      if (this.hasPendingImmediatePush) {
        this.hasPendingImmediatePush = false;
        setTimeout(() => this.triggerFullSync(), 80);
      }
    }
  }

  /**
   * Force an immediate sync without debouncing
   */
  public async triggerImmediateSync(): Promise<{ success: boolean; error?: string; scriptErrorCode?: string }> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.triggerFullSync();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error('SyncService listener error:', err);
      }
    });
  }

  private evaluateStatus() {
    if (!networkMonitor.isOnline()) {
      this.globalStatus = 'offline';
      return;
    }

    if (this.conflicts.length > 0) {
      this.globalStatus = 'conflict';
      return;
    }

    const hasFailed = this.queue.some(q => q.syncStatus === 'failed');
    if (hasFailed) {
      this.globalStatus = 'failed';
      return;
    }

    const hasPending = this.queue.some(q => q.syncStatus === 'pending' || q.syncStatus === 'syncing');
    if (hasPending) {
      this.globalStatus = 'pending';
      return;
    }

    this.globalStatus = 'synced';
  }

  /**
   * Enqueue a change in the local database and trigger auto-sync
   */
  public enqueue(
    entityType: SyncEntityType,
    entityId: string,
    action: SyncActionType,
    payload: any,
    user?: string,
    immediate = false
  ): void {
    const actor = user || this.currentUser || 'guest';
    const now = Date.now();
    const formattedTime = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');

    // Coalesce: If there is already an existing pending/failed queue item for this entity, coalesce
    const existingIndex = this.queue.findIndex(
      item => item.entityId === entityId && item.entityType === entityType && item.syncStatus !== 'syncing'
    );

    if (existingIndex >= 0) {
      const existing = this.queue[existingIndex];
      // If original was CREATE and current is UPDATE, keep as CREATE with latest payload
      const coalescedAction = existing.action === 'CREATE' && action === 'UPDATE' ? 'CREATE' : action;
      this.queue[existingIndex] = {
        ...existing,
        action: coalescedAction,
        payload,
        timestamp: now,
        formattedTime,
        syncStatus: 'pending',
        error: undefined
      };
    } else {
      const newItem: SyncQueueItem = {
        id: `sync_${now}_${Math.random().toString(36).substring(2, 7)}`,
        entityType,
        entityId,
        action,
        payload,
        timestamp: now,
        formattedTime,
        retryCount: 0,
        maxRetries: 5,
        syncStatus: 'pending',
        user: actor
      };
      this.queue.push(newItem);
    }

    // Persist queue locally
    LocalDatabase.saveSyncQueue(this.queue);

    this.evaluateStatus();
    this.notify();

    // Trigger instant cloud sync for CREATE / DELETE / explicit immediate actions
    if (immediate || action === 'CREATE' || action === 'DELETE') {
      this.triggerImmediateSync().catch(err => console.warn('Instant enqueue sync:', err));
    } else {
      // Trigger debounced auto-sync to avoid spamming the cloud on rapid keystrokes
      this.scheduleDebouncedSync(800);
    }
  }

  private scheduleDebouncedSync(delayMs = 800) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, delayMs);
  }

  /**
   * Process the Sync Queue
   */
  public async processQueue(isManual = false): Promise<void> {
    if (this.isProcessing) return;

    if (!networkMonitor.isOnline()) {
      this.globalStatus = 'offline';
      this.detailMessage = 'Đang ngoại tuyến. Dữ liệu chờ sẽ tự động đồng bộ khi có Internet.';
      this.notify();
      return;
    }

    const pendingItems = this.queue.filter(q => q.syncStatus === 'pending' || (isManual && q.syncStatus === 'failed'));
    if (pendingItems.length === 0) {
      this.evaluateStatus();
      this.notify();
      return;
    }

    this.isProcessing = true;
    this.globalStatus = 'syncing';
    this.detailMessage = `Đang đồng bộ ${pendingItems.length} tác vụ lên Cloud...`;
    this.notify();

    // Mark items as syncing
    pendingItems.forEach(item => {
      item.syncStatus = 'syncing';
    });
    LocalDatabase.saveSyncQueue(this.queue);

    try {
      const currentInventory = LocalDatabase.getInventory();
      const currentDispatched = LocalDatabase.getDispatchedRecords();
      const currentCategories = LocalDatabase.getCategories();
      const pushResult = await CloudService.pushToCloud(
        this.webAppUrl,
        currentInventory,
        currentDispatched,
        pendingItems,
        this.currentUser,
        currentCategories
      );

      if (pushResult.success) {
        // Success: Clear processed items from queue
        const processedIds = new Set(pendingItems.map(p => p.id));
        this.queue = this.queue.filter(q => !processedIds.has(q.id));
        LocalDatabase.saveSyncQueue(this.queue);

        // Update local items to synced
        LocalDatabase.markAllItemsSyncStatus('synced');

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.lastSyncedTime = nowStr;
        localStorage.setItem('cns_last_synced_time', nowStr);

        this.globalStatus = 'synced';
        this.scriptErrorCode = undefined;
        this.detailMessage = `Đồng bộ thành công lúc ${nowStr}`;
      } else {
        // Cloud reported failure: Apply retry policy
        this.scriptErrorCode = pushResult.scriptErrorCode;
        this.handleBatchFailure(pendingItems, pushResult.error || 'Lỗi kết nối máy chủ');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi không xác định khi đồng bộ';
      this.handleBatchFailure(pendingItems, errMsg);
    } finally {
      this.isProcessing = false;
      this.evaluateStatus();
      this.notify();
    }
  }

  private handleBatchFailure(items: SyncQueueItem[], errorMessage: string) {
    let hasSchedulableRetry = false;
    let minNextDelay = Infinity;

    items.forEach(item => {
      item.retryCount += 1;
      item.error = errorMessage;

      if (RetryManager.canRetry(item.retryCount, item.maxRetries)) {
        item.syncStatus = 'pending';
        const delay = RetryManager.getNextDelayMs(item.retryCount);
        item.nextRetryTime = Date.now() + delay;
        if (delay < minNextDelay) minNextDelay = delay;
        hasSchedulableRetry = true;
      } else {
        item.syncStatus = 'failed';
      }
    });

    LocalDatabase.saveSyncQueue(this.queue);
    this.detailMessage = `Đồng bộ gặp lỗi: ${errorMessage}.`;

    if (hasSchedulableRetry && isFinite(minNextDelay)) {
      this.detailMessage += ` Tự động thử lại sau ${Math.round(minNextDelay / 1000)}s...`;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.processQueue();
      }, minNextDelay);
    }
  }

  /**
   * Manual trigger: retry all failed or pending items immediately
   */
  public retryFailed(): void {
    this.queue.forEach(item => {
      if (item.syncStatus === 'failed') {
        item.syncStatus = 'pending';
        item.retryCount = 0;
        item.error = undefined;
      }
    });
    LocalDatabase.saveSyncQueue(this.queue);
    this.processQueue(true);
  }

  /**
   * Clear all items in queue (Admin override)
   */
  public clearQueue(): void {
    this.queue = [];
    LocalDatabase.saveSyncQueue([]);
    this.evaluateStatus();
    this.notify();
  }

  /**
   * Check for conflicts against pulled cloud items with Cloud-First Priority.
   * A conflict ONLY genuinely exists if the local machine has an unsent pending edit
   * in the sync queue AND the cloud has received a newer version with different content.
   */
  public checkForConflicts(cloudItems: InventoryItem[], localItems: InventoryItem[]): ConflictItem[] {
    const pendingQueue = this.queue.filter(q => q.syncStatus === 'pending' || q.syncStatus === 'syncing');
    const pendingQueueIds = new Set(pendingQueue.map(q => q.entityId));

    // Cloud-First Priority: If there are no pending local edits queued by the user,
    // there can be no conflict. Cloud data is applied seamlessly!
    if (pendingQueueIds.size === 0) {
      if (this.conflicts.length > 0) {
        this.clearConflicts();
      }
      return [];
    }

    const detected: ConflictItem[] = [];
    const localMap = new Map<string, InventoryItem>();
    const localSnMap = new Map<string, InventoryItem>();
    
    localItems.forEach(i => {
      localMap.set(i.id, i);
      if (i.sn) {
        localSnMap.set(i.sn.trim().toLowerCase(), i);
      }
    });

    cloudItems.forEach(cloudItem => {
      // If this item was explicitly deleted by the user, ignore it (not a conflict)
      if (LocalDatabase.isItemDeleted(cloudItem.id, cloudItem.sn)) {
        return;
      }

      const cleanSn = (cloudItem.sn || '').trim().toLowerCase();
      const localItem = localMap.get(cloudItem.id) || (cleanSn ? localSnMap.get(cleanSn) : undefined);
      if (!localItem) return;

      // Only check items that ACTUALLY have a pending un-pushed change in the local queue
      if (!pendingQueueIds.has(localItem.id)) {
        return;
      }

      // Check if both sides have conflicting versions or contents
      const localVer = localItem.version || 1;
      const cloudVer = cloudItem.version || 1;

      const hasContentDiff =
        Number(localItem.qty) !== Number(cloudItem.qty) ||
        (localItem.auditStatus || '') !== (cloudItem.auditStatus || '') ||
        (localItem.loc || '').trim() !== (cloudItem.loc || '').trim() ||
        (localItem.warehouse || '').trim() !== (cloudItem.warehouse || '').trim();

      // Real conflict: Cloud has a strictly newer version, or cloud has an explicit newer timestamp
      const isCloudNewer = cloudVer > localVer;
      const bothHaveTimestamps = Boolean(cloudItem.updatedAt && localItem.updatedAt);
      const isCloudTimeNewer = bothHaveTimestamps &&
        new Date(cloudItem.updatedAt!).getTime() > (new Date(localItem.updatedAt!).getTime() + 3000);

      if (hasContentDiff && (isCloudNewer || isCloudTimeNewer)) {
        detected.push({
          id: `conflict_${localItem.id}_${Date.now()}`,
          entityType: 'equipment',
          entityId: localItem.id,
          entityName: localItem.name,
          localData: localItem,
          cloudData: cloudItem,
          detectedAt: new Date().toISOString(),
          localUpdatedAt: localItem.updatedAt,
          cloudUpdatedAt: cloudItem.updatedAt,
          localVersion: localVer,
          cloudVersion: cloudVer
        });
      }
    });

    if (detected.length > 0) {
      this.conflicts = detected;
      LocalDatabase.saveConflicts(detected);
      this.globalStatus = 'conflict';
      this.detailMessage = `Phát hiện ${detected.length} xung đột dữ liệu giữa Local và Cloud.`;
      this.notify();
    } else if (this.conflicts.length > 0) {
      // Clear out resolved or obsolete conflicts
      this.clearConflicts();
    }

    return detected;
  }

  /**
   * Resolve a single conflict
   */
  public resolveConflict(conflictId: string, choice: 'keep_local' | 'keep_cloud'): { resolvedItem: any } {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) throw new Error('Không tìm thấy bản ghi xung đột');

    const localInventory = LocalDatabase.getInventory();
    let finalItem: InventoryItem;

    if (choice === 'keep_local') {
      // Local wins: Enqueue to overwrite cloud
      finalItem = {
        ...conflict.localData,
        version: Math.max(conflict.localVersion || 1, conflict.cloudVersion || 1) + 1,
        syncStatus: 'pending'
      };
      this.enqueue('equipment', finalItem.id, 'UPDATE', finalItem);
    } else {
      // Cloud wins: Update local inventory with cloud data
      finalItem = {
        ...conflict.cloudData,
        syncStatus: 'synced'
      };
      // Remove any pending queue item for this equipment
      this.queue = this.queue.filter(q => q.entityId !== conflict.entityId);
      LocalDatabase.saveSyncQueue(this.queue);
    }

    // Update in local DB
    const updated = localInventory.map(i => i.id === finalItem.id ? finalItem : i);
    LocalDatabase.saveInventory(updated);

    // Remove from active conflicts
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
    LocalDatabase.saveConflicts(this.conflicts);

    this.evaluateStatus();
    this.notify();

    return { resolvedItem: finalItem };
  }

  /**
   * Resolve all active conflicts in one action (Batch resolve)
   */
  public resolveAllConflicts(choice: 'keep_local' | 'keep_cloud'): InventoryItem[] {
    const localInventory = LocalDatabase.getInventory();
    const inventoryMap = new Map<string, InventoryItem>(localInventory.map(i => [i.id, i]));
    const resolvedItems: InventoryItem[] = [];

    for (const conflict of this.conflicts) {
      if (choice === 'keep_local') {
        const finalItem: InventoryItem = {
          ...conflict.localData,
          version: Math.max(conflict.localVersion || 1, conflict.cloudVersion || 1) + 1,
          syncStatus: 'pending'
        };
        inventoryMap.set(finalItem.id, finalItem);
        this.enqueue('equipment', finalItem.id, 'UPDATE', finalItem);
        resolvedItems.push(finalItem);
      } else {
        const finalItem: InventoryItem = {
          ...conflict.cloudData,
          syncStatus: 'synced'
        };
        inventoryMap.set(finalItem.id, finalItem);
        this.queue = this.queue.filter(q => q.entityId !== conflict.entityId);
        resolvedItems.push(finalItem);
      }
    }

    if (choice === 'keep_cloud') {
      LocalDatabase.saveSyncQueue(this.queue);
    }

    const updated = Array.from(inventoryMap.values());
    LocalDatabase.saveInventory(updated);

    this.conflicts = [];
    LocalDatabase.clearConflicts();
    this.evaluateStatus();
    this.notify();

    return updated;
  }

  /**
   * Clear all active conflicts without forcing changes
   */
  public clearConflicts(): void {
    this.conflicts = [];
    LocalDatabase.clearConflicts();
    this.evaluateStatus();
    this.notify();
  }
}

export const syncService = new SyncService();
