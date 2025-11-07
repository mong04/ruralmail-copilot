// src/components/Packages.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../store';
import { addPackage, loadPackagesFromDB, savePackagesToDB, clearPackagesFromDB, matchAddressToStop } from '../store/packageSlice';
import { toast } from 'sonner';
import { type Package } from '../db';
import BarcodeScanner from './BarcodeScanner'; // The new implementation

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
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [tempAssignedStop, setTempAssignedStop] = useState<number>(-1);
  const [isMatchingAddress, setIsMatchingAddress] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    dispatch(loadPackagesFromDB());
  }, [dispatch]);

  // Voice recognition setup (unchanged)
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

  // Live address matching with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (newAddress.trim().length > 2) {  // Min length for match
      setIsMatchingAddress(true);
      timeoutId = setTimeout(async () => {
        const resultAction = await dispatch(matchAddressToStop(newAddress.trim()));
        if (matchAddressToStop.fulfilled.match(resultAction)) {
          setTempAssignedStop(resultAction.payload ?? -1);
        } else {
          setTempAssignedStop(-1);
        }
        setIsMatchingAddress(false);
      }, 400);
    } else {
      setTempAssignedStop(-1);
      setIsMatchingAddress(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [newAddress, dispatch]);

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

  const handleScanSuccess = (tracking: string) => {
    setNewPackage({ tracking, size: 'small', notes: '' });
    setNewAddress('');
    setTempAssignedStop(-1);
    setIsMatchingAddress(false);
    setShowPackageForm(true);
    setIsScanning(false);
    toast.success(`✅ Tracking captured: ${tracking}`);
  };

  const handleCloseForm = () => {
    setShowPackageForm(false);
    setIsScanning(true);
    setNewPackage({ tracking: '', size: 'small', notes: '' });
    setNewAddress('');
    setTempAssignedStop(-1);
    setIsMatchingAddress(false);
  };

  const handleAddFromForm = async () => {
    await handleAddPackage();
    setShowPackageForm(false);
    setIsScanning(true);
  };

  // Updated to use cached tempAssignedStop if available
  const handleAddPackage = async () => {
    if (!newPackage.tracking?.trim()) {
      toast.error('Tracking number required');
      return;
    }

    let assignedStop: number = -1;
    if (newAddress.trim()) {
      if (tempAssignedStop > -1) {
        assignedStop = tempAssignedStop;
      } else {
        const resultAction = await dispatch(matchAddressToStop(newAddress.trim()));
        if (matchAddressToStop.fulfilled.match(resultAction)) {
          assignedStop = resultAction.payload ?? -1;
        } else {
          toast.warning('No stop matched for this address');
        }
      }
    }

    dispatch(addPackage({ ...newPackage, assignedAddress: newAddress.trim(), assignedStop } as Package));
    setNewPackage({ tracking: '', size: 'small', notes: '' });
    setNewAddress('');
    toast.success('✅ Package added! Ready for the next one.');
  };

  // Manual entry open
  const openManualForm = () => {
    setNewPackage({ tracking: '', size: 'small', notes: '' });
    setNewAddress('');
    setTempAssignedStop(-1);
    setIsMatchingAddress(false);
    setShowPackageForm(true);
    setIsScanning(false);
  };

  const handleSave = () => {
    dispatch(savePackagesToDB(packages));
    toast.success('Packages saved!');
  };

  const handleClear = () => {
    dispatch(clearPackagesFromDB());
    toast.success('Packages cleared!');
  };

  if (loading) return <div className="text-center py-12"><p className="text-lg">Loading packages...</p></div>;
  if (error) return <div className="text-center py-12 text-red-500"><p className="text-lg">{error}</p></div>;

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 relative min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 font-semibold text-lg">
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-800">📦 Packages</h1>
        <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
          {packages.length}
        </span>
      </div>

      {/* Add Packages Section */}
      <div className="mb-8">
        {/* Manual Entry Button */}
        {!showPackageForm && (
          <div className="flex justify-center mb-8">
            <button
              onClick={openManualForm}
              className="group inline-flex items-center justify-center px-8 py-4 bg-linear-to-r from-amber-500 to-orange-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="mr-3 text-xl group-hover:animate-bounce">⌨️</span>
              Add Manual Package
            </button>
          </div>
        )}

        {/* Scanner */}
        <div 
          className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mb-8" 
          style={{ height: '420px' }}
        >
          <BarcodeScanner 
            isScanning={isScanning && !showPackageForm}
            onScanSuccess={handleScanSuccess}
            onScanError={(error) => toast.error(`Scan error: ${error}`)}
          />

          {/* Scanning Instructions Overlay */}
          {isScanning && !showPackageForm && (
            <div className="absolute inset-0 flex flex-col items-center text-white z-10 px-8 pointer-events-none">
              {/* Top Instructions */}
              <div className="w-full pt-4 text-center bg-linear-to-b from-black/60 to-transparent pb-8">
                <h3 className="text-xl font-bold mb-2 drop-shadow-lg">Scan Tracking Barcode</h3>
                <p className="text-sm opacity-90 drop-shadow-md">Point camera at the USPS tracking barcode</p>
              </div>

              {/* Targeting Area - Transparent center with borders */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4/5 h-24 border-2 border-white/50 border-dashed rounded-xl flex items-center justify-center">
                  <span className="text-4xl animate-pulse">📦</span>
                </div>
              </div>

              {/* Bottom Hint */}
              <div className="absolute bottom-0 w-full pb-4 text-center bg-linear-to-t from-black/60 to-transparent pt-8">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium opacity-90 border border-white/30">
                  <span className="mr-2 animate-pulse">✨</span>
                  Auto-captures instantly
                </div>
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {showPackageForm && !isScanning && (
            <div className="absolute inset-0 flex flex-col justify-center items-center bg-linear-to-b from-emerald-400/30 to-teal-500/30 backdrop-blur-sm text-white z-10 px-8 text-center pointer-events-none">
              <div className="text-9xl mb-8 animate-bounce drop-shadow-2xl">✅</div>
              <h3 className="text-3xl font-extrabold mb-6 leading-tight drop-shadow-lg">Barcode Captured!</h3>
              <p className="text-xl font-semibold mb-4 opacity-95">Now add package details</p>
              <p className="text-base max-w-md mx-auto leading-relaxed opacity-90">
                Address auto-matches your route stops as you type
              </p>
            </div>
          )}
        </div>

        {/* Slide-up Package Form */}
        <div
          className={`
            fixed inset-x-0 bottom-0 z-50 bg-linear-to-t from-slate-50/95 via-white to-white/90 backdrop-blur-xl rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-slate-200/60
            max-h-[80vh] overflow-y-auto
            transition-all duration-700 ease-out
            ${showPackageForm 
              ? 'translate-y-0 scale-100 opacity-100' 
              : 'translate-y-full scale-95 opacity-0 pointer-events-none'
            }
          `}
        >
          {showPackageForm && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              {/* Tracking Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Tracking Number
                </label>
                <input
                  type="text"
                  name="tracking"
                  value={newPackage.tracking || ''}
                  onChange={handleInputChange}
                  placeholder="9405 5082 0549 8741 0995"
                  className="w-full p-5 font-mono text-lg font-semibold tracking-widest border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm transition-all duration-300"
                />
                {newPackage.tracking && (
                  <p className="mt-3 text-center text-sm text-emerald-600 bg-emerald-50/60 p-3 rounded-lg font-medium border border-emerald-200/60">
                    ✓ Ready (editable if needed)
                  </p>
                )}
              </div>

              {/* Address Input + Auto-match */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Delivery Address <span className="text-blue-500 font-normal">(auto-matches route)</span>
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 123 Main St or 'Smith Farm'"
                  className="w-full p-5 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm transition-all duration-300"
                />
                {newAddress.trim() && (
                  <div className="mt-4 p-5 rounded-xl shadow-sm border">
                    {isMatchingAddress ? (
                      <div className="flex items-center justify-center py-3">
                        <div className="animate-spin w-6 h-6 mr-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm font-medium text-blue-600">🔍 Matching to your route stops...</span>
                      </div>
                    ) : tempAssignedStop > -1 ? (
                      <div className="flex items-center p-4 bg-linear-to-r from-green-50 to-emerald-50/60 rounded-xl border border-green-200/60">
                        <span className="mr-4 p-3 bg-green-100 rounded-full text-green-600">✅</span>
                        <div>
                          <p className="font-semibold text-green-700">Perfect match!</p>
                          <p className="text-sm text-green-600 opacity-90">Stop #{tempAssignedStop + 1}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center p-4 bg-linear-to-r from-amber-50 to-orange-50/60 rounded-xl border border-amber-200/60">
                        <span className="mr-4 p-3 bg-amber-100 rounded-full text-amber-600">⚠️</span>
                        <div>
                          <p className="font-semibold text-amber-700">No exact match</p>
                          <p className="text-sm text-amber-600 opacity-90">Package will be unassigned</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dictation Button */}
              <div className="pt-2">
                {!recognizing ? (
                  <button
                    onClick={startRecognition}
                    className="w-full bg-linear-to-r from-purple-500 to-indigo-600 text-white py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                  >
                    <span className="mr-4 text-2xl">🎤</span>
                    Dictate Address
                  </button>
                ) : (
                  <button
                    onClick={stopRecognition}
                    className="w-full bg-linear-to-r from-red-500 to-rose-600 text-white py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                  >
                    <span className="mr-4 text-2xl">⏹️</span>
                    Stop Dictation
                  </button>
                )}
              </div>

              {/* Size Select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">Package Size</label>
                <select
                  name="size"
                  value={newPackage.size || 'small'}
                  onChange={handleInputChange}
                  className="w-full p-5 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-sm transition-all duration-300 bg-white"
                >
                  <option value="small">📫 Small - Mailbox</option>
                  <option value="medium">📦 Medium - Porch/Door</option>
                  <option value="large">🏠 Large - House Delivery</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">Notes (optional)</label>
                <input
                  type="text"
                  name="notes"
                  value={newPackage.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Fragile • Signature required • COD $25"
                  className="w-full p-5 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm transition-all duration-300"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={handleCloseForm}
                  className="flex-1 bg-linear-to-r from-gray-400 to-gray-500 text-white py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                >
                  <span className="mr-3 text-xl">🔄</span>
                  Rescan
                </button>
                <button
                  onClick={handleAddFromForm}
                  disabled={!newPackage.tracking?.trim()}
                  className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 text-white py-5 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <span className="mr-3 text-xl">✅</span>
                  Add Package
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Packages List */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-3">📋</span>
          Today's Packages ({packages.length})
        </h3>
        <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-xl p-4 border border-gray-200">
          {packages.length === 0 ? (
            <p className="text-center text-gray-500 italic py-8">No packages added yet. Start scanning!</p>
          ) : (
            <ul className="space-y-3">
              {packages.map((pkg, index) => (
                <li
                  key={index}
                  className="group flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-sm text-gray-900 truncate">{pkg.tracking}</div>
                    <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pkg.size === 'small' ? 'bg-green-100 text-green-800' :
                        pkg.size === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {pkg.size.toUpperCase()}
                      </span>
                      {pkg.assignedAddress && (
                        <span className="truncate max-w-[150px]">@{pkg.assignedAddress}</span>
                      )}
                      {pkg.notes && <span className="ml-auto text-amber-600">• {pkg.notes}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Save/Clear Buttons */}
      <div className="flex space-x-4 pt-6">
        <button
          onClick={handleClear}
          className="flex-1 bg-linear-to-r from-red-500 to-rose-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        >
          <span className="mr-3">🗑️</span>
          Clear All
        </button>
        <button
          onClick={handleSave}
          disabled={packages.length === 0}
          className="flex-1 bg-linear-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
        >
          <span className="mr-3">💾</span>
          Save Packages
        </button>
      </div>
    </div>
  );
};

export default Packages;