import React, { useState } from 'react';
import { Printer, X, Check, Copy, FileText } from 'lucide-react';
import { Sale } from '../../types/pharmacy';
import { getSettings } from '../../services/storageService';
import { getPrinterSettings } from '../../services/printerService';
import { generateCode128Svg } from '../../utils/barcodeGenerator';

interface ThermalReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, onClose }) => {
  const printerSettings = getPrinterSettings();
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(
    printerSettings.invoicePaperWidth === '58mm' ? '58mm' : '80mm'
  );
  const settings = getSettings();

  const handlePrint = () => {
    window.print();
  };

  const invoiceBarcodeSvg = generateCode128Svg(sale.invoiceNumber, 40, 1.8);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">معاينة وطباعة الفاتورة الحرارية</h3>
              <span className="text-[10px] text-emerald-300 font-mono block">
                الطابعة: {printerSettings.defaultInvoicePrinter}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Paper Width Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  paperWidth === '80mm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80 مم
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  paperWidth === '58mm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58 مم
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {/* THERMAL PAPER CONTAINER (printable-area targeted by CSS) */}
          <div
            id="printable-area"
            className={`bg-white p-4 shadow-md text-slate-900 font-mono text-xs border border-slate-300 print:border-none print:shadow-none ${
              paperWidth === '80mm' ? 'w-[78mm] max-w-[78mm]' : 'w-[56mm] max-w-[56mm]'
            }`}
          >
            {/* Pharmacy Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="text-sm font-black text-slate-900 font-sans tracking-wide">
                {settings.pharmacyNameAr}
              </h2>
              <p className="text-[10px] text-slate-600 mt-0.5">{settings.pharmacyNameEn}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}</p>
              <p className="text-[10px] text-slate-600">هاتف: {settings.phone1} {settings.phone2 ? `- ${settings.phone2}` : ''}</p>
              <div className="text-[9px] text-slate-500 mt-1 flex justify-center gap-2">
                <span>س.ت: {settings.commercialRegister}</span>
                <span>•</span>
                <span>ب.ض: {settings.taxNumber}</span>
              </div>
            </div>

            {/* Receipt Meta Info */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{sale.date}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span>{sale.userName}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span>{sale.customerName || 'نقدي'}</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-bold uppercase">{sale.paymentMethod}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400">
              <table className="w-full text-right text-[10px]">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="pb-1 font-bold">الصنف / الباتش</th>
                    <th className="pb-1 text-center font-bold">الكمية</th>
                    <th className="pb-1 text-center font-bold">السعر</th>
                    <th className="pb-1 text-left font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sale.items.map((item, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-1">
                        <div className="font-sans font-bold leading-tight">{item.productName}</div>
                        <div className="text-[9px] text-slate-500">
                          {item.batchNumber} • {item.expiryDate}
                        </div>
                      </td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-center">{item.salePrice.toFixed(2)}</td>
                      <td className="py-1 text-left font-bold">{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{sale.subtotal.toFixed(2)} ج.م</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>الخصم:</span>
                  <span>-{sale.discount.toFixed(2)} ج.م</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>ضريبة القيمة المضافة:</span>
                  <span>+{sale.tax.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-300">
                <span>الصافي الإجمالي:</span>
                <span>{sale.total.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>المبلغ المدفوع:</span>
                <span>{sale.paid.toFixed(2)} ج.م</span>
              </div>
              {sale.change > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>الباقي المسترد:</span>
                  <span>{sale.change.toFixed(2)} ج.م</span>
                </div>
              )}
              {sale.remaining > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-slate-800">
                  <span>المتبقي آجل:</span>
                  <span>{sale.remaining.toFixed(2)} ج.م</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer */}
            <div className="text-center pt-3 space-y-2">
              <div
                className="w-full flex justify-center py-1 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: invoiceBarcodeSvg }}
              />
              <p className="text-[10px] font-sans font-bold text-slate-700">
                {settings.receiptFooterAr}
              </p>
              <p className="text-[9px] text-slate-400">
                البرنامج يعمل بنظام أوفلاين معتمد
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Bar (Hidden in Print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الإيصال الحراري الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
