/**
 * LOCAL DATABASE LAYER (Local-First Architecture)
 * Handles resilient reading and writing to LocalStorage / IndexedDB with automatic schema versioning,
 * syncStatus tracking, and change detection.
 */

import { InventoryItem, DispatchedRecord, UsageSlip, SystemAuditLogEntry, SyncQueueItem, ConflictItem, SyncItemStatus } from '../types.ts';
import { INITIAL_INVENTORY, INITIAL_DISPATCHED_RECORDS, INITIAL_SYSTEM_AUDIT_LOGS, CATEGORIES } from '../initialData.ts';

export const STORAGE_KEYS = {
  INVENTORY: 'cns_inventory_v30_stable',
  DISPATCHED: 'cns_dispatched_records_v1',
  USAGE_SLIPS: 'cns_usage_slips_v1',
  CATEGORIES: 'cns_categories_v30',
  AUDIT_LOGS: 'cns_system_audit_logs_v1',
  SYNC_QUEUE: 'cns_sync_queue_v1',
  CONFLICTS: 'cns_sync_conflicts_v1',
  LAST_SAVED: 'cns_last_saved_time',
  LAST_SYNCED: 'cns_last_synced_time',
  AUTO_BACKUP_TIMESTAMP: 'cns_last_auto_backup_timestamp'
} as const;

export class LocalDatabase {
  // Inventory
  static getInventory(): InventoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (!raw) return INITIAL_INVENTORY;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_INVENTORY;
    } catch (err) {
      console.error('LocalDatabase.getInventory error:', err);
      return INITIAL_INVENTORY;
    }
  }

  static saveInventory(items: InventoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      localStorage.setItem(STORAGE_KEYS.LAST_SAVED, nowStr);
    } catch (err) {
      console.error('LocalDatabase.saveInventory error:', err);
    }
  }

  static updateItemSyncStatus(id: string, status: SyncItemStatus): void {
    try {
      const items = this.getInventory();
      let changed = false;
      const updated = items.map(item => {
        if (item.id === id) {
          changed = true;
          return { ...item, syncStatus: status };
        }
        return item;
      });
      if (changed) {
        this.saveInventory(updated);
      }
    } catch (err) {
      console.error('LocalDatabase.updateItemSyncStatus error:', err);
    }
  }

  static markAllItemsSyncStatus(status: SyncItemStatus): void {
    try {
      const items = this.getInventory();
      const updated = items.map(item => ({ ...item, syncStatus: status }));
      this.saveInventory(updated);
    } catch (err) {
      console.error('LocalDatabase.markAllItemsSyncStatus error:', err);
    }
  }

  // Dispatched Records
  static getDispatchedRecords(): DispatchedRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DISPATCHED);
      if (!raw) return INITIAL_DISPATCHED_RECORDS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_DISPATCHED_RECORDS;
    } catch (err) {
      console.error('LocalDatabase.getDispatchedRecords error:', err);
      return INITIAL_DISPATCHED_RECORDS;
    }
  }

  static saveDispatchedRecords(records: DispatchedRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DISPATCHED, JSON.stringify(records));
    } catch (err) {
      console.error('LocalDatabase.saveDispatchedRecords error:', err);
    }
  }

  // Categories
  static getCategories(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!raw) return CATEGORIES;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : CATEGORIES;
    } catch {
      return CATEGORIES;
    }
  }

  static saveCategories(categories: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (err) {
      console.error('LocalDatabase.saveCategories error:', err);
    }
  }

  // Audit Logs
  static getAuditLogs(): SystemAuditLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (!raw) return INITIAL_SYSTEM_AUDIT_LOGS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_SYSTEM_AUDIT_LOGS;
    } catch {
      return INITIAL_SYSTEM_AUDIT_LOGS;
    }
  }

  static saveAuditLogs(logs: SystemAuditLogEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    } catch (err) {
      console.error('LocalDatabase.saveAuditLogs error:', err);
    }
  }

  // Sync Queue
  static getSyncQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveSyncQueue(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (err) {
      console.error('LocalDatabase.saveSyncQueue error:', err);
    }
  }

  // Conflicts
  static getConflicts(): ConflictItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFLICTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveConflicts(conflicts: ConflictItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));
    } catch (err) {
      console.error('LocalDatabase.saveConflicts error:', err);
    }
  }

  /**
   * Helper to attach or update versioning metadata (version, updatedAt, updatedBy, syncStatus)
   */
  static applyMetadata<T extends { id?: string; version?: number; createdAt?: string; updatedAt?: string; updatedBy?: string; syncStatus?: SyncItemStatus }>(
    item: T,
    user: string,
    isCreate = false
  ): T {
    const now = new Date().toISOString();
    const currentVersion = typeof item.version === 'number' ? item.version : 0;

    return {
      ...item,
      createdAt: isCreate ? (item.createdAt || now) : (item.createdAt || now),
      updatedAt: now,
      updatedBy: user || 'guest',
      version: isCreate ? 1 : currentVersion + 1,
      syncStatus: 'pending'
    };
  }
}
