import React, { useState } from 'react';
import {
  CalendarClock, AlertTriangle, ShieldCheck, Tag, Filter,
  Search, Trash2, CheckCircle2, ArrowRight
} from 'lucide-react';
import {
  getBatches, getProducts, recordInventoryMovement, updateBatchQuantity,
  hasPermission
} from '../../services/storageService';
import { Batch, Product } from '../../types/pharmacy';
import { BarcodePrintModal } from '../printing/BarcodePrintModal';

export const BatchesView: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | 'EXPIRED' | '30DAYS' | '90DAYS' | 'ZERO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [printModalData, setPrintModalData] = useState<{ product: Product; batch: Batch } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const batches = getBatches();
  const products = getProducts();
  const canManage = hasPermission('inventory.adjust');

  const nowMs = new Date().getTime();
  const DAY_MS = 24 * 3600 * 1000;

  const getExpiryStatus = (expiryDate: string, quantity: number) => {
    const expMs = new Date(expiryDate).getTime();
    const diffDays = Math.ceil((expMs - nowMs) / DAY_MS);

    if (quantity <= 0) {
      return { label: 'رصيد نافد', color: 'bg-slate-100 text-slate-600', code: 'ZERO', days: diffDays };
    }
    if (diffDays < 0) {
      return { label: `منتهي منذ ${Math.abs(diffDays)} يوم`, color: 'bg-rose-100 text-rose-800 border-rose-200', code: 'EXPIRED', days: diffDays };
    }
    if (diffDays <= 30) {
      return { label: `ينتهي خلال ${diffDays} يوم`, color: 'bg-amber-100 text-amber-900 border-amber-300', code: '30DAYS', days: diffDays };
    }
    if (diffDays <= 90) {
      return { label: `ينتهي خلال ${diffDays} يوم`, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', code: '90DAYS', days: diffDays };
    }
    return { label: `صالح (${diffDays} يوم)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', code: 'VALID', days: diffDays };
  };

  const handleDiscardExpired = (batch: Batch, product: Product) => {
    if (batch.quantity <= 0) return;
    const confirmDiscard = confirm(
      `هل تريد تأكيد إعدام واستبعاد الباتش المنتهي (${batch.batchNumber}) للصنف "${product.nameAr}" بكمية ${batch.quantity}؟`
    );
    if (!confirmDiscard) return;

    recordInventoryMovement({
      productId: product.id,
      productName: product.nameAr,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: -batch.quantity,
      movementType: 'EXPIRED_DISCARD',
      referenceId: `DISCARD-${Date.now().toString().slice(-5)}`,
      reason: `استبعاد وإعدام صنف منتهي الصلاحية (تاريخ: ${batch.expiryDate})`,
    });

    setFeedback(`تم بنجاح إعدام واستبعاد كمية ${batch.quantity} من الباتش ${batch.batchNumber}.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredBatches = batches.filter(batch => {
    const product = products.find(p => p.id === batch.productId);
    const status = getExpiryStatus(batch.expiryDate, batch.quantity);

    if (filterType === 'EXPIRED' && status.code !== 'EXPIRED') return false;
    if (filterType === '30DAYS' && status.code !== '30DAYS') return false;
    if (filterType === '90DAYS' && status.code !== '90DAYS') return false;
    if (filterType === 'ZERO' && batch.quantity > 0) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      batch.batchNumber.toLowerCase().includes(q) ||
      (product && (
        product.nameAr.toLowerCase().includes(q) ||
        product.barcode.includes(q) ||
        product.internalCode.toLowerCase().includes(q)
      ))
    );
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              إدارة الباتشات وتواريخ الصلاحية (Batches & Expiry)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
              {batches.length} تشغيلة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة لكل تشغيلة دوائية وتطبيق معايير الصرف حسب الأقرب انتهاءً (FEFO).
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الباتش أو اسم الدواء أو الباركود..."
              className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({batches.length})
            </button>
            <button
              onClick={() => setFilterType('EXPIRED')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                filterType === 'EXPIRED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              منتهية الصلاحية
            </button>
            <button
              onClick={() => setFilterType('30DAYS')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                filterType === '30DAYS'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              خلال 30 يوم
            </button>
            <button
              onClick={() => setFilterType('90DAYS')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                filterType === '90DAYS'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
              }`}
            >
              خلال 90 يوم
            </button>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الباتش (Batch No)</th>
                <th className="py-3 px-3">اسم الصنف الدوائي</th>
                <th className="py-3 px-3">تاريخ الانتهاء</th>
                <th className="py-3 px-3">حالة الصلاحية</th>
                <th className="py-3 px-3 text-center">الرصيد المتاح</th>
                <th className="py-3 px-3 text-center">سعر الشراء</th>
                <th className="py-3 px-3 text-center">سعر البيع</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد باتشات مطابقة لخيارات التصفية
                  </td>
                </tr>
              ) : (
                filteredBatches.map(b => {
                  const product = products.find(p => p.id === b.productId);
                  const status = getExpiryStatus(b.expiryDate, b.quantity);
                  const isExpired = status.code === 'EXPIRED';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {b.batchNumber}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 text-sm">
                          {product?.nameAr || 'صنف غير معروف'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {product?.barcode}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {b.expiryDate}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-black text-sm ${b.quantity <= 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                          {b.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400 mr-1">{product?.unit || 'علبة'}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-600 font-medium">
                        {b.purchasePrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {b.salePrice.toFixed(2)} ج.م
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Label */}
                          {product && (
                            <button
                              onClick={() => setPrintModalData({ product, batch: b })}
                              title="طباعة باركود الباتش"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                          )}

                          {/* Discard Expired button */}
                          {isExpired && b.quantity > 0 && canManage && product && (
                            <button
                              onClick={() => handleDiscardExpired(b, product)}
                              title="إعدام واستبعاد الباتش المنتهي"
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>إعدام</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Print Modal */}
      {printModalData && (
        <BarcodePrintModal
          product={printModalData.product}
          batch={printModalData.batch}
          onClose={() => setPrintModalData(null)}
        />
      )}
    </div>
  );
};
