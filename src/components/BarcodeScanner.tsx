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
  
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

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
        videoTrackRef.current = null;
      }
    };
  }, []);

  // Effect to control the torch (flash)
  useEffect(() => {
    if (videoTrackRef.current && 'torch' in videoTrackRef.current.getCapabilities()) {
      // **FIX for Error 1:** Cast constraints to 'any' to allow 'torch'
      videoTrackRef.current.applyConstraints({
        advanced: [{ torch: torch }],
      } as never).catch(e => {
        console.error('Failed to apply torch constraints:', e);
      });
    }
  }, [torch]); // Re-run whenever the torch prop changes

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
              
              // **FIX for Error 2 & 5:** Rename 'viewfinderHeight' to '_viewfinderHeight'
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              qrbox: (viewfinderWidth: number, _viewfinderHeight: number) => {
                const width = viewfinderWidth * 0.80; // 80% (matches w-4/5)
                const height = 96; // 96px (matches h-24)
                return { width, height };
              },

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
                
                // **FIX for Error 3 & 4:** Cast 'track' to 'any' to bypass
                // the library's incorrect type definitions.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const track: any = scanner.getRunningTrackCapabilities();
                
                if (track) {
                  videoTrackRef.current = track.getTrack(); // This method DOES exist
                  if (onCameraReady) {
                    onCameraReady(track.getCapabilities()); // This method DOES exist
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
      videoTrackRef.current = null;
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
      <style>
        {`
          #${containerId} video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            position: absolute;
            top: 0;
            left: 0;
          }
        `}
      </style>
    </div>
  );
};

export default BarcodeScanner;