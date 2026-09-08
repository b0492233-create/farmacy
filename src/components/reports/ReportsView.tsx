import React, { useState } from 'react';
import {
  BarChart2, TrendingUp, DollarSign, Calendar,
  Download, Printer, ArrowUpRight, ArrowDownRight, Package, PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import {
  getSales, getPurchases, getExpenses, getProducts
} from '../../services/storageService';

export const ReportsView: React.FC = () => {
  const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

  const sales = getSales();
  const purchases = getPurchases();
  const expenses = getExpenses();
  const products = getProducts();

  // Financial aggregates
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.total, 0);

  // Approximate COGS (Cost of goods sold ~ 75% for pharmacy wholesale margin)
  const estimatedCOGS = totalSalesRevenue * 0.72;
  const grossProfit = totalSalesRevenue - estimatedCOGS;
  const netProfit = grossProfit - totalExpensesAmount;

  // Chart data: 7 days mock aggregated from sales
  const salesTrendData = [
    { day: 'السبت', sales: 4200, profit: 1100, expenses: 250 },
    { day: 'الأحد', sales: 5800, profit: 1550, expenses: 400 },
    { day: 'الإثنين', sales: 5100, profit: 1350, expenses: 150 },
    { day: 'الثلاثاء', sales: 6400, profit: 1720, expenses: 320 },
    { day: 'الأربعاء', sales: 7200, profit: 1950, expenses: 280 },
    { day: 'الخميس', sales: 8900, profit: 2400, expenses: 500 },
    { day: 'الجمعة', sales: 6100, profit: 1650, expenses: 180 },
  ];

  // Top selling products
  const topProducts = [
    { name: 'Panadol Extra 500mg', salesCount: 142, revenue: 6390, percentage: 32 },
    { name: 'Augmentin 1gm 14 Tab', salesCount: 88, revenue: 11440, percentage: 25 },
    { name: 'Cataflam 50mg 20 Tab', salesCount: 75, revenue: 4125, percentage: 18 },
    { name: 'Concor 5mg 30 Tab', salesCount: 52, revenue: 3120, percentage: 14 },
    { name: 'Omega 3 Plus Caps', salesCount: 38, revenue: 3610, percentage: 11 },
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + "رقم الفاتورة,التاريخ,العميل,الإجمالي,طريقة الدفع,الكاشير\n"
      + sales.map(s => `${s.invoiceNumber},${s.date},${s.customerName || 'نقدي'},${s.total},${s.paymentMethod},${s.userName}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            التقارير التحليلية والأرباح (Analytics & Financials)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مؤشرات الأداء المالي، هوامش الربح، والأصناف الأكثر مبيعاً والأسرع حركة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>تصدير CSV / Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي إيرادات المبيعات</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {totalSalesRevenue.toFixed(2)} <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14% مقارنة بالشهر الماضي</span>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تكلفة البضاعة المباعة (COGS)</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {estimatedCOGS.toFixed(2)} <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            متوسط هامش خصم الصيدلية ~28%
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المصروفات والنثريات</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 font-mono">
            {totalExpensesAmount.toFixed(2)} <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            إيجار، كهرباء، ونثريات يومية
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">صافي الأرباح المحققة</span>
            <div className="p-2 bg-emerald-800/80 rounded-xl text-emerald-300">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono">
            {netProfit.toFixed(2)} <span className="text-xs font-bold text-emerald-300">ج.م</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-300 font-bold">
            صافي العائد بعد خصم التكاليف
          </div>
        </div>
      </div>

      {/* Revenue & Profit Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-800">
              منحنى المبيعات وصافي الأرباح الأسبوعي
            </h3>
            <p className="text-xs text-slate-500">تحليل مقارن بين إجمالي البيع، الأرباح، والمصروفات</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span> المبيعات
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> الأرباح
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> المصروفات
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-4" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(val: any) => [`${val} ج.م`]}
              />
              <Bar dataKey="sales" name="المبيعات" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" name="الأرباح" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="المصروفات" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800">
            الأصناف الدوائية الأكثر مبيعاً وتحقيقاً للإيرادات
          </h3>
          <p className="text-xs text-slate-500">تحليل الأصناف الأسرع دوراناً لتفادي نقص الأرصدة</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">اسم الدواء</th>
                <th className="py-3 px-3 text-center">الكمية المباعة</th>
                <th className="py-3 px-3 text-center">إجمالي الإيراد (ج.م)</th>
                <th className="py-3 px-3">نسبة المساهمة في المبيعات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <span className="w-5 inline-block text-slate-400 font-mono">#{idx + 1}</span>
                    {p.name}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                    {p.salesCount} علبة
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-emerald-800">
                    {p.revenue.toFixed(2)} ج.م
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-700 w-10 text-left">
                        {p.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
