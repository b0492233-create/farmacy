type ScanHandler = (barcode: string) => void;

class BarcodeScannerService {
  private handlers: Set<ScanHandler> = new Set();
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private readonly BURST_THRESHOLD_MS = 50; // Hardware scanner keystroke interval
  private isListening: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public init() {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown, true);
    this.isListening = true;
  }

  public destroy() {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.isListening = false;
  }

  public subscribe(handler: ScanHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public triggerManualScan(barcode: string) {
    const clean = barcode.trim();
    if (!clean) return;
    this.handlers.forEach(fn => fn(clean));
  }

  private handleKeyDown(e: KeyboardEvent) {
    // If user is typing in a textarea or certain inputs that want normal text,
    // we still check if the keystroke speed resembles a hardware scanner burst!
    const now = Date.now();
    const timeDiff = now - this.lastKeyTime;
    this.lastKeyTime = now;

    if (e.key === 'Enter') {
      if (this.buffer.length >= 4) {
        const scannedCode = this.buffer.trim();
        this.buffer = '';
        
        // Prevent default form submit
        e.preventDefault();
        e.stopPropagation();

        this.handlers.forEach(fn => fn(scannedCode));
      } else {
        this.buffer = '';
      }
      return;
    }

    // Single printable characters
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (timeDiff > this.BURST_THRESHOLD_MS && this.buffer.length > 0) {
        // Human typing is slow (>50ms per key); reset buffer if slow
        this.buffer = '';
      }
      this.buffer += e.key;
    }
  }
}

export const barcodeScanner = new BarcodeScannerService();
