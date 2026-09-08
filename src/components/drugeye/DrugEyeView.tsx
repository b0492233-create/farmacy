import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Wifi, WifiOff, Search, CheckCircle2, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Pill, Sparkles, Sliders, ExternalLink,
  Download, Printer, Check, ShieldCheck, Database, Layers,
  Building2, DollarSign, Calendar, Clock, ChevronRight, Info, BookOpen
} from 'lucide-react';
import {
  DRUG_EYE_DATABASE, checkDrugEyeConnection, compareInventoryWithDrugEye,
  applyDrugEyePriceUpdate, applyBulkDrugEyePriceUpdates, importDrugEyeMedicine,
  findEquivalentsAndSubstitutes, getDrugEyeSettings, saveDrugEyeSettings,
  syncPricesWithDrugEye, DrugSubstituteResult, DrugEyeSyncResult
} from '../../services/drugEyeService';
import { DrugEyeMedicine, DrugEyePriceComparison } from '../../types/pharmacy';
import { BarcodePrintModal } from '../printing/BarcodePrintModal';
import { getProducts } from '../../services/storageService';

export const DrugEyeView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'price_updater' | 'search_import' | 'substitutes' | 'cloud_settings'>('price_updater');

  // Connection & Sync State
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResultModal, setSyncResultModal] = useState<DrugEyeSyncResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latencyMs: number;
    edaBulletinNo: string;
    totalMedicinesInCloud: number;
    lastBulletinDate: string;
    message: string;
  } | null>(null);

  // Settings state
  const [settings, setSettings] = useState(() => getDrugEyeSettings());
  const [updateBatchesOption, setUpdateBatchesOption] = useState(settings.updateBatchesWithProduct);

  // Price comparison state
  const [comparisonData, setComparisonData] = useState(() => compareInventoryWithDrugEye());
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceFilterStatus, setPriceFilterStatus] = useState<'all' | 'needs_update' | 'already_updated' | 'not_in_inventory'>('needs_update');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Cloud Search & Import State
  const [cloudSearchQuery, setCloudSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Substitutes & Equivalents State
  const [substituteSearchQuery, setSubstituteSearchQuery] = useState('');
  const [substituteResult, setSubstituteResult] = useState<{
    sourceMedicine: DrugEyeMedicine | null;
    results: DrugSubstituteResult[];
  }>({ sourceMedicine: null, results: [] });

  // Print barcode modal for updated product
  const [printProductBarcode, setPrintProductBarcode] = useState<{
    id: string;
    nameAr: string;
    nameEn?: string;
    barcode: string;
    internalCode: string;
    salePrice: number;
    purchasePrice: number;
    unit: string;
  } | null>(null);

  // Initial connection check
  useEffect(() => {
    handleCheckConnection();
  }, []);

  const handleCheckConnection = async () => {
    setIsConnecting(true);
    setFeedback(null);
    try {
      const res = await checkDrugEyeConnection();
      setConnectionStatus(res);
      // Re-compare inventory
      setComparisonData(compareInventoryWithDrugEye());
      if (res.connected) {
        setFeedback({
          type: 'success',
          text: `تم الاتصال بنجاح بسيرفر Drug Eye السحابي (زمن الاستجابة: ${res.latencyMs}ms). تم جلب أحدث منشورات هيئة الدواء المصرية.`
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.message
        });
      }
    } catch (e) {
      setFeedback({
        type: 'error',
        text: 'حدث خطأ أثناء محاولة الاتصال بسيرفر Drug Eye.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Full online price synchronization using syncPricesWithDrugEye
  const handleOnlinePriceSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const result = await syncPricesWithDrugEye({
        updateBatches: updateBatchesOption
      });

      setComparisonData(compareInventoryWithDrugEye());

      if (result.success) {
        setFeedback({
          type: 'success',
          text: result.message
        });
        if (result.updatedCount > 0) {
          setSyncResultModal(result);
        }
      } else {
        setFeedback({
          type: 'error',
          text: result.message
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: 'فشلت عملية المزامنة عبر الإنترنت: ' + (err.message || 'خطأ اتصال غير معروف')
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle single price update
  const handleUpdateSinglePrice = (item: DrugEyePriceComparison) => {
    if (!item.productId) return;
    const res = applyDrugEyePriceUpdate(item.productId, item.newOfficialPrice, updateBatchesOption);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setComparisonData(compareInventoryWithDrugEye());
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Handle bulk price update
  const handleBulkUpdate = () => {
    const itemsToUpdate = comparisonData.comparisons.filter(c => c.status === 'needs_update');
    if (itemsToUpdate.length === 0) {
      setFeedback({ type: 'info', text: 'لا توجد أصناف تحتاج إلى تحديث السعر حالياً.' });
      return;
    }

    const res = applyBulkDrugEyePriceUpdates(itemsToUpdate, updateBatchesOption);
    if (res.success) {
      setFeedback({
        type: 'success',
        text: `${res.message} تم حفظ سجل التغييرات في سجل العمليات.`
      });
      setComparisonData(compareInventoryWithDrugEye());
    }
  };

  // Handle importing medicine from Drug Eye to Pharmacy
  const handleImportMedicine = (medId: string) => {
    const res = importDrugEyeMedicine(medId, 10, 2);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setComparisonData(compareInventoryWithDrugEye());
    } else {
      setFeedback({ type: 'info', text: res.message });
    }
  };

  // Handle searching substitutes
  const handleSearchSubstitutes = (query: string) => {
    setSubstituteSearchQuery(query);
    if (!query.trim()) {
      setSubstituteResult({ sourceMedicine: null, results: [] });
      return;
    }
    const res = findEquivalentsAndSubstitutes(query);
    setSubstituteResult(res);
  };

  // Filtered price comparisons
  const filteredComparisons = useMemo(() => {
    return comparisonData.comparisons.filter(item => {
      // Filter status
      if (priceFilterStatus !== 'all' && item.status !== priceFilterStatus) {
        return false;
      }
      // Filter search
      if (priceSearchQuery.trim()) {
        const q = priceSearchQuery.toLowerCase();
        const matchesName = item.tradeNameAr.toLowerCase().includes(q) || item.tradeNameEn.toLowerCase().includes(q);
        const matchesBarcode = item.barcode.includes(q);
        const matchesActive = item.activeIngredient.toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode && !matchesActive) return false;
      }
      return true;
    });
  }, [comparisonData, priceFilterStatus, priceSearchQuery]);

  // Filtered Cloud medicines
  const filteredCloudMedicines = useMemo(() => {
    const pharmacyProducts = getProducts();
    const existingBarcodes = new Set(pharmacyProducts.map(p => p.barcode));

    return DRUG_EYE_DATABASE.filter(med => {
      if (selectedCategoryFilter !== 'ALL' && med.categoryAr !== selectedCategoryFilter) {
        return false;
      }
      if (cloudSearchQuery.trim()) {
        const q = cloudSearchQuery.toLowerCase();
        const mName = med.tradeNameAr.toLowerCase().includes(q) || med.tradeNameEn.toLowerCase().includes(q);
        const mActive = med.activeIngredient.toLowerCase().includes(q);
        const mBarcode = med.barcode.includes(q);
        const mCompany = med.companyNameAr.toLowerCase().includes(q);
        if (!mName && !mActive && !mBarcode && !mCompany) return false;
      }
      return true;
    }).map(med => ({
      ...med,
      isAlreadyInPharmacy: existingBarcodes.has(med.barcode)
    }));
  }, [cloudSearchQuery, selectedCategoryFilter, comparisonData]);

  // Categories list for filtering
  const allDrugEyeCategories = useMemo(() => {
    const set = new Set<string>();
    DRUG_EYE_DATABASE.forEach(m => set.add(m.categoryAr));
    return Array.from(set);
  }, []);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Drug Eye Cloud Live Sync</span>
              </span>
              <span className="text-xs text-indigo-200/80 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>الربط المباشر بالإنترنت وهيئة الدواء المصرية (EDA)</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>منظومة تحديث الأسعار ودليل Drug Eye®</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              تحديث تلقائي للأسعار الرسمية الصادرة عن هيئة الدواء المصرية بالإنترنت، كشف الأدوية التي زادت أسعارها في صيدليتك، البحث السريع وإضافة الأدوية بضغطة زر، والوصول الفوري لبدائل ومثائل الأدوية الناقصة.
            </p>
          </div>

          {/* Status & Sync Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Live Status indicator */}
            <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 ${
              connectionStatus?.connected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <span className="relative flex h-3 w-3">
                {connectionStatus?.connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  connectionStatus?.connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
              </span>
              <div className="text-right">
                <div className="text-xs font-bold leading-tight">
                  {connectionStatus?.connected ? 'متصل بالإنترنت ومزامن' : 'غير متصل بالإنترنت'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {connectionStatus?.connected ? `Ping: ${connectionStatus.latencyMs}ms | EDA 2026` : 'تحقق من الشبكة'}
                </div>
              </div>
            </div>

            {/* Sync Now Button */}
            <button
              onClick={handleOnlinePriceSync}
              disabled={isConnecting || isSyncing}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جاري الاتصال والمزامنة بالإنترنت...' : 'مزامنة وتحديث الأسعار عبر الإنترنت'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-sm p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>أصناف زادت أسعارها في صيدليتك</span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {comparisonData.needsUpdateCount}
              <span className="text-xs font-normal text-slate-400 mr-1.5">أصناف</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>إجمالي فرق السعر الجديد</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              +{comparisonData.totalPriceIncreaseAmount.toFixed(2)}
              <span className="text-xs font-normal text-slate-400 mr-1.5">ج.م</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>أصناف مطابقة ومحدثة</span>
            </div>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {comparisonData.alreadyUpdatedCount}
              <span className="text-xs font-normal text-slate-400 mr-1.5">أصناف</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>أدوية قاعدة Drug Eye السحابية</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              14,850+
              <span className="text-xs font-normal text-slate-400 mr-1.5">دواء مصري</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alert Message */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fadeIn ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : feedback.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            {feedback.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('price_updater')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'price_updater'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>مُحدّث الأسعار من هيئة الدواء</span>
          {comparisonData.needsUpdateCount > 0 && (
            <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
              {comparisonData.needsUpdateCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('search_import')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'search_import'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>البحث السحابي واستيراد الأدوية</span>
        </button>

        <button
          onClick={() => setActiveSubTab('substitutes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'substitutes'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>محرك البدائل والمثائل (Equivalents)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cloud_settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeSubTab === 'cloud_settings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إعدادات الربط السحابي بالإنترنت</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRICE UPDATER */}
      {/* ========================================================================= */}
      {activeSubTab === 'price_updater' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={priceSearchQuery}
                onChange={e => setPriceSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم العربي، الإنجليزي، المادة الفعالة، أو الباركود..."
                className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {priceSearchQuery && (
                <button
                  onClick={() => setPriceSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setPriceFilterStatus('needs_update')}
                className={`text-xs px-3 py-2 rounded-lg font-bold transition-all shrink-0 ${
                  priceFilterStatus === 'needs_update'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                يحتاج تحديث ({comparisonData.needsUpdateCount})
              </button>

              <button
                onClick={() => setPriceFilterStatus('already_updated')}
                className={`text-xs px-3 py-2 rounded-lg font-bold transition-all shrink-0 ${
                  priceFilterStatus === 'already_updated'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                محدث ومطابق ({comparisonData.alreadyUpdatedCount})
              </button>

              <button
                onClick={() => setPriceFilterStatus('all')}
                className={`text-xs px-3 py-2 rounded-lg font-bold transition-all shrink-0 ${
                  priceFilterStatus === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({comparisonData.comparisons.length})
              </button>
            </div>

            {/* Bulk Update Controls */}
            <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateBatchesOption}
                  onChange={e => setUpdateBatchesOption(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>تحديث سعر الباتشات الحالية بالمخزن</span>
              </label>

              <button
                onClick={handleBulkUpdate}
                disabled={comparisonData.needsUpdateCount === 0}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تحديث جميع الأسعار دفعة واحدة ({comparisonData.needsUpdateCount})</span>
              </button>
            </div>
          </div>

          {/* Price Comparisons Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="p-3.5">الدواء / المستحضر</th>
                    <th className="p-3.5">المادة الفعالة</th>
                    <th className="p-3.5">الباركود ورقم EDA</th>
                    <th className="p-3.5">السعر الحالي بالصيدلية</th>
                    <th className="p-3.5">السعر الجديد (Drug Eye)</th>
                    <th className="p-3.5">فارق الزيادة</th>
                    <th className="p-3.5">رقم المنشور</th>
                    <th className="p-3.5">الرصيد</th>
                    <th className="p-3.5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComparisons.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <p className="font-bold text-slate-700">لا توجد أصناف مطابقة لهذا البحث أو الفلتر</p>
                          <p className="text-xs text-slate-400">جميع أسعار الأدوية في صيدليتك متوافقة ومحدثة وفق منشورات هيئة الدواء المصرية الأخيرة.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredComparisons.map((item, idx) => {
                      const isNeedsUpdate = item.status === 'needs_update';
                      return (
                        <tr
                          key={item.drugEyeId + idx}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isNeedsUpdate ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{item.tradeNameAr}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{item.tradeNameEn}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium max-w-xs truncate">
                              {item.activeIngredient}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-mono text-slate-700 font-medium">{item.barcode}</div>
                            <div className="text-[10px] text-indigo-600 font-mono">EDA Reg: {item.edaBulletinNo.slice(0, 18)}</div>
                          </td>

                          <td className="p-3.5">
                            {item.currentPharmacyPrice !== undefined ? (
                              <span className="font-bold text-slate-700 font-mono text-sm">
                                {item.currentPharmacyPrice.toFixed(2)} ج.م
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">غير مسجل بالصيدلية</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span className="font-black text-emerald-600 font-mono text-sm">
                              {item.newOfficialPrice.toFixed(2)} ج.م
                            </span>
                            {item.previousOfficialPrice && item.previousOfficialPrice !== item.newOfficialPrice && (
                              <div className="text-[10px] text-slate-400 line-through font-mono">
                                السابق: {item.previousOfficialPrice.toFixed(2)} ج.م
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            {item.priceDifference > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full text-xs font-mono">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                +{item.priceDifference.toFixed(2)} ج.م ({item.percentChange}%)
                              </span>
                            ) : item.priceDifference < 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-xs font-mono">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                {item.priceDifference.toFixed(2)} ج.م
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">مطابق 0.00</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="text-[11px] text-slate-600 font-medium max-w-xs">{item.edaBulletinNo}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>تطبيق: {item.priceEffectiveDate}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`font-bold font-mono ${
                              (item.stockQuantity ?? 0) > 0 ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {item.stockQuantity ?? 0} علبة
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            {item.productId ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {isNeedsUpdate ? (
                                  <button
                                    onClick={() => handleUpdateSinglePrice(item)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1"
                                    title="تحديث سعر هذا الصنف"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تحديث السعر</span>
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>محدث</span>
                                  </span>
                                )}

                                <button
                                  onClick={() => {
                                    setPrintProductBarcode({
                                      id: item.productId!,
                                      nameAr: item.tradeNameAr,
                                      nameEn: item.tradeNameEn,
                                      barcode: item.barcode,
                                      internalCode: 'MED-UPD',
                                      salePrice: item.newOfficialPrice,
                                      purchasePrice: item.newOfficialPrice * 0.8,
                                      unit: 'علبة'
                                    });
                                  }}
                                  className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                  title="طباعة استيكر باركود بالسعر الجديد"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleImportMedicine(item.drugEyeId)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>استيراد للصيدلية</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLOUD SEARCH & IMPORT */}
      {/* ========================================================================= */}
      {activeSubTab === 'search_import' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cloudSearchQuery}
                onChange={e => setCloudSearchQuery(e.target.value)}
                placeholder="ابحث في قاعدة بيانات Drug Eye (أكثر من 14,000 دواء مصري بالاسم أو المادة الفعالة أو الشركة)..."
                className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto shrink-0">
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">جميع الأقسام العلاجية</option>
                {allDrugEyeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCloudMedicines.map(med => (
              <div
                key={med.id}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-base">{med.tradeNameAr}</div>
                      <div className="text-xs text-slate-400 font-mono">{med.tradeNameEn}</div>
                    </div>
                    <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-full shrink-0">
                      {med.categoryAr}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">المادة الفعالة:</span>
                      <span className="font-bold text-slate-800 text-left font-mono">{med.activeIngredient}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الشركة المصنعة:</span>
                      <span className="font-medium text-slate-700">{med.companyNameAr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الشكل الصيدلي:</span>
                      <span className="text-slate-700">{med.dosageForm}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الباركود:</span>
                      <span className="font-mono text-slate-800 font-bold">{med.barcode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">رقم التسجيل EDA:</span>
                      <span className="font-mono text-indigo-700">{med.edaRegistrationNo}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">السعر الجبري الرسمي:</div>
                    <div className="text-lg font-black text-emerald-600 font-mono">
                      {med.officialPrice.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      هامش الصيدلي: <span className="text-indigo-600 font-bold">%{med.pharmacyDiscount}</span>
                    </div>
                  </div>

                  {med.isAlreadyInPharmacy ? (
                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 font-bold text-xs px-3 py-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>موجود بمخزونك</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleImportMedicine(med.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>إضافة للصيدلية</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EQUIVALENTS & SUBSTITUTES */}
      {/* ========================================================================= */}
      {activeSubTab === 'substitutes' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="max-w-2xl">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>محرك البحث عن بدائل ومثائل الأدوية (Drug Eye Equivalents Engine)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ابحث عن أي دواء ناقص (Out of Stock) للوصول الفوري إلى كافة المثائل المتطابقة (Same Active Ingredient) أو البدائل العلاجية المتوفرة حالياً في صيدليتك مع الأسعار.
              </p>
            </div>

            <div className="relative max-w-xl">
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={substituteSearchQuery}
                onChange={e => handleSearchSubstitutes(e.target.value)}
                placeholder="اكتب اسم الدواء الناقص (مثل: بنادول، كونكور، أوجمنتين، بروفين)..."
                className="w-full pl-4 pr-12 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-slate-400 font-medium">بحث سريع مقترح:</span>
              {['بنادول إكسترا', 'أوجمنتين 1 جم', 'كونكور 5 مجم', 'بروفين 400', 'كيتوفان 75'].map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSearchSubstitutes(chip)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Results display */}
          {substituteResult.sourceMedicine && (
            <div className="space-y-4">
              {/* Source Drug Card */}
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-900">الدواء المطلوب / المستعلم عنه:</div>
                    <div className="text-base font-black text-indigo-950">
                      {substituteResult.sourceMedicine.tradeNameAr} ({substituteResult.sourceMedicine.tradeNameEn})
                    </div>
                    <div className="text-xs text-indigo-700 font-mono">
                      المادة الفعالة: {substituteResult.sourceMedicine.activeIngredient}
                    </div>
                  </div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-xs text-indigo-700">السعر الرسمي:</div>
                  <div className="text-lg font-black text-indigo-950">
                    {substituteResult.sourceMedicine.officialPrice.toFixed(2)} ج.م
                  </div>
                </div>
              </div>

              {/* Substitutes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {substituteResult.results.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    لم يتم العثور على بدائل مسجلة لهذا الدواء في قاعدة البيانات.
                  </div>
                ) : (
                  substituteResult.results.map((sub, idx) => (
                    <div
                      key={sub.medicine.id + idx}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        sub.inStockInPharmacy
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            sub.type === 'equivalent'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.type === 'equivalent' ? 'مثيل (نفس المادة الفعالة)' : 'بديل علاجي (نفس المجموعة)'}
                          </span>

                          {sub.inStockInPharmacy ? (
                            <span className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>متوفر ({sub.pharmacyStockQuantity} علبة)</span>
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md">
                              غير متوفر بمخزنك
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 text-sm">{sub.medicine.tradeNameAr}</div>
                          <div className="text-xs text-slate-400 font-mono">{sub.medicine.tradeNameEn}</div>
                        </div>

                        <div className="text-xs text-slate-600 font-mono">
                          {sub.medicine.activeIngredient}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          الشركة: {sub.medicine.companyNameAr}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">سعر البيع:</div>
                          <div className="text-base font-black text-emerald-600 font-mono">
                            {sub.pharmacySalePrice.toFixed(2)} ج.م
                          </div>
                        </div>

                        {!sub.inStockInPharmacy && (
                          <button
                            onClick={() => handleImportMedicine(sub.medicine.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>استيراد للصيدلية</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CLOUD SYNC SETTINGS */}
      {/* ========================================================================= */}
      {activeSubTab === 'cloud_settings' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-indigo-600" />
              <span>إعدادات الربط السحابي بالإنترنت (Drug Eye Cloud Integration)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              التحكم في خيارات الاتصال بسيرفرات Drug Eye المركزية ومواعيد المزامنة التلقائية لأسعار الأدوية.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-900 text-sm">تفعيل الربط السحابي بالإنترنت (Online Cloud Mode)</div>
                <div className="text-xs text-slate-500">يتيح تحديث الأسعار تلقائياً عند صدور منشورات هيئة الدواء المصرية</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={e => {
                  const updated = saveDrugEyeSettings({ enabled: e.target.checked });
                  setSettings(updated);
                }}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">رابط سيرفر Drug Eye السحابي (API Endpoint):</label>
              <input
                type="text"
                value={settings.apiEndpoint}
                onChange={e => setSettings({ ...settings, apiEndpoint: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">كود ترخيص الصيدلية (License ID):</label>
                <input
                  type="text"
                  value={settings.pharmacyLicenseId}
                  onChange={e => setSettings({ ...settings, pharmacyLicenseId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">مفتاح الربط الآمن (API Key):</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-900 text-sm">تحديث أسعار الباتشات القديمة بالمخزن</div>
                <div className="text-xs text-slate-500">
                  عند تحديث سعر أي صنف، يتم تحديث سعر البيع لكافة التشغيلات الحالية في المخزن وطباعة استيكرات بالسعر الجديد
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.updateBatchesWithProduct}
                onChange={e => {
                  const updated = saveDrugEyeSettings({ updateBatchesWithProduct: e.target.checked });
                  setSettings(updated);
                  setUpdateBatchesOption(updated.updateBatchesWithProduct);
                }}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  saveDrugEyeSettings(settings);
                  setFeedback({ type: 'success', text: 'تم حفظ إعدادات ربط Drug Eye السحابي بنجاح.' });
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm"
              >
                حفظ الإعدادات
              </button>

              <button
                onClick={handleCheckConnection}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>اختبار الاتصال المباشر بالسيرفر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {printProductBarcode && (
        <BarcodePrintModal
          isOpen={Boolean(printProductBarcode)}
          onClose={() => setPrintProductBarcode(null)}
          product={printProductBarcode}
        />
      )}

      {/* Online Sync Detailed Report Modal */}
      {syncResultModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  تقرير مزامنة وتحديث الأسعار من Drug Eye® API
                </h3>
              </div>
              <button
                onClick={() => setSyncResultModal(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-950">
              <div>
                <span className="font-bold block">تم تطبيق التحديثات بنجاح في المخزون المحلي!</span>
                <span className="text-[11px] text-emerald-700">
                  تم فحص {syncResultModal.totalChecked} صنف، وتحديث {syncResultModal.updatedCount} صنف.
                </span>
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-emerald-700">إجمالي فرق الأسعار</div>
                <div className="text-base font-black text-emerald-700">+{syncResultModal.totalPriceIncreaseAmount.toFixed(2)} ج.م</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {syncResultModal.updatedProducts.map(p => (
                <div
                  key={p.productId}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-slate-900">{p.productNameAr}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      باركود: {p.barcode} • نشرة EDA: {p.edaBulletinNo} • تم تحديث {p.batchesUpdatedCount} باتش
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left font-mono">
                      <div className="text-[10px] text-slate-400 line-through">{p.oldPrice.toFixed(2)} ج.م</div>
                      <div className="font-bold text-emerald-700 text-sm">{p.newPrice.toFixed(2)} ج.م</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintProductBarcode({
                          id: p.productId,
                          nameAr: p.productNameAr,
                          nameEn: p.productNameEn,
                          barcode: p.barcode,
                          salePrice: p.newPrice,
                          purchasePrice: p.newPrice * 0.75,
                          unit: 'علبة'
                        });
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                      title="طباعة استيكر السعر الجديد"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setSyncResultModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                إغلاق التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
