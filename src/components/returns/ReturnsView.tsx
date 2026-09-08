import React, { useState } from 'react';
import {
  Undo2, Search, Plus, Trash2, CheckCircle2, ArrowRight,
  User, Store, X, AlertCircle
} from 'lucide-react';
import {
  getSales, getProducts, getBatches, recordInventoryMovement,
  hasPermission
} from '../../services/storageService';
import { Sale, Product, Batch } from '../../types/pharmacy';

export const ReturnsView: React.FC = () => {
  const [returnType, setReturnType] = useState<'SALE_RETURN' | 'PURCHASE_RETURN'>('SALE_RETURN');
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ productId: string; productName: string; batchId?: string; batchNumber?: string; quantity: number; unitPrice: number; total: number }[]>([]);
  const [returnReason, setReturnReason] = useState('خطأ في الصرف أو رغبة العميل');
  const [feedback, setFeedback] = useState<string | null>(null);

  const sales = getSales();
  const products = getProducts();
  const canReturn = hasPermission('pos.return');

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems(
      sale.items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        batchId: it.batchId,
        batchNumber: it.batchNumber,
        quantity: 0,
        unitPrice: it.salePrice,
        total: 0,
      }))
    );
  };

  const handleUpdateReturnQty = (idx: number, qty: number, maxQty: number) => {
    setReturnItems(prev => {
      const updated = [...prev];
      const validQty = Math.max(0, Math.min(qty, maxQty));
      updated[idx].quantity = validQty;
      updated[idx].total = validQty * updated[idx].unitPrice;
      return updated;
    });
  };

  const totalReturnAmount = returnItems.reduce((sum, it) => sum + it.total, 0);
  const hasItemsToReturn = returnItems.some(it => it.quantity > 0);

  const handleExecuteReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasItemsToReturn) {
      alert('يرجى تحديد كمية صنف واحد على الأقل للإرجاع.');
      return;
    }

    // Process each return item
    returnItems.filter(it => it.quantity > 0).forEach(it => {
      recordInventoryMovement({
        productId: it.productId,
        productName: it.productName,
        batchId: it.batchId,
        batchNumber: it.batchNumber,
        quantity: it.quantity, // Positive: restored back to pharmacy stock
        movementType: 'SALE_RETURN',
        referenceId: selectedSale ? `RET-${selectedSale.invoiceNumber}` : `RET-${Date.now().toString().slice(-5)}`,
        reason: returnReason,
      });
    });

    setFeedback(`تم بنجاح إرجاع الأصناف واستعادة كمياتها في المخزون بإجمالي ${totalReturnAmount.toFixed(2)} ج.م.`);
    setSelectedSale(null);
    setReturnItems([]);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              مرتجعات المبيعات والمشتريات (Returns & Refunds)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إرجاع الأدوية واسترداد مبالغ العملاء أو الموردين مع إعادة الرصيد للمخزن آلياً.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Step 1: Select or Search Invoice to return from */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800">
          الخطوة 1: ابحث عن فاتورة البيع المراد استرجاعها
        </h3>

        <div className="relative">
          <input
            type="text"
            value={searchInvoice}
            onChange={e => setSearchInvoice(e.target.value)}
            placeholder="أدخل رقم الفاتورة أو اسم العميل..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        {/* Quick select recent sales */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500">أحدث فواتير البيع:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sales.slice(0, 6).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSale(s)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  selectedSale?.id === s.id
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-slate-800 font-mono">
                  <span>{s.invoiceNumber}</span>
                  <span className="text-emerald-700">{s.total.toFixed(2)} ج.م</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                  <span>{s.customerName || 'نقدي'}</span>
                  <span>{s.items.length} أصناف</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: Items to return */}
      {selectedSale && (
        <form onSubmit={handleExecuteReturn} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                الخطوة 2: تحديد الأصناف والكميات المرتجعة من الفاتورة ({selectedSale.invoiceNumber})
              </h3>
              <p className="text-xs text-slate-500">
                العميل: {selectedSale.customerName} • التاريخ: {selectedSale.date}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">الباتش</th>
                  <th className="p-2.5 text-center">الكمية المباعة</th>
                  <th className="p-2.5 text-center">سعر الوحدة</th>
                  <th className="p-2.5 text-center w-32">الكمية المرتجعة</th>
                  <th className="p-2.5 text-left">مبلغ الإرجاع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSale.items.map((saleItem, idx) => {
                  const retItem = returnItems[idx];
                  return (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-800">{saleItem.productName}</td>
                      <td className="p-2.5 font-mono">{saleItem.batchNumber}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700">{saleItem.quantity}</td>
                      <td className="p-2.5 text-center font-mono">{saleItem.salePrice.toFixed(2)}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max={saleItem.quantity}
                          value={retItem?.quantity || 0}
                          onChange={e => handleUpdateReturnQty(idx, parseInt(e.target.value) || 0, saleItem.quantity)}
                          className="w-20 p-1 border border-slate-300 rounded-lg text-center font-mono font-bold text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold text-emerald-800">
                        {(retItem?.total || 0).toFixed(2)} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              سبب الإرجاع *
            </label>
            <input
              type="text"
              required
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 block">إجمالي المبلغ المسترد للعميل:</span>
              <span className="text-2xl font-black text-rose-700 font-mono">
                {totalReturnAmount.toFixed(2)} ج.م
              </span>
            </div>

            <button
              type="submit"
              disabled={!hasItemsToReturn}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              تأكيد استرجاع الأصناف وإعادة الرصيد للمخزن
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
