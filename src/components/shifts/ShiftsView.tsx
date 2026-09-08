import React, { useState } from 'react';
import {
  Clock, Play, Square, DollarSign, Calendar, User,
  CheckCircle2, AlertTriangle, FileText, ArrowUpRight, ArrowDownRight,
  TrendingUp, Wallet, X
} from 'lucide-react';
import {
  getActiveShift, getShifts, openShift, closeShift,
  getCurrentUser
} from '../../services/storageService';
import { Shift } from '../../types/pharmacy';

export const ShiftsView: React.FC = () => {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState<number>(500);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [selectedClosedShift, setSelectedClosedShift] = useState<Shift | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeShift = getActiveShift();
  const shifts = getShifts();
  const currentUser = getCurrentUser();

  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openShift(Number(openingCashInput) || 0);
    setShowOpenModal(false);
    setFeedback('تم فتح الشيفت وبدء اليومية بنجاح.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenCloseModal = () => {
    if (activeShift) {
      setActualCashInput(activeShift.expectedCash);
      setCloseNotes('');
      setShowCloseModal(true);
    }
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const closed = closeShift(Number(actualCashInput), closeNotes.trim());
    setShowCloseModal(false);
    setFeedback(`تم إغلاق الشيفت بنجاح وتوليد تقرير التقفيل.`);
    setSelectedClosedShift(closed);
    setTimeout(() => setFeedback(null), 4000);
  };

  const cashDifference = activeShift ? (actualCashInput - activeShift.expectedCash) : 0;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              إدارة الشيفتات واليومية (Cashier Shifts)
            </h2>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              activeShift ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800'
            }`}>
              {activeShift ? 'الشيفت الحالي مفتوح' : 'لا يوجد شيفت نشط'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حركة النقدية بدرج الكاشير، تقفيل اليومية، واكتشاف أي عجز أو زيادة في الخزينة.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {activeShift ? (
            <button
              onClick={handleOpenCloseModal}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>تقفيل وإغلاق الشيفت الحالي</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setOpeningCashInput(500);
                setShowOpenModal(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>فتح شيفت جديد</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* ACTIVE SHIFT SUMMARY CARD */}
      {activeShift ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-6 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">الشيفت الحالي قيد التشغيل</span>
              <h3 className="text-lg font-black text-slate-800">
                المسؤول: د. {activeShift.userName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تاريخ وبدء الشيفت: <span className="font-mono">{activeShift.startTime}</span>
              </p>
            </div>

            <div className="text-left bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 block">النقدية المتوقعة بالدرج (الآن)</span>
              <span className="text-2xl font-black text-emerald-900 font-mono">
                {activeShift.expectedCash.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">رصيد أول المدة (افتتاحي)</span>
              <span className="text-base font-black text-slate-800 font-mono mt-1 block">
                {activeShift.openingCash.toFixed(2)} ج.م
              </span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-medium block">المبيعات النقدية (+)</span>
              <span className="text-base font-black text-emerald-800 font-mono mt-1 block">
                +{activeShift.cashSales.toFixed(2)} ج.م
              </span>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[11px] text-blue-700 font-medium block">مبيعات فيزا وبطاقات</span>
              <span className="text-base font-black text-blue-800 font-mono mt-1 block">
                {activeShift.cardSales.toFixed(2)} ج.م
              </span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[11px] text-amber-700 font-medium block">المصروفات النقدية (-)</span>
              <span className="text-base font-black text-amber-800 font-mono mt-1 block">
                -{activeShift.expenses.toFixed(2)} ج.م
              </span>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[11px] text-rose-700 font-medium block">المرتجعات (-)</span>
              <span className="text-base font-black text-rose-800 font-mono mt-1 block">
                -{activeShift.returns.toFixed(2)} ج.م
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xs">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">لا يوجد شيفت مفتوح حالياً</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            لبدء تسجيل المبيعات النقدية بدقة وربطها بدرج الكاشير، اضغط على زر فتح شيفت جديد وأدخل نقدية أول المدة.
          </p>
          <button
            onClick={() => {
              setOpeningCashInput(500);
              setShowOpenModal(true);
            }}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>فتح شيفت الآن</span>
          </button>
        </div>
      )}

      {/* SHIFTS ARCHIVE TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
          سجل الشيفتات السابقة والتقفيلات اليومية
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">المسؤول / الكاشير</th>
                <th className="py-3 px-3">وقت البدء</th>
                <th className="py-3 px-3">وقت الإغلاق</th>
                <th className="py-3 px-3 text-center">رصيد أول المدة</th>
                <th className="py-3 px-3 text-center">المبيعات النقدية</th>
                <th className="py-3 px-3 text-center">المتوقع بالدرج</th>
                <th className="py-3 px-3 text-center">الفعلي المحسوب</th>
                <th className="py-3 px-3 text-center">العجز / الزيادة</th>
                <th className="py-3 px-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map(s => {
                const diff = s.difference || 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {s.userName}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {s.startTime}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {s.endTime || '—'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {s.openingCash.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                      {s.cashSales.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                      {s.expectedCash.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                      {s.actualCash !== undefined ? `${s.actualCash.toFixed(2)} ج.م` : '—'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {s.actualCash === undefined ? (
                        <span className="text-slate-400">—</span>
                      ) : diff === 0 ? (
                        <span className="text-emerald-700">مطابق (0.00)</span>
                      ) : diff > 0 ? (
                        <span className="text-blue-600">+{diff.toFixed(2)} زيادة</span>
                      ) : (
                        <span className="text-rose-600">{diff.toFixed(2)} عجز</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.status === 'open' ? 'مفتوح' : 'مغلق'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN SHIFT MODAL */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">فتح شيفت جديد وبدء اليومية</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShiftSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900">
                المستخدم الحالي: <strong>{currentUser?.name || 'كاشير'}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رصيد نقدية أول المدة (الفكة الموجودة بالدرج) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={openingCashInput}
                  onChange={e => setOpeningCashInput(Number(e.target.value) || 0)}
                  className="w-full p-3 border border-emerald-500 rounded-xl text-center text-xl font-mono font-black text-emerald-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  بدء وفتح الشيفت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">تقفيل الشيفت وجرد الخزينة</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShiftSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span>النقدية المتوقعة حسابياً:</span>
                  <span className="font-mono font-bold text-slate-900">{activeShift.expectedCash.toFixed(2)} ج.م</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  النقدية الفعلية المحسوبة في الدرج (العد الفعلي) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={actualCashInput}
                  onChange={e => setActualCashInput(Number(e.target.value) || 0)}
                  className="w-full p-3 border border-slate-400 rounded-xl text-center text-2xl font-mono font-black text-slate-900"
                />
              </div>

              {/* Difference Preview */}
              <div className={`p-3 rounded-xl border text-xs flex justify-between items-center font-bold ${
                cashDifference === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : cashDifference > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <span>الفارق (عجز / زيادة):</span>
                <span className="font-mono text-sm">
                  {cashDifference === 0 ? 'مطابق تماماً' : `${cashDifference > 0 ? '+' : ''}${cashDifference.toFixed(2)} ج.م`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات وتفاصيل التقفيل
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  placeholder="ملاحظات إن وجدت..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  تأكيد إغلاق الشيفت وترحيل اليومية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
