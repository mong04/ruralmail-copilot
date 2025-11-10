// src/components/ScannerView.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import BarcodeScanner from './BarcodeScanner';

interface ScannerViewProps {
  onScanSuccess: (trackingNumber: string) => void;
  onClose: () => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onScanSuccess, onClose }) => {
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [canUseTorch, setCanUseTorch] = useState(false);

  const handleCameraReady = (capabilities: MediaTrackCapabilities) => {
    if ('torch' in capabilities) {
      setCanUseTorch(true);
    }
  };

  // **THE STABLE WORKAROUND:**
  // This function is the stable fix for the library's bug.
  // It filters the "false positive" errors caused by the torch.
  const handleScanError = (error: string) => {
    if (
      // These are the "false positive" errors thrown
      // by the library's torch toggle.
      error.includes('Camera permission denied') || 
      error.includes('NotAllowedError') ||
      error.includes('torch')
    ) {
      // We log it to the console for debugging but
      // do not show a toast to the user.
      console.warn("Filtered Scan Error (Known Library Issue):", error);
      return;
    }
    // This is a *real* error, so we must show it.
    toast.error(`Scan error: ${error}`);
  };

  const toggleTorch = () => {
    if (canUseTorch) {
      setIsTorchOn((prev) => !prev);
    } else {
      toast.error('Flash not available on this camera');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black animate-in fade-in-25 duration-300">
      
      <style>
        {`
          @keyframes scan {
            0% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(94px); /* 96px (h-24) - 2px (laser) */
            }
            100% {
              transform: translateY(0);
            }
          }
        `}
      </style>

      <BarcodeScanner
        isScanning={true}
        onScanSuccess={onScanSuccess}
        onScanError={handleScanError} // Use the workaround
        onCameraReady={handleCameraReady}
        torch={isTorchOn}
      />

      <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Controls: Close & Flash */}
        <div className="flex justify-between w-full">
          <button
            onClick={onClose}
            className="p-3 bg-black/40 rounded-full text-white text-2xl shadow-lg pointer-events-auto transition-all hover:bg-black/60 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          {canUseTorch && (
            <button
              onClick={toggleTorch}
              className={`p-3 rounded-full text-2xl shadow-lg pointer-events-auto transition-all active:scale-90 ${
                isTorchOn 
                ? 'bg-yellow-400 text-black' 
                : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6v10l7-5-7 5V2Z"></path><path d="m17.5 13 5 5L13 22V12l9.5 5.5Z"></path></svg>
            </button>
          )}
        </div>

        {/* Middle: Targeting Reticle & Laser */}
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="w-4/5 h-24 rounded-xl relative overflow-hidden"
            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} 
          >
            <div 
              className="absolute w-full h-0.5 bg-red-500 opacity-75"
              style={{
                animation: 'scan 2.5s infinite ease-in-out',
                boxShadow: '0 0 10px 2px rgba(239, 68, 68, 0.5)'
              }}
            ></div>
          </div>
        </div>

        {/* Bottom: Instructions */}
        <div className="w-full pb-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white opacity-90 border border-white/30">
            <span className="mr-2 animate-pulse">✨</span>
            Scanning for USPS barcodes...
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScannerView;