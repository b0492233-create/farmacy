import React, { useState } from 'react';
import {
  UserCheck, Plus, Search, Phone, MapPin, DollarSign,
  CreditCard, Edit3, X, CheckCircle2, User
} from 'lucide-react';
import {
  getCustomers, upsertCustomer, recordSale,
  hasPermission
} from '../../services/storageService';
import { Customer } from '../../types/pharmacy';

export const CustomersView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectNotes, setCollectNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [balance, setBalance] = useState<number>(0);

  const customers = getCustomers();
  const canManage = hasPermission('customers.manage');

  const openAddModal = () => {
    setSelectedCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setBalance(0);
    setShowAddModal(true);
  };

  const openEditModal = (c: Customer) => {
    setSelectedCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setBalance(c.balance);
    setShowAddModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    upsertCustomer({
      id: selectedCustomer ? selectedCustomer.id : undefined,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      balance: Number(balance) || 0,
    });

    setShowAddModal(false);
    setFeedback(`تم حفظ بيانات العميل "${name}" بنجاح.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenCollect = (c: Customer) => {
    setSelectedCustomer(c);
    setCollectAmount(c.balance);
    setCollectNotes(`تحصيل دفعة نقدية من حساب العميل ${c.name}`);
    setShowCollectModal(true);
  };

  const handleExecuteCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || collectAmount <= 0) return;

    // Reduce customer balance
    upsertCustomer({
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      balance: Math.max(0, selectedCustomer.balance - Number(collectAmount)),
    });

    setShowCollectModal(false);
    setFeedback(`تم بنجاح تحصيل ${collectAmount} ج.م من العميل "${selectedCustomer.name}".`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              دليل العملاء وحسابات الآجل (Customers & Debts)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {customers.length} عميل
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة ديون العملاء، المبيعات الآجلة، وتحصيل الدفعات النقدية.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
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
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">اسم العميل</th>
                <th className="py-3 px-3">رقم الهاتف</th>
                <th className="py-3 px-3">العنوان</th>
                <th className="py-3 px-3 text-center">المديونية الحالية (ج.م)</th>
                <th className="py-3 px-3">ملاحظات</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    لا يوجد عملاء مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                      {c.name}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {c.phone || '—'}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {c.address || '—'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-sm">
                      {c.balance > 0 ? (
                        <span className="text-rose-600">{c.balance.toFixed(2)} ج.م</span>
                      ) : (
                        <span className="text-emerald-700">0.00 ج.م</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {c.notes || '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.balance > 0 && canManage && (
                          <button
                            onClick={() => handleOpenCollect(c)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                            title="تحصيل دفعة نقدية"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>تحصيل</span>
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات العميل"
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

      {/* ADD/EDIT CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {selectedCustomer ? `تعديل العميل: ${selectedCustomer.name}` : 'إضافة عميل جديد'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: الحاج إبراهيم عبد الله"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="012XXXXXXXX"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">المديونية السابقة إن وجدت (ج.م)</label>
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
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {showCollectModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">تحصيل دفعة نقدية من العميل</h3>
              <button onClick={() => setShowCollectModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCollect} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800">العميل: {selectedCustomer.name}</div>
                <div className="text-slate-500">
                  إجمالي المديونية الحالية: <strong className="text-rose-600 font-mono">{selectedCustomer.balance.toFixed(2)} ج.م</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المحصل نقداً (ج.م) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedCustomer.balance}
                  value={collectAmount}
                  onChange={e => setCollectAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-emerald-500 rounded-xl text-center text-xl font-mono font-black text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التحصيل</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={e => setCollectNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  تأكيد استلام المبلغ وتحديث الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
