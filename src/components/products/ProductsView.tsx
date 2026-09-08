import React, { useState, useMemo } from 'react';
import {
  Pill, Plus, Search, Filter, Edit3, Trash2, Tag,
  AlertTriangle, CheckCircle2, X, Barcode, ShieldAlert, Download,
  Database, Sparkles, RefreshCw, ArrowUpRight
} from 'lucide-react';
import {
  getProducts, getCategories, getCompanies, upsertProduct, deleteProduct,
  hasPermission
} from '../../services/storageService';
import {
  compareInventoryWithDrugEye, DRUG_EYE_DATABASE, applyBulkDrugEyePriceUpdates,
  syncPricesWithDrugEye
} from '../../services/drugEyeService';
import { Product, Batch } from '../../types/pharmacy';
import { BarcodePrintModal } from '../printing/BarcodePrintModal';
import { BarcodePrintView } from './BarcodePrintView';

export const ProductsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [filterPrescriptionOnly, setFilterPrescriptionOnly] = useState(false);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [printLabelProduct, setPrintLabelProduct] = useState<Product | null>(null);
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add/Edit Form State
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('cat-1');
  const [companyId, setCompanyId] = useState('comp-1');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [unit, setUnit] = useState('علبة');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [minimumStock, setMinimumStock] = useState<number>(5);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [requiresPrescription, setRequiresPrescription] = useState(false);

  // Initial Batch for new product
  const [initialBatchNumber, setInitialBatchNumber] = useState('');
  const [initialExpiryDate, setInitialExpiryDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number>(10);

  const products = getProducts();
  const categories = getCategories();
  const companies = getCompanies();

  const canEdit = hasPermission('products.edit');
  const canDelete = hasPermission('products.delete');

  const [drugEyeSearchTerm, setDrugEyeSearchTerm] = useState('');
  const [showDrugEyeDropdown, setShowDrugEyeDropdown] = useState(false);
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);

  const drugEyeComparison = useMemo(() => compareInventoryWithDrugEye(), [products]);

  const matchingDrugEyeMedicines = useMemo(() => {
    if (!drugEyeSearchTerm.trim()) return [];
    const q = drugEyeSearchTerm.toLowerCase();
    return DRUG_EYE_DATABASE.filter(m =>
      m.tradeNameAr.toLowerCase().includes(q) ||
      m.tradeNameEn.toLowerCase().includes(q) ||
      m.barcode.includes(q) ||
      m.activeIngredient.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [drugEyeSearchTerm]);

  const handleAutoFillFromDrugEye = (med: typeof DRUG_EYE_DATABASE[0]) => {
    setNameAr(med.tradeNameAr);
    setNameEn(med.tradeNameEn);
    setBarcode(med.barcode);
    setActiveIngredient(med.activeIngredient);
    setSalePrice(med.officialPrice);
    const discount = (100 - med.pharmacyDiscount) / 100;
    setPurchasePrice(Math.round(med.officialPrice * discount * 100) / 100);
    setRequiresPrescription(med.requiresPrescription);

    const cat = categories.find(c => c.nameAr.includes(med.categoryAr.slice(0, 5)));
    if (cat) setCategoryId(cat.id);

    const comp = companies.find(c => c.nameAr.toLowerCase().includes(med.companyNameAr.slice(0, 5).toLowerCase()));
    if (comp) setCompanyId(comp.id);

    setShowDrugEyeDropdown(false);
    setDrugEyeSearchTerm('');
    setFeedback(`تم استيراد بيانات "${med.tradeNameAr}" وتعيين السعر الجبري الرسمي (${med.officialPrice} ج.م) بنجاح.`);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setNameAr('');
    setNameEn('');
    setBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setInternalCode(`MED-${(products.length + 1).toString().padStart(4, '0')}`);
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategoryId(categories[0]?.id || 'cat-1');
    setCompanyId(companies[0]?.id || 'comp-1');
    setActiveIngredient('');
    setUnit('علبة');
    setPurchasePrice(0);
    setSalePrice(0);
    setMinimumStock(5);
    setTaxRate(0);
    setRequiresPrescription(false);
    setInitialBatchNumber(`B${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    setInitialExpiryDate(futureDate.toISOString().slice(0, 10));
    setInitialQuantity(10);
    setShowAddEditModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setNameAr(p.nameAr);
    setNameEn(p.nameEn || '');
    setBarcode(p.barcode);
    setInternalCode(p.internalCode);
    setSku(p.sku || '');
    setCategoryId(p.categoryId);
    setCompanyId(p.companyId);
    setActiveIngredient(p.activeIngredient || '');
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice);
    setSalePrice(p.salePrice);
    setMinimumStock(p.minimumStock);
    setTaxRate(p.tax || p.taxRate || 0);
    setRequiresPrescription(Boolean(p.requiresPrescription));
    setShowAddEditModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !barcode.trim()) {
      alert('يرجى كتابة اسم الدواء بالعربية ورقم الباركود');
      return;
    }

    const initialBatches: Batch[] = editingProduct?.batches || [];

    if (!editingProduct && initialQuantity > 0 && initialBatchNumber.trim()) {
      initialBatches.push({
        id: `batch-${Date.now()}`,
        productId: '',
        batchNumber: initialBatchNumber.trim(),
        expiryDate: initialExpiryDate || '2027-12-31',
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        quantity: Number(initialQuantity) || 0,
        createdAt: new Date().toISOString(),
      });
    }

    const payload: Partial<Product> = {
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      barcode: barcode.trim(),
      internalCode: internalCode.trim(),
      sku: sku.trim(),
      categoryId,
      companyId,
      activeIngredient: activeIngredient.trim(),
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
      minimumStock: Number(minimumStock) || 0,
      tax: Number(taxRate) || 0,
      taxRate: Number(taxRate) || 0,
      requiresPrescription,
      status: 'active',
      batches: initialBatches,
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
    }

    upsertProduct(payload);
    setShowAddEditModal(false);
    setFeedback(`تم حفظ الدواء "${nameAr}" بنجاح في قاعدة البيانات.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteProduct = (p: Product) => {
    if (confirm(`هل أنت متأكد من حذف الدواء "${p.nameAr}" نهائياً من النظام؟`)) {
      deleteProduct(p.id);
      setFeedback(`تم حذف الصنف "${p.nameAr}".`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
    if (filterLowStockOnly && (p.totalQuantity || 0) > p.minimumStock) return false;
    if (filterPrescriptionOnly && !p.requiresPrescription) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.nameAr.toLowerCase().includes(q) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
      p.barcode.includes(q) ||
      p.internalCode.toLowerCase().includes(q) ||
      p.activeIngredient.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-12" dir="rtl">
      {/* Drug Eye Price Updates Alert Banner */}
      {drugEyeComparison.needsUpdateCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950/10 rounded-xl">
              <Database className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-black text-sm">
                تنبيه تسعير Drug Eye®: يوجد {drugEyeComparison.needsUpdateCount} أصناف في صيدليتك طرأ عليها تعديل وزيادة بالتسعيرة الجبرية الرسمية!
              </div>
              <div className="text-xs text-slate-900/80">
                إجمالي فرق الزيادة يضيف +{drugEyeComparison.totalPriceIncreaseAmount.toFixed(2)} ج.م لأرباح ومخزون الصيدلية.
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              setIsSyncingPrices(true);
              try {
                const res = await syncPricesWithDrugEye({ updateBatches: true });
                setFeedback(res.message);
              } catch {
                setFeedback('حدث خطأ أثناء مزامنة وتحديث الأسعار.');
              } finally {
                setIsSyncingPrices(false);
              }
            }}
            disabled={isSyncingPrices}
            className="bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingPrices ? 'animate-spin' : ''}`} />
            <span>{isSyncingPrices ? 'جاري التحديث...' : `تحديث كل الأسعار عبر الإنترنت (${drugEyeComparison.needsUpdateCount})`}</span>
          </button>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800">
              دليل الأدوية والمنتجات
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {products.length} صنف مسجل
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة الأسعار، الباركود، الحدود الدنيا، والوحدات والشركات المصنعة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPrintLabelProduct(null);
              setShowBarcodePrintModal(true);
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
          >
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>طباعة ملصقات الباركود</span>
          </button>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دواء جديد</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم بالعربي أو الإنجليزي، الباركود، الكود الداخلي، أو المادة الفعالة..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full sm:w-56">
            <select
              aria-label="تصفية حسب التصنيف"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">جميع التصنيفات ({products.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkbox Quick Filters */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filterLowStockOnly}
              onChange={e => setFilterLowStockOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>النواقص والحد الأدنى فقط</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filterPrescriptionOnly}
              onChange={e => setFilterPrescriptionOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>الأدوية التي تستوجب روشتة (Prescription)</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">اسم الدواء</th>
                <th className="py-3 px-3">الباركود والكود</th>
                <th className="py-3 px-3">المادة الفعالة</th>
                <th className="py-3 px-3">التصنيف والوحدة</th>
                <th className="py-3 px-3 text-center">سعر الشراء</th>
                <th className="py-3 px-3 text-center">سعر البيع</th>
                <th className="py-3 px-3 text-center">المخزون الكلي</th>
                <th className="py-3 px-3 text-center">عدد الباتشات</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد منتجات مطابقة لخيارات البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const stock = p.totalQuantity || 0;
                  const isLow = stock <= p.minimumStock;
                  const isOut = stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">{p.nameAr}</div>
                        {p.nameEn && <div className="text-[11px] text-slate-400 font-mono">{p.nameEn}</div>}
                        {p.requiresPrescription && (
                          <span className="inline-block mt-1 text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                            يلزم روشتة طبية
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="text-slate-800 font-bold">{p.barcode}</div>
                        <div className="text-[10px] text-slate-400">{p.internalCode}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {p.activeIngredient || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {p.categoryNameAr || categories.find(c => c.id === p.categoryId)?.nameAr || 'عام'}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          الوحدة: {p.unit}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-600">
                        {p.purchasePrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {p.salePrice.toFixed(2)} ج.م
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono inline-block ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {stock} {p.unit}
                        </span>
                        {isLow && !isOut && (
                          <span className="block text-[9px] text-amber-600 mt-0.5 font-bold">
                            حد الطلب: {p.minimumStock}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {p.batches?.length || 0}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Barcode Label */}
                          <button
                            onClick={() => setPrintLabelProduct(p)}
                            title="طباعة ملصق الباركود"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Tag className="w-4 h-4" />
                          </button>

                          {/* Edit Product */}
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(p)}
                              title="تعديل بيانات الدواء"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Product */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              title="حذف الدواء"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct ? `تعديل الصنف: ${editingProduct.nameAr}` : 'إضافة دواء / صنف جديد'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Drug Eye Quick AutoFill Box */}
              {!editingProduct && (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>تعبئة تلقائية وسريعة من قاعدة بيانات Drug Eye السحابية:</span>
                    </span>
                    <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md font-medium border border-indigo-100">
                      تسعيرة هيئة الدواء EDA
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={drugEyeSearchTerm}
                      onChange={e => {
                        setDrugEyeSearchTerm(e.target.value);
                        setShowDrugEyeDropdown(true);
                      }}
                      onFocus={() => setShowDrugEyeDropdown(true)}
                      placeholder="اكتب اسم الدواء أو الباركود (مثل: بنادول، كونكور، أوجمنتين) للملء التلقائي..."
                      className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-indigo-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <Search className="w-3.5 h-3.5 text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showDrugEyeDropdown && matchingDrugEyeMedicines.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100">
                      {matchingDrugEyeMedicines.map(med => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => handleAutoFillFromDrugEye(med)}
                          className="w-full text-right p-2.5 hover:bg-indigo-50 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{med.tradeNameAr}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{med.tradeNameEn} • {med.activeIngredient}</div>
                          </div>
                          <div className="text-left font-mono">
                            <span className="font-black text-emerald-600">{med.officialPrice.toFixed(2)} ج.م</span>
                            <div className="text-[9px] text-indigo-600">اختر للتعبئة</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الدواء بالعربية *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    placeholder="مثال: كونكور 5 مجم 30 قرص"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم بالإنجليزية (Trade Name)
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="مثال: Concor 5mg 30 Tabs"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الباركود الدولي *
                  </label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الكود الداخلي للصيدلية
                  </label>
                  <input
                    type="text"
                    value={internalCode}
                    onChange={e => setInternalCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوحدة الأساسية
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="علبة">علبة</option>
                    <option value="شريط">شريط</option>
                    <option value="قرص">قرص</option>
                    <option value="أمبول">أمبول</option>
                    <option value="زجاجة">زجاجة</option>
                    <option value="أنبوبة">أنبوبة مرهم/كريم</option>
                    <option value="بخاخ">بخاخ</option>
                    <option value="كيس">كيس فوار</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصنيف الدوائي
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الشركة المصنعة
                  </label>
                  <select
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المادة الفعالة (Active Ingredient)
                </label>
                <input
                  type="text"
                  value={activeIngredient}
                  onChange={e => setActiveIngredient(e.target.value)}
                  placeholder="مثال: Bisoprolol Fumarate"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر الشراء (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر البيع للجمهور (ج.م) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    required
                    value={salePrice}
                    onChange={e => setSalePrice(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-emerald-500 rounded-lg text-xs font-mono font-black text-center text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحد الأدنى للطلب (Reorder)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minimumStock}
                    onChange={e => setMinimumStock(Number(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Prescription Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqPresc"
                  checked={requiresPrescription}
                  onChange={e => setRequiresPrescription(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="reqPresc" className="text-xs font-bold text-slate-700 cursor-pointer">
                  يتطلب صرف هذا الدواء روشتة طبية معتمدة
                </label>
              </div>

              {/* Initial Batch info (only when adding new product) */}
              {!editingProduct && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                  <div className="font-bold text-xs text-emerald-900">
                    بيانات الباتش والرصيد الافتتاحي (Initial Batch):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-emerald-800 mb-0.5">رقم الباتش</label>
                      <input
                        type="text"
                        value={initialBatchNumber}
                        onChange={e => setInitialBatchNumber(e.target.value)}
                        className="w-full p-1.5 border border-emerald-300 bg-white rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-emerald-800 mb-0.5">تاريخ الانتهاء</label>
                      <input
                        type="date"
                        value={initialExpiryDate}
                        onChange={e => setInitialExpiryDate(e.target.value)}
                        className="w-full p-1.5 border border-emerald-300 bg-white rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-emerald-800 mb-0.5">الرصيد الافتتاحي</label>
                      <input
                        type="number"
                        min="0"
                        value={initialQuantity}
                        onChange={e => setInitialQuantity(Number(e.target.value) || 0)}
                        className="w-full p-1.5 border border-emerald-300 bg-white rounded text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  {editingProduct ? 'حفظ التعديلات' : 'إضافة وحفظ الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE PRINT VIEW MODAL */}
      {(printLabelProduct || showBarcodePrintModal) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <BarcodePrintView
              product={printLabelProduct || undefined}
              onClose={() => {
                setPrintLabelProduct(null);
                setShowBarcodePrintModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
