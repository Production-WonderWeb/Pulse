import React, { useState, useEffect } from 'react';
import QrScanner from 'react-qr-scanner';
import QRCode from 'qrcode';
import { Camera, Download, X } from 'lucide-react';

interface Props {
  onScan: (data: string | null) => void;
  onClose: () => void;
}

export const QRCodeScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const handleError = (err: any) => console.error(err);
  const handleScan = (data: any) => {
    if (data) onScan(data.text);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-4 rounded-xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Scan QR Code</h2>
            <button onClick={onClose}><X size={20} /></button>
        </div>
        <QrScanner
          delay={300}
          style={{ width: '100%', borderRadius: '10px' }}
          onError={handleError}
          onScan={handleScan}
        />
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
