import React, { useState } from 'react';
import { Printer, X, Tag } from 'lucide-react';
import { Product, Batch } from '../../types/pharmacy';
import { generateCode128Svg } from '../../utils/barcodeGenerator';
import { getSettings } from '../../services/storageService';

interface BarcodePrintModalProps {
  product: Product;
  batch?: Batch;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ product, batch, onClose }) => {
  const [labelSize, setLabelSize] = useState<'50x25' | '40x20' | '38x25'>('50x25');
  const [copies, setCopies] = useState<number>(1);
  const settings = getSettings();

  const selectedBatch = batch || (product.batches && product.batches.length > 0 ? product.batches[0] : null);
  const barcodeSvg = generateCode128Svg(product.barcode, 35, 1.5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">طباعة ملصق الباركود (Barcode Label)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4 bg-slate-50 border-b border-slate-200 no-print">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مقاس ورق الملصق
              </label>
              <select
                value={labelSize}
                onChange={e => setLabelSize(e.target.value as any)}
                className="w-full bg-white border border-slate-300 text-xs rounded-lg p-2 font-medium"
              >
                <option value="50x25">50 × 25 مم (شائع)</option>
                <option value="40x20">40 × 20 مم (صغير)</option>
                <option value="38x25">38 × 25 مم (مزدوج)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عدد الملصقات للطباعة
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={copies}
                onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-slate-300 text-xs rounded-lg p-2 font-mono font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* Preview Container */}
        <div className="p-6 bg-slate-200 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold text-slate-500 mb-2 no-print">
            معاينة الملصق (نسبة 1:1)
          </span>

          {/* Actual Printable Label Element */}
          <div
            id="printable-area"
            className="bg-white border-2 border-slate-400 p-2 text-center rounded shadow-sm text-slate-900 select-none"
            style={{
              width: labelSize === '50x25' ? '190px' : labelSize === '40x20' ? '150px' : '145px',
              minHeight: labelSize === '50x25' ? '95px' : labelSize === '40x20' ? '76px' : '95px',
            }}
          >
            <div className="text-[9px] font-black text-slate-800 leading-tight">
              {settings.pharmacyNameAr}
            </div>

            <div className="text-[10px] font-black text-slate-900 leading-tight mt-0.5 line-clamp-1">
              {product.nameAr}
            </div>

            <div className="my-1 flex justify-center" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />

            <div className="flex justify-between items-center text-[9px] border-t border-slate-300 pt-0.5 mt-0.5">
              <span className="font-bold text-slate-700">
                {selectedBatch ? `B:${selectedBatch.batchNumber}` : ''}
              </span>
              <span className="font-black text-[11px] text-slate-950 font-sans">
                {product.salePrice.toFixed(2)} ج.م
              </span>
              <span className="text-slate-600">
                {selectedBatch ? selectedBatch.expiryDate.slice(2, 7) : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-white flex justify-between items-center no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الملصق ({copies})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
