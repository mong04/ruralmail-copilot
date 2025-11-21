// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode'; // For format enums

interface BarcodeScannerProps {
  isScanning: boolean;
  onScanSuccess: (trackingNumber: string) => void;
  onScanError?: (error: string) => void;
  onCameraReady?: (capabilities: MediaTrackCapabilities) => void;
  torch?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isScanning,
  onScanSuccess,
  onScanError,
  onCameraReady,
  torch = false,
}) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-container';
  
  // **THE FIX:** Use a ref to track if this is the first render.
  // This will prevent the torch useEffect from running on mount.
  const didMount = useRef(false);

  // Initialize the scanner instance once
  useEffect(() => {
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(containerId, {
        verbose: false,
      });
      console.log('Scanner initialized');
    }

    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((err) => {
          console.error('Failed to stop scanner on unmount:', err);
        });
      }
    };
  }, []);

  // Effect to control the torch (flash)
  useEffect(() => {
    // **THE FIX:** Check the didMount ref.
    // If this is the first render, set it to true and do nothing.
    // This stops the race condition on startup.
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    // On all subsequent renders (i.e., when the button is tapped),
    // apply the constraints.
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: torch }],
      } as never).catch(e => {
        // This is where the *library bug* happens.
        // The library will catch this error and (incorrectly)
        // pass it to the onScanError prop.
        console.error('Failed to apply torch constraints:', e);
      });
    }
  }, [torch]); // Only runs when torch prop changes

  // Start/stop scanning based on isScanning prop
  useEffect(() => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) {
      console.warn('Scanner not initialized yet.');
      return;
    }

    if (isScanning) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            const cameraId = devices[devices.length - 1].id;

            const config = {
              fps: 10,
              disableFlip: false,
              formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.QR_CODE
              ],
            };

            scanner
              .start(
                cameraId,
                config,
                (decodedText) => {
                  onScanSuccess(decodedText);
                },
                () => { /* No-op on frame errors */ }
              )
              .then(() => {
                console.log('Scanner started successfully.');
                
                // Manually style the video element to force full-screen
                const videoElement = document.querySelector(`#${containerId} video`) as HTMLVideoElement;
                if (videoElement) {
                  videoElement.style.width = '100%';
                  videoElement.style.height = '100%';
                  videoElement.style.objectFit = 'cover';
                  videoElement.style.position = 'absolute';
                  videoElement.style.top = '0';
                  videoElement.style.left = '0';
                }
                
                const capabilities = scanner.getRunningTrackCapabilities();
                
                if (capabilities) {
                  if (onCameraReady) {
                    onCameraReady(capabilities); 
                  }
                }
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
      scanner.stop().catch((err) => {
        console.error('Failed to stop scanner:', err);
      });
      // Reset the didMount ref for the next time the scanner opens
      didMount.current = false;
    }
  }, [isScanning, onScanSuccess, onScanError, onCameraReady]);

  return (
    <div 
      id={containerId}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    >
      {/* No style tag needed, we are styling the video in the useEffect */}
    </div>
  );
};

export default BarcodeScanner;