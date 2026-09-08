import React, { useState } from 'react';
import {
  Receipt, Search, Eye, Printer, Undo2, Filter,
  Calendar, CheckCircle2, DollarSign, User, X
} from 'lucide-react';
import { getSales, hasPermission } from '../../services/storageService';
import { Sale } from '../../types/pharmacy';
import { ThermalReceiptModal } from '../printing/ThermalReceiptModal';

interface SalesHistoryViewProps {
  onInitiateReturn?: (sale: Sale) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ onInitiateReturn }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);

  const sales = getSales();
  const canReturn = hasPermission('pos.return');

  const filteredSales = sales.filter(s => {
    if (paymentFilter !== 'ALL' && s.paymentMethod !== paymentFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      s.userName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              سجل فواتير المبيعات (Sales Invoices Ledger)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {sales.length} فاتورة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            أرشيف كامل لكافة فواتير نقطة البيع POS مع إمكانية إعادة الطباعة أو الاسترجاع.
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
            placeholder="ابحث برقم الفاتورة، اسم العميل، أو الكاشير..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="w-full sm:w-56">
          <select
            aria-label="طريقة الدفع"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">جميع طرق الدفع</option>
            <option value="cash">نقدي (Cash)</option>
            <option value="visa">فيزا (Visa)</option>
            <option value="card">بطاقة (Card)</option>
            <option value="credit">آجل (Credit)</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">العميل</th>
                <th className="py-3 px-3 text-center">الأصناف</th>
                <th className="py-3 px-3 text-center">الصافي (ج.م)</th>
                <th className="py-3 px-3 text-center">طريقة الدفع</th>
                <th className="py-3 px-3">الكاشير</th>
                <th className="py-3 px-3 text-center">حالة المزامنة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد فواتير مبيعات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {s.invoiceNumber}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {s.date}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      {s.customerName || 'عميل نقدي'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {s.items.length}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-800 text-sm">
                      {s.total.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {s.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {s.userName}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        محفوظ محلياً
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedSaleForView(s)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="عرض تفاصيل الفاتورة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Reprint Thermal Receipt */}
                        <button
                          onClick={() => setSelectedSaleForPrint(s)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="إعادة طباعة الفاتورة الحرارية"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Quick Return */}
                        {canReturn && onInitiateReturn && (
                          <button
                            onClick={() => onInitiateReturn(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="إرجاع صنف من الفاتورة"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW SALE DETAILS MODAL */}
      {selectedSaleForView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  تفاصيل الفاتورة: {selectedSaleForView.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  العميل: {selectedSaleForView.customerName} • التاريخ: {selectedSaleForView.date}
                </p>
              </div>
              <button onClick={() => setSelectedSaleForView(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">رقم الباتش</th>
                    <th className="p-2.5">الصلاحية</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-center">سعر البيع</th>
                    <th className="p-2.5 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSaleForView.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold">{it.productName}</td>
                      <td className="p-2.5 font-mono">{it.batchNumber}</td>
                      <td className="p-2.5 font-mono">{it.expiryDate}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                      <td className="p-2.5 text-center font-mono">{it.salePrice.toFixed(2)}</td>
                      <td className="p-2.5 text-left font-mono font-bold">{it.total.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
              <span>المجموع: <strong className="text-base font-mono text-slate-900">{selectedSaleForView.total.toFixed(2)} ج.م</strong></span>
              <span>المدفوع: <strong className="text-emerald-700 font-mono">{selectedSaleForView.paid.toFixed(2)} ج.م</strong></span>
              <span>الباقي: <strong className="text-slate-700 font-mono">{selectedSaleForView.change.toFixed(2)} ج.م</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* REPRINT THERMAL RECEIPT MODAL */}
      {selectedSaleForPrint && (
        <ThermalReceiptModal
          sale={selectedSaleForPrint}
          onClose={() => setSelectedSaleForPrint(null)}
        />
      )}
    </div>
  );
};
