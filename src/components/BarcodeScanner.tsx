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
    console.log('Initializing Html5Qrcode scanner...');
    if (!html5QrCodeRef.current) {
      // Configure for barcode only
      html5QrCodeRef.current = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
        verbose: true, // Enable verbose logging for debugging
      });
      console.log('Scanner initialized with formats:', Html5QrcodeSupportedFormats.CODE_128);
    }

    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        console.log('Stopping scanner on unmount...');
        html5QrCodeRef.current.stop().catch((err) => {
          console.error('Failed to stop scanner on unmount:', err);
        });
      }
    };
  }, []);

  // Start/stop scanning based on isScanning prop
  useEffect(() => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) {
      console.warn('Scanner not initialized yet.');
      return;
    }

    if (isScanning) {
      console.log('Starting scanning...');
      // Get cameras and start with back camera
      Html5Qrcode.getCameras()
        .then((devices) => {
          console.log('Available cameras:', devices);
          if (devices && devices.length) {
            // Select the last device (typically back camera on mobile)
            const cameraId = devices[devices.length - 1].id;
            console.log('Using camera:', cameraId);

            // Config optimized for barcodes: rectangular box
            const config = {
              fps: 10,
              qrbox: { width: 300, height: 100 }, // Wider for linear barcodes
              disableFlip: false, // Allow flipping if needed
            };
            console.log('Starting scanner with config:', config);

            scanner
              .start(
                cameraId,
                config,
                (decodedText) => {
                  console.log('Scan success! Decoded text:', decodedText);
                  // Call parent callback with tracking number
                  onScanSuccess(decodedText);
                  // Note: Don't stop here; parent controls via isScanning
                },
                (errorMessage) => {
                  // Filter common no-detection errors for toasts, but log all to console
                  console.log('Scan frame error:', errorMessage);
                  if (
                    !errorMessage.includes('No MultiFormat Readers') &&
                    !errorMessage.includes('No Multiformat Readers') &&
                    !errorMessage.includes('NotFoundException') &&
                    onScanError
                  ) {
                    onScanError(errorMessage);
                  }
                }
              )
              .then(() => {
                console.log('Scanner started successfully.');
              })
              .catch((err) => {
                console.error('Failed to start scanner:', err);
                if (onScanError) {
                  onScanError(err.message || 'Failed to start scanner');
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
      console.log('Stopping scanning...');
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
        height: '100%', // Fill the parent div
      }}
    />
  );
};

export default BarcodeScanner;