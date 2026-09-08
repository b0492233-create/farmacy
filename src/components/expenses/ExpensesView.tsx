import React, { useState } from 'react';
import {
  Wallet, Plus, Search, DollarSign, Calendar,
  User, CheckCircle2, X
} from 'lucide-react';
import {
  getExpenses, recordExpense, hasPermission
} from '../../services/storageService';
import { Expense } from '../../types/pharmacy';

export const ExpensesView: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryNameAr, setCategoryNameAr] = useState('كهرباء ومرافق');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [feedback, setFeedback] = useState<string | null>(null);

  const expenses = getExpenses();
  const canAdd = hasPermission('expenses.manage');

  const categories = [
    'إيجار الصيدلية',
    'كهرباء ومرافق',
    'مرتبات وأجور العاملين',
    'صيانة وأدوات',
    'أدوات نظافة ومستهلكات',
    'ضيافة وبوفيه',
    'انتقالات وشحن',
    'سداد موردين',
    'مصروفات أخرى ونثريات',
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) {
      alert('يرجى كتابة المبلغ والبيان');
      return;
    }

    recordExpense({
      category: 'other',
      categoryAr: categoryNameAr,
      amount: Number(amount),
      description: description.trim(),
      paymentMethod,
    });

    setShowAddModal(false);
    setAmount(0);
    setDescription('');
    setFeedback(`تم صرف ${amount} ج.م بنجاح وتسجيلها في الشيفت الحالي.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              المصروفات والنثريات اليومية (Expenses & Petty Cash)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 rounded-full border border-amber-200">
              الإجمالي: {totalExpenses.toFixed(2)} ج.م
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل كافة المصروفات التشغيلية والنثريات وخصمها من نقدية الدرج وصافي الأرباح.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مصروف جديد</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-3">بند المصروف</th>
                <th className="py-3 px-3">البيان والتفاصيل</th>
                <th className="py-3 px-3 text-center">المبلغ (ج.م)</th>
                <th className="py-3 px-3 text-center">طريقة الصرف</th>
                <th className="py-3 px-3">المسؤول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد مصروفات مسجلة
                  </td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {e.date}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {e.categoryAr || (e as any).categoryNameAr || 'نثريات'}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {e.description}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-rose-700 text-sm">
                      {e.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {e.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {e.userName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">صرف نثريات أو مصروف تشغيلي</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بند المصروف</label>
                <select
                  value={categoryNameAr}
                  onChange={e => setCategoryNameAr(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {categories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المصروف (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="any"
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2.5 border border-amber-500 rounded-xl text-center text-xl font-mono font-black text-amber-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / تفاصيل الصرف *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="مثال: فاتورة كهرباء شهر سبتمبر، شراء ورق طباعة..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الصرف</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="cash">نقداً من درج الكاشير</option>
                  <option value="card">من الحساب البنكي / بطاقة الصيدلية</option>
                </select>
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
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  تأكيد وصرف المبلغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
