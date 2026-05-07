import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import QRCode from 'qrcode';
import { Camera, Download, X } from 'lucide-react';

interface Props {
  onScan: (data: string | null) => void;
  onClose: () => void;
}

export const QRCodeScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
        }
      },
      (error) => {
        // Suppress errors during scanning as they are very frequent (e.g. "No QR code found")
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner during unmount", error));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-4 rounded-xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Scan QR Code</h2>
            <button onClick={onClose}><X size={20} /></button>
        </div>
        <div id="qr-reader" style={{ width: '100%' }}></div>
      </div>
    </div>
  );
};

export const DownloadQRCode = ({ data, name }: { data: string, name: string }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(data).then(setSrc);
  }, [data]);

  const download = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${name}-qr.png`;
    link.click();
  };

  return (
    <button onClick={download} className="flex items-center gap-2 text-brand-blue text-sm font-bold uppercase tracking-widest mt-2">
      <Download size={14} /> Download QR
    </button>
  );
};
