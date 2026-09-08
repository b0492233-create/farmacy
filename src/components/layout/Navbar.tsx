import React, { useState, useEffect } from 'react';
import {
  Store, Wifi, WifiOff, RefreshCw, User as UserIcon, LogOut,
  Clock, Server, Monitor, ShieldCheck, AlertTriangle
} from 'lucide-react';
import {
  getCurrentUser, logout, getActiveBranch, getBranches, setActiveBranch,
  getActiveDevice, getActiveShift, getNetworkStatus, setNetworkStatus, NetworkMode
} from '../../services/storageService';
import { syncEngine, SyncEngineStatus } from '../../services/syncEngine';
import { User, Branch } from '../../types/pharmacy';

interface NavbarProps {
  onNavigateToShifts: () => void;
  onNavigateToSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateToShifts, onNavigateToSync }) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [activeBranch, setBranch] = useState<Branch>(getActiveBranch());
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = syncEngine.subscribe(setSyncStatus);
    return () => unsub();
  }, []);

  const activeShift = getActiveShift();
  const activeDevice = getActiveDevice();
  const branches = getBranches();

  const handleSyncClick = async () => {
    const res = await syncEngine.syncNow();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleNetworkModeChange = (mode: NetworkMode) => {
    setNetworkStatus(mode);
    setShowNetworkModal(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Right Section (RTL): Pharmacy Branding & Branch */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">
                صيدلية الشفاء التخصصية
              </h1>
              <span className="hidden md:inline-flex px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                EGP جنيه مصري
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <select
                aria-label="اختيار فرع الصيدلية"
                className="bg-transparent border-none text-slate-600 font-medium cursor-pointer p-0 focus:ring-0 text-xs"
                value={activeBranch.id}
                onChange={(e) => {
                  setActiveBranch(e.target.value);
                  setBranch(getActiveBranch());
                }}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center / Operational Badges */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Active Shift Indicator */}
          <button
            onClick={onNavigateToShifts}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeShift
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>
              {activeShift ? `الشيفت مفتوح (${activeShift.userName})` : 'لا يوجد شيفت مفتوح'}
            </span>
            {activeShift && (
              <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded-md font-bold text-[10px]">
                {activeShift.expectedCash.toFixed(0)} ج.م
              </span>
            )}
          </button>

          {/* Network Mode Status */}
          <button
            onClick={() => setShowNetworkModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {syncStatus.networkMode === 'local_lan' ? (
              <>
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>شبكة محلية (LAN)</span>
              </>
            ) : syncStatus.networkMode === 'online' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>سيرفر سحابي (Online)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-rose-700">وضع الأوفلاين (Offline)</span>
              </>
            )}
          </button>

          {/* Device ID */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 bg-slate-50 border border-slate-200">
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{activeDevice.name.slice(0, 15)}</span>
          </div>
        </div>

        {/* Left Section: Sync Trigger, User Profile, Logout */}
        <div className="flex items-center gap-2">
          {/* Sync Button */}
          <button
            onClick={handleSyncClick}
            disabled={syncStatus.isSyncing}
            title="مزامنة البيانات فورياً"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {syncStatus.isSyncing ? 'مزامنة...' : 'مزامنة'}
            </span>
            {syncStatus.pendingCount > 0 && (
              <span className="bg-amber-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                {syncStatus.pendingCount}
              </span>
            )}
          </button>

          {/* User Badge */}
          {user && (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                {user.name.slice(0, 2)}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                    {user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير صيدلية' : 'كاشير'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            title="تسجيل الخروج"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncFeedback && (
        <div className="bg-emerald-600 text-white text-xs py-1 px-4 text-center font-medium animate-in fade-in duration-200">
          {syncFeedback}
        </div>
      )}

      {/* Network Mode Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 text-right">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              إعدادات الاتصال وحالة الشبكة
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              يمكنك التبديل بين أنماط العمل لتجربة أداء النظام في حالة انقطاع الإنترنت أو العمل عبر السيرفر المحلي.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleNetworkModeChange('local_lan')}
                className={`w-full p-3.5 rounded-xl border text-right transition-all flex items-start gap-3 ${
                  syncStatus.networkMode === 'local_lan'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Server className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">الشبكة المحلية للصيدلية (Local LAN Server)</div>
                  <div className="text-xs text-slate-500">
                    الاتصال بجهاز السيرفر الرئيسي 192.168.1.10 عبر راوتر الصيدلية بدون الحاجة لإنترنت.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleNetworkModeChange('offline')}
                className={`w-full p-3.5 rounded-xl border text-right transition-all flex items-start gap-3 ${
                  syncStatus.networkMode === 'offline'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <WifiOff className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">وضع عدم الاتصال التام (Offline Mode)</div>
                  <div className="text-xs text-slate-500">
                    محاكاة انقطاع الإنترنت والشبكة. يستمر البيع والشراء محلياً ويتم حفظ العمليات في قائمة الانتظار للمزامنة لاحقاً.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleNetworkModeChange('online')}
                className={`w-full p-3.5 rounded-xl border text-right transition-all flex items-start gap-3 ${
                  syncStatus.networkMode === 'online'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Wifi className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">سيرفر سحابي مركزي (Cloud Server)</div>
                  <div className="text-xs text-slate-500">
                    الاتصال المباشر بقاعدة بيانات PostgreSQL المركزية للفروع.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNetworkModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
