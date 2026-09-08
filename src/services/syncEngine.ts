import {
  getSyncQueue, getNetworkStatus, setNetworkStatus, getSettings,
  getSyncConflicts, generateUUID, recordAudit, getActiveDevice, getCurrentUser
} from './storageService';
import { SyncQueueItem, SyncConflict } from '../types/pharmacy';

export interface SyncEngineStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  conflictsCount: number;
  serverConnection: 'connected' | 'disconnected' | 'checking';
  networkMode: 'online' | 'offline' | 'local_lan';
}

type SyncStatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private listeners: Set<SyncStatusListener> = new Set();
  private isSyncing: boolean = false;
  private lastSyncTime: string | null = null;
  private timerId: any = null;
  private serverConnection: 'connected' | 'disconnected' | 'checking' = 'connected';

  constructor() {
    this.startAutoSync();
  }

  public subscribe(fn: SyncStatusListener): () => void {
    this.listeners.add(fn);
    fn(this.getStatus());
    return () => this.listeners.delete(fn);
  }

  public getStatus(): SyncEngineStatus {
    const queue = getSyncQueue();
    const conflicts = getSyncConflicts();
    const unresolvedConflicts = conflicts.filter(c => c.status === 'unresolved');
    const pendingItems = queue.filter(q => q.status === 'pending');

    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingCount: pendingItems.length,
      conflictsCount: unresolvedConflicts.length,
      serverConnection: this.serverConnection,
      networkMode: getNetworkStatus(),
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }

  public async testServerConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    this.serverConnection = 'checking';
    this.notify();

    const settings = getSettings();
    const startTime = Date.now();

    // Simulate network handshake to settings.serverIp:settings.serverPort
    await new Promise(r => setTimeout(r, 600));
    const latency = Date.now() - startTime;

    const isOffline = getNetworkStatus() === 'offline';
    if (isOffline) {
      this.serverConnection = 'disconnected';
      this.notify();
      return {
        success: false,
        latencyMs: latency,
        message: 'النظام مضبوط على وضع "غير متصل (Offline)". يمكنك تفعيل وضع الشبكة المحلية أو السحابية للاتصال.',
      };
    }

    this.serverConnection = 'connected';
    this.notify();
    return {
      success: true,
      latencyMs: latency,
      message: `تم الاتصال بالسيرفر بنجاح (${settings.serverIp}:${settings.serverPort}) - زمن الاستجابة: ${latency}ms`,
    };
  }

  public async syncNow(): Promise<{ syncedCount: number; conflictCount: number; message: string }> {
    if (this.isSyncing) {
      return { syncedCount: 0, conflictCount: 0, message: 'المزامنة جارية بالفعل...' };
    }

    const netStatus = getNetworkStatus();
    if (netStatus === 'offline') {
      return {
        syncedCount: 0,
        conflictCount: 0,
        message: 'لا يمكن المزامنة حالياً نظراً لأن النظام في وضع عدم الاتصال (Offline Mode). تم حفظ التغييرات محلياً.',
      };
    }

    this.isSyncing = true;
    this.notify();

    try {
      // Simulate sync roundtrip with backend
      await new Promise(r => setTimeout(r, 1000));

      const queue = getSyncQueue();
      const pending = queue.filter(item => item.status === 'pending');

      let syncedCount = 0;
      let conflictCount = 0;

      for (const item of pending) {
        item.status = 'synced';
        syncedCount++;
      }

      // Save updated queue in localStorage
      localStorage.setItem('pms_sync_queue_v2', JSON.stringify(queue));

      this.lastSyncTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.serverConnection = 'connected';

      recordAudit({
        userId: getCurrentUser()?.id || 'system',
        userName: getCurrentUser()?.name || 'محرك المزامنة',
        action: 'SYNC_COMPLETED',
        actionAr: 'اكتمال عملية المزامنة التلقائية',
        deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
        details: `تمت مزامنة ${syncedCount} عملية بنجاح مع سيرفر PostgreSQL الرئيسي`
      });

      return {
        syncedCount,
        conflictCount,
        message: `تمت مزامنة ${syncedCount} عملية بنجاح مع قاعدة البيانات المركزية!`,
      };
    } catch (e) {
      return {
        syncedCount: 0,
        conflictCount: 0,
        message: 'فشلت المزامنة: ' + (e instanceof Error ? e.message : 'خطأ غير معروف'),
      };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public startAutoSync() {
    if (this.timerId) clearInterval(this.timerId);
    // Periodic check every 30 seconds
    this.timerId = setInterval(() => {
      const mode = getNetworkStatus();
      if (mode !== 'offline' && !this.isSyncing) {
        this.syncNow();
      }
    }, 30000);
  }
}

export const syncEngine = new SyncEngine();
