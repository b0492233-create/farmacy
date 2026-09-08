import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode, Search, ShoppingCart, Trash2, Plus, Minus, CreditCard,
  Pause, Play, Printer, CheckCircle2, User as UserIcon, Tag,
  AlertCircle, ChevronDown, Percent, DollarSign, X, ShieldAlert, Sparkles
} from 'lucide-react';
import {
  getProducts, getBatches, findProductByBarcode, recordSale,
  getCustomers, getActiveShift, hasPermission
} from '../../services/storageService';
import { barcodeScanner } from '../../services/barcodeScanner';
import { Product, Batch, CartItem, Customer, Sale } from '../../types/pharmacy';
import { ThermalReceiptModal } from '../printing/ThermalReceiptModal';
import { findEquivalentsAndSubstitutes, DrugSubstituteResult } from '../../services/drugEyeService';

interface PosViewProps {
  onOpenShiftModal: () => void;
}

export const PosView: React.FC<PosViewProps> = ({ onOpenShiftModal }) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-001');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Multi-batch selection modal state
  const [batchModalProduct, setBatchModalProduct] = useState<Product | null>(null);

  // Hold / Suspend invoices state
  const [heldInvoices, setHeldInvoices] = useState<{ id: string; name: string; items: CartItem[]; customerId: string; date: string }[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'visa' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Completed sale for thermal receipt printing
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Feedback notifications
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Drug Eye Substitutes Modal
  const [showDrugEyeSubstituteModal, setShowDrugEyeSubstituteModal] = useState(false);
  const [substituteQuery, setSubstituteQuery] = useState('');
  const [substituteResult, setSubstituteResult] = useState<{
    sourceMedicine: any;
    results: DrugSubstituteResult[];
  }>({ sourceMedicine: null, results: [] });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const products = getProducts();
  const customers = getCustomers();
  const activeShift = getActiveShift();
  const canChangePrice = hasPermission('pos.change_price');
  const canDiscount = hasPermission('pos.discount');

  // Setup USB Barcode Scanner hardware listener
  useEffect(() => {
    barcodeScanner.init();
    const unsubscribe = barcodeScanner.subscribe((scannedCode) => {
      handleDirectBarcodeScan(scannedCode);
    });
    return () => {
      unsubscribe();
    };
  }, [products, cartItems]);

  // Auto-focus the barcode scanner input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setScanMessage({ text, type });
    setTimeout(() => setScanMessage(null), 3000);
  };

  const handleDirectBarcodeScan = (barcode: string) => {
    const result = findProductByBarcode(barcode);
    if (!result) {
      showFeedback(`لم يتم العثور على أي صنف بالباركود: ${barcode}`, 'error');
      return;
    }

    const { product, availableBatch } = result;

    if (!availableBatch || availableBatch.quantity <= 0) {
      showFeedback(`الصنف ${product.nameAr} موجود ولكن نفد رصيد كافة الباتشات!`, 'warning');
      return;
    }

    // Check if item already in cart with same batch
    addProductToCart(product, availableBatch);
    showFeedback(`تم مسح وإضافة: ${product.nameAr} (${availableBatch.batchNumber})`, 'success');
  };

  const handleBarcodeManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleDirectBarcodeScan(barcodeInput.trim());
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const addProductToCart = (product: Product, batch: Batch) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id && item.batchId === batch.id);
      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        if (item.quantity >= batch.quantity) {
          showFeedback(`تم الوصول للحد الأقصى للرصيد المتاح من هذا الباتش (${batch.quantity})`, 'warning');
          return prev;
        }
        const updated = [...prev];
        const newQty = item.quantity + 1;
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          total: (newQty * item.salePrice) - item.discount,
        };
        return updated;
      }

      const newItem: CartItem = {
        productId: product.id,
        productName: product.nameAr,
        barcode: product.barcode,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        unit: product.unit,
        salePrice: batch.salePrice || product.salePrice,
        purchasePrice: batch.purchasePrice || product.purchasePrice,
        quantity: 1,
        maxQuantity: batch.quantity,
        discount: 0,
        total: (batch.salePrice || product.salePrice),
      };

      return [newItem, ...prev];
    });

    if (batchModalProduct) setBatchModalProduct(null);
  };

  const handleProductClick = (product: Product) => {
    const availableBatches = (product.batches || []).filter(b => b.quantity > 0);
    if (availableBatches.length === 0) {
      showFeedback(`رصيد الصنف ${product.nameAr} غير متوفر بالمخزن!`, 'warning');
      return;
    }

    if (availableBatches.length === 1) {
      addProductToCart(product, availableBatches[0]);
    } else {
      // Product has multiple active batches -> let cashier choose or verify FEFO
      setBatchModalProduct(product);
    }
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    setCartItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      if (newQty > item.maxQuantity) {
        showFeedback(`الكمية المطلوبة تتجاوز رصيد الباتش المتاح (${item.maxQuantity})`, 'warning');
        return prev;
      }
      item.quantity = newQty;
      item.total = (newQty * item.salePrice) - item.discount;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);
  const itemsDiscount = cartItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const totalDiscount = itemsDiscount + overallDiscount;
  const tax = 0; // standard medicines 0%
  const netTotal = Math.max(0, subtotal - totalDiscount + tax);

  const handleOpenPayment = () => {
    if (cartItems.length === 0) {
      showFeedback('سلة المبيعات فارغة! قم بمسح أو إضافة أصناف أولاً.', 'warning');
      return;
    }
    setPaidAmount(netTotal);
    setShowPaymentModal(true);
  };

  const handleCompleteSale = () => {
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const paid = Number(paidAmount) || 0;
    const remaining = paymentMethod === 'credit' ? netTotal : Math.max(0, netTotal - paid);
    const change = paymentMethod === 'credit' ? 0 : Math.max(0, paid - netTotal);

    const sale = recordSale({
      items: cartItems,
      subtotal,
      discount: totalDiscount,
      tax,
      total: netTotal,
      paid: paymentMethod === 'credit' ? 0 : Math.min(paid, netTotal),
      remaining,
      change,
      paymentMethod,
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name || 'عميل نقدي',
    });

    // Clear cart and show receipt
    setCartItems([]);
    setOverallDiscount(0);
    setShowPaymentModal(false);
    setCompletedSale(sale);
  };

  // Hold / Suspend Invoice
  const handleHoldInvoice = () => {
    if (cartItems.length === 0) return;
    const newHold = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      name: `فاتورة معلقة #${heldInvoices.length + 1} (${cartItems.length} أصناف)`,
      items: cartItems,
      customerId: selectedCustomerId,
      date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    setHeldInvoices(prev => [...prev, newHold]);
    setCartItems([]);
    showFeedback('تم تعليق الفاتورة بنجاح. يمكنك استئنافها في أي وقت.', 'success');
  };

  const handleResumeInvoice = (holdId: string) => {
    const target = heldInvoices.find(h => h.id === holdId);
    if (!target) return;
    setCartItems(target.items);
    setSelectedCustomerId(target.customerId);
    setHeldInvoices(prev => prev.filter(h => h.id !== holdId));
    setShowHeldModal(false);
    showFeedback('تم استرجاع الفاتورة المعلقة بنجاح.', 'success');
  };

  // Filter products for POS Grid
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
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
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 select-none pb-4" dir="rtl">
      {/* RIGHT COLUMN: Products Catalog & Instant Barcode Scanner */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Scan Bar & Search */}
        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Hardware / Barcode Input */}
          <form onSubmit={handleBarcodeManualSubmit} className="relative w-full sm:w-1/2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="امسح الباركود هنا (قارئ الباركود USB يعمل تلقائياً)..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border-2 border-emerald-500 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800"
            />
            <Barcode className="w-5 h-5 text-emerald-600 absolute right-3 top-2.5" />
          </form>

          {/* Quick Search Input */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو المادة الفعالة أو الكود..."
              className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Drug Eye Quick Substitutes Button */}
          <button
            type="button"
            onClick={() => setShowDrugEyeSubstituteModal(true)}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="البحث عن بدائل ومثائل الأدوية الناقصة من قاعدة بيانات Drug Eye"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>بدائل ومثائل Drug Eye®</span>
          </button>
        </div>

        {/* Scan / Alert Feedback Banner */}
        {scanMessage && (
          <div
            className={`py-1.5 px-4 text-xs font-bold text-center transition-all ${
              scanMessage.type === 'success'
                ? 'bg-emerald-600 text-white'
                : scanMessage.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {scanMessage.text}
          </div>
        )}

        {/* Shift Warning if no shift is open */}
        {!activeShift && (
          <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تنبيه: لا يوجد شيفت مفتوح حالياً. يُفضل فتح شيفت لربط المبيعات النقدية بالدرج.</span>
            </div>
            <button
              onClick={onOpenShiftModal}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] cursor-pointer"
            >
              فتح شيفت الآن
            </button>
          </div>
        )}

        {/* Categories Horizontal Pills */}
        <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({products.length})
          </button>
          <button
            onClick={() => setSelectedCategory('cat-1')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'cat-1' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            مسكنات
          </button>
          <button
            onClick={() => setSelectedCategory('cat-2')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'cat-2' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            مضادات حيوية
          </button>
          <button
            onClick={() => setSelectedCategory('cat-3')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'cat-3' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ضغط وقلب
          </button>
          <button
            onClick={() => setSelectedCategory('cat-4')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'cat-4' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سكر
          </button>
          <button
            onClick={() => setSelectedCategory('cat-5')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'cat-5' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جهاز هضمي
          </button>
          <button
            onClick={() => setSelectedCategory('cat-6')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === 'cat-6' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            فيتامينات
          </button>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-xs">
              لا توجد أدوية مطابقة للبحث
            </div>
          ) : (
            filteredProducts.map(product => {
              const totalStock = product.totalQuantity || 0;
              const isOut = totalStock <= 0;
              const hasMultipleBatches = (product.batches || []).filter(b => b.quantity > 0).length > 1;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={isOut}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer group relative ${
                    isOut
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-slate-800 leading-tight group-hover:text-emerald-700">
                        {product.nameAr}
                      </span>
                      {hasMultipleBatches && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-md border border-blue-200 shrink-0">
                          باتشات متعددة
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-400 font-mono line-clamp-1">
                      {product.activeIngredient || product.internalCode}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800">
                        {product.salePrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 mr-0.5">ج.م</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isOut
                          ? 'bg-rose-100 text-rose-800'
                          : totalStock <= product.minimumStock
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isOut ? 'نفد' : `متاح: ${totalStock}`}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* LEFT COLUMN: Active Bill & Checkout Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs">سلة الفاتورة الحالية</span>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-full text-emerald-400 font-mono font-bold">
              {cartItems.length}
            </span>
          </div>

          {/* Hold Invoices Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleHoldInvoice}
              disabled={cartItems.length === 0}
              title="تعليق الفاتورة الحالية"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="text-[10px]">تعليق</span>
            </button>

            {heldInvoices.length > 0 && (
              <button
                onClick={() => setShowHeldModal(true)}
                title="استرجاع الفواتير المعلقة"
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 animate-pulse"
              >
                <Play className="w-3 h-3" />
                <span>المعلق ({heldInvoices.length})</span>
              </button>
            )}

            {cartItems.length > 0 && (
              <button
                onClick={() => setCartItems([])}
                title="إفراغ السلة"
                className="p-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-300 rounded-lg text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Selector */}
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            aria-label="تحديد العميل"
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.balance > 0 ? `(مدين: ${c.balance} ج.م)` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-12 h-12 text-slate-200 mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold text-slate-500">الفاتورة فارغة</p>
              <p className="text-[11px] text-slate-400 mt-1">
                استخدم قارئ الباركود أو انقر على الأصناف لإضافتها
              </p>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div
                key={`${item.productId}-${item.batchId}`}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="font-bold text-slate-800 leading-tight block">
                      {item.productName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                        {item.batchNumber}
                      </span>
                      <span>صلاحية: {item.expiryDate}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs text-slate-800 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price info */}
                  <div className="text-left">
                    <span className="font-black text-slate-800 text-sm">
                      {item.total.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 mr-1">ج.م</span>
                    <div className="text-[10px] text-slate-400">
                      @{item.salePrice.toFixed(2)} ج.م
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Checkout */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>المجموع الفرعي:</span>
            <span className="font-mono font-bold">{subtotal.toFixed(2)} ج.م</span>
          </div>

          {canDiscount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">خصم إضافي:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={overallDiscount || ''}
                  onChange={e => setOverallDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 px-1.5 py-0.5 rounded border border-slate-300 text-center text-xs font-mono"
                />
                <span className="text-slate-500 text-[11px]">ج.م</span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="font-bold text-sm text-slate-800">الصافي المطلوب:</span>
            <div className="text-left">
              <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                {netTotal.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-emerald-800 mr-1">ج.م</span>
            </div>
          </div>

          <button
            onClick={handleOpenPayment}
            disabled={cartItems.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            <span>إتمام البيع والدفع (F2)</span>
          </button>
        </div>
      </div>

      {/* MULTI-BATCH SELECTOR MODAL */}
      {batchModalProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  اختيار الباتش (FEFO - الأقرب للصلاحية أولاً)
                </h3>
                <p className="text-xs text-slate-500">{batchModalProduct.nameAr}</p>
              </div>
              <button
                onClick={() => setBatchModalProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {(batchModalProduct.batches || [])
                .filter(b => b.quantity > 0)
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                .map((batch, idx) => {
                  const isSoon = new Date(batch.expiryDate).getTime() - Date.now() < 30 * 24 * 3600 * 1000;
                  return (
                    <button
                      key={batch.id}
                      onClick={() => addProductToCart(batchModalProduct, batch)}
                      className={`w-full p-3 rounded-xl border text-right flex items-center justify-between hover:bg-emerald-50 hover:border-emerald-400 transition-all cursor-pointer ${
                        idx === 0 ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 font-mono">
                            {batch.batchNumber}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">
                              موصى به (أقرب انتهاء)
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] block mt-0.5 ${isSoon ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                          انتهاء: {batch.expiryDate}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="font-black text-xs text-slate-800">{batch.salePrice.toFixed(2)} ج.م</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">
                          رصيد: {batch.quantity}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* HELD INVOICES MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-800">الفواتير المعلقة حالياً</h3>
              <button
                onClick={() => setShowHeldModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {heldInvoices.map(hold => (
                <div
                  key={hold.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">{hold.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">توقيت التعليق: {hold.date}</span>
                  </div>
                  <button
                    onClick={() => handleResumeInvoice(hold.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    استئناف الفاتورة
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT & CHECKOUT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800">تحصيل الدفع وإصدار الفاتورة</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-xl bg-slate-900 text-white text-center mb-4">
              <span className="text-xs text-slate-400 block mb-1">المبلغ المطلوب سداده</span>
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {netTotal.toFixed(2)} <span className="text-sm font-normal text-slate-300">ج.م</span>
              </span>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                نقدي (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('visa')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  paymentMethod === 'visa'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                فيزا (Visa)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                بطاقة (Card)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  paymentMethod === 'credit'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                آجل (Credit)
              </button>
            </div>

            {/* Cash Paid Amount & Quick Buttons */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المستلم من العميل (المدفوع)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paidAmount || ''}
                    onChange={e => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full text-center text-xl font-bold py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
                  />
                </div>

                {/* Quick denomination pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(netTotal)}
                    className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    المبلغ بالضبط
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(Math.ceil(netTotal / 50) * 50 || 50)}
                    className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    +50 ج.م
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(Math.ceil(netTotal / 100) * 100 || 100)}
                    className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    +100 ج.م
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(200)}
                    className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    200 ج.م
                  </button>
                </div>

                {/* Change / Balance Calculation */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">الباقي للعميل:</span>
                  <span className="font-black text-base text-emerald-700 font-mono">
                    {Math.max(0, paidAmount - netTotal).toFixed(2)} ج.م
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 mb-4">
                سيتم ترحيل كامل قيمة الفاتورة ({netTotal.toFixed(2)} ج.م) كمديونية على حساب العميل المختار.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وطباعة الفاتورة</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THERMAL INVOICE PRINT MODAL */}
      {completedSale && (
        <ThermalReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* DRUG EYE SUBSTITUTES MODAL IN POS */}
      {showDrugEyeSubstituteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right">
            <div className="p-4 bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  دليل بدائل ومثائل الأدوية (Drug Eye® Live Lookup)
                </h3>
              </div>
              <button
                onClick={() => setShowDrugEyeSubstituteModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  value={substituteQuery}
                  onChange={e => {
                    setSubstituteQuery(e.target.value);
                    if (e.target.value.trim()) {
                      setSubstituteResult(findEquivalentsAndSubstitutes(e.target.value));
                    } else {
                      setSubstituteResult({ sourceMedicine: null, results: [] });
                    }
                  }}
                  placeholder="ابحث عن الدواء الناقص لمعرفة المثائل والبدائل (مثال: بنادول، كونكور، أوجمنتين، بروفين)..."
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                  autoFocus
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400">أمثلة شائعة:</span>
                {['بنادول إكسترا', 'أوجمنتين 1 جم', 'كونكور 5 مجم', 'بروفين 400', 'كيتوفان 75'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSubstituteQuery(chip);
                      setSubstituteResult(findEquivalentsAndSubstitutes(chip));
                    }}
                    className="text-[11px] bg-white hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {substituteResult.sourceMedicine ? (
                <>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-indigo-950">
                        الدواء المطلوب: {substituteResult.sourceMedicine.tradeNameAr} ({substituteResult.sourceMedicine.tradeNameEn})
                      </span>
                      <div className="text-slate-500 text-[11px] font-mono">
                        المادة: {substituteResult.sourceMedicine.activeIngredient}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 font-mono">
                      {substituteResult.sourceMedicine.officialPrice.toFixed(2)} ج.م
                    </span>
                  </div>

                  <div className="space-y-2">
                    {substituteResult.results.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        لم يتم العثور على بدائل مسجلة لهذا الدواء.
                      </div>
                    ) : (
                      substituteResult.results.map((sub, idx) => (
                        <div
                          key={sub.medicine.id + idx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            sub.inStockInPharmacy
                              ? 'bg-emerald-50/50 border-emerald-300'
                              : 'bg-white border-slate-200 opacity-75'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{sub.medicine.tradeNameAr}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                sub.type === 'equivalent' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {sub.type === 'equivalent' ? 'مثيل (نفس المادة)' : 'بديل علاجي'}
                              </span>
                              {sub.inStockInPharmacy ? (
                                <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                                  متوفر ({sub.pharmacyStockQuantity} علبة)
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md">
                                  غير متوفر
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {sub.medicine.tradeNameEn} • الشركة: {sub.medicine.companyNameAr}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-left font-mono">
                              <div className="font-bold text-slate-800">{sub.pharmacySalePrice.toFixed(2)} ج.م</div>
                            </div>
                            {sub.inStockInPharmacy && sub.pharmacyProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleProductClick(sub.pharmacyProduct!);
                                  setShowDrugEyeSubstituteModal(false);
                                  showFeedback(`تم اختيار ${sub.medicine.tradeNameAr}!`, 'success');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة للفاتورة</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 text-indigo-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-xs">ابحث عن أي دواء ناقص لعرض البدائل والمثائل المتوفرة</p>
                  <p className="text-[11px] text-slate-400">يقوم النظام بالبحث بمطابقة المادة الفعالة (Same Molecule) والمجموعة العلاجية وفحص مخزون صيدليتك فورياً.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
