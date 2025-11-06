import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../store';
import { addPackage, loadPackagesFromDB, savePackagesToDB, clearPackagesFromDB, matchAddressToStop } from '../store/packageSlice';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from 'sonner';
import { type Package } from '../db';

// Declarations for Web Speech API (unchanged)
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const Packages: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { packages, loading, error } = useSelector((state: RootState) => state.packages);
  const [newPackage, setNewPackage] = useState<Partial<Package>>({ tracking: '', size: 'small', notes: '' });
  const [newAddress, setNewAddress] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    dispatch(loadPackagesFromDB());
  }, [dispatch]);

  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionConstructor) {
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setNewAddress(transcript);
        toast.success(`Dictated: ${transcript}`);
      };
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        toast.error(`Voice error: ${event.error}`);
        setRecognizing(false);
      };
      recognitionRef.current.onend = () => setRecognizing(false);
    } else {
      toast.warning('Voice recognition not supported in this browser');
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPackage((prev) => ({ ...prev, [name]: value }));
  };

  const startRecognition = () => {
    if (recognitionRef.current) {
      setRecognizing(true);
      recognitionRef.current.start();
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const handleAddPackage = async () => {
    if (newPackage.tracking) {
      let assignedStop = -1;
      if (newAddress) {
        const result = await dispatch(matchAddressToStop(newAddress));
        if (matchAddressToStop.fulfilled.match(result)) {
          assignedStop = result.payload;
        }
      }
      dispatch(addPackage({ ...newPackage, assignedAddress: newAddress, assignedStop } as Package));
      setNewPackage({ tracking: '', size: 'small', notes: '' });
      setNewAddress('');
    } else {
      toast.error('Tracking number required');
    }
  };

  const handleSave = () => {
    dispatch(savePackagesToDB(packages));
  };

  const handleClear = () => {
    dispatch(clearPackagesFromDB());
  };

  useEffect(() => {
    if (scanning && scannerRef.current && !html5QrCodeRef.current) {
      try {
        // Constructor config: Limit formats and disable verbose logging
        const config = {
          formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        };
        html5QrCodeRef.current = new Html5Qrcode("scanner", config);

        // Camera scan config: fps, qrbox (function for dynamic sizing, wider for Code 128)
        const cameraConfig = {
          fps: 10,  // Start low; increase to 20-30 if needed, but test for performance on 1D codes
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            return { width: Math.min(300, viewfinderWidth * 0.8), height: Math.min(150, viewfinderHeight * 0.8) };  // Height suits linear Code 128
          },
          disableFlip: false,
        };

        // Use rear camera via constraints
        const videoConstraints = { facingMode: "environment" };

        const onScanSuccess = (decodedText: string) => {
          console.log('Decoded text:', decodedText);
          setNewPackage((prev) => ({ ...prev, tracking: decodedText }));
          toast.success(`Scanned: ${decodedText}`);
          stopScanner();
        };

        const onScanFailure = (error: string) => {
          console.warn(`Scan error: ${error}`);
          // Optional: User hint for alignment issues common with Code 128
          if (error.includes('no code')) {
            toast.info('No code detected - align barcode fully in the scan area and hold steady.');
          }
        };

        html5QrCodeRef.current.start(videoConstraints, cameraConfig, onScanSuccess, onScanFailure)
          .catch((err) => {
            console.error('Start error:', err);
            toast.error(`Failed to start scanner: ${err.message || err}`);
            setScanning(false);
          });
      } catch (err: unknown) {
        console.error('Init error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Scanner initialization failed: ${errorMessage}`)
        setScanning(false);
      }
    }

    return () => {
      if (!scanning && html5QrCodeRef.current) {
        stopScanner();
      }
    };
  }, [scanning]);

  const startScanner = () => {
    console.log('Start scanner button clicked');
    setScanning(true);
  };

  const stopScanner = () => {
    console.log('Stop scanner button clicked');
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop()
        .then(() => {
          console.log('Scanner stopped');
          html5QrCodeRef.current = null;
          setScanning(false);
        })
        .catch((err) => {
          console.error('Scanner stop error:', err);
          toast.error(`Scanner stop failed: ${err.message || err}`);
        });
    } else {
      console.log('No scanner instance to stop');
      setScanning(false);
    }
  };

  if (loading) return <p className="text-center">Loading packages...</p>;
  if (error) return <p className="text-red-500 text-center">{error}</p>;

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Add Today's Packages</h2>
      <button onClick={onBack} className="mb-4 text-blue-500">Back to Dashboard</button>

      {/* Manual Entry */}
      <div className="mb-6">
        <h3 className="text-lg mb-2">Add Manually</h3>
        <input
          type="text"
          name="tracking"
          value={newPackage.tracking}
          onChange={handleInputChange}
          placeholder="Tracking Number"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          placeholder="Assign to Address (optional)"
          className="w-full mb-2 p-2 border rounded"
        />
        {!recognizing ? (
          <button onClick={startRecognition} className="bg-purple-500 text-white py-2 px-4 rounded mr-2">Dictate Address</button>
        ) : (
          <button onClick={stopRecognition} className="bg-red-500 text-white py-2 px-4 rounded mr-2">Stop Dictating</button>
        )}
        <select
          name="size"
          value={newPackage.size}
          onChange={handleInputChange}
          className="w-full mb-2 p-2 border rounded"
        >
          <option value="small">Small (Mailbox)</option>
          <option value="medium">Medium</option>
          <option value="large">Large (House Delivery)</option>
        </select>
        <input
          type="text"
          name="notes"
          value={newPackage.notes}
          onChange={handleInputChange}
          placeholder="Notes (e.g., Fragile)"
          className="w-full mb-2 p-2 border rounded"
        />
        <button onClick={handleAddPackage} className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
          Add Package
        </button>
      </div>

      {/* Scanner */}
      <div className="mb-6">
        <h3 className="text-lg mb-2">Scan Barcode</h3>
        {!scanning ? (
          <button onClick={startScanner} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Start Scanner
          </button>
        ) : (
          <>
            <div id="scanner" ref={scannerRef} className="w-full h-64 bg-gray-200 rounded" />  {/* Video renders here */}
            <button onClick={stopScanner} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 mt-2">
              Stop Scanner
            </button>
          </>
        )}
      </div>

      {/* Current Packages */}
      <div className="mb-6">
        <h3 className="text-lg mb-2">Today's Packages ({packages.length})</h3>
        <ul className="list-disc pl-5 max-h-60 overflow-y-auto">
          {packages.map((pkg, index) => (
            <li key={index}>
              {pkg.tracking} - {pkg.size.toUpperCase()} {pkg.assignedAddress && `@ ${pkg.assignedAddress}`} {pkg.notes && `- ${pkg.notes}`}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between">
        <button onClick={handleClear} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
          Clear Packages
        </button>
        <button onClick={handleSave} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          Save Packages
        </button>
      </div>
    </div>
  );
};

export default Packages;