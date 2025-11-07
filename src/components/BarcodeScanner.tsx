import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode'; // For format enums

interface BarcodeScannerProps {
  isScanning: boolean;
  onScanSuccess: (trackingNumber: string) => void;
  onScanError?: (error: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isScanning,
  onScanSuccess,
  onScanError,
}) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-container';

  // Initialize the scanner instance once (handles Strict Mode)
  useEffect(() => {
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(containerId);
    }

    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((err) => {
          console.error('Failed to stop scanner:', err);
        });
      }
    };
  }, []);

  // Start/stop scanning based on isScanning prop
  useEffect(() => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    if (isScanning) {
      // Get cameras and start with back camera
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            // Select the last device (typically back camera on mobile)
            const cameraId = devices[devices.length - 1].id;

            // Config optimized for barcodes: rectangular box, specific formats
            const config = {
              fps: 10,
              qrbox: { width: 300, height: 100 }, // Wider for linear barcodes
              formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128], // USPS typically uses Code 128
            };

            scanner
              .start(
                cameraId,
                config,
                (decodedText) => {
                  // Call parent callback with tracking number
                  onScanSuccess(decodedText);
                  // Note: Don't stop here; parent controls via isScanning
                },
                (errorMessage) => {
                  // Optional: Handle per-frame errors (e.g., no code detected)
                  if (onScanError) {
                    onScanError(errorMessage);
                  }
                }
              )
              .catch((err) => {
                console.error('Failed to start scanner:', err);
                if (onScanError) {
                  onScanError(err.message);
                }
              });
          } else {
            const err = 'No cameras found';
            console.error(err);
            if (onScanError) onScanError(err);
          }
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          if (onScanError) onScanError(err.message || 'Camera permission denied');
        });
    } else if (scanner.isScanning) {
      scanner.stop().catch((err) => {
        console.error('Failed to stop scanner:', err);
      });
    }
  }, [isScanning, onScanSuccess, onScanError]);

  return (
    <div
      id={containerId}
      style={{
        width: '100%',
        height: '300px', // Adjustable based on UI
        border: '1px solid #ccc', // Optional visual feedback
      }}
    />
  );
};

export default BarcodeScanner;