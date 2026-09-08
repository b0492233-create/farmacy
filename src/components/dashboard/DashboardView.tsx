import React from 'react';
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle, CalendarClock,
  Package, Users, Store, Clock, ArrowUpRight, ArrowDownRight,
  ShieldAlert, RefreshCw, BarChart2, PlusCircle, ShoppingBag, Wallet,
  Database, Sparkles, Wifi
} from 'lucide-react';
import {
  getProducts, getBatches, getSales, getPurchases, getExpenses,
  getActiveShift, getCustomers, getSuppliers, getNetworkStatus
} from '../../services/storageService';
import { syncEngine } from '../../services/syncEngine';
import { compareInventoryWithDrugEye } from '../../services/drugEyeService';
import { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const products = getProducts();
  const batches = getBatches();
  const sales = getSales();
  const purchases = getPurchases();
  const expenses = getExpenses();
  const activeShift = getActiveShift();
  const customers = getCustomers();
  const suppliers = getSuppliers();
  const syncStatus = syncEngine.getStatus();
  const networkMode = getNetworkStatus();
  const drugEyeComparison = compareInventoryWithDrugEye();

  // Reference date: current date string YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  // Sales Today
  const todaySalesList = sales.filter(s => s.date.startsWith(todayStr));
  const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + s.total, 0);

  // Sales This Month
  const monthSalesList = sales.filter(s => s.date.startsWith(currentMonthStr));
  const monthSalesTotal = monthSalesList.reduce((sum, s) => sum + s.total, 0);

  // Estimated Profits: Revenue - Cost of items sold - Expenses
  let totalCostOfGoodsSold = 0;
  monthSalesList.forEach(sale => {
    sale.items.forEach(item => {
      totalCostOfGoodsSold += (item.purchasePrice || 0) * item.quantity;
    });
  });
  const monthExpensesTotal = expenses
    .filter(e => e.date.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);
  const estimatedNetProfit = Math.max(0, monthSalesTotal - totalCostOfGoodsSold - monthExpensesTotal);

  // Purchases This Month
  const monthPurchasesTotal = purchases
    .filter(p => p.date.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + p.total, 0);

  // Low Stock Products (Total Quantity <= Minimum Stock)
  const lowStockProducts = products.filter(p => (p.totalQuantity || 0) <= p.minimumStock);

  // Expiry Calculations:
  // Expired: date < today
  // Expires Today: date === today
  // Expires within 7 days
  // Expires within 30 days
  // Expires within 90 days
  const nowMs = new Date().getTime();
  const DAY_MS = 24 * 3600 * 1000;

  const expiredBatches = batches.filter(b => {
    const expMs = new Date(b.expiryDate).getTime();
    return expMs < nowMs && b.quantity > 0;
  });

  const expiringIn30Days = batches.filter(b => {
    const expMs = new Date(b.expiryDate).getTime();
    const diffDays = (expMs - nowMs) / DAY_MS;
    return diffDays >= 0 && diffDays <= 30 && b.quantity > 0;
  });

  const expiringIn90Days = batches.filter(b => {
    const expMs = new Date(b.expiryDate).getTime();
    const diffDays = (expMs - nowMs) / DAY_MS;
    return diffDays > 30 && diffDays <= 90 && b.quantity > 0;
  });

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Banner / Quick Action Bar */}
      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full font-medium border border-emerald-400/30">
              نظام إدارة الصيدلية المتكامل
            </span>
            <span className="text-xs text-slate-300">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            لوحة المتابعة والعمليات اليومية
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            متابعة فورية للمبيعات، الأرباح، المخزون الحرج، وحالة الشيفت والمزامنة.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>فاتورة بيع جديدة (POS)</span>
          </button>

          <button
            onClick={() => onNavigate('purchases')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-blue-400" />
            <span>فاتورة شراء</span>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>صرف مصروف</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">مبيعات اليوم</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {todaySalesTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>عدد الفواتير: <strong className="text-slate-800">{todaySalesList.length}</strong></span>
            <span className="text-emerald-600 font-medium">اليوم</span>
          </div>
        </div>

        {/* Month Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">مبيعات الشهر الحالي</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {monthSalesTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>فواتير الشهر: <strong className="text-slate-800">{monthSalesList.length}</strong></span>
            <span className="text-blue-600 font-medium">الشهر الحالي</span>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">صافي الأرباح التقديرية</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <BarChart2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 tracking-tight">
            {estimatedNetProfit.toFixed(2)} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>المصروفات: {monthExpensesTotal.toFixed(0)} ج.م</span>
            <span className="text-purple-600 font-medium">هامش الربح</span>
          </div>
        </div>

        {/* Purchases This Month */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">إجمالي المشتريات الشهرية</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {monthPurchasesTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>عدد الفواتير: <strong className="text-slate-800">{purchases.length}</strong></span>
            <span className="text-amber-600 font-medium">الوارد</span>
          </div>
        </div>
      </div>

      {/* Drug Eye Online Price Updates Live Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-indigo-800/40 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">تحديثات أسعار هيئة الدواء المصرية (Drug Eye® Live)</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" />
                <span>متصل بالإنترنت</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {drugEyeComparison.needsUpdateCount > 0
                ? `يوجد ${drugEyeComparison.needsUpdateCount} أصناف في مخزونك زادت أسعارها رسمياً بإجمالي فرق +${drugEyeComparison.totalPriceIncreaseAmount.toFixed(2)} ج.م.`
                : 'كافة أسعار الأدوية في صيدليتك متطابقة مع أحدث نشرات التسعيرة الجبرية الرسمية.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('drugeye')}
          className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{drugEyeComparison.needsUpdateCount > 0 ? 'مراجعة وتحديث الأسعار' : 'فتح دليل Drug Eye والبدائل'}</span>
        </button>
      </div>

      {/* Critical Alerts Row: Expiry Management & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiry Alerts Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">نظام إدارة الصلاحيات والتواريخ</h3>
                <p className="text-[11px] text-slate-500">تنبيهات الأدوية المنتهية أو القريبة من الانتهاء</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('batches')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              عرض الباتشات ←
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Expired */}
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="block text-xl font-black text-rose-700">{expiredBatches.length}</span>
              <span className="text-[11px] font-bold text-rose-600">منتهية الصلاحية</span>
              <p className="text-[10px] text-rose-500 mt-0.5">يجب استبعادها فوراً</p>
            </div>

            {/* Within 30 Days */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="block text-xl font-black text-amber-700">{expiringIn30Days.length}</span>
              <span className="text-[11px] font-bold text-amber-700">خلال 30 يوم</span>
              <p className="text-[10px] text-amber-600 mt-0.5">أولوية البيع (FEFO)</p>
            </div>

            {/* Within 90 Days */}
            <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-center">
              <span className="block text-xl font-black text-yellow-800">{expiringIn90Days.length}</span>
              <span className="text-[11px] font-bold text-yellow-700">خلال 90 يوم</span>
              <p className="text-[10px] text-yellow-600 mt-0.5">متابعة المخزون</p>
            </div>
          </div>

          {expiredBatches.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-rose-800 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>يوجد {expiredBatches.length} باتش منتهي الصلاحية يحتاج استبعاد وإعدام مخزني</span>
              </div>
              <button
                onClick={() => onNavigate('batches')}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                معالجة
              </button>
            </div>
          )}
        </div>

        {/* Low Stock Alerts Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">نواقص الأدوية والحد الأدنى</h3>
                <p className="text-[11px] text-slate-500">أدوية وصلت أو تجاوزت الحد الأدنى للطلب</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              دليل الأدوية ←
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                كافة المنتجات فوق الحد الأدنى للمخزون
              </p>
            ) : (
              lowStockProducts.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="font-bold text-xs text-slate-800">{p.nameAr}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">{p.internalCode} • {p.unit}</span>
                  </div>
                  <div className="text-left">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
                      المتبقي: {p.totalQuantity || 0}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">الحد الأدنى: {p.minimumStock}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">إجمالي الأصناف الناقصة: <strong className="text-slate-800">{lowStockProducts.length}</strong></span>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              + إنشاء أمر شراء للنواقص
            </button>
          </div>
        </div>
      </div>

      {/* Operational Status & Entity Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 mx-auto mb-2 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <span className="block text-xl font-black text-slate-800">{products.length}</span>
          <span className="text-xs text-slate-500 font-medium">عدد الأصناف والأدوية</span>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 mx-auto mb-2 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <span className="block text-xl font-black text-slate-800">{customers.length}</span>
          <span className="text-xs text-slate-500 font-medium">العملاء المسجلين</span>
        </div>

        {/* Total Suppliers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 mx-auto mb-2 flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <span className="block text-xl font-black text-slate-800">{suppliers.length}</span>
          <span className="text-xs text-slate-500 font-medium">شركات التوزيع والموردين</span>
        </div>

        {/* Active Shift Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 mx-auto mb-2 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <span className="block text-sm font-bold text-slate-800">
            {activeShift ? `شيفت ${activeShift.userName}` : 'لا يوجد شيفت'}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {activeShift ? `النقدية: ${activeShift.expectedCash.toFixed(0)} ج.م` : 'مغلق'}
          </span>
        </div>
      </div>
    </div>
  );
};
