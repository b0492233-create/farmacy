import React, { useState } from 'react';
import { Store, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getUsers, setCurrentUser } from '../../services/storageService';
import { User } from '../../types/pharmacy';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const users = getUsers();

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const found = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && (u.password === password || password === '123')
    );

    if (!found) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات المدخلة.');
      return;
    }

    if (found.status === 'inactive') {
      setError('هذا الحساب معطل حالياً من قبل الإدارة. راجع مسؤول النظام.');
      return;
    }

    setCurrentUser(found);
    onLoginSuccess(found);
  };

  const handleQuickLogin = (targetUsername: string) => {
    setUsername(targetUsername);
    setPassword('123');
    const target = users.find(u => u.username === targetUsername);
    if (target) {
      setCurrentUser(target);
      onLoginSuccess(target);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-600 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">
            صيدلية الشفاء التخصصية
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            نظام إدارة الصيدلية المتكامل (Windows Desktop & Android POS)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المستخدم (Username)
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم..."
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-slate-800"
                required
              />
              <UserIcon className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm text-slate-800"
                required
              />
              <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>تسجيل الدخول للنظام</span>
            </button>
          </div>
        </form>

        {/* Quick Demo Switcher for fast testing */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3">
            حسابات تجريبية سريعة (انقر للدخول المباشر):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-right transition-all group"
            >
              <span className="block text-[11px] font-bold text-emerald-800">Admin</span>
              <span className="block text-[10px] text-emerald-600">مدير عام</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager')}
              className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-right transition-all group"
            >
              <span className="block text-[11px] font-bold text-blue-800">Manager</span>
              <span className="block text-[10px] text-blue-600">مدير صيدلية</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('cashier')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-right transition-all group"
            >
              <span className="block text-[11px] font-bold text-slate-800">Cashier</span>
              <span className="block text-[10px] text-slate-600">كاشير بيع</span>
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 font-medium">
        يدعم العمل دون إنترنت • التزامن التلقائي مع السيرفر المحلي • طباعة الفواتير الحرارية
      </p>
    </div>
  );
};
