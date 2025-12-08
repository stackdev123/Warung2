import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
  scanResultMessage?: string | null; // Pesan sukses (misal: "Indomie +1")
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose, isOpen, scanResultMessage }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(false);
  
  // Logic untuk mencegah double-scan instan pada kode yang sama
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const SCAN_DELAY = 1500; // Jeda waktu (ms) sebelum bisa scan kode yang SAMA lagi

  useEffect(() => {
    mountedRef.current = true;

    if (isOpen) {
      // Reset state scan
      lastScannedCodeRef.current = null;
      lastScannedTimeRef.current = 0;

      const initScanner = async () => {
        try {
          const formatsToSupport = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ];

          if (scannerRef.current) {
            try {
               await scannerRef.current.stop();
               scannerRef.current.clear();
            } catch (e) {
               console.warn("Cleanup warning:", e);
            }
          }

          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              formatsToSupport: formatsToSupport,
              disableFlip: false
            },
            (decodedText) => {
              if (!mountedRef.current) return;

              const now = Date.now();
              // Cek apakah kode sama dengan sebelumnya dan masih dalam durasi delay
              if (
                decodedText === lastScannedCodeRef.current && 
                now - lastScannedTimeRef.current < SCAN_DELAY
              ) {
                return; // Abaikan scan ini
              }

              // Update tracker
              lastScannedCodeRef.current = decodedText;
              lastScannedTimeRef.current = now;

              // Kirim hasil scan
              onScan(decodedText);
            },
            (errorMessage) => {
              // Abaikan error saat scanning berlangsung
            }
          );
          
          if (mountedRef.current) setHasPermission(true);

        } catch (err) {
          console.error("Camera start error:", err);
          if (mountedRef.current) setHasPermission(false);
        }
      };

      const timer = setTimeout(initScanner, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
        }
      };
    }

    return () => {
      mountedRef.current = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      onScan(manualCode);
      setManualCode('');
    }
  };

  const simulateScan = () => {
    const randomCode = Math.floor(Math.random() * 1000000000000).toString();
    onScan(randomCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-4 right-4 z-20">
        <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {hasPermission === false ? (
          <div className="text-white text-center p-4 z-10">
            <AlertCircle size={48} className="mx-auto mb-2 text-red-500" />
            <p className="font-bold">Akses kamera gagal.</p>
            <p className="text-sm text-gray-400 mt-2">Pastikan izin kamera aktif atau gunakan input manual.</p>
          </div>
        ) : (
          <>
            {/* Wadah Video Scanner */}
            <div id="reader" className="w-full h-full"></div>
            
            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64 border-2 border-primary/50 rounded-lg">
                 {/* Pojok Scanner */}
                 <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-green-500 -mt-1 -ml-1"></div>
                 <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-green-500 -mt-1 -mr-1"></div>
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-green-500 -mb-1 -ml-1"></div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-green-500 -mb-1 -mr-1"></div>
                 
                 {/* Garis Scan Animasi */}
                 <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>

              {/* Feedback Message (Toast di dalam kamera) */}
              {scanResultMessage && (
                <div className="absolute top-24 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-md bg-opacity-90">
                    <CheckCircle2 size={24} className="text-white" />
                    <span className="font-bold text-lg">{scanResultMessage}</span>
                  </div>
                </div>
              )}

              <p className="absolute bottom-20 text-white text-xs font-medium bg-black/40 px-3 py-1 rounded backdrop-blur-sm">
                Arahkan ke Barcode atau QR Code
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-4 rounded-t-xl z-20">
        <form onSubmit={handleManualSubmit} className="flex gap-2 mb-2">
          <input 
            type="text" 
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Ketik kode manual..." 
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-lg"
            autoFocus
          />
          <button type="submit" className="bg-primary text-white px-4 rounded-lg font-bold">
            OK
          </button>
        </form>
        <button onClick={simulateScan} className="w-full py-2 text-xs text-gray-400 flex items-center justify-center gap-1 hover:text-primary">
          <Zap size={14} /> Mode Demo (Simulasi)
        </button>
      </div>
      
      <style>{`
        #reader video {
          object-fit: cover;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
};