import React, { useState, useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Printer, Tag, Settings, Sliders, Copy, CheckCircle2,
  RefreshCw, Eye, AlertCircle, X, Search, ChevronDown, Check
} from 'lucide-react';
import { Product, Batch } from '../../types/pharmacy';
import { getProducts, getSettings } from '../../services/storageService';
import { getPrinterSettings } from '../../services/printerService';

export interface LabelDimensionPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const LABEL_PRESETS: LabelDimensionPreset[] = [
  { id: '50x25', name: '50 × 25 مم (قياسي)', widthMm: 50, heightMm: 25, description: 'المقاس الأكثر شيوعاً للصيدليات (Thermal Barcode)' },
  { id: '40x20', name: '40 × 20 مم (صغير)', widthMm: 40, heightMm: 20, description: 'للعبوات الصغيرة وقطرات العين والأمبولات' },
  { id: '38x25', name: '38 × 25 مم (مزدوج)', widthMm: 38, heightMm: 25, description: 'ملصقات رول ثنائية أو مفردة' },
  { id: '60x30', name: '60 × 30 مم (كبير)', widthMm: 60, heightMm: 30, description: 'ملصقات الرفوف وكراتين التخزين' },
  { id: '50x30', name: '50 × 30 مم (متوسط)', widthMm: 50, heightMm: 30, description: 'يتسع لاسم الدواء والمادة الفعالة والباتش' },
  { id: 'custom', name: 'مخصص (Custom)', widthMm: 50, heightMm: 25, description: 'تحديد أبعاد مخصصة بالمليمتر' },
];

interface BarcodeLabelItemProps {
  productNameAr: string;
  productNameEn?: string;
  barcode: string;
  salePrice: number;
  pharmacyName?: string;
  batchNumber?: string;
  expiryDate?: string;
  widthMm: number;
  heightMm: number;
  showPharmacyName: boolean;
  showEnglishName: boolean;
  showPrice: boolean;
  showBatchExpiry: boolean;
  showBarcodeText: boolean;
  barcodeFormat: string;
  barcodeHeight: number;
  barcodeScale: number;
}

/**
 * مكون ملصق باركود فردي يستخدم مكتبة jsbarcode
 */
export const BarcodeLabelItem: React.FC<BarcodeLabelItemProps> = ({
  productNameAr,
  productNameEn,
  barcode,
  salePrice,
  pharmacyName,
  batchNumber,
  expiryDate,
  widthMm,
  heightMm,
  showPharmacyName,
  showEnglishName,
  showPrice,
  showBatchExpiry,
  showBarcodeText,
  barcodeFormat,
  barcodeHeight,
  barcodeScale,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const rawBarcode = (barcode || '00000000').trim();
    setBarcodeError(null);

    try {
      JsBarcode(svgRef.current, rawBarcode, {
        format: barcodeFormat || 'CODE128',
        width: Math.max(1, barcodeScale * 1.2),
        height: Math.max(15, barcodeHeight),
        displayValue: showBarcodeText,
        font: 'JetBrains Mono, monospace',
        fontSize: 10,
        textMargin: 1,
        margin: 0,
        lineColor: '#000000',
      });
    } catch (err: any) {
      // إذا فشل التشفير بالصيغة المحددة (مثل EAN13 لأرقام غير قياسية)، يتم التحويل التلقائي لـ CODE128
      try {
        JsBarcode(svgRef.current, rawBarcode, {
          format: 'CODE128',
          width: Math.max(1, barcodeScale * 1.2),
          height: Math.max(15, barcodeHeight),
          displayValue: showBarcodeText,
          font: 'JetBrains Mono, monospace',
          fontSize: 10,
          textMargin: 1,
          margin: 0,
          lineColor: '#000000',
        });
      } catch (fallbackErr: any) {
        setBarcodeError('تنسيق الباركود غير صالح');
      }
    }
  }, [barcode, barcodeFormat, barcodeHeight, barcodeScale, showBarcodeText]);

  return (
    <div
      className="barcode-label-printable bg-white text-black p-1.5 border border-dashed border-slate-300 rounded-xs flex flex-col justify-between overflow-hidden select-none box-border shadow-2xs"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        maxWidth: `${widthMm}mm`,
        maxHeight: `${heightMm}mm`,
      }}
      dir="rtl"
    >
      {/* Header: Pharmacy Name & English Name */}
      <div className="flex items-center justify-between gap-1 leading-none">
        {showPharmacyName && pharmacyName && (
          <span className="text-[8px] font-bold text-slate-700 truncate max-w-[65%]">
            {pharmacyName}
          </span>
        )}
        {showEnglishName && productNameEn && (
          <span className="text-[7.5px] font-mono text-slate-500 truncate text-left ltr" dir="ltr">
            {productNameEn}
          </span>
        )}
      </div>

      {/* Main: Product Arabic Name */}
      <div className="text-center my-0.5 leading-tight">
        <h4 className="font-extrabold text-[10px] sm:text-[11px] text-slate-900 truncate">
          {productNameAr || 'اسم الصنف غير محدد'}
        </h4>
      </div>

      {/* Barcode SVG Container */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 my-0.5 overflow-hidden">
        {barcodeError ? (
          <div className="text-[8px] text-red-600 font-mono text-center">
            {barcodeError}
          </div>
        ) : (
          <svg ref={svgRef} className="max-w-full max-h-full object-contain"></svg>
        )}
      </div>

      {/* Footer: Price & Batch / Expiry */}
      <div className="flex items-end justify-between gap-1 pt-0.5 border-t border-slate-200 mt-auto leading-none">
        {showPrice ? (
          <div className="flex items-baseline gap-0.5">
            <span className="text-[11px] sm:text-[12px] font-black font-mono text-black">
              {Number(salePrice || 0).toFixed(2)}
            </span>
            <span className="text-[7.5px] font-bold text-slate-700">ج.م</span>
          </div>
        ) : <div />}

        {showBatchExpiry && (batchNumber || expiryDate) && (
          <div className="text-left font-mono text-[7px] text-slate-600 leading-tight ltr" dir="ltr">
            {batchNumber && <div>B:{batchNumber}</div>}
            {expiryDate && <div>EXP:{expiryDate.slice(0, 7)}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export interface BarcodePrintViewProps {
  product?: Product;
  batch?: Batch;
  onClose?: () => void;
}

/**
 * شاشة ومحرر طباعة الباركود المتكامل مع التحكم في عدد الملصقات وأبعاد الورق
 */
export const BarcodePrintView: React.FC<BarcodePrintViewProps> = ({
  product: initialProduct,
  batch: initialBatch,
  onClose,
}) => {
  const allProducts = useMemo(() => getProducts(), []);
  const pharmacySettings = useMemo(() => getSettings(), []);
  const printerSettings = useMemo(() => getPrinterSettings(), []);

  // Product Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(
    initialProduct || allProducts[0]
  );
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>(
    initialBatch || (selectedProduct?.batches?.[0])
  );
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Editable Label Fields
  const [productNameAr, setProductNameAr] = useState(selectedProduct?.nameAr || '');
  const [productNameEn, setProductNameEn] = useState(selectedProduct?.nameEn || '');
  const [barcode, setBarcode] = useState(selectedProduct?.barcode || '');
  const [salePrice, setSalePrice] = useState<number>(selectedProduct?.salePrice || 0);
  const [batchNumber, setBatchNumber] = useState<string>(selectedBatch?.batchNumber || 'BN2026-A1');
  const [expiryDate, setExpiryDate] = useState<string>(selectedBatch?.expiryDate || '2027-12-31');

  // Quantity / Copies State - loaded from default printer settings
  const [copies, setCopies] = useState<number>(printerSettings.barcodeCopiesDefault || 1);

  // Label Dimension State - loaded from default printer settings
  const initialPreset = printerSettings.barcodeLabelPreset || '50x25';
  const foundPreset = LABEL_PRESETS.find(p => p.id === initialPreset) || LABEL_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPreset);
  const [widthMm, setWidthMm] = useState<number>(foundPreset.widthMm);
  const [heightMm, setHeightMm] = useState<number>(foundPreset.heightMm);

  // Custom Display Controls
  const [showPharmacyName, setShowPharmacyName] = useState<boolean>(true);
  const [showEnglishName, setShowEnglishName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBatchExpiry, setShowBatchExpiry] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);
  const [barcodeFormat, setBarcodeFormat] = useState<string>('CODE128');
  const [barcodeHeight, setBarcodeHeight] = useState<number>(24);
  const [barcodeScale, setBarcodeScale] = useState<number>(1.2);
  const [printColumns, setPrintColumns] = useState<number>(1);

  // Synchronize when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setProductNameAr(selectedProduct.nameAr || '');
      setProductNameEn(selectedProduct.nameEn || '');
      setBarcode(selectedProduct.barcode || '');
      setSalePrice(selectedProduct.salePrice || 0);

      const firstBatch = selectedProduct.batches?.[0];
      setSelectedBatch(firstBatch);
      if (firstBatch) {
        setBatchNumber(firstBatch.batchNumber || '');
        setExpiryDate(firstBatch.expiryDate || '');
      }
    }
  }, [selectedProduct]);

  // Handle Preset Change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = LABEL_PRESETS.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setWidthMm(preset.widthMm);
      setHeightMm(preset.heightMm);
    }
  };

  // Filter products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return allProducts.slice(0, 10);
    const term = productSearchTerm.trim().toLowerCase();
    return allProducts.filter(p =>
      p.nameAr.toLowerCase().includes(term) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(term)) ||
      p.barcode.includes(term)
    ).slice(0, 10);
  }, [allProducts, productSearchTerm]);

  // Execute native print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 min-h-full rounded-2xl flex flex-col font-sans" dir="rtl">
      {/* Styles for printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .barcode-print-container, .barcode-print-container * {
            visibility: visible;
          }
          .barcode-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .barcode-label-printable {
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 1mm auto;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                طباعة ملصقات الباركود والأسعار (Barcode Label Generator)
              </h2>
              {printerSettings.defaultBarcodePrinter && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Printer className="w-3 h-3 text-indigo-500" />
                  <span>طابعة: {printerSettings.defaultBarcodePrinter.split(' ')[0]}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              توليد وتخصيص ملصقات الباركود بدقة باستخدام مكتبة JsBarcode للطابعات الحرارية والورقية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الملصقات ({copies} ملصق)</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 no-print">
        {/* Left Column: Settings & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Product Selection & Data */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>بيانات الصنف والباركود:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {allProducts.length} صنف مسجل
              </span>
            </div>

            {/* Product Quick Search Selector */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                اختر صنفاً من المخزون:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={e => {
                    setProductSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder={selectedProduct ? selectedProduct.nameAr : "ابحث باسم الدواء أو الباركود..."}
                  className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>

              {showProductDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setProductSearchTerm('');
                        setShowProductDropdown(false);
                      }}
                      className="w-full text-right p-2 hover:bg-emerald-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.nameAr}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.nameEn || ''} • باركود: {p.barcode}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-700 font-mono text-xs">
                        {p.salePrice.toFixed(2)} ج.م
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Editable Product Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  اسم الصنف (عربي) *
                </label>
                <input
                  type="text"
                  value={productNameAr}
                  onChange={e => setProductNameAr(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  value={productNameEn}
                  onChange={e => setProductNameEn(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono ltr text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  كود الباركود *
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-left ltr focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  سعر البيع (ج.م) *
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={salePrice}
                  onChange={e => setSalePrice(Number(e.target.value) || 0)}
                  className="w-full p-2 border border-emerald-300 rounded-lg text-xs font-mono font-black text-center text-emerald-800 bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  رقم الباتش (Batch No)
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={e => setBatchNumber(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  تاريخ الصلاحية (EXP)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* 2. Copies & Dimensions Settings (أبعاد الملصق وعدد النسخ) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>إعدادات أبعاد الملصق وعدد النسخ:</span>
              </span>
            </div>

            {/* Copies Count Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  عدد الملصقات للطباعة:
                </label>
                <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {copies} ملصق
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={e => setCopies(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="flex-1 p-2 border border-slate-300 rounded-lg text-center font-mono font-bold text-sm"
                />
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Quick Preset Buttons for Copies */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                {[1, 2, 5, 10, 20, 50, 100].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setCopies(cnt)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      copies === cnt
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Label Dimension Presets */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                مقاس الملصق (الأبعاد):
              </label>
              <select
                value={selectedPresetId}
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {LABEL_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} - {preset.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Millimeter Inputs */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  العرض (مم - Width)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="20"
                    max="150"
                    value={widthMm}
                    onChange={e => {
                      setWidthMm(Number(e.target.value) || 20);
                      setSelectedPresetId('custom');
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                  />
                  <span className="text-[10px] text-slate-500 mr-1.5">مم</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  الارتفاع (مم - Height)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="15"
                    max="100"
                    value={heightMm}
                    onChange={e => {
                      setHeightMm(Number(e.target.value) || 15);
                      setSelectedPresetId('custom');
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
                  />
                  <span className="text-[10px] text-slate-500 mr-1.5">مم</span>
                </div>
              </div>
            </div>

            {/* Print Columns */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                توزيع الملصقات في الصفحة:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(cols => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => setPrintColumns(cols)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      printColumns === cols
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cols === 1 ? 'عمود واحد (رول)' : `${cols} أعمدة (ورقة)`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Barcode Advanced Settings (JsBarcode Options) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>خيارات تنسيق JsBarcode والمحتوى:</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  نوع ترميز الباركود:
                </label>
                <select
                  value={barcodeFormat}
                  onChange={e => setBarcodeFormat(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold"
                >
                  <option value="CODE128">CODE128 (شامل قياسي)</option>
                  <option value="EAN13">EAN13 (أوروبي/مصري 13 رقم)</option>
                  <option value="UPC">UPC (أمريكي)</option>
                  <option value="CODE39">CODE39 (حروف وأرقام)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  ارتفاع خطوط الباركود:
                </label>
                <input
                  type="range"
                  min="15"
                  max="45"
                  value={barcodeHeight}
                  onChange={e => setBarcodeHeight(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            {/* Display Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={showPharmacyName}
                  onChange={e => setShowPharmacyName(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>اسم الصيدلية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={showEnglishName}
                  onChange={e => setShowEnglishName(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>الاسم بالإنجليزية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={e => setShowPrice(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>سعر البيع (ج.م)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={showBatchExpiry}
                  onChange={e => setShowBatchExpiry(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>الباتش وتاريخ الصلاحية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 col-span-2">
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={e => setShowBarcodeText(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>إظهار أرقام الباركود أسفل الخطوط</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview & Multi-Copy Sheets (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Zoomed Single Label Preview */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>معاينة حية دقيقة للملصق (100% Scale Preview):</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {widthMm} مم × {heightMm} مم
              </span>
            </div>

            <div className="p-6 bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-center overflow-auto min-h-[160px]">
              <div className="transform scale-110 sm:scale-125 transition-transform duration-200">
                <BarcodeLabelItem
                  productNameAr={productNameAr}
                  productNameEn={productNameEn}
                  barcode={barcode}
                  salePrice={salePrice}
                  pharmacyName={pharmacySettings?.nameAr || 'صيدلية النور الحديثة'}
                  batchNumber={batchNumber}
                  expiryDate={expiryDate}
                  widthMm={widthMm}
                  heightMm={heightMm}
                  showPharmacyName={showPharmacyName}
                  showEnglishName={showEnglishName}
                  showPrice={showPrice}
                  showBatchExpiry={showBatchExpiry}
                  showBarcodeText={showBarcodeText}
                  barcodeFormat={barcodeFormat}
                  barcodeHeight={barcodeHeight}
                  barcodeScale={barcodeScale}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>* جاهز للإرسال المباشر لطابعات الباركود الحرارية (Zebra, Xprinter, Bixolon).</span>
              <span className="font-mono text-emerald-700 font-bold">JsBarcode Engine Ready</span>
            </div>
          </div>

          {/* Multi-Copies Grid Preview */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  معاينة شبكة الطباعة ({copies} ملصقات معدة للطباعة):
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكل</span>
              </button>
            </div>

            {/* Scrollable multi-label preview container */}
            <div className="max-h-[380px] overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div
                className="grid gap-3 justify-items-center"
                style={{
                  gridTemplateColumns: `repeat(${printColumns}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: copies }).map((_, index) => (
                  <div key={index} className="relative group">
                    <BarcodeLabelItem
                      productNameAr={productNameAr}
                      productNameEn={productNameEn}
                      barcode={barcode}
                      salePrice={salePrice}
                      pharmacyName={pharmacySettings?.nameAr || 'صيدلية النور الحديثة'}
                      batchNumber={batchNumber}
                      expiryDate={expiryDate}
                      widthMm={widthMm}
                      heightMm={heightMm}
                      showPharmacyName={showPharmacyName}
                      showEnglishName={showEnglishName}
                      showPrice={showPrice}
                      showBatchExpiry={showBatchExpiry}
                      showBarcodeText={showBarcodeText}
                      barcodeFormat={barcodeFormat}
                      barcodeHeight={barcodeHeight}
                      barcodeScale={barcodeScale}
                    />
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-800 text-white text-[8px] font-mono rounded-full flex items-center justify-center font-bold no-print shadow-xs">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Container for Actual Native Printing (@media print) */}
      <div className="barcode-print-container hidden print:block">
        <div
          className="print-sheet"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${printColumns}, ${widthMm}mm)`,
            gap: '1.5mm',
            justifyContent: 'center',
          }}
        >
          {Array.from({ length: copies }).map((_, idx) => (
            <BarcodeLabelItem
              key={idx}
              productNameAr={productNameAr}
              productNameEn={productNameEn}
              barcode={barcode}
              salePrice={salePrice}
              pharmacyName={pharmacySettings?.nameAr || 'صيدلية النور الحديثة'}
              batchNumber={batchNumber}
              expiryDate={expiryDate}
              widthMm={widthMm}
              heightMm={heightMm}
              showPharmacyName={showPharmacyName}
              showEnglishName={showEnglishName}
              showPrice={showPrice}
              showBatchExpiry={showBatchExpiry}
              showBarcodeText={showBarcodeText}
              barcodeFormat={barcodeFormat}
              barcodeHeight={barcodeHeight}
              barcodeScale={barcodeScale}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarcodePrintView;
