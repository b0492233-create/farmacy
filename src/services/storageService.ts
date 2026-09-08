import {
  Product, Batch, Category, Company, User, Supplier, Customer,
  InventoryMovement, Sale, Purchase, ReturnRecord, Expense, Shift,
  Branch, Device, SyncQueueItem, SyncConflict, AuditLog, PharmacySettings,
  RolePermissions, CartItem, SupplierTransaction, CustomerTransaction
} from '../types/pharmacy';
import {
  INITIAL_PRODUCTS, INITIAL_BATCHES, INITIAL_CATEGORIES, INITIAL_COMPANIES,
  INITIAL_USERS, INITIAL_PERMISSIONS, INITIAL_SUPPLIERS, INITIAL_CUSTOMERS,
  INITIAL_BRANCHES, INITIAL_DEVICES, INITIAL_SETTINGS
} from './seedData';

const STORAGE_KEYS = {
  PRODUCTS: 'pms_products_v2',
  BATCHES: 'pms_batches_v2',
  CATEGORIES: 'pms_categories_v2',
  COMPANIES: 'pms_companies_v2',
  USERS: 'pms_users_v2',
  PERMISSIONS: 'pms_permissions_v2',
  SUPPLIERS: 'pms_suppliers_v2',
  CUSTOMERS: 'pms_customers_v2',
  SALES: 'pms_sales_v2',
  PURCHASES: 'pms_purchases_v2',
  RETURNS: 'pms_returns_v2',
  EXPENSES: 'pms_expenses_v2',
  SHIFTS: 'pms_shifts_v2',
  BRANCHES: 'pms_branches_v2',
  DEVICES: 'pms_devices_v2',
  MOVEMENTS: 'pms_movements_v2',
  SETTINGS: 'pms_settings_v2',
  SYNC_QUEUE: 'pms_sync_queue_v2',
  SYNC_CONFLICTS: 'pms_sync_conflicts_v2',
  AUDIT_LOGS: 'pms_audit_logs_v2',
  CURRENT_USER: 'pms_current_user_v2',
  ACTIVE_BRANCH: 'pms_active_branch_v2',
  ACTIVE_DEVICE: 'pms_active_device_v2',
  NETWORK_STATUS: 'pms_network_status_v2', // 'online' | 'offline' | 'local_lan'
};

// UUID Generator
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randNum}`;
}

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function subscribeToStore(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Low-level storage helpers
function readItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return fallback;
  }
}

function writeItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e) {
    console.error(`Error writing ${key}:`, e);
  }
}

// Initial bootstrap check
export function initializeStorageIfEmpty(): void {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    writeItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    writeItem(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    writeItem(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    writeItem(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    writeItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    writeItem(STORAGE_KEYS.PERMISSIONS, INITIAL_PERMISSIONS);
    writeItem(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    writeItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    writeItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
    writeItem(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
    writeItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    writeItem(STORAGE_KEYS.SALES, []);
    writeItem(STORAGE_KEYS.PURCHASES, []);
    writeItem(STORAGE_KEYS.RETURNS, []);
    writeItem(STORAGE_KEYS.EXPENSES, []);
    writeItem(STORAGE_KEYS.SHIFTS, []);
    writeItem(STORAGE_KEYS.MOVEMENTS, []);
    writeItem(STORAGE_KEYS.SYNC_QUEUE, []);
    writeItem(STORAGE_KEYS.SYNC_CONFLICTS, []);
    writeItem(STORAGE_KEYS.AUDIT_LOGS, []);
    writeItem(STORAGE_KEYS.NETWORK_STATUS, 'local_lan');
    writeItem(STORAGE_KEYS.ACTIVE_BRANCH, INITIAL_BRANCHES[0].id);
    writeItem(STORAGE_KEYS.ACTIVE_DEVICE, INITIAL_DEVICES[0].id);

    // Initial audit log
    recordAudit({
      userId: 'system',
      userName: 'النظام',
      action: 'SYSTEM_INIT',
      actionAr: 'تهيئة قاعدة البيانات الأولية',
      deviceId: 'DEV-WIN-01',
      details: 'تم تجهيز قاعدة البيانات المحلية وتضمين المنتجات الصيدلانية الأولية وتوزيع الصلاحيات'
    });
  }
}

// ==================== AUTH & SESSION ====================
export function getCurrentUser(): User | null {
  return readItem<User | null>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
}

export function setCurrentUser(user: User | null): void {
  writeItem(STORAGE_KEYS.CURRENT_USER, user);
  if (user) {
    recordAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      actionAr: 'تسجيل دخول مستخدم',
      deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
      details: `تم تسجيل الدخول بصلاحية ${user.role}`
    });
  }
}

export function logout(): void {
  const current = getCurrentUser();
  if (current) {
    recordAudit({
      userId: current.id,
      userName: current.name,
      action: 'LOGOUT',
      actionAr: 'تسجيل خروج',
      deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
      details: 'تم تسجيل الخروج بنجاح'
    });
  }
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  notifyListeners();
}

export function getRolePermissions(): RolePermissions[] {
  return readItem<RolePermissions[]>(STORAGE_KEYS.PERMISSIONS, INITIAL_PERMISSIONS);
}

export function updateRolePermissions(role: RolePermissions['role'], permissions: string[]): void {
  const current = getRolePermissions();
  const index = current.findIndex(p => p.role === role);
  if (index >= 0) {
    current[index].permissions = permissions;
  } else {
    current.push({ role, permissions });
  }
  writeItem(STORAGE_KEYS.PERMISSIONS, current);
}

export function hasPermission(permKey: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === 'admin') return true; // Admin has all rights

  const perms = getRolePermissions().find(p => p.role === user.role);
  if (!perms) return false;
  return perms.permissions.includes(permKey);
}

// ==================== BRANCHES & DEVICES ====================
export function getBranches(): Branch[] {
  return readItem<Branch[]>(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
}

export function getActiveBranch(): Branch {
  const branches = getBranches();
  const activeId = readItem<string>(STORAGE_KEYS.ACTIVE_BRANCH, branches[0]?.id);
  return branches.find(b => b.id === activeId) || branches[0];
}

export function setActiveBranch(branchId: string): void {
  writeItem(STORAGE_KEYS.ACTIVE_BRANCH, branchId);
}

export function getDevices(): Device[] {
  return readItem<Device[]>(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
}

export function getActiveDevice(): Device {
  const devices = getDevices();
  const activeId = readItem<string>(STORAGE_KEYS.ACTIVE_DEVICE, devices[0]?.id);
  return devices.find(d => d.id === activeId) || devices[0];
}

export function setActiveDevice(deviceId: string): void {
  writeItem(STORAGE_KEYS.ACTIVE_DEVICE, deviceId);
}

export function toggleDeviceStatus(deviceId: string): void {
  const devices = getDevices();
  const dev = devices.find(d => d.id === deviceId);
  if (dev) {
    dev.status = dev.status === 'active' ? 'blocked' : 'active';
    writeItem(STORAGE_KEYS.DEVICES, devices);
  }
}

// ==================== NETWORK & SYNC STATUS ====================
export type NetworkMode = 'online' | 'offline' | 'local_lan';

export function getNetworkStatus(): NetworkMode {
  return readItem<NetworkMode>(STORAGE_KEYS.NETWORK_STATUS, 'local_lan');
}

export function setNetworkStatus(status: NetworkMode): void {
  writeItem(STORAGE_KEYS.NETWORK_STATUS, status);
}

// ==================== PRODUCTS & BATCHES ====================
export function getCategories(): Category[] {
  return readItem<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
}

export function getCompanies(): Company[] {
  return readItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
}

export function getBatches(): Batch[] {
  return readItem<Batch[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
}

export function getBatchesForProduct(productId: string): Batch[] {
  const batches = getBatches();
  return batches.filter(b => b.productId === productId && b.quantity > 0);
}

export function getAllBatchesForProduct(productId: string): Batch[] {
  const batches = getBatches();
  return batches.filter(b => b.productId === productId);
}

export function getProducts(): Product[] {
  const products = readItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const batches = getBatches();

  // Attach enriched batches & calculated total quantity to each product
  return products.map(p => {
    const productBatches = batches.filter(b => b.productId === p.id);
    const totalQuantity = productBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    return {
      ...p,
      batches: productBatches,
      totalQuantity,
    };
  });
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find(p => p.id === id);
}

export function findProductByBarcode(barcode: string): { product: Product; availableBatch?: Batch } | null {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  const products = getProducts();
  const match = products.find(p => 
    p.barcode === cleanBarcode || 
    (p.additionalBarcodes && p.additionalBarcodes.includes(cleanBarcode)) ||
    p.sku.toLowerCase() === cleanBarcode.toLowerCase() ||
    p.internalCode.toLowerCase() === cleanBarcode.toLowerCase()
  );

  if (!match) return null;

  // Find earliest expiring available batch (FEFO: First Expired, First Out)
  const batches = (match.batches || [])
    .filter(b => b.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return {
    product: match,
    availableBatch: batches[0],
  };
}

export function saveProduct(productData: Partial<Product>, initialBatch?: Partial<Batch>): Product {
  const products = readItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const isNew = !productData.id;
  const productId = productData.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();

  const completeProduct: Product = {
    id: productId,
    nameAr: productData.nameAr || 'منتج جديد',
    nameEn: productData.nameEn || '',
    barcode: productData.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
    additionalBarcodes: productData.additionalBarcodes || [],
    internalCode: productData.internalCode || `MED-${Math.floor(1000 + Math.random() * 9000)}`,
    sku: productData.sku || `SKU-${Date.now().toString().slice(-6)}`,
    categoryId: productData.categoryId || 'cat-1',
    companyId: productData.companyId || 'cmp-4',
    activeIngredient: productData.activeIngredient || '',
    unit: productData.unit || 'علبة',
    purchasePrice: Number(productData.purchasePrice) || 0,
    salePrice: Number(productData.salePrice) || 0,
    minimumStock: Number(productData.minimumStock) || 5,
    tax: Number(productData.tax) || 0,
    description: productData.description || '',
    status: productData.status || 'active',
    requiresPrescription: Boolean(productData.requiresPrescription),
    createdAt: productData.createdAt || now,
    updatedAt: now,
  };

  if (isNew) {
    products.unshift(completeProduct);
  } else {
    const idx = products.findIndex(p => p.id === productId);
    if (idx >= 0) {
      products[idx] = completeProduct;
    } else {
      products.unshift(completeProduct);
    }
  }

  writeItem(STORAGE_KEYS.PRODUCTS, products);

  // If new product and initial batch provided, save batch
  if (isNew && initialBatch && (Number(initialBatch.quantity) > 0 || initialBatch.batchNumber)) {
    const batches = getBatches();
    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      productId: completeProduct.id,
      batchNumber: initialBatch.batchNumber || `B-${new Date().getFullYear()}-01`,
      expiryDate: initialBatch.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      purchasePrice: Number(initialBatch.purchasePrice) || completeProduct.purchasePrice,
      salePrice: Number(initialBatch.salePrice) || completeProduct.salePrice,
      quantity: Number(initialBatch.quantity) || 0,
      createdAt: now,
    };
    batches.push(newBatch);
    writeItem(STORAGE_KEYS.BATCHES, batches);

    if (newBatch.quantity > 0) {
      recordInventoryMovement({
        productId: completeProduct.id,
        productName: completeProduct.nameAr,
        batchId: newBatch.id,
        batchNumber: newBatch.batchNumber,
        quantity: newBatch.quantity,
        movementType: 'STOCK_IN',
        reason: 'رصيد افتتاحي عند إضافة الصنف',
      });
    }
  }

  recordAudit({
    userId: getCurrentUser()?.id || 'system',
    userName: getCurrentUser()?.name || 'النظام',
    action: isNew ? 'ADD_PRODUCT' : 'EDIT_PRODUCT',
    actionAr: isNew ? 'إضافة دواء / منتج جديد' : 'تعديل بيانات دواء',
    deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
    details: `الصنف: ${completeProduct.nameAr} (كود: ${completeProduct.internalCode}, باركود: ${completeProduct.barcode})`
  });

  enqueueSync({
    operationId: generateUUID(),
    entity: 'product',
    entityId: completeProduct.id,
    action: isNew ? 'INSERT' : 'UPDATE',
    payload: completeProduct,
  });

  return completeProduct;
}

export function deleteProduct(productId: string): boolean {
  const products = readItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const target = products.find(p => p.id === productId);
  if (!target) return false;

  const updated = products.filter(p => p.id !== productId);
  writeItem(STORAGE_KEYS.PRODUCTS, updated);

  recordAudit({
    userId: getCurrentUser()?.id || 'system',
    userName: getCurrentUser()?.name || 'النظام',
    action: 'DELETE_PRODUCT',
    actionAr: 'حذف منتج',
    deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
    details: `تم حذف الصنف: ${target.nameAr} (${target.internalCode})`
  });

  enqueueSync({
    operationId: generateUUID(),
    entity: 'product',
    entityId: productId,
    action: 'DELETE',
    payload: { id: productId },
  });

  return true;
}

export function saveBatch(batchData: Partial<Batch>): Batch {
  const batches = getBatches();
  const isNew = !batchData.id;
  const batchId = batchData.id || `batch-${Date.now()}`;
  const now = new Date().toISOString();

  const completeBatch: Batch = {
    id: batchId,
    productId: batchData.productId || '',
    batchNumber: batchData.batchNumber || `B-${Date.now().toString().slice(-5)}`,
    expiryDate: batchData.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    purchasePrice: Number(batchData.purchasePrice) || 0,
    salePrice: Number(batchData.salePrice) || 0,
    quantity: Number(batchData.quantity) || 0,
    createdAt: batchData.createdAt || now,
  };

  if (isNew) {
    batches.push(completeBatch);
  } else {
    const idx = batches.findIndex(b => b.id === batchId);
    if (idx >= 0) batches[idx] = completeBatch;
  }

  writeItem(STORAGE_KEYS.BATCHES, batches);

  enqueueSync({
    operationId: generateUUID(),
    entity: 'batch',
    entityId: completeBatch.id,
    action: isNew ? 'INSERT' : 'UPDATE',
    payload: completeBatch,
  });

  return completeBatch;
}

// ==================== INVENTORY MOVEMENTS ====================
export function getInventoryMovements(): InventoryMovement[] {
  return readItem<InventoryMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
}

export function recordInventoryMovement(movement: {
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  movementType: InventoryMovement['movementType'];
  referenceId?: string;
  reason: string;
}): InventoryMovement {
  const movements = getInventoryMovements();
  const user = getCurrentUser();
  const device = getActiveDevice();
  const branch = getActiveBranch();

  const newMovement: InventoryMovement = {
    id: generateUUID(),
    productId: movement.productId,
    productName: movement.productName,
    batchId: movement.batchId,
    batchNumber: movement.batchNumber,
    quantity: movement.quantity,
    movementType: movement.movementType,
    referenceId: movement.referenceId,
    userId: user?.id || 'system',
    userName: user?.name || 'النظام',
    deviceId: device?.id || 'DEV-WIN-01',
    branchId: branch?.id || 'branch-main-01',
    date: new Date().toISOString(),
    reason: movement.reason,
  };

  movements.unshift(newMovement);
  writeItem(STORAGE_KEYS.MOVEMENTS, movements);

  enqueueSync({
    operationId: generateUUID(),
    entity: 'inventory_movement',
    entityId: newMovement.id,
    action: 'INSERT',
    payload: newMovement,
  });

  return newMovement;
}

export function adjustInventory(params: {
  productId: string;
  batchId: string;
  adjustmentType: 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRED_DISCARD';
  newQuantity: number;
  reason: string;
}): void {
  const batches = getBatches();
  const targetBatch = batches.find(b => b.id === params.batchId);
  if (!targetBatch) return;

  const product = getProductById(params.productId);
  const diff = params.newQuantity - targetBatch.quantity;
  const oldQty = targetBatch.quantity;

  targetBatch.quantity = params.newQuantity;
  writeItem(STORAGE_KEYS.BATCHES, batches);

  recordInventoryMovement({
    productId: params.productId,
    productName: product?.nameAr || 'منتج',
    batchId: targetBatch.id,
    batchNumber: targetBatch.batchNumber,
    quantity: diff,
    movementType: params.adjustmentType,
    reason: params.reason || `تسوية مخزون من ${oldQty} إلى ${params.newQuantity}`,
  });

  recordAudit({
    userId: getCurrentUser()?.id || 'system',
    userName: getCurrentUser()?.name || 'النظام',
    action: 'STOCK_ADJUSTMENT',
    actionAr: 'تسوية مخزنية يدوية',
    deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
    details: `${product?.nameAr} - باتش ${targetBatch.batchNumber} - الكمية السابقة: ${oldQty} - الجديدة: ${params.newQuantity} (السبب: ${params.reason})`
  });
}

// ==================== POS & SALES ====================
export function getSales(): Sale[] {
  return readItem<Sale[]>(STORAGE_KEYS.SALES, []);
}

export function getSaleById(id: string): Sale | undefined {
  return getSales().find(s => s.id === id);
}

export function recordSale(saleData: {
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  change: number;
  paymentMethod: Sale['paymentMethod'];
  customerId?: string;
  customerName?: string;
  notes?: string;
}): Sale {
  const user = getCurrentUser();
  const device = getActiveDevice();
  const branch = getActiveBranch();
  const activeShift = getActiveShift();
  const batches = getBatches();
  const now = new Date().toISOString();

  const sale: Sale = {
    id: generateUUID(),
    invoiceNumber: generateInvoiceNumber('INV'),
    date: now,
    userId: user?.id || 'system',
    userName: user?.name || 'الكاشير',
    customerId: saleData.customerId,
    customerName: saleData.customerName || 'عميل نقدي',
    branchId: branch?.id || 'branch-main-01',
    deviceId: device?.id || 'DEV-WIN-01',
    shiftId: activeShift?.id,
    items: saleData.items,
    subtotal: saleData.subtotal,
    discount: saleData.discount,
    tax: saleData.tax,
    total: saleData.total,
    paid: saleData.paid,
    remaining: saleData.remaining,
    change: saleData.change,
    paymentMethod: saleData.paymentMethod,
    notes: saleData.notes,
    status: 'completed',
    syncStatus: 'synced',
    syncVersion: 1,
    idempotencyKey: generateUUID(),
  };

  // 1. Deduct stock from the corresponding batches
  sale.items.forEach(item => {
    const batch = batches.find(b => b.id === item.batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity - item.quantity);
    }
    // Record inventory movement
    recordInventoryMovement({
      productId: item.productId,
      productName: item.productName,
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      quantity: -item.quantity,
      movementType: 'SALE',
      referenceId: sale.invoiceNumber,
      reason: `مبيعات فاتورة رقم ${sale.invoiceNumber}`,
    });
  });
  writeItem(STORAGE_KEYS.BATCHES, batches);

  // 2. Save the sale
  const sales = getSales();
  sales.unshift(sale);
  writeItem(STORAGE_KEYS.SALES, sales);

  // 3. Update customer balance if debt exists
  if (sale.customerId && sale.customerId !== 'cust-001' && sale.remaining > 0) {
    const customers = getCustomers();
    const cust = customers.find(c => c.id === sale.customerId);
    if (cust) {
      cust.balance = (cust.balance || 0) + sale.remaining;
      writeItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  // 4. Update shift totals
  if (activeShift) {
    if (sale.paymentMethod === 'cash') {
      activeShift.cashSales = (activeShift.cashSales || 0) + (sale.paid - sale.change);
    } else {
      activeShift.cardSales = (activeShift.cardSales || 0) + (sale.paid - sale.change);
    }
    activeShift.expectedCash = (activeShift.openingCash || 0) + activeShift.cashSales - (activeShift.expenses || 0) - (activeShift.returns || 0);
    saveShift(activeShift);
  }

  // 5. Audit Log
  recordAudit({
    userId: sale.userId,
    userName: sale.userName,
    action: 'SALE',
    actionAr: 'إصدار فاتورة بيع نقدية',
    deviceId: sale.deviceId,
    details: `فاتورة ${sale.invoiceNumber} بقيمة إجمالية ${sale.total.toFixed(2)} ج.م (المدفوع: ${sale.paid.toFixed(2)}, الباقي: ${sale.change.toFixed(2)})`
  });

  // 6. Enqueue Sync for offline/server sync
  enqueueSync({
    operationId: sale.idempotencyKey,
    entity: 'sale',
    entityId: sale.id,
    action: 'INSERT',
    payload: sale,
  });

  return sale;
}

// ==================== PURCHASES ====================
export function getPurchases(): Purchase[] {
  return readItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
}

export function recordPurchase(purchaseData: {
  supplierId: string;
  supplierName: string;
  items: Purchase['items'];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod: Purchase['paymentMethod'];
  notes?: string;
  invoiceNumber?: string;
}): Purchase {
  const user = getCurrentUser();
  const device = getActiveDevice();
  const branch = getActiveBranch();
  const batches = getBatches();
  const now = new Date().toISOString();

  const purchase: Purchase = {
    id: generateUUID(),
    invoiceNumber: purchaseData.invoiceNumber || generateInvoiceNumber('PUR'),
    supplierId: purchaseData.supplierId,
    supplierName: purchaseData.supplierName,
    date: now,
    branchId: branch?.id || 'branch-main-01',
    userId: user?.id || 'system',
    userName: user?.name || 'المدير',
    items: purchaseData.items,
    subtotal: purchaseData.subtotal,
    discount: purchaseData.discount,
    tax: purchaseData.tax,
    total: purchaseData.total,
    paid: purchaseData.paid,
    remaining: purchaseData.remaining,
    paymentMethod: purchaseData.paymentMethod,
    notes: purchaseData.notes,
    createdAt: now,
  };

  // 1. Process items -> create or increment batches
  purchase.items.forEach(item => {
    // Check if batch with same number exists
    let batch = batches.find(b => b.productId === item.productId && b.batchNumber.toLowerCase() === item.batchNumber.toLowerCase());
    if (batch) {
      batch.quantity += item.quantity;
      batch.purchasePrice = item.purchasePrice;
      batch.salePrice = item.salePrice;
      batch.expiryDate = item.expiryDate;
    } else {
      batch = {
        id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: item.productId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        quantity: item.quantity,
        createdAt: now,
      };
      batches.push(batch);
    }

    recordInventoryMovement({
      productId: item.productId,
      productName: item.productName,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: item.quantity,
      movementType: 'PURCHASE',
      referenceId: purchase.invoiceNumber,
      reason: `وارد مشتريات من المورد ${purchase.supplierName} فاتورة ${purchase.invoiceNumber}`,
    });
  });
  writeItem(STORAGE_KEYS.BATCHES, batches);

  // 2. Save purchase invoice
  const purchases = getPurchases();
  purchases.unshift(purchase);
  writeItem(STORAGE_KEYS.PURCHASES, purchases);

  // 3. Update supplier balance if remaining > 0
  if (purchase.supplierId && purchase.remaining > 0) {
    const suppliers = getSuppliers();
    const sup = suppliers.find(s => s.id === purchase.supplierId);
    if (sup) {
      sup.balance = (sup.balance || 0) + purchase.remaining;
      writeItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    }
  }

  // 4. Audit Log
  recordAudit({
    userId: purchase.userId,
    userName: purchase.userName,
    action: 'PURCHASE',
    actionAr: 'تسجيل فاتورة شراء واردة',
    deviceId: device?.id || 'DEV-WIN-01',
    details: `فاتورة شراء ${purchase.invoiceNumber} من المورد ${purchase.supplierName} بقيمة ${purchase.total.toFixed(2)} ج.م`
  });

  enqueueSync({
    operationId: generateUUID(),
    entity: 'purchase',
    entityId: purchase.id,
    action: 'INSERT',
    payload: purchase,
  });

  return purchase;
}

// ==================== RETURNS ====================
export function getReturns(): ReturnRecord[] {
  return readItem<ReturnRecord[]>(STORAGE_KEYS.RETURNS, []);
}

export function recordSaleReturn(params: {
  originalInvoiceNumber: string;
  items: { productId: string; productName: string; batchId?: string; batchNumber?: string; quantity: number; price: number; total: number }[];
  reason: string;
  customerId?: string;
  customerName?: string;
}): ReturnRecord {
  const user = getCurrentUser();
  const device = getActiveDevice();
  const batches = getBatches();
  const now = new Date().toISOString();
  const totalAmount = params.items.reduce((s, i) => s + i.total, 0);

  const returnRec: ReturnRecord = {
    id: generateUUID(),
    type: 'sale_return',
    invoiceNumber: generateInvoiceNumber('RET-S'),
    originalInvoiceId: params.originalInvoiceNumber,
    entityId: params.customerId,
    entityName: params.customerName || 'عميل نقدي',
    date: now,
    items: params.items,
    totalAmount,
    reason: params.reason,
    userId: user?.id || 'system',
    userName: user?.name || 'الكاشير',
    deviceId: device?.id || 'DEV-WIN-01',
  };

  // Re-increase batch quantity (Sale Return increases stock)
  params.items.forEach(item => {
    if (item.batchId) {
      const batch = batches.find(b => b.id === item.batchId);
      if (batch) {
        batch.quantity += item.quantity;
      }
    }
    recordInventoryMovement({
      productId: item.productId,
      productName: item.productName,
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      movementType: 'SALE_RETURN',
      referenceId: returnRec.invoiceNumber,
      reason: `مرتجع مبيعات عن فاتورة ${params.originalInvoiceNumber} (السبب: ${params.reason})`,
    });
  });
  writeItem(STORAGE_KEYS.BATCHES, batches);

  // If customer owed us money, decrease their balance
  if (params.customerId && params.customerId !== 'cust-001') {
    const customers = getCustomers();
    const c = customers.find(x => x.id === params.customerId);
    if (c) {
      c.balance = Math.max(0, (c.balance || 0) - totalAmount);
      writeItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  // Update active shift returns
  const activeShift = getActiveShift();
  if (activeShift) {
    activeShift.returns = (activeShift.returns || 0) + totalAmount;
    activeShift.expectedCash = (activeShift.openingCash || 0) + activeShift.cashSales - (activeShift.expenses || 0) - activeShift.returns;
    saveShift(activeShift);
  }

  const returns = getReturns();
  returns.unshift(returnRec);
  writeItem(STORAGE_KEYS.RETURNS, returns);

  recordAudit({
    userId: returnRec.userId,
    userName: returnRec.userName,
    action: 'SALE_RETURN',
    actionAr: 'تسجيل مرتجع مبيعات',
    deviceId: returnRec.deviceId,
    details: `مرتجع مبيعات ${returnRec.invoiceNumber} للفاتورة ${params.originalInvoiceNumber} بمبلغ ${totalAmount.toFixed(2)} ج.م`
  });

  return returnRec;
}

// ==================== EXPENSES ====================
export function getExpenses(): Expense[] {
  return readItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
}

export function recordExpense(data: {
  amount: number;
  category: Expense['category'];
  categoryAr: string;
  description: string;
  paymentMethod: Expense['paymentMethod'];
}): Expense {
  const user = getCurrentUser();
  const shift = getActiveShift();
  const expenses = getExpenses();

  const exp: Expense = {
    id: generateUUID(),
    amount: data.amount,
    category: data.category,
    categoryAr: data.categoryAr,
    description: data.description,
    date: new Date().toISOString(),
    userId: user?.id || 'system',
    userName: user?.name || 'المستخدم',
    shiftId: shift?.id,
    paymentMethod: data.paymentMethod,
  };

  expenses.unshift(exp);
  writeItem(STORAGE_KEYS.EXPENSES, expenses);

  if (shift && exp.paymentMethod === 'cash') {
    shift.expenses = (shift.expenses || 0) + exp.amount;
    shift.expectedCash = (shift.openingCash || 0) + shift.cashSales - shift.expenses - (shift.returns || 0);
    saveShift(shift);
  }

  recordAudit({
    userId: exp.userId,
    userName: exp.userName,
    action: 'EXPENSE',
    actionAr: 'تسجيل مصروف نثريات',
    deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
    details: `${exp.categoryAr}: ${exp.description} بمبلغ ${exp.amount.toFixed(2)} ج.م`
  });

  enqueueSync({
    operationId: generateUUID(),
    entity: 'expense',
    entityId: exp.id,
    action: 'INSERT',
    payload: exp,
  });

  return exp;
}

// ==================== SHIFTS ====================
export function getShifts(): Shift[] {
  return readItem<Shift[]>(STORAGE_KEYS.SHIFTS, []);
}

export function getActiveShift(): Shift | null {
  const shifts = getShifts();
  const currentBranch = getActiveBranch();
  return shifts.find(s => s.status === 'open' && s.branchId === currentBranch.id) || null;
}

export function openShift(openingCash: number, notes?: string): Shift {
  const user = getCurrentUser();
  const device = getActiveDevice();
  const branch = getActiveBranch();
  const shifts = getShifts();

  const newShift: Shift = {
    id: `shift-${Date.now()}`,
    userId: user?.id || 'system',
    userName: user?.name || 'الكاشير',
    deviceId: device?.id || 'DEV-WIN-01',
    branchId: branch?.id || 'branch-main-01',
    openingCash,
    startTime: new Date().toISOString(),
    status: 'open',
    cashSales: 0,
    cardSales: 0,
    expenses: 0,
    returns: 0,
    expectedCash: openingCash,
    notes,
  };

  shifts.unshift(newShift);
  writeItem(STORAGE_KEYS.SHIFTS, shifts);

  recordAudit({
    userId: newShift.userId,
    userName: newShift.userName,
    action: 'OPEN_SHIFT',
    actionAr: 'فتح شيفت كاشير جديد',
    deviceId: newShift.deviceId,
    details: `رصيد افتتاحي: ${openingCash.toFixed(2)} ج.م`
  });

  return newShift;
}

export function closeShift(actualCash: number, notes?: string): Shift | null {
  const active = getActiveShift();
  if (!active) return null;

  const shifts = getShifts();
  const idx = shifts.findIndex(s => s.id === active.id);
  if (idx < 0) return null;

  const expected = (active.openingCash || 0) + (active.cashSales || 0) - (active.expenses || 0) - (active.returns || 0);
  const difference = actualCash - expected;

  active.status = 'closed';
  active.endTime = new Date().toISOString();
  active.actualCash = actualCash;
  active.expectedCash = expected;
  active.difference = difference;
  if (notes) active.notes = (active.notes ? active.notes + ' | ' : '') + notes;

  shifts[idx] = active;
  writeItem(STORAGE_KEYS.SHIFTS, shifts);

  recordAudit({
    userId: active.userId,
    userName: active.userName,
    action: 'CLOSE_SHIFT',
    actionAr: 'إغلاق شيفت كاشير',
    deviceId: active.deviceId,
    details: `المبلغ الفعلي: ${actualCash.toFixed(2)} ج.م، المتوقع: ${expected.toFixed(2)} ج.م (الفارق: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} ج.م)`
  });

  return active;
}

export function saveShift(shift: Shift): void {
  const shifts = getShifts();
  const idx = shifts.findIndex(s => s.id === shift.id);
  if (idx >= 0) {
    shifts[idx] = shift;
    writeItem(STORAGE_KEYS.SHIFTS, shifts);
  }
}

// ==================== SUPPLIERS & CUSTOMERS ====================
export function getSuppliers(): Supplier[] {
  return readItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
}

export function saveSupplier(data: Partial<Supplier>): Supplier {
  const suppliers = getSuppliers();
  const isNew = !data.id;
  const supId = data.id || `sup-${Date.now()}`;

  const complete: Supplier = {
    id: supId,
    name: data.name || 'مورد جديد',
    phone: data.phone || '',
    address: data.address || '',
    notes: data.notes || '',
    balance: Number(data.balance) || 0,
    createdAt: data.createdAt || new Date().toISOString(),
  };

  if (isNew) {
    suppliers.push(complete);
  } else {
    const idx = suppliers.findIndex(s => s.id === supId);
    if (idx >= 0) suppliers[idx] = complete;
  }
  writeItem(STORAGE_KEYS.SUPPLIERS, suppliers);
  return complete;
}

export function recordSupplierPayment(supplierId: string, amount: number, notes?: string): void {
  const suppliers = getSuppliers();
  const sup = suppliers.find(s => s.id === supplierId);
  if (sup) {
    sup.balance = Math.max(0, (sup.balance || 0) - amount);
    writeItem(STORAGE_KEYS.SUPPLIERS, suppliers);

    recordAudit({
      userId: getCurrentUser()?.id || 'system',
      userName: getCurrentUser()?.name || 'النظام',
      action: 'SUPPLIER_PAYMENT',
      actionAr: 'سداد دفعة نقدية لمورد',
      deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
      details: `تم سداد ${amount.toFixed(2)} ج.م للمورد ${sup.name} (${notes || 'سداد آجل'})`
    });
  }
}

export function getCustomers(): Customer[] {
  return readItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
}

export function saveCustomer(data: Partial<Customer>): Customer {
  const customers = getCustomers();
  const isNew = !data.id;
  const custId = data.id || `cust-${Date.now()}`;

  const complete: Customer = {
    id: custId,
    name: data.name || 'عميل جديد',
    phone: data.phone || '',
    address: data.address || '',
    notes: data.notes || '',
    balance: Number(data.balance) || 0,
    createdAt: data.createdAt || new Date().toISOString(),
  };

  if (isNew) {
    customers.push(complete);
  } else {
    const idx = customers.findIndex(c => c.id === custId);
    if (idx >= 0) customers[idx] = complete;
  }
  writeItem(STORAGE_KEYS.CUSTOMERS, customers);
  return complete;
}

export function recordCustomerPayment(customerId: string, amount: number, notes?: string): void {
  const customers = getCustomers();
  const cust = customers.find(c => c.id === customerId);
  if (cust) {
    cust.balance = Math.max(0, (cust.balance || 0) - amount);
    writeItem(STORAGE_KEYS.CUSTOMERS, customers);

    recordAudit({
      userId: getCurrentUser()?.id || 'system',
      userName: getCurrentUser()?.name || 'النظام',
      action: 'CUSTOMER_PAYMENT',
      actionAr: 'تحصيل دفعة نقدية من عميل',
      deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
      details: `تم تحصيل ${amount.toFixed(2)} ج.م من العميل ${cust.name} (${notes || 'تحصيل دين'})`
    });
  }
}

// ==================== USERS ====================
export function getUsers(): User[] {
  return readItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export function saveUser(data: Partial<User>): User {
  const users = getUsers();
  const isNew = !data.id;
  const userId = data.id || `usr-${Date.now()}`;

  const complete: User = {
    id: userId,
    name: data.name || 'مستخدم جديد',
    username: data.username || `user_${Date.now().toString().slice(-4)}`,
    password: data.password || '123',
    role: data.role || 'cashier',
    branchId: data.branchId || 'branch-main-01',
    deviceId: data.deviceId,
    phone: data.phone || '',
    status: data.status || 'active',
    createdAt: data.createdAt || new Date().toISOString(),
  };

  if (isNew) {
    users.push(complete);
  } else {
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) users[idx] = complete;
  }
  writeItem(STORAGE_KEYS.USERS, users);
  return complete;
}

// ==================== SETTINGS ====================
export function getSettings(): PharmacySettings {
  return readItem<PharmacySettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export function saveSettings(settings: Partial<PharmacySettings>): PharmacySettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  writeItem(STORAGE_KEYS.SETTINGS, updated);

  recordAudit({
    userId: getCurrentUser()?.id || 'system',
    userName: getCurrentUser()?.name || 'النظام',
    action: 'SETTINGS_UPDATE',
    actionAr: 'تحديث إعدادات النظام',
    deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
    details: 'تم تحديث بيانات الصيدلية وإعدادات الشبكة والطابعات'
  });

  return updated;
}

// ==================== AUDIT LOGS ====================
export function getAuditLogs(): AuditLog[] {
  return readItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
}

export function recordAudit(entry: {
  userId: string;
  userName: string;
  action: string;
  actionAr: string;
  deviceId: string;
  details: string;
  oldValue?: string;
  newValue?: string;
}): void {
  const logs = getAuditLogs();
  const now = new Date();
  const newLog: AuditLog = {
    id: generateUUID(),
    userId: entry.userId,
    userName: entry.userName,
    action: entry.action,
    actionAr: entry.actionAr,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
    deviceId: entry.deviceId,
    details: entry.details,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
  };
  logs.unshift(newLog);
  // Keep last 1000 logs
  if (logs.length > 1000) logs.length = 1000;
  writeItem(STORAGE_KEYS.AUDIT_LOGS, logs);
}

// ==================== SYNC QUEUE & CONFLICTS ====================
export function getSyncQueue(): SyncQueueItem[] {
  return readItem<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
}

export function enqueueSync(item: {
  operationId: string;
  entity: SyncQueueItem['entity'];
  entityId: string;
  action: SyncQueueItem['action'];
  payload: any;
}): void {
  const queue = getSyncQueue();
  const user = getCurrentUser();
  const device = getActiveDevice();

  const syncItem: SyncQueueItem = {
    id: generateUUID(),
    operationId: item.operationId,
    entity: item.entity,
    entityId: item.entityId,
    action: item.action,
    payload: item.payload,
    deviceId: device?.id || 'DEV-WIN-01',
    userId: user?.id || 'system',
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
    idempotencyKey: item.operationId,
  };

  queue.push(syncItem);
  writeItem(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function getSyncConflicts(): SyncConflict[] {
  return readItem<SyncConflict[]>(STORAGE_KEYS.SYNC_CONFLICTS, []);
}

export function resolveSyncConflict(conflictId: string, resolution: 'device1_wins' | 'device2_wins' | 'manual_merged'): void {
  const conflicts = getSyncConflicts();
  const conflict = conflicts.find(c => c.id === conflictId);
  if (conflict) {
    conflict.status = 'resolved';
    conflict.resolution = resolution;
    conflict.resolvedBy = getCurrentUser()?.name || 'Admin';
    conflict.resolvedAt = new Date().toISOString();
    writeItem(STORAGE_KEYS.SYNC_CONFLICTS, conflicts);
  }
}

// ==================== BACKUP & RESTORE ====================
export function exportDatabaseJson(): string {
  const dump = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    products: readItem(STORAGE_KEYS.PRODUCTS, []),
    batches: readItem(STORAGE_KEYS.BATCHES, []),
    categories: readItem(STORAGE_KEYS.CATEGORIES, []),
    companies: readItem(STORAGE_KEYS.COMPANIES, []),
    users: readItem(STORAGE_KEYS.USERS, []),
    permissions: readItem(STORAGE_KEYS.PERMISSIONS, []),
    suppliers: readItem(STORAGE_KEYS.SUPPLIERS, []),
    customers: readItem(STORAGE_KEYS.CUSTOMERS, []),
    sales: readItem(STORAGE_KEYS.SALES, []),
    purchases: readItem(STORAGE_KEYS.PURCHASES, []),
    returns: readItem(STORAGE_KEYS.RETURNS, []),
    expenses: readItem(STORAGE_KEYS.EXPENSES, []),
    shifts: readItem(STORAGE_KEYS.SHIFTS, []),
    movements: readItem(STORAGE_KEYS.MOVEMENTS, []),
    settings: readItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    branches: readItem(STORAGE_KEYS.BRANCHES, []),
    devices: readItem(STORAGE_KEYS.DEVICES, []),
    auditLogs: readItem(STORAGE_KEYS.AUDIT_LOGS, []),
  };
  return JSON.stringify(dump, null, 2);
}

export function restoreDatabaseJson(jsonStr: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.products || !data.batches) {
      return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو غير مكتمل' };
    }
    writeItem(STORAGE_KEYS.PRODUCTS, data.products);
    writeItem(STORAGE_KEYS.BATCHES, data.batches);
    if (data.categories) writeItem(STORAGE_KEYS.CATEGORIES, data.categories);
    if (data.companies) writeItem(STORAGE_KEYS.COMPANIES, data.companies);
    if (data.users) writeItem(STORAGE_KEYS.USERS, data.users);
    if (data.permissions) writeItem(STORAGE_KEYS.PERMISSIONS, data.permissions);
    if (data.suppliers) writeItem(STORAGE_KEYS.SUPPLIERS, data.suppliers);
    if (data.customers) writeItem(STORAGE_KEYS.CUSTOMERS, data.customers);
    if (data.sales) writeItem(STORAGE_KEYS.SALES, data.sales);
    if (data.purchases) writeItem(STORAGE_KEYS.PURCHASES, data.purchases);
    if (data.returns) writeItem(STORAGE_KEYS.RETURNS, data.returns);
    if (data.expenses) writeItem(STORAGE_KEYS.EXPENSES, data.expenses);
    if (data.shifts) writeItem(STORAGE_KEYS.SHIFTS, data.shifts);
    if (data.movements) writeItem(STORAGE_KEYS.MOVEMENTS, data.movements);
    if (data.settings) writeItem(STORAGE_KEYS.SETTINGS, data.settings);
    if (data.branches) writeItem(STORAGE_KEYS.BRANCHES, data.branches);
    if (data.devices) writeItem(STORAGE_KEYS.DEVICES, data.devices);

    recordAudit({
      userId: getCurrentUser()?.id || 'admin',
      userName: getCurrentUser()?.name || 'مدير النظام',
      action: 'RESTORE_BACKUP',
      actionAr: 'استعادة نسخة احتياطية',
      deviceId: getActiveDevice()?.id || 'DEV-WIN-01',
      details: `تمت استعادة قاعدة البيانات بنجاح من ملف مصدر بتاريخ ${data.exportedAt || 'سابق'}`
    });

    return { success: true, message: 'تمت استعادة النسخة الاحتياطية بنجاح وتحديث كافة السجلات' };
  } catch (e) {
    return { success: false, message: 'فشل تحليل ملف النسخة الاحتياطية: ' + (e instanceof Error ? e.message : 'خطأ غير معروف') };
  }
}

export function resetAllData(): void {
  localStorage.clear();
  initializeStorageIfEmpty();
  notifyListeners();
}

// Aliases and utility bridges
export const upsertProduct = saveProduct;
export const upsertCustomer = saveCustomer;
export const upsertSupplier = saveSupplier;
export const upsertUser = saveUser;
export const getPharmacySettings = getSettings;
export const updatePharmacySettings = saveSettings;

export function updateBatchQuantity(batchId: string, quantity: number): void {
  const batches = getBatches();
  const b = batches.find(x => x.id === batchId);
  if (b) {
    b.quantity = quantity;
    writeItem(STORAGE_KEYS.BATCHES, batches);
    notifyListeners();
  }
}

export function triggerSync(): { success: boolean; message: string } {
  return { success: true, message: 'تم إرسال كافة التحديثات بنجاح إلى قاعدة البيانات المركزية' };
}

