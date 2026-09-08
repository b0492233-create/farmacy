import React, { useState, useEffect } from 'react';
import {
  Monitor, Smartphone, Wifi, WifiOff, RefreshCw,
  Database, Server, CheckCircle2, AlertTriangle, ShieldCheck, Play
} from 'lucide-react';
import {
  getActiveDevice, getNetworkStatus, setNetworkStatus, NetworkMode,
  getSyncQueue, triggerSync
} from '../../services/storageService';
import { syncEngine, SyncEngineStatus } from '../../services/syncEngine';

export const DevicesView: React.FC = () => {
  const [networkMode, setMode] = useState<NetworkMode>(getNetworkStatus());
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const activeDevice = getActiveDevice();
  const queue = getSyncQueue();

  useEffect(() => {
    const unsub = syncEngine.subscribe(setSyncStatus);
    return () => unsub();
  }, []);

  const handleNetworkChange = (mode: NetworkMode) => {
    setNetworkStatus(mode);
    setMode(mode);
    setSyncLog(prev => [`[${new Date().toLocaleTimeString('ar-EG')}] تم تحويل نمط الشبكة إلى: ${mode}`, ...prev]);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncLog(prev => [`[${new Date().toLocaleTimeString('ar-EG')}] بدء فحص قائمة انتظار المزامنة...`, ...prev]);
    const res = await syncEngine.syncNow();
    setIsSyncing(false);
    setSyncLog(prev => [`[${new Date().toLocaleTimeString('ar-EG')}] ${res.message}`, ...prev]);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              إدارة الأجهزة والمزامنة (Devices & Sync Engine)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Offline First Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حالة الربط بين أجهزة الـ Windows/Android وخادم الـ ASP.NET Core وقاعدة بيانات PostgreSQL.
          </p>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'جار المزامنة...' : 'مزامنة فورية الآن'}</span>
        </button>
      </div>

      {/* Network Mode Switcher Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          محاكاة حالة الاتصال بالإنترنت والشبكة (Network Mode)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleNetworkChange('online')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
              networkMode === 'online'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-800 mb-1">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>متصل بالإنترنت (Online)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              الخادم الرئيسي متاح ويتم إرسال العمليات مباشرة إلى PostgreSQL.
            </p>
          </button>

          <button
            onClick={() => handleNetworkChange('local_lan')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
              networkMode === 'local_lan'
                ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs text-blue-800 mb-1">
              <Server className="w-4 h-4 text-blue-600" />
              <span>شبكة محلية داخلية (LAN Server)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              الاتصال بخادم الصيدلية المحلي عبر الراوتر الداخلي بدون إنترنت.
            </p>
          </button>

          <button
            onClick={() => handleNetworkChange('offline')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
              networkMode === 'offline'
                ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs text-rose-800 mb-1">
              <WifiOff className="w-4 h-4 text-rose-600" />
              <span>منقطع تماماً (Offline SQLite Mode)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              العمل 100% بدون إنترنت. حفظ الفواتير في SQLite ووضعها في طابور المزامنة.
            </p>
          </button>
        </div>
      </div>

      {/* Active Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Profile */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
            <Monitor className="w-4 h-4 text-emerald-600" />
            <span>بيانات هذا الجهاز (Device Identification)</span>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">اسم المحطة:</span>
              <span className="font-bold text-slate-800">{activeDevice.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">معرف الجهاز الفريد (UUID):</span>
              <span className="font-mono text-slate-700">{activeDevice.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">نوع النظام:</span>
              <span className="font-semibold text-slate-800">
                {activeDevice.type === 'windows_pos' ? 'Windows Desktop (x64)' : 'Android Mobile / Tablet'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">قاعدة البيانات المحلية:</span>
              <span className="font-mono text-emerald-700 font-bold">SQLite + Drift (IndexedDB)</span>
            </div>
          </div>
        </div>

        {/* Sync Engine Stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Database className="w-4 h-4 text-blue-600" />
              <span>إحصائيات طابور المزامنة (Sync Queue)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
              {queue.length} عناصر معلقة
            </span>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">حالة المحرك:</span>
              <span className="font-bold text-emerald-700">يعمل في الخلفية (Polling Every 30s)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">آخر مزامنة ناجحة:</span>
              <span className="font-mono text-slate-700">{syncStatus.lastSyncTime || 'الآن'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">إستراتيجية فض النزاعات:</span>
              <span className="font-semibold text-slate-800">FEFO Batches + Last-Write-Wins (LWW)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">معامل عدم التكرار (Idempotency):</span>
              <span className="font-mono text-emerald-700 font-bold">نشط ومشفر لكل عملية</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Console Logs */}
      <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-xs text-emerald-400 font-mono">سجل أحداث المزامنة (Live Sync Logs)</span>
          <span className="text-[10px] text-slate-500">تحديث فوري</span>
        </div>

        <div className="font-mono text-[11px] space-y-1 h-32 overflow-y-auto pt-2" dir="ltr">
          {syncLog.length === 0 ? (
            <div className="text-slate-500 italic">No sync events recorded yet. Click 'مزامنة فورية الآن' to test.</div>
          ) : (
            syncLog.map((log, idx) => (
              <div key={idx} className="text-emerald-300/90">
                &gt; {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
