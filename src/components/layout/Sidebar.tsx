import React from 'react';
import {
  LayoutDashboard, ShoppingCart, Pill, CalendarClock, Layers,
  ShoppingBag, Receipt, Undo2, Users, UserCheck, Wallet,
  Clock, BarChart3, ShieldCheck, Monitor, History, Settings,
  Download, FileCode, Database
} from 'lucide-react';
import { hasPermission } from '../../services/storageService';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'drugeye'
  | 'batches'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'returns'
  | 'suppliers'
  | 'customers'
  | 'expenses'
  | 'shifts'
  | 'reports'
  | 'users'
  | 'devices'
  | 'audit'
  | 'settings'
  | 'codebase';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lowStockCount: number;
  expiringCount: number;
  priceUpdatesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  lowStockCount,
  expiringCount,
  priceUpdatesCount,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; perm?: string }[] = [
    { id: 'dashboard', label: 'لوحة التحكم (Dashboard)', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pos', label: 'نقطة البيع (POS)', icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />, perm: 'pos.sell' },
    { id: 'products', label: 'الأدوية والمنتجات', icon: <Pill className="w-4 h-4" />, badge: lowStockCount, badgeColor: 'bg-rose-500', perm: 'products.view' },
    { id: 'drugeye', label: 'تحديث أسعار Drug Eye®', icon: <Database className="w-4 h-4 text-emerald-400" />, badge: priceUpdatesCount, badgeColor: 'bg-amber-500', perm: 'products.view' },
    { id: 'batches', label: 'الباتشات والصلاحيات', icon: <CalendarClock className="w-4 h-4" />, badge: expiringCount, badgeColor: 'bg-amber-500', perm: 'products.view' },
    { id: 'inventory', label: 'حركة المخزون والجرد', icon: <Layers className="w-4 h-4" />, perm: 'inventory.view' },
    { id: 'purchases', label: 'فواتير المشتريات', icon: <ShoppingBag className="w-4 h-4" />, perm: 'purchases.view' },
    { id: 'sales', label: 'سجل المبيعات والفواتير', icon: <Receipt className="w-4 h-4" /> },
    { id: 'returns', label: 'مرتجعات البيع والشراء', icon: <Undo2 className="w-4 h-4" />, perm: 'pos.return' },
    { id: 'suppliers', label: 'الموردين والحسابات', icon: <Users className="w-4 h-4" />, perm: 'suppliers.manage' },
    { id: 'customers', label: 'العملاء والآجل', icon: <UserCheck className="w-4 h-4" />, perm: 'customers.manage' },
    { id: 'expenses', label: 'المصروفات والنثريات', icon: <Wallet className="w-4 h-4" />, perm: 'expenses.manage' },
    { id: 'shifts', label: 'الشيفتات واليومية', icon: <Clock className="w-4 h-4" /> },
    { id: 'reports', label: 'التقارير والأرباح', icon: <BarChart3 className="w-4 h-4" />, perm: 'reports.sales' },
    { id: 'users', label: 'المستخدمين والصلاحيات', icon: <ShieldCheck className="w-4 h-4" />, perm: 'users.manage' },
    { id: 'devices', label: 'الأجهزة والمزامنة', icon: <Monitor className="w-4 h-4" /> },
    { id: 'audit', label: 'سجل العمليات (Audit)', icon: <History className="w-4 h-4" />, perm: 'audit.view' },
    { id: 'settings', label: 'إعدادات الصيدلية', icon: <Settings className="w-4 h-4" />, perm: 'settings.manage' },
    { id: 'codebase', label: 'بنية المشروع & الأكواد', icon: <FileCode className="w-4 h-4 text-indigo-500" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-l border-slate-800 select-none">
      {/* POS Quick Button */}
      <div className="p-3 border-b border-slate-800/80">
        <button
          onClick={() => onSelectTab('pos')}
          className={`w-full py-3 px-4 rounded-xl flex items-center justify-between font-bold text-sm shadow-md transition-all ${
            currentTab === 'pos'
              ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/40'
              : 'bg-emerald-600/90 text-white hover:bg-emerald-600 hover:shadow-lg'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5" />
            <span>نقطة البيع السريعة POS</span>
          </div>
          <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-md font-mono">F1</span>
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 text-xs">
        {navItems.map(item => {
          if (item.perm && !hasPermission(item.perm)) {
            return null;
          }

          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`${item.badgeColor || 'bg-slate-700'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
        <div>
          <span className="text-slate-300 font-semibold">الإصدار 2.0.0</span>
          <p className="text-[10px] text-slate-400">نظام أوفلاين معتمد</p>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="النظام يعمل بكفاءة"></div>
      </div>
    </aside>
  );
};
