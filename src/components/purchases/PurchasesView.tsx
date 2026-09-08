import React, { useState } from 'react';
import {
  ShoppingBag, Plus, Search, Eye, Calendar, DollarSign,
  User, CheckCircle2, Trash2, X, AlertCircle
} from 'lucide-react';
import {
  getPurchases, getSuppliers, getProducts, recordPurchase,
  hasPermission
} from '../../services/storageService';
import { Purchase, PurchaseItem, Supplier, Product } from '../../types/pharmacy';

export const PurchasesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Purchase Form state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Item row input state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [rowBatchNumber, setRowBatchNumber] = useState('');
  const [rowExpiryDate, setRowExpiryDate] = useState('');
  const [rowQty, setRowQty] = useState<number>(10);
  const [rowPurchasePrice, setRowPurchasePrice] = useState<number>(0);
  const [rowSalePrice, setRowSalePrice] = useState<number>(0);

  const purchases = getPurchases();
  const suppliers = getSuppliers();
  const products = getProducts();
  const canAddPurchase = hasPermission('purchases.add');

  const openNewPurchaseModal = () => {
    setSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber(`PINV-${Date.now().toString().slice(-6)}`);
    setItems([]);
    setDiscount(0);
    setTax(0);
    setPaid(0);
    setNotes('');

    if (products.length > 0) {
      const p = products[0];
      setSelectedProductId(p.id);
      setRowPurchasePrice(p.purchasePrice);
      setRowSalePrice(p.salePrice);
      setRowBatchNumber(`B${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      const fut = new Date();
      fut.setFullYear(fut.getFullYear() + 2);
      setRowExpiryDate(fut.toISOString().slice(0, 10));
      setRowQty(10);
    }
    setShowAddModal(true);
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find(prod => prod.id === prodId);
    if (p) {
      setRowPurchasePrice(p.purchasePrice);
      setRowSalePrice(p.salePrice);
    }
  };

  const handleAddItemToInvoice = () => {
    const p = products.find(prod => prod.id === selectedProductId);
    if (!p) return;

    if (!rowBatchNumber.trim() || !rowExpiryDate.trim() || rowQty <= 0) {
      alert('يرجى التأكد من رقم الباتش، تاريخ الانتهاء، والكمية.');
      return;
    }

    const newItem: PurchaseItem = {
      productId: p.id,
      productName: p.nameAr,
      batchNumber: rowBatchNumber.trim(),
      expiryDate: rowExpiryDate,
      quantity: Number(rowQty),
      purchasePrice: Number(rowPurchasePrice),
      salePrice: Number(rowSalePrice),
      total: Number(rowQty) * Number(rowPurchasePrice),
    };

    setItems(prev => [...prev, newItem]);

    // Reset item row
    setRowBatchNumber(`B${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount + tax);
  const remaining = Math.max(0, total - paid);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('يجب إضافة أصناف إلى الفاتورة أولاً.');
      return;
    }

    const sup = suppliers.find(s => s.id === supplierId);

    recordPurchase({
      invoiceNumber: invoiceNumber.trim(),
      supplierId,
      supplierName: sup?.name || 'مورد عام',
      items,
      subtotal,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      total,
      paid: Number(paid) || 0,
      remaining,
      paymentMethod: remaining > 0 ? 'credit' : 'cash',
      notes: notes.trim(),
    });

    setShowAddModal(false);
    setFeedback(`تم حفظ فاتورة المشتريات "${invoiceNumber}" وتحديث المخزون بنجاح.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredPurchases = purchases.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      p.userName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              فواتير المشتريات والتوريدات (Purchases & Inbound)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {purchases.length} فاتورة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل فواتير الشراء الواردة من شركات التوزيع، تسجيل الباتشات، وزيادة الأرصدة تلقائياً.
          </p>
        </div>

        {canAddPurchase && (
          <button
            onClick={openNewPurchaseModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فاتورة شراء جديدة</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم المورد أو المسؤول..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">المورد / شركة التوزيع</th>
                <th className="py-3 px-3 text-center">عدد الأصناف</th>
                <th className="py-3 px-3 text-center">الإجمالي (ج.م)</th>
                <th className="py-3 px-3 text-center">المدفوع</th>
                <th className="py-3 px-3 text-center">المتبقي (آجل)</th>
                <th className="py-3 px-3">المسؤول</th>
                <th className="py-3 px-4 text-center">معاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد فواتير مشتريات مسجلة
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {p.invoiceNumber}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {p.date}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      {p.supplierName}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {p.items.length}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                      {p.total.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-bold">
                      {p.paid.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {p.remaining > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {p.remaining.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0.00</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {p.userName}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPurchase(p)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PURCHASE INVOICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">إنشاء فاتورة توريد ومشتريات جديدة</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المورد / شركة الأدوية *
                  </label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم فاتورة المورد *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>

              {/* Add Item Section */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                <div className="font-bold text-xs text-blue-950">إضافة صنف إلى الفاتورة:</div>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">الصنف</label>
                    <select
                      value={selectedProductId}
                      onChange={e => handleProductChange(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">رقم الباتش</label>
                    <input
                      type="text"
                      value={rowBatchNumber}
                      onChange={e => setRowBatchNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={rowExpiryDate}
                      onChange={e => setRowExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={rowQty}
                      onChange={e => setRowQty(Number(e.target.value) || 1)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">سعر الشراء</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={rowPurchasePrice}
                      onChange={e => setRowPurchasePrice(Number(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddItemToInvoice}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إدراج الصنف في الجدول</span>
                  </button>
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5">الباتش</th>
                      <th className="p-2.5">الصلاحية</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-center">سعر الشراء</th>
                      <th className="p-2.5 text-left">الإجمالي</th>
                      <th className="p-2.5 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          لم يتم إدراج أي أصناف بعد في الفاتورة
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold">{item.productName}</td>
                          <td className="p-2.5 font-mono">{item.batchNumber}</td>
                          <td className="p-2.5 font-mono">{item.expiryDate}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-center font-mono">{item.purchasePrice.toFixed(2)}</td>
                          <td className="p-2.5 text-left font-mono font-black">{item.total.toFixed(2)} ج.م</td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المجموع الفرعي</label>
                  <div className="text-lg font-mono font-black text-slate-800 py-1.5">{subtotal.toFixed(2)} ج.م</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خصم الفاتورة</label>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={e => setDiscount(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صافي الفاتورة الإجمالي</label>
                  <div className="text-xl font-mono font-black text-blue-700 py-1">{total.toFixed(2)} ج.م</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المدفوع</label>
                  <input
                    type="number"
                    min="0"
                    value={paid || ''}
                    onChange={e => setPaid(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-emerald-500 rounded-lg text-xs font-mono font-bold text-center text-emerald-800 bg-white"
                  />
                  {remaining > 0 && (
                    <span className="block text-[10px] text-rose-600 font-bold mt-1">
                      المتبقي آجل: {remaining.toFixed(2)} ج.م
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  حفظ الفاتورة وإضافة الأرصدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PURCHASE DETAILS MODAL */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  تفاصيل فاتورة المشتريات: {selectedPurchase.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  المورد: {selectedPurchase.supplierName} • التاريخ: {selectedPurchase.date}
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">الباتش</th>
                    <th className="p-2.5">تاريخ الانتهاء</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-center">سعر الشراء</th>
                    <th className="p-2.5 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold">{it.productName}</td>
                      <td className="p-2.5 font-mono">{it.batchNumber}</td>
                      <td className="p-2.5 font-mono">{it.expiryDate}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                      <td className="p-2.5 text-center font-mono">{it.purchasePrice.toFixed(2)}</td>
                      <td className="p-2.5 text-left font-mono font-bold">{it.total.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
              <span>الإجمالي الكلي: <strong className="text-base font-mono text-slate-900">{selectedPurchase.total.toFixed(2)} ج.م</strong></span>
              <span>المدفوع: <strong className="text-emerald-700 font-mono">{selectedPurchase.paid.toFixed(2)} ج.م</strong></span>
              <span>المتبقي: <strong className="text-rose-700 font-mono">{selectedPurchase.remaining.toFixed(2)} ج.م</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
