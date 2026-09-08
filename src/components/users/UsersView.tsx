import React, { useState } from 'react';
import {
  ShieldCheck, Plus, Search, UserCheck, Key,
  Edit3, CheckCircle2, Lock, X
} from 'lucide-react';
import { getUsers, upsertUser, getCurrentUser, hasPermission } from '../../services/storageService';
import { User, Role } from '../../types/pharmacy';

export const UsersView: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('pharmacist');
  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const users = getUsers();
  const currentUser = getCurrentUser();
  const canManageUsers = hasPermission('users.manage');

  const openAddModal = () => {
    setSelectedUser(null);
    setUsername('');
    setName('');
    setRole('pharmacist');
    setPin('1234');
    setShowAddModal(true);
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setUsername(u.username);
    setName(u.name);
    setRole(u.role);
    setPin(u.pin || '1234');
    setShowAddModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    upsertUser({
      id: selectedUser ? selectedUser.id : undefined,
      username: username.trim(),
      name: name.trim(),
      role,
      pin: pin.trim(),
      branchId: selectedUser ? selectedUser.branchId : 'branch-01',
      isActive: true,
      permissions: role === 'admin'
        ? ['*']
        : role === 'pharmacist'
        ? ['pos.sell', 'pos.discount', 'pos.return', 'products.view', 'products.edit', 'inventory.view', 'inventory.adjust', 'purchases.view', 'purchases.add', 'customers.manage', 'suppliers.manage']
        : ['pos.sell', 'pos.return', 'products.view'],
    });

    setShowAddModal(false);
    setFeedback(`تم حفظ بيانات المستخدم "${name}" بنجاح.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return { label: 'مدير النظام (Admin)', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'pharmacist':
        return { label: 'صيدلي (Pharmacist)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'cashier':
        return { label: 'كاشير (Cashier)', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'inventory_manager':
        return { label: 'مسؤول مخزن', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              إدارة المستخدمين والصلاحيات (Users & RBAC)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
              {users.length} مستخدمين
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            صلاحيات دقيقة لكل دور (مدير، صيدلي، كاشير، أمين مخزن) مع رمز PIN سريع للدخول.
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">اسم المستخدم</th>
                <th className="py-3 px-3">الاسم بالكامل</th>
                <th className="py-3 px-3">الدور / الصلاحية</th>
                <th className="py-3 px-3 text-center">رمز PIN الدخول</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const badge = getRoleBadge(u.role);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      @{u.username}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="mr-2 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                          أنت
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                      •••• (PIN: {u.pin})
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        نشط
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {canManageUsers && (
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل بيانات المستخدم"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {selectedUser ? `تعديل المستخدم: ${selectedUser.name}` : 'إضافة مستخدم جديد'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الدخول (Username) *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. ahmed_ph"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل الظاهر في الفواتير *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="د. أحمد مصطفى"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدور والصلاحيات</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="pharmacist">صيدلي (صرف، تسعير، مرتجعات، وفواتير)</option>
                  <option value="cashier">كاشير (نقطة البيع POS واليومية فقط)</option>
                  <option value="inventory_manager">أمين مخزن (أرصدة، جرد، وتوريدات)</option>
                  <option value="admin">مدير نظام كامل الصلاحيات</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز PIN السريع (4 أرقام)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center text-lg"
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
                  حفظ المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
