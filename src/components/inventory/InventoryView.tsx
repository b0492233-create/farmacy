import React, { useState } from 'react';
import {
  Layers, Plus, Minus, Search, ArrowUpRight, ArrowDownRight,
  RefreshCw, FileText, CheckCircle2, X, AlertTriangle, ArrowLeftRight
} from 'lucide-react';
import {
  getInventoryMovements, getProducts, getBatches, recordInventoryMovement,
  hasPermission
} from '../../services/storageService';
import { InventoryMovement, Product, Batch } from '../../types/pharmacy';

export const InventoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');

  // Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT' | 'DAMAGE'>('ADJUSTMENT');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const movements = getInventoryMovements();
  const products = getProducts();
  const batches = getBatches();
  const canAdjust = hasPermission('inventory.adjust');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const productBatches = selectedProduct
    ? (selectedProduct.batches || []).filter(b => b.quantity >= 0)
    : [];

  const handleOpenAdjust = () => {
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setSelectedBatchId(products[0].batches?.[0]?.id || '');
    }
    setAdjustQty(1);
    setAdjustType('ADJUSTMENT');
    setAdjustReason('تسوية جرد دوري');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const chosenBatch = productBatches.find(b => b.id === selectedBatchId) || productBatches[0];
    const qty = Number(adjustQty);

    if (qty === 0) {
      alert('يرجى تحديد كمية التسوية (موجبة للزيادة أو سالبة للعجز)');
      return;
    }

    recordInventoryMovement({
      productId: selectedProduct.id,
      productName: selectedProduct.nameAr,
      batchId: chosenBatch?.id,
      batchNumber: chosenBatch?.batchNumber,
      quantity: qty,
      movementType: adjustType,
      referenceId: `ADJ-${Date.now().toString().slice(-5)}`,
      reason: adjustReason.trim() || 'تسوية رصيد يدوي',
    });

    setShowAdjustModal(false);
    setFeedback(`تم تسجيل حركة المخزون بنجاح لصنف "${selectedProduct.nameAr}".`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'SALE':
        return { label: 'مبيعات نقدية', color: 'bg-emerald-100 text-emerald-800' };
      case 'PURCHASE':
        return { label: 'فاتورة شراء', color: 'bg-blue-100 text-blue-800' };
      case 'SALE_RETURN':
        return { label: 'مرتجع مبيعات', color: 'bg-indigo-100 text-indigo-800' };
      case 'PURCHASE_RETURN':
        return { label: 'مرتجع لمورد', color: 'bg-purple-100 text-purple-800' };
      case 'EXPIRED_DISCARD':
        return { label: 'إعدام منتهي', color: 'bg-rose-100 text-rose-800' };
      case 'DAMAGE':
        return { label: 'بضاعة تالفة', color: 'bg-amber-100 text-amber-800' };
      case 'ADJUSTMENT':
        return { label: 'تسوية جردية', color: 'bg-slate-100 text-slate-800' };
      default:
        return { label: type, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const filteredMovements = movements.filter(m => {
    if (movementFilter !== 'ALL' && m.movementType !== movementFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.productName.toLowerCase().includes(q) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
      m.referenceId.toLowerCase().includes(q) ||
      m.userName.toLowerCase().includes(q) ||
      (m.reason && m.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              حركة المخزون وسجل الجرد (Inventory Movements Ledger)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full font-mono">
              {movements.length} حركة مسجلة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سجل تدقيق كامل وغير قابل للتلاعب لكافة الحركات المخزنية الواردة والمنصرفة.
          </p>
        </div>

        {canAdjust && (
          <button
            onClick={handleOpenAdjust}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span>تسجيل تسوية جردية / تالف</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الصنف، رقم الباتش، رقم الفاتورة، أو الكاشير..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="w-full sm:w-56">
          <select
            aria-label="نوع حركة المخزون"
            value={movementFilter}
            onChange={e => setMovementFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">جميع الحركات</option>
            <option value="SALE">مبيعات نقدية</option>
            <option value="PURCHASE">مشتريات واردة</option>
            <option value="SALE_RETURN">مرتجعات مبيعات</option>
            <option value="EXPIRED_DISCARD">إعدام منتهي</option>
            <option value="DAMAGE">تالف</option>
            <option value="ADJUSTMENT">تسويات جردية</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-3">الصنف الدوائي</th>
                <th className="py-3 px-3">رقم الباتش</th>
                <th className="py-3 px-3">نوع الحركة</th>
                <th className="py-3 px-3 text-center">الكمية</th>
                <th className="py-3 px-3">المرجع / الفاتورة</th>
                <th className="py-3 px-3">المستخدم والجهاز</th>
                <th className="py-3 px-4">ملاحظات / السبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد حركات مخزنية مسجلة
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const badge = getMovementBadge(m.movementType);
                  const isPositive = m.quantity > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {m.date}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-800">
                        {m.productName}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600">
                        {m.batchNumber || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-sm">
                        <span className={isPositive ? 'text-blue-600' : 'text-rose-600'}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {m.referenceId}
                      </td>

                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        <span className="font-bold text-slate-800">{m.userName}</span>
                        <span className="block text-[10px] text-slate-400">{m.deviceId}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {m.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">تسجيل تسوية جردية أو تالف</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر الصنف المراد تسويته
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod && prod.batches && prod.batches.length > 0) {
                      setSelectedBatchId(prod.batches[0].id);
                    }
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} ({p.totalQuantity || 0} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {productBatches.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختر الباتش
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                  >
                    {productBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (رصيد: {b.quantity} | انتهاء: {b.expiryDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع الحركة
                </label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="ADJUSTMENT">تسوية جردية (عجز أو زيادة)</option>
                  <option value="DAMAGE">إهلاك بضاعة تالفة / كسر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مقدار التغيير في الكمية (أدخل رقم سالب للعجز أو موجب للزيادة)
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-center text-lg font-mono font-black"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  مثال: -2 لعجز حبتين، أو +5 لوجود زيادة غير مسجلة
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب التسوية أو التفاصيل
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="مثال: كسر أثناء النقل، تسوية جرد نهاية الشهر..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  تأكيد وحفظ الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
