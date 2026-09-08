import React, { useState } from 'react';
import {
  Users, Plus, Search, Phone, MapPin, DollarSign,
  FileText, CheckCircle2, Edit3, X, CreditCard
} from 'lucide-react';
import {
  getSuppliers, upsertSupplier, recordExpense,
  hasPermission
} from '../../services/storageService';
import { Supplier } from '../../types/pharmacy';

export const SuppliersView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add/Edit Supplier form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [balance, setBalance] = useState<number>(0);

  const suppliers = getSuppliers();
  const canManage = hasPermission('suppliers.manage');

  const openAddModal = () => {
    setSelectedSupplier(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setBalance(0);
    setShowAddModal(true);
  };

  const openEditModal = (s: Supplier) => {
    setSelectedSupplier(s);
    setName(s.name);
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setBalance(s.balance);
    setShowAddModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    upsertSupplier({
      id: selectedSupplier ? selectedSupplier.id : undefined,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      balance: Number(balance) || 0,
    });

    setShowAddModal(false);
    setFeedback(`تم حفظ بيانات المورد "${name}" بنجاح.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenPayment = (s: Supplier) => {
    setSelectedSupplier(s);
    setPaymentAmount(s.balance);
    setPaymentNotes(`سداد دفعة حساب للمورد ${s.name}`);
    setShowPaymentModal(true);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || paymentAmount <= 0) return;

    // Record expense for this payment
    recordExpense({
      category: 'other',
      categoryAr: 'سداد موردين',
      amount: Number(paymentAmount),
      description: `سداد دفعة من الحساب للمورد: ${selectedSupplier.name} (${paymentNotes})`,
      paymentMethod: 'cash',
    });

    // Update supplier balance
    upsertSupplier({
      id: selectedSupplier.id,
      name: selectedSupplier.name,
      balance: Math.max(0, selectedSupplier.balance - Number(paymentAmount)),
    });

    setShowPaymentModal(false);
    setFeedback(`تم سداد ${paymentAmount} ج.م للمورد "${selectedSupplier.name}" بنجاح.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredSuppliers = suppliers.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              دليل شركات التوزيع والموردين (Suppliers & Accounts)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-50 text-purple-700 rounded-full border border-purple-200">
              {suppliers.length} مورد
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حسابات شركات الأدوية، المديونيات، وسداد الدفعات النقدية.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>إضافة مورد جديد</span>
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
            placeholder="ابحث باسم المورد أو رقم الهاتف..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-800 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">اسم الشركة / المورد</th>
                <th className="py-3 px-3">رقم الهاتف</th>
                <th className="py-3 px-3">العنوان</th>
                <th className="py-3 px-3 text-center">الرصيد الدائن المستحق (ج.م)</th>
                <th className="py-3 px-3">ملاحظات</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    لا يوجد موردين مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                      {s.name}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {s.phone || '—'}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {s.address || '—'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-sm">
                      {s.balance > 0 ? (
                        <span className="text-rose-600">{s.balance.toFixed(2)} ج.م</span>
                      ) : (
                        <span className="text-emerald-700">0.00 ج.م</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {s.notes || '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {s.balance > 0 && canManage && (
                          <button
                            onClick={() => handleOpenPayment(s)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                            title="سداد دفعة حساب"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>سداد</span>
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات المورد"
                          >
                            <Edit3 className="w-4 h-4" />
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

      {/* ADD/EDIT SUPPLIER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {selectedSupplier ? `تعديل المورد: ${selectedSupplier.name}` : 'إضافة مورد / شركة توزيع جديدة'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: شركة ابن سينا فارما"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي المستحق للمورد (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  value={balance}
                  onChange={e => setBalance(Number(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
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
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER PAYMENT MODAL */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">سداد دفعة حساب للمورد</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800">المورد: {selectedSupplier.name}</div>
                <div className="text-slate-500">
                  إجمالي الحساب المستحق: <strong className="text-rose-600 font-mono">{selectedSupplier.balance.toFixed(2)} ج.م</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المراد سداده الآن (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedSupplier.balance}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-emerald-500 rounded-xl text-center text-xl font-mono font-black text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / ملاحظات السداد</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  تأكيد السداد وخصم المبلغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
