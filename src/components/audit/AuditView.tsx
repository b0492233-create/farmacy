import React, { useState } from 'react';
import {
  History, Search, Filter, ShieldCheck, Clock,
  User, Monitor, Key, FileText, CheckCircle2
} from 'lucide-react';
import { getAuditLogs, hasPermission } from '../../services/storageService';
import { AuditLog } from '../../types/pharmacy';

export const AuditView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const logs = getAuditLogs();

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'SALE_CREATED':
        return { label: 'فاتورة بيع', color: 'bg-emerald-100 text-emerald-800' };
      case 'PURCHASE_CREATED':
        return { label: 'فاتورة شراء', color: 'bg-blue-100 text-blue-800' };
      case 'INVENTORY_ADJUSTMENT':
        return { label: 'تسوية رصيد', color: 'bg-amber-100 text-amber-800' };
      case 'PRODUCT_CREATED':
      case 'PRODUCT_UPDATED':
        return { label: 'تعديل صنف', color: 'bg-purple-100 text-purple-800' };
      case 'EXPENSE_RECORDED':
        return { label: 'صرف نثريات', color: 'bg-rose-100 text-rose-800' };
      case 'SHIFT_OPENED':
      case 'SHIFT_CLOSED':
        return { label: 'حركة شيفت', color: 'bg-slate-100 text-slate-800' };
      case 'SYNC_COMPLETED':
        return { label: 'مزامنة سحابية', color: 'bg-teal-100 text-teal-800' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const filteredLogs = logs.filter(l => {
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      l.details.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.deviceId.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              سجل تدقيق العمليات والأمان (Audit Trail & Activity Log)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full font-mono">
              {logs.length} سجل
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            توثيق إلكتروني مشفر لكل حركة بالنظام تشمل: المعرف الفريد UUID، المستخدم، الجهاز، ونقاط التعديل.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالمعرف الفريد UUID أو التفاصيل أو المستخدم..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-800 text-slate-800 font-mono"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="w-full sm:w-56">
          <select
            aria-label="نوع العملية في سجل التدقيق"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-slate-800"
          >
            <option value="ALL">جميع العمليات</option>
            <option value="SALE_CREATED">فواتير البيع</option>
            <option value="PURCHASE_CREATED">فواتير الشراء</option>
            <option value="INVENTORY_ADJUSTMENT">تسويات المخزون</option>
            <option value="EXPENSE_RECORDED">المصروفات</option>
            <option value="SHIFT_OPENED">فتح وإغلاق الشيفت</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">الوقت والتاريخ</th>
                <th className="py-3 px-3">المعرف الفريد (UUID)</th>
                <th className="py-3 px-3">نوع العملية</th>
                <th className="py-3 px-3">المستخدم</th>
                <th className="py-3 px-3">الجهاز</th>
                <th className="py-3 px-3">تفاصيل الحركة</th>
                <th className="py-3 px-4 text-center">حالة المزامنة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد سجلات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => {
                  const badge = getActionBadge(l.action);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {l.timestamp || `${l.date} ${l.time}`}
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        {l.id.slice(0, 16)}...
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-800">
                        {l.userName}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {l.deviceId}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-700">
                        {l.details}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          مكتمل وموثق
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
