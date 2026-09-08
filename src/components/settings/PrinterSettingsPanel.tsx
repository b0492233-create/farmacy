import React, { useState, useEffect } from 'react';
import {
  Printer, Tag, Sliders, Check, Plus, Trash2, HelpCircle,
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, Laptop,
  Cpu, FileText, Settings2, Play, Eye, X
} from 'lucide-react';
import {
  getPrinterSettings, savePrinterSettings, detectSystemPrinters,
  addCustomPrinter, removePrinter, PrinterDevice, PrinterSettingsConfig,
  DEFAULT_AVAILABLE_PRINTERS
} from '../../services/printerService';
import { getSettings } from '../../services/storageService';
import { generateCode128Svg } from '../../utils/barcodeGenerator';

export const PrinterSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<PrinterSettingsConfig>(() => getPrinterSettings());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [testModalType, setTestModalType] = useState<'invoice' | 'barcode' | null>(null);

  // Add printer modal form
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterType, setNewPrinterType] = useState<PrinterDevice['type']>('thermal_receipt');
  const [newPrinterConn, setNewPrinterConn] = useState<PrinterDevice['connection']>('usb');
  const [newPrinterIp, setNewPrinterIp] = useState('');
  const [newPrinterPaper, setNewPrinterPaper] = useState('80mm');

  const pharmacyInfo = getSettings();

  // Show feedback banner helper
  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // 1. Change Default Invoice Printer
  const handleSetDefaultInvoice = (printerName: string) => {
    const updated = savePrinterSettings({ defaultInvoicePrinter: printerName });
    setSettings(updated);
    notify(`تم تعيين "${printerName}" كطابعة افتراضية لفواتير المبيعات وحفظها في الذاكرة المحلية.`);
  };

  // 2. Change Default Barcode Printer
  const handleSetDefaultBarcode = (printerName: string) => {
    const updated = savePrinterSettings({ defaultBarcodePrinter: printerName });
    setSettings(updated);
    notify(`تم تعيين "${printerName}" كطابعة افتراضية لملصقات الباركود وحفظها في الذاكرة المحلية.`);
  };

  // 3. Toggle print options
  const handleToggleOption = (key: keyof PrinterSettingsConfig, val: any) => {
    const updated = savePrinterSettings({ [key]: val });
    setSettings(updated);
    notify('تم تحديث خيارات وتفضيلات الطباعة وحفظها في localStorage.');
  };

  // 4. Scan & Detect connected printers
  const handleScanPrinters = async () => {
    setIsScanning(true);
    try {
      const list = await detectSystemPrinters();
      setSettings(prev => ({ ...prev, availablePrinters: list }));
      notify(`تم فحص منافذ الجهاز والكشف عن ${list.length} طابعة متاحة.`);
    } catch {
      notify('تعذر استرداد قائمة الطابعات من النظام.');
    } finally {
      setIsScanning(false);
    }
  };

  // 5. Add custom printer
  const handleAddCustomPrinterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim()) return;

    const updated = addCustomPrinter({
      name: newPrinterName.trim(),
      type: newPrinterType,
      connection: newPrinterConn,
      paperWidth: newPrinterPaper,
      ipAddress: newPrinterConn === 'network' ? newPrinterIp.trim() : undefined,
      status: 'online',
    });

    setSettings(updated);
    setShowAddModal(false);
    setNewPrinterName('');
    setNewPrinterIp('');
    notify(`تمت إضافة الطابعة "${newPrinterName.trim()}" بنجاح.`);
  };

  // 6. Remove printer
  const handleRemovePrinter = (id: string, name: string) => {
    if (settings.availablePrinters.length <= 1) {
      notify('لا يمكن حذف آخر طابعة متبقية في النظام.');
      return;
    }
    const updated = removePrinter(id);
    // If removed printer was default, fallback to first available
    if (settings.defaultInvoicePrinter === name) {
      const fallback = updated.availablePrinters.find(p => p.type === 'thermal_receipt') || updated.availablePrinters[0];
      updated.defaultInvoicePrinter = fallback?.name || '';
      savePrinterSettings({ defaultInvoicePrinter: updated.defaultInvoicePrinter });
    }
    if (settings.defaultBarcodePrinter === name) {
      const fallback = updated.availablePrinters.find(p => p.type === 'barcode_label') || updated.availablePrinters[0];
      updated.defaultBarcodePrinter = fallback?.name || '';
      savePrinterSettings({ defaultBarcodePrinter: updated.defaultBarcodePrinter });
    }
    setSettings(updated);
    notify(`تم حذف الطابعة "${name}" من القائمة.`);
  };

  // 7. Reset to factory default
  const handleResetToDefaults = () => {
    if (window.confirm('هل تريد استعادة قائمة الطابعات والإعدادات الافتراضية؟')) {
      const reset = savePrinterSettings({
        defaultInvoicePrinter: DEFAULT_AVAILABLE_PRINTERS[0].name,
        defaultBarcodePrinter: DEFAULT_AVAILABLE_PRINTERS[3].name,
        availablePrinters: DEFAULT_AVAILABLE_PRINTERS,
        autoPrintInvoiceOnSale: true,
        invoicePaperWidth: '80mm',
        barcodeLabelPreset: '50x25',
        openCashDrawerOnPrint: true,
        printCutPaper: true,
        barcodeCopiesDefault: 1,
      });
      setSettings(reset);
      notify('تمت استعادة الإعدادات والطابعات الافتراضية بنجاح.');
    }
  };

  const invoicePrinters = settings.availablePrinters.filter(
    p => p.type === 'thermal_receipt' || p.type === 'laser_general' || p.type === 'virtual'
  );

  const barcodePrinters = settings.availablePrinters.filter(
    p => p.type === 'barcode_label' || p.type === 'thermal_receipt' || p.type === 'virtual'
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center shadow-md animate-in fade-in flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Top Banner: Status & Overview */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Printer className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-black tracking-wide">
                لوحة تحكم وإعدادات الطابعات (Printer Management)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              تحكم بالطابعات الافتراضية لفواتير المبيعات الحرارية وملصقات الباركود، مع حفظ وتخزين التفضيلات مباشرة في ذاكرة المتصفح المحلية (localStorage) لاستخدامها التلقائي في كافة عمليات البيع والمخزون.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleScanPrinters}
              disabled={isScanning}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-600 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جاري الفحص...' : 'فحص منافذ الجهاز'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة طابعة يدوياً</span>
            </button>
          </div>
        </div>

        {/* Current Active Defaults Quick Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">طابعة فواتير المبيعات الافتراضية:</span>
                <span className="text-xs font-black text-emerald-300 font-mono">
                  {settings.defaultInvoicePrinter || 'غير محددة'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTestModalType('invoice')}
              className="px-2.5 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>اختبار</span>
            </button>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">طابعة ملصقات الباركود الافتراضية:</span>
                <span className="text-xs font-black text-indigo-300 font-mono">
                  {settings.defaultBarcodePrinter || 'غير محددة'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTestModalType('barcode')}
              className="px-2.5 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 text-indigo-400" />
              <span>اختبار</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two Columns: Default Invoice Printer & Default Barcode Printer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: INVOICE / RECEIPT PRINTER */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  طابعة فواتير المبيعات (POS Receipt)
                </h4>
                <p className="text-[11px] text-slate-500">
                  تُستخدم لطباعة بونات الكاشير والإيصالات الحرارية في نقطة البيع
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
              فاتورة POS
            </span>
          </div>

          {/* Select Default Invoice Printer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اختر الطابعة الافتراضية للفواتير من الطابعات المتاحة:
            </label>
            <select
              value={settings.defaultInvoicePrinter}
              onChange={e => handleSetDefaultInvoice(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              {invoicePrinters.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name} — [{p.paperWidth} | {p.connection.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* Quick Select Buttons */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-1.5">اختيار سريع لطابعات الفواتير:</span>
            <div className="flex flex-wrap gap-1.5">
              {invoicePrinters.slice(0, 4).map(p => {
                const isSelected = settings.defaultInvoicePrinter === p.name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSetDefaultInvoice(p.name)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                    <span>{p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Size Radio */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              عرض مقاس رول ورق الفواتير:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '80mm', label: '80 مم', desc: 'حراري قياسي عريض' },
                { id: '58mm', label: '58 مم', desc: 'حراري صغير محمول' },
                { id: 'A4', label: 'ورق A4', desc: 'ليزر / فواتير ضريبية' },
              ].map(opt => {
                const isSelected = settings.invoicePaperWidth === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleOption('invoicePaperWidth', opt.id)}
                    className={`p-2 rounded-xl text-right border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* POS Automation Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                طباعة الفاتورة تلقائياً عند تأكيد البيع في الكاشير
              </span>
              <input
                type="checkbox"
                checked={settings.autoPrintInvoiceOnSale}
                onChange={e => handleToggleOption('autoPrintInvoiceOnSale', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                إرسال أمر نبضة لفتح درج النقدية تلقائياً (Cash Drawer Kick)
              </span>
              <input
                type="checkbox"
                checked={settings.openCashDrawerOnPrint}
                onChange={e => handleToggleOption('openCashDrawerOnPrint', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                قص الورق تلقائياً بعد نهاية البون (Auto Paper Cut)
              </span>
              <input
                type="checkbox"
                checked={settings.printCutPaper}
                onChange={e => handleToggleOption('printCutPaper', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setTestModalType('invoice')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>معاينة واختبار طباعة فاتورة تجريبية</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: BARCODE LABEL PRINTER */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  طابعة ملصقات الباركود (Barcode Labels)
                </h4>
                <p className="text-[11px] text-slate-500">
                  تُستخدم لطباعة استيكرات الأسعار والتشغيلات لعلب الأدوية والرفوف
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-md">
              ملصقات الباركود
            </span>
          </div>

          {/* Select Default Barcode Printer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اختر الطابعة الافتراضية لملصقات الباركود من الطابعات المتاحة:
            </label>
            <select
              value={settings.defaultBarcodePrinter}
              onChange={e => handleSetDefaultBarcode(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              {barcodePrinters.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name} — [{p.paperWidth} | {p.connection.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* Quick Select Buttons */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-1.5">اختيار سريع لطابعات الباركود:</span>
            <div className="flex flex-wrap gap-1.5">
              {barcodePrinters.slice(0, 4).map(p => {
                const isSelected = settings.defaultBarcodePrinter === p.name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSetDefaultBarcode(p.name)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                    <span>{p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Label Preset */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              مقاس رول ملصقات الباركود الافتراضي:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '50x25', label: '50 × 25 مم', desc: 'القياسي لصيدليات مصر' },
                { id: '40x20', label: '40 × 20 مم', desc: 'علب صغيرة وقطرات' },
                { id: '38x25', label: '38 × 25 مم', desc: 'رول استيكر مزدوج' },
                { id: '60x30', label: '60 × 30 مم', desc: 'استيكر رف وكراتين' },
                { id: '50x30', label: '50 × 30 مم', desc: 'شامل تاريخ الصلاحية' },
                { id: 'custom', label: 'مقاس يدوي', desc: 'تحديد دقيق بالـ مم' },
              ].map(opt => {
                const isSelected = settings.barcodeLabelPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleOption('barcodeLabelPreset', opt.id)}
                    className={`p-2 rounded-xl text-right border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Copies */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عدد النسخ الافتراضي عند فتح الطباعة:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                value={settings.barcodeCopiesDefault}
                onChange={e => handleToggleOption('barcodeCopiesDefault', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 p-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-center"
              />
              <span className="text-xs text-slate-500">
                (يمكن تغييره في أي وقت من شاشة طباعة الباركود)
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setTestModalType('barcode')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>معاينة واختبار طباعة ملصق باركود تجريبي</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: PRINTERS LIST & HARDWARE MANAGEMENT */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span>الطابعات المعرفة والمتاحة على هذا الجهاز</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
                {settings.availablePrinters.length} طابعة
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنك تعيين أي طابعة كافتراضية بضغطة زر، أو إضافة طابعة شبكية / USB جديدة.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              استعادة الافتراضي
            </button>
          </div>
        </div>

        {/* Printers Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold">اسم الطابعة</th>
                <th className="py-2.5 px-3 font-bold">النوع والاستخدام</th>
                <th className="py-2.5 px-3 font-bold">المنفذ والاتصال</th>
                <th className="py-2.5 px-3 font-bold">المقاس المدعوم</th>
                <th className="py-2.5 px-3 font-bold">الحالة</th>
                <th className="py-2.5 px-3 font-bold text-center">التعيين كافتراضية</th>
                <th className="py-2.5 px-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.availablePrinters.map(p => {
                const isDefaultInvoice = settings.defaultInvoicePrinter === p.name;
                const isDefaultBarcode = settings.defaultBarcodePrinter === p.name;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {p.type === 'thermal_receipt' ? (
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : p.type === 'barcode_label' ? (
                          <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span>{p.name}</span>
                      </div>
                      {p.ipAddress && (
                        <span className="text-[10px] font-mono text-slate-400 block mr-6">
                          IP: {p.ipAddress}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {p.type === 'thermal_receipt' && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          فواتير كاشير POS
                        </span>
                      )}
                      {p.type === 'barcode_label' && (
                        <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          ملصقات باركود
                        </span>
                      )}
                      {p.type === 'virtual' && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          طابعة النظام الافتراضية
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase font-bold">
                        {p.connection}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {p.paperWidth}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>متصلة وجاهزة</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultInvoice(p.name)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            isDefaultInvoice
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                          title="تعيين كطابعة فواتير افتراضية"
                        >
                          {isDefaultInvoice ? 'افتراضية للفواتير ✓' : 'للفواتير'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetDefaultBarcode(p.name)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            isDefaultBarcode
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                          title="تعيين كطابعة باركود افتراضية"
                        >
                          {isDefaultBarcode ? 'افتراضية للباركود ✓' : 'للباركود'}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePrinter(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الطابعة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage persistence indicator bar */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            تفضيلاتك محفوظة تلقائياً في الذاكرة المحلية (localStorage: <code>pms_printer_settings_v2</code>) وتظل نشطة ومحفوظة حتى بعد إعادة تشغيل المتصفح أو الجهاز.
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            savePrinterSettings(settings);
            notify('تم تأكيد وحفظ كافة التفضيلات بنجاح في localStorage.');
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>تأكيد الحفظ في الجهاز</span>
        </button>
      </div>

      {/* MODAL: ADD CUSTOM PRINTER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>إضافة طابعة جديدة للنظام</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomPrinterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطابعة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Xprinter XP-420B أو EPSON TM-T88VI"
                  value={newPrinterName}
                  onChange={e => setNewPrinterName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع واستخدام الطابعة</label>
                <select
                  value={newPrinterType}
                  onChange={e => setNewPrinterType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="thermal_receipt">طابعة فواتير وإيصالات كاشير (Thermal POS)</option>
                  <option value="barcode_label">طابعة ملصقات واستيكرات باركود (Barcode Labels)</option>
                  <option value="laser_general">طابعة ليزر / ورق عام (Laser / Inkjet A4)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع المنفذ / الاتصال</label>
                  <select
                    value={newPrinterConn}
                    onChange={e => setNewPrinterConn(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="usb">USB مباشر</option>
                    <option value="network">شبكة LAN / IP</option>
                    <option value="bluetooth">بلوتوث Bluetooth</option>
                    <option value="system">نظام التشغيل Spooler</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عرض الورق الافتراضي</label>
                  <input
                    type="text"
                    value={newPrinterPaper}
                    onChange={e => setNewPrinterPaper(e.target.value)}
                    placeholder="80mm أو 50x25mm"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {newPrinterConn === 'network' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان IP الطابعة والمنفذ</label>
                  <input
                    type="text"
                    placeholder="192.168.1.200:9100"
                    value={newPrinterIp}
                    onChange={e => setNewPrinterIp(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono text-left"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  إضافة الطابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TEST PRINT PREVIEW */}
      {testModalType && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>
                  {testModalType === 'invoice'
                    ? 'اختبار طباعة فاتورة تجريبية'
                    : 'اختبار طباعة ملصق باركود تجريبي'}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setTestModalType(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {testModalType === 'invoice' ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500">
                  سيتم إرسال هذا الإيصال الاختباري إلى الطابعة الافتراضية للفواتير:
                  <span className="font-bold text-emerald-700 block mt-0.5">
                    {settings.defaultInvoicePrinter}
                  </span>
                </div>

                {/* Printable receipt preview container */}
                <div className="bg-slate-50 p-4 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 space-y-2 shadow-inner">
                  <div className="text-center font-bold border-b border-slate-300 pb-1">
                    <div>{pharmacyInfo.pharmacyNameAr || 'صيدلية النور الحديثة'}</div>
                    <div className="text-[9px] text-slate-500">*** إيصال اختبار طباعة ***</div>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>رقم الفاتورة:</span>
                    <span>INV-TEST-001</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>التاريخ:</span>
                    <span>{new Date().toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="border-t border-b border-dashed border-slate-300 py-1 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>كونكور 5 مجم (1 علبة)</span>
                      <span>52.00 ج.م</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>بنادول إكسترا (1 علبة)</span>
                      <span>45.00 ج.م</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1">
                    <span>الإجمالي النهائي:</span>
                    <span>97.00 ج.م</span>
                  </div>
                  <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-300">
                    شكراً لزيارتكم • الطابعة تعمل بنجاح
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500">
                  سيتم إرسال هذا الملصق الاختباري إلى طابعة الباركود الافتراضية:
                  <span className="font-bold text-indigo-700 block mt-0.5">
                    {settings.defaultBarcodePrinter}
                  </span>
                </div>

                {/* Printable barcode label preview container */}
                <div className="bg-white p-3 border-2 border-slate-800 rounded-lg text-center space-y-1 shadow-sm">
                  <div className="text-[10px] font-black text-slate-900">
                    {pharmacyInfo.pharmacyNameAr || 'صيدلية النور الحديثة'}
                  </div>
                  <div className="text-xs font-black text-slate-900 leading-tight">
                    أوجمنتين 1 جم أقراص
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    Augmentin 1g Tablets
                  </div>
                  <div
                    className="flex justify-center my-1"
                    dangerouslySetInnerHTML={{
                      __html: generateCode128Svg('6221234567890', 36, 1.4),
                    }}
                  />
                  <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-200 pt-1">
                    <span className="text-slate-600 font-mono">B: BN2026-A1</span>
                    <span className="text-xs font-black text-slate-950 font-sans">135.00 ج.م</span>
                    <span className="text-slate-600 font-mono">EXP: 12/28</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setTestModalType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                  notify('تم إرسال أمر الطباعة التجريبية.');
                  setTestModalType(null);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>طباعة تجريبية الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
