import React, { useState } from 'react';
import {
  Settings, Building2, Users, Shield, Database,
  Download, Upload, Save, CheckCircle2, Server, Smartphone, Key,
  Wifi, Sparkles, RefreshCw, Printer
} from 'lucide-react';
import {
  getBranches, getPharmacySettings, updatePharmacySettings,
  getCurrentUser, hasPermission, getProducts, getSales, getBatches, getActiveBranch
} from '../../services/storageService';
import {
  getDrugEyeSettings, saveDrugEyeSettings, checkDrugEyeConnection
} from '../../services/drugEyeService';
import { PharmacySettings, Branch } from '../../types/pharmacy';
import { PrinterSettingsPanel } from './PrinterSettingsPanel';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PHARMACY' | 'BRANCHES' | 'SYNC' | 'DRUG_EYE' | 'PRINTERS' | 'BACKUP'>('PHARMACY');
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentSettings = getPharmacySettings();
  const branches = getBranches();
  const activeBranch = getActiveBranch();
  const currentUser = getCurrentUser();
  const canManageSettings = hasPermission('settings.manage');

  // Drug Eye State
  const [drugEyeConfig, setDrugEyeConfig] = useState(() => getDrugEyeSettings());
  const [isTestingDrugEye, setIsTestingDrugEye] = useState(false);
  const [drugEyeTestResult, setDrugEyeTestResult] = useState<string | null>(null);

  // Form states
  const [pharmacyName, setPharmacyName] = useState(currentSettings.pharmacyNameAr || '');
  const [phone, setPhone] = useState(currentSettings.phone1 || '');
  const [address, setAddress] = useState(currentSettings.address || '');
  const [taxNumber, setTaxNumber] = useState(currentSettings.taxNumber || '');
  const [commercialRecord, setCommercialRecord] = useState(currentSettings.commercialRegister || '');
  const [receiptFooter, setReceiptFooter] = useState(currentSettings.invoiceFooterMessage || '');
  const [apiUrl, setApiUrl] = useState('http://localhost:5000/api');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePharmacySettings({
      pharmacyNameAr: pharmacyName.trim(),
      phone1: phone.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      commercialRegister: commercialRecord.trim(),
      invoiceFooterMessage: receiptFooter.trim(),
      receiptFooterAr: receiptFooter.trim(),
    });

    setFeedback('تم حفظ إعدادات وبيانات الصيدلية بنجاح.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExportFullBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings: getPharmacySettings(),
      branches: getBranches(),
      products: getProducts(),
      batches: getBatches(),
      sales: getSales(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmacy_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setFeedback('تم تصدير النسخة الاحتياطية الكاملة بنجاح.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              إعدادات النظام والفروع (Settings & Configuration)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تهيئة بيانات الصيدلية، الربط مع خادم ASP.NET Core، إدارة الفروع، والنسخ الاحتياطي.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('PHARMACY')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PHARMACY'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات الصيدلية والفاتورة</span>
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'BRANCHES'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>إدارة الفروع ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SYNC')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SYNC'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>خادم API والعمل Offline</span>
        </button>

        <button
          onClick={() => setActiveTab('DRUG_EYE')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'DRUG_EYE'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>ربط Drug Eye® السحابي</span>
        </button>

        <button
          onClick={() => setActiveTab('PRINTERS')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PRINTERS'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>إعدادات الطابعات والملصقات</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'BACKUP'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>النسخ الاحتياطي والأمان</span>
        </button>
      </div>

      {/* TAB 1: PHARMACY INFO */}
      {activeTab === 'PHARMACY' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصيدلية الرسمي *</label>
              <input
                type="text"
                required
                value={pharmacyName}
                onChange={e => setPharmacyName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف والخط الساخن</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">العنوان الرئيسي</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (Tax ID)</label>
              <input
                type="text"
                value={taxNumber}
                onChange={e => setTaxNumber(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السجل التجاري (Commercial Record)</label>
              <input
                type="text"
                value={commercialRecord}
                onChange={e => setCommercialRecord(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">تذييل الإيصال الحراري (ملاحظات الفاتورة)</label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={e => setReceiptFooter(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: BRANCHES */}
      {activeTab === 'BRANCHES' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">قائمة فروع الصيدلية المسجلة</h3>
              <p className="text-xs text-slate-500">يدعم النظام العمل متعدد الفروع (Multi-Branch) ومزامنة الأرصدة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(b => (
              <div
                key={b.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  b.id === activeBranch?.id
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                    <span className="font-bold text-sm text-slate-800">{b.nameAr || b.name}</span>
                  </div>
                  {b.isMain && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                      الفرع الرئيسي
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1 font-medium">
                  <div>العنوان: {b.address}</div>
                  <div>الهاتف: <span className="font-mono">{b.phone}</span></div>
                  <div>كود الفرع: <span className="font-mono font-bold text-slate-800">{b.code || b.id}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SYNC & OFFLINE CONFIG */}
      {activeTab === 'SYNC' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-slate-800">إعدادات الاتصال بالخادم والمزامنة Offline First</h3>
            <p className="text-xs text-slate-500">
              تكوين خادم الـ ASP.NET Core Web API ومحرك المزامنة التلقائي.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رابط خادم الـ API الرئيسي (ASP.NET Core Web API)
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono text-left bg-slate-50"
                dir="ltr"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                الافتراضي: http://localhost:5000/api أو IP الخادم المحلي بالشبكة الداخلية (LAN)
              </span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>محرك المزامنة التلقائي (Background Sync Engine) نشط</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                في حالة انقطاع الإنترنت أو تعذر الوصول للخادم المركزي، يتم تخزين كافة الفواتير والحركات المخزنية محلياً مع تشفير Idempotency Key و UUID. عند عودة الاتصال تتم المزامنة تلقائياً دون أي تكرار أو تعارض.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DRUG EYE CLOUD SETTINGS */}
      {activeTab === 'DRUG_EYE' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>إعدادات ربط Drug Eye® السحابي (تحديث الأسعار الرسمي بالإنترنت)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ربط الصيدلية مباشرة بمنظومة Drug Eye السحابية لجلب أحدث قرارات التسعيرة الجبرية الصادرة عن هيئة الدواء المصرية (EDA).
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-xs text-slate-800 block">تفعيل الربط السحابي التلقائي بالإنترنت</span>
                <span className="text-[11px] text-slate-500">فحص وتنبيه الصيدلي بأي تغيرات سعرية رسمية تلقائياً</span>
              </div>
              <input
                type="checkbox"
                checked={drugEyeConfig.enabled}
                onChange={e => {
                  const updated = saveDrugEyeSettings({ enabled: e.target.checked });
                  setDrugEyeConfig(updated);
                }}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">رابط خادم Drug Eye (API Endpoint):</label>
              <input
                type="text"
                value={drugEyeConfig.apiEndpoint}
                onChange={e => setDrugEyeConfig({ ...drugEyeConfig, apiEndpoint: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">كود ترخيص الصيدلية (License ID):</label>
                <input
                  type="text"
                  value={drugEyeConfig.pharmacyLicenseId}
                  onChange={e => setDrugEyeConfig({ ...drugEyeConfig, pharmacyLicenseId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">المفتاح الآمن (API Key):</label>
                <input
                  type="password"
                  value={drugEyeConfig.apiKey}
                  onChange={e => setDrugEyeConfig({ ...drugEyeConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-xs text-slate-800 block">تحديث سعر البيع لكافة باتشات المخزن الحالية</span>
                <span className="text-[11px] text-slate-500">تحديث أسعار التشغيلات الموجودة حالياً بالمخزن وطباعة استيكرات بالسعر الجديد</span>
              </div>
              <input
                type="checkbox"
                checked={drugEyeConfig.updateBatchesWithProduct}
                onChange={e => {
                  const updated = saveDrugEyeSettings({ updateBatchesWithProduct: e.target.checked });
                  setDrugEyeConfig(updated);
                }}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300"
              />
            </div>

            {drugEyeTestResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{drugEyeTestResult}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  saveDrugEyeSettings(drugEyeConfig);
                  setFeedback('تم حفظ إعدادات Drug Eye بنجاح.');
                  setTimeout(() => setFeedback(null), 3000);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                حفظ الإعدادات
              </button>

              <button
                type="button"
                disabled={isTestingDrugEye}
                onClick={async () => {
                  setIsTestingDrugEye(true);
                  setDrugEyeTestResult(null);
                  try {
                    const res = await checkDrugEyeConnection();
                    if (res.connected) {
                      setDrugEyeTestResult(`الاتصال نشط وسريع (Ping: ${res.latencyMs}ms). تم التحقق من رقم النشرة: ${res.edaBulletinNo}`);
                    } else {
                      setDrugEyeTestResult(`فشل الاتصال: ${res.message}`);
                    }
                  } finally {
                    setIsTestingDrugEye(false);
                  }
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Wifi className={`w-4 h-4 text-emerald-600 ${isTestingDrugEye ? 'animate-pulse' : ''}`} />
                <span>{isTestingDrugEye ? 'جاري فحص الاتصال...' : 'اختبار الاتصال المباشر بالإنترنت'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRINTERS */}
      {activeTab === 'PRINTERS' && (
        <PrinterSettingsPanel />
      )}

      {/* TAB 6: BACKUP */}
      {activeTab === 'BACKUP' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-800">النسخ الاحتياطي والأمان (Backup & Security)</h3>
            <p className="text-xs text-slate-500">
              تصدير قاعدة البيانات بالكامل إلى ملف مشفر أو استعادة نسخة سابقة.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 block">تصدير نسخة احتياطية فورية</span>
                <span className="text-[11px] text-slate-500">تشمل الأصناف، الباتشات، الفواتير، والعملاء</span>
              </div>

              <button
                onClick={handleExportFullBackup}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>تحميل النسخة الاحتياطية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
