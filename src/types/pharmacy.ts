export type Role = 'admin' | 'manager' | 'pharmacist' | 'cashier' | 'inventory_manager';
export type RoleType = Role;

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  pin?: string;
  role: Role;
  branchId: string;
  deviceId?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  permissions?: string[];
  createdAt?: string;
}

export interface Permission {
  id: string;
  key: string;
  nameAr: string;
  category: 'pos' | 'products' | 'inventory' | 'purchases' | 'reports' | 'users' | 'settings';
}

export interface RolePermissions {
  role: RoleType;
  permissions: string[]; // array of permission keys
}

export interface Category {
  id: string;
  nameAr: string;
  description?: string;
}

export interface Company {
  id: string;
  nameAr: string;
  country?: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  createdAt: string;
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn?: string;
  barcode: string;
  additionalBarcodes?: string[];
  internalCode: string;
  sku: string;
  categoryId: string;
  categoryNameAr?: string;
  companyId: string;
  activeIngredient: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  minimumStock: number;
  tax: number; // e.g., 0 or 14%
  taxRate?: number;
  description?: string;
  status: 'active' | 'inactive';
  requiresPrescription?: boolean;
  batches?: Batch[];
  totalQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 
  | 'STOCK_IN' 
  | 'STOCK_OUT' 
  | 'SALE' 
  | 'PURCHASE' 
  | 'SALE_RETURN' 
  | 'PURCHASE_RETURN' 
  | 'DAMAGE' 
  | 'EXPIRED_DISCARD' 
  | 'TRANSFER' 
  | 'ADJUSTMENT';

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number; // positive or negative
  movementType: MovementType;
  referenceId?: string;
  userId: string;
  userName: string;
  deviceId: string;
  branchId: string;
  date: string;
  reason: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  quantity: number;
  maxQuantity: number;
  discount: number; // in EGP
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'visa' | 'credit';

export interface Sale {
  id: string; // UUID
  invoiceNumber: string;
  date: string;
  userId: string;
  userName: string;
  customerId?: string;
  customerName?: string;
  branchId: string;
  deviceId: string;
  shiftId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  change: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  status: 'completed' | 'returned' | 'partial_returned';
  syncStatus: 'synced' | 'pending' | 'conflict';
  syncVersion: number;
  idempotencyKey: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  branchId: string;
  userId: string;
  userName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  balance: number; // positive = we owe them
  createdAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  date: string;
  type: 'purchase' | 'payment' | 'return';
  referenceId?: string;
  amount: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  balance: number; // positive = customer owes us
  createdAt: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  date: string;
  type: 'sale' | 'payment' | 'return';
  referenceId?: string;
  amount: number;
  notes?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReturnRecord {
  id: string;
  type: 'sale_return' | 'purchase_return';
  invoiceNumber: string;
  originalInvoiceId?: string;
  entityId?: string; // customer or supplier id
  entityName?: string;
  date: string;
  items: ReturnItem[];
  totalAmount: number;
  reason: string;
  userId: string;
  userName: string;
  deviceId: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: 'rent' | 'electricity' | 'salaries' | 'maintenance' | 'transport' | 'packaging' | 'other';
  categoryAr: string;
  description: string;
  date: string;
  userId: string;
  userName: string;
  shiftId?: string;
  paymentMethod: PaymentMethod;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  deviceId: string;
  branchId: string;
  openingCash: number;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  cashSales: number;
  cardSales: number;
  expenses: number;
  returns: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  notes?: string;
}

export interface Branch {
  id: string;
  nameAr: string;
  name?: string;
  code?: string;
  address: string;
  phone: string;
  isMain: boolean;
}

export interface Device {
  id: string;
  name: string;
  type: 'windows_pos' | 'android_mobile' | 'tablet';
  ip: string;
  branchId: string;
  lastSeen: string;
  syncStatus: 'synced' | 'pending' | 'offline';
  status: 'active' | 'blocked';
}

export interface SyncQueueItem {
  id: string;
  operationId: string;
  entity: 'sale' | 'purchase' | 'product' | 'batch' | 'customer' | 'supplier' | 'expense' | 'shift' | 'inventory_movement';
  entityId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  deviceId: string;
  userId: string;
  createdAt: string;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
  idempotencyKey: string;
}

export interface SyncConflict {
  id: string;
  entity: string;
  entityId: string;
  device1: string;
  device2: string;
  conflictDetails: string;
  oldValue: any;
  newValue: any;
  status: 'unresolved' | 'resolved';
  resolution?: 'device1_wins' | 'device2_wins' | 'manual_merged';
  resolvedBy?: string;
  resolvedAt?: string;
  date: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  actionAr: string;
  date: string;
  time: string;
  timestamp?: string;
  deviceId: string;
  details: string;
  oldValue?: string;
  newValue?: string;
}

export interface PharmacySettings {
  pharmacyNameAr: string;
  pharmacyNameEn: string;
  logoUrl?: string;
  taxNumber: string;
  commercialRegister: string;
  phone1: string;
  phone2: string;
  address: string;
  currency: string;
  taxRate: number; // e.g. 0% for medicines or custom
  invoiceFooterMessage: string;
  receiptFooterAr?: string;
  enableSoundAlerts: boolean;
  defaultPrinterType: 'thermal' | 'a4';
  thermalWidth: '80mm' | '58mm';
  barcodeLabelWidth: number; // mm
  barcodeLabelHeight: number; // mm
  autoSyncIntervalMinutes: number;
  serverIp: string;
  serverPort: number;
  networkMode: 'local_lan' | 'cloud' | 'standalone_offline';
  requirePrescriptionWarning: boolean;
  drugEyeSettings?: DrugEyeSettings;
}

export interface DrugEyeMedicine {
  id: string;
  tradeNameAr: string;
  tradeNameEn: string;
  activeIngredient: string;
  dosageForm: string;
  companyNameAr: string;
  companyNameEn?: string;
  barcode: string;
  edaRegistrationNo: string;
  officialPrice: number;
  previousPrice?: number;
  priceDifference?: number;
  priceEffectiveDate: string;
  edaBulletinNo: string;
  pharmacyDiscount: number;
  categoryAr: string;
  requiresPrescription: boolean;
  equivalents: string[];
  substitutes: string[];
  packageSize: string;
}

export interface DrugEyePriceComparison {
  productId?: string;
  drugEyeId: string;
  tradeNameAr: string;
  tradeNameEn: string;
  barcode: string;
  activeIngredient: string;
  currentPharmacyPrice?: number;
  newOfficialPrice: number;
  previousOfficialPrice: number;
  priceDifference: number;
  percentChange: number;
  edaBulletinNo: string;
  priceEffectiveDate: string;
  status: 'needs_update' | 'already_updated' | 'not_in_inventory';
  stockQuantity?: number;
}

export interface DrugEyeSettings {
  enabled: boolean;
  apiEndpoint: string;
  pharmacyLicenseId: string;
  apiKey: string;
  autoCheckOnStartup: boolean;
  autoCheckIntervalHours: number;
  lastSuccessfulSync?: string;
  updateBatchesWithProduct: boolean;
  notifyOnPriceIncrease: boolean;
}

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'thermal_receipt' | 'barcode_label' | 'laser_general' | 'virtual';
  connection: 'usb' | 'network' | 'bluetooth' | 'system';
  paperWidth: string; // '80mm' | '58mm' | '50x25mm' | 'A4'
  status: 'online' | 'ready' | 'offline';
  ipAddress?: string;
  isDefaultInvoice?: boolean;
  isDefaultBarcode?: boolean;
}

export interface PrinterSettingsConfig {
  defaultInvoicePrinter: string;
  defaultBarcodePrinter: string;
  availablePrinters: PrinterDevice[];
  autoPrintInvoiceOnSale: boolean;
  invoicePaperWidth: '80mm' | '58mm' | 'A4';
  barcodeLabelPreset: '50x25' | '40x20' | '38x25' | '60x30' | '50x30' | 'custom';
  openCashDrawerOnPrint: boolean;
  printCutPaper: boolean;
  barcodeCopiesDefault: number;
  lastTestedAt?: string;
}

