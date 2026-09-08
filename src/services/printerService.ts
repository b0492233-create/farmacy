import { PrinterDevice, PrinterSettingsConfig } from '../types/pharmacy';

export type { PrinterDevice, PrinterSettingsConfig };

const PRINTER_SETTINGS_KEY = 'pms_printer_settings_v2';

export const DEFAULT_AVAILABLE_PRINTERS: PrinterDevice[] = [
  {
    id: 'prn-xprinter-pos',
    name: 'Xprinter XP-80C Thermal POS (USB-001)',
    type: 'thermal_receipt',
    connection: 'usb',
    paperWidth: '80mm',
    status: 'online',
    isDefaultInvoice: true,
  },
  {
    id: 'prn-epson-tmt20',
    name: 'EPSON TM-T20III Receipt (LAN 192.168.1.180)',
    type: 'thermal_receipt',
    connection: 'network',
    paperWidth: '80mm',
    ipAddress: '192.168.1.180:9100',
    status: 'online',
    isDefaultInvoice: false,
  },
  {
    id: 'prn-bixolon-pos',
    name: 'Bixolon SRP-330II Thermal (USB)',
    type: 'thermal_receipt',
    connection: 'usb',
    paperWidth: '80mm',
    status: 'ready',
    isDefaultInvoice: false,
  },
  {
    id: 'prn-xprinter-barcode',
    name: 'Xprinter XP-365B Barcode Label (USB-002)',
    type: 'barcode_label',
    connection: 'usb',
    paperWidth: '50x25mm',
    status: 'online',
    isDefaultBarcode: true,
  },
  {
    id: 'prn-zebra-zd220',
    name: 'Zebra ZD220 Direct Thermal Label (USB-003)',
    type: 'barcode_label',
    connection: 'usb',
    paperWidth: '50x25mm',
    status: 'online',
    isDefaultBarcode: false,
  },
  {
    id: 'prn-tsc-te200',
    name: 'TSC TE200 Barcode Printer (LAN 192.168.1.185)',
    type: 'barcode_label',
    connection: 'network',
    paperWidth: '50x25mm',
    ipAddress: '192.168.1.185:9100',
    status: 'ready',
    isDefaultBarcode: false,
  },
  {
    id: 'prn-system-default',
    name: 'طابعة النظام الافتراضية (System Spooler / PDF)',
    type: 'virtual',
    connection: 'system',
    paperWidth: 'A4',
    status: 'online',
  },
];

export const INITIAL_PRINTER_SETTINGS: PrinterSettingsConfig = {
  defaultInvoicePrinter: 'Xprinter XP-80C Thermal POS (USB-001)',
  defaultBarcodePrinter: 'Xprinter XP-365B Barcode Label (USB-002)',
  availablePrinters: DEFAULT_AVAILABLE_PRINTERS,
  autoPrintInvoiceOnSale: true,
  invoicePaperWidth: '80mm',
  barcodeLabelPreset: '50x25',
  openCashDrawerOnPrint: true,
  printCutPaper: true,
  barcodeCopiesDefault: 1,
  lastTestedAt: new Date().toISOString(),
};

/**
 * جلب تفضيلات وإعدادات الطابعات المحفوظة في localStorage
 */
export function getPrinterSettings(): PrinterSettingsConfig {
  if (typeof window === 'undefined') return INITIAL_PRINTER_SETTINGS;
  try {
    const raw = localStorage.getItem(PRINTER_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(INITIAL_PRINTER_SETTINGS));
      return INITIAL_PRINTER_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_PRINTER_SETTINGS,
      ...parsed,
      availablePrinters: parsed.availablePrinters?.length > 0 ? parsed.availablePrinters : DEFAULT_AVAILABLE_PRINTERS,
    };
  } catch {
    return INITIAL_PRINTER_SETTINGS;
  }
}

/**
 * حفظ تفضيلات وإعدادات الطابعات في localStorage
 */
export function savePrinterSettings(
  updated: Partial<PrinterSettingsConfig>
): PrinterSettingsConfig {
  const current = getPrinterSettings();
  const merged: PrinterSettingsConfig = {
    ...current,
    ...updated,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(merged));
    } catch (err) {
      console.error('Failed to persist printer settings to localStorage', err);
    }
  }

  return merged;
}

/**
 * فحص الطابعات المتاحة على الجهاز
 */
export async function detectSystemPrinters(): Promise<PrinterDevice[]> {
  // محاكاة الاتصال والتحقق من تعريفات طابعات Windows/POS
  await new Promise(res => setTimeout(res, 600));
  const settings = getPrinterSettings();
  return settings.availablePrinters;
}

/**
 * إضافة طابعة جديدة لقائمة الطابعات
 */
export function addCustomPrinter(
  printerData: Omit<PrinterDevice, 'id'>
): PrinterSettingsConfig {
  const settings = getPrinterSettings();
  const newPrinter: PrinterDevice = {
    ...printerData,
    id: `prn-custom-${Date.now()}`,
  };

  const updatedPrinters = [...settings.availablePrinters, newPrinter];
  return savePrinterSettings({ availablePrinters: updatedPrinters });
}

/**
 * حذف طابعة من القائمة
 */
export function removePrinter(printerId: string): PrinterSettingsConfig {
  const settings = getPrinterSettings();
  const updatedPrinters = settings.availablePrinters.filter(p => p.id !== printerId);
  return savePrinterSettings({ availablePrinters: updatedPrinters });
}

/**
 * اختبار طباعة فاتورة تجريبية
 */
export function testPrintInvoice(printerName: string): void {
  savePrinterSettings({ lastTestedAt: new Date().toISOString() });
  window.print();
}
