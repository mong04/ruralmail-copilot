// src/components/packages/PackageForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { type AppDispatch } from '../../../store';
import { addPackage, updatePackage, matchAddressToStop } from '../packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../../db';

// Declarations for Web Speech API
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

/**
 * Fallback UUID generator for non-secure contexts (http://)
 * where crypto.randomUUID is not available.
 */
function fallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Secure, robust UUID generator.
 * Tries to use the crypto API (secure) and falls back
 * to a simple generator if in a non-secure context.
 */
function generateUUID() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    // Use the secure, built-in method (works on HTTPS/localhost)
    return window.crypto.randomUUID();
  } else {
    // Use the fallback for insecure contexts (http:// on mobile)
    return fallbackUUID();
  }
}


// This is the type we expect from your matchAddressToStop thunk
type AddressMatch = {
  stopIndex: number;
  address: string;
} | null;

interface PackageFormProps {
  show: boolean;
  formContext: 'scan' | 'manual' | 'edit';
  initialPackage: Partial<Package> | null;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({
  show,
  formContext,
  initialPackage,
  onSubmitSuccess,
  onCancel,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [pkg, setPkg] = useState<Partial<Package>>({ tracking: '', size: 'small', notes: '' });
  const [address, setAddress] = useState('');
  
  const [tempMatch, setTempMatch] = useState<AddressMatch>(null);
  const [suggestions, setSuggestions] = useState<AddressMatch[]>([]);

  const [isMatching, setIsMatching] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // When the form is shown, load the initial data into its state
  useEffect(() => {
    if (show) {
      setPkg({
        tracking: initialPackage?.tracking || '',
        size: (initialPackage as Package)?.size || 'small',
        notes: (initialPackage as Package)?.notes || '',
      });
      setAddress((initialPackage as Package)?.assignedAddress || '');
      
      const initStop = (initialPackage as Package)?.assignedStop;
      const initAddr = (initialPackage as Package)?.assignedAddress;
      if (initStop !== undefined && initStop > -1 && initAddr) {
        setTempMatch({ stopIndex: initStop, address: initAddr });
      } else {
        setTempMatch(null);
      }
      setSuggestions([]);

      // Auto-focus the correct field
      if (formContext === 'manual') {
        setTimeout(() => {
          document.querySelector<HTMLInputElement>('input[name="tracking"]')?.focus();
        }, 700);
      } else if (formContext === 'scan' || formContext === 'edit') {
        setTimeout(() => {
          addressInputRef.current?.focus();
        }, 700);
      }
    }
  }, [show, initialPackage, formContext]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionConstructor) {
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setAddress(transcript);
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
    
    if (address.trim().length <= 2) {
      setSuggestions([]);
      setIsMatching(false);
      if (tempMatch && address.trim() !== tempMatch.address) {
        setTempMatch(null);
      }
      return;
    }

    if (tempMatch && address.trim() === tempMatch.address) {
      setSuggestions([]);
      setIsMatching(false);
      return;
    }

    setTempMatch(null);
    setIsMatching(true);

    timeoutId = setTimeout(async () => {
      const resultAction = await dispatch(matchAddressToStop(address.trim()));
      if (matchAddressToStop.fulfilled.match(resultAction)) {
        setSuggestions(resultAction.payload as AddressMatch[]);
      } else {
        setSuggestions([]);
      }
      setIsMatching(false);
    }, 400);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [address, tempMatch, dispatch]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPkg((prev) => ({ ...prev, [name]: value }));
  };

  const startRecognition = () => {
    addressInputRef.current?.blur();
    if (recognitionRef.current) {
      setRecognizing(true);
      recognitionRef.current.start();
    }
  };
  
  const stopRecognition = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  // Handler for "Tap-to-Fill"
  const handleSuggestionClick = (match: AddressMatch) => {
    if (match) {
      setAddress(match.address);
      setTempMatch(match);
      setSuggestions([]); // Close dropdown
    }
  };

  const handleSubmit = async () => {
    try {
      if (!pkg.tracking?.trim() && !address.trim()) {
        toast.error('Must provide a tracking # or an address');
        return;
      }

      const assignedStop = tempMatch ? tempMatch.stopIndex : -1;

      const finalPackage: Package = {
        // **THE FIX:** Call our new robust function
        id: (initialPackage as Package)?.id || generateUUID(),
        tracking: pkg.tracking?.trim() || '',
        size: pkg.size || 'small',
        notes: pkg.notes,
        assignedAddress: address.trim(),
        assignedStop,
      };

      if (formContext === 'edit') {
        dispatch(updatePackage(finalPackage));
      } else {
        dispatch(addPackage(finalPackage));
      }
      
      onSubmitSuccess();

    } catch (error) {
      console.error('Failed to handle submit:', error);
      toast.error(`Error saving package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const showSuggestions = address.trim().length > 2 && suggestions.length > 0 && !tempMatch;
  
  return (
    <div
      className={`
        fixed inset-x-0 bottom-0 z-50 bg-linear-to-t from-slate-50/95 via-white to-white/90 backdrop-blur-xl rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-slate-200/60
        max-h-[80vh] overflow-y-auto
        transition-all duration-700 ease-out
        ${show 
          ? 'translate-y-0 scale-100 opacity-100' 
          : 'translate-y-full scale-95 opacity-0 pointer-events-none'
        }
      `}
    >
      {show && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          
          {/* --- Tracking Input --- */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Tracking Number <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="tracking"
              value={pkg.tracking || ''}
              onChange={handleInputChange}
              placeholder="9405 5082 0549 8741 0995"
              readOnly={formContext === 'edit'} 
              className={`w-full p-5 font-mono text-lg font-semibold tracking-widest border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm transition-all duration-300 ${formContext === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {formContext === 'edit' && (
              <p className="mt-3 text-center text-sm text-emerald-600 bg-emerald-50/60 p-3 rounded-lg font-medium border border-emerald-200/60">
                ✓ Editing this package
              </p>
            )}
          </div>

          {/* --- Address Input & Suggestions --- */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Delivery Address
            </label>
            <input
              type="text"
              ref={addressInputRef}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St or 'Smith Farm'"
              className="w-full p-5 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm transition-all duration-300"
            />
            
            {/* --- Match/Suggestion UI --- */}
            
            {/* --- Loading Spinner --- */}
            {isMatching && (
              <div className="mt-4">
                <div className="flex items-center justify-center p-4 rounded-xl shadow-sm border">
                  <div className="animate-spin w-6 h-6 mr-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm font-medium text-blue-600">🔍 Matching to your route stops...</span>
                </div>
              </div>
            )}

            {/* --- Suggestions Dropdown --- */}
            {showSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {suggestions
                    .filter((m): m is Exclude<AddressMatch, null> => m !== null)
                    .map((match) => (
                      <li key={match.stopIndex}>
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(match)}
                          className="w-full text-left p-4 hover:bg-blue-50"
                        >
                          <span className="font-medium text-gray-900">{match.address}</span>
                          <span className="text-sm text-gray-500 ml-2">(Stop #{match.stopIndex + 1})</span>
                        </button>
                      </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* --- Dictation Button --- */}
          <div className="pt-2">
            {!recognizing ? (
              <button
                type="button"
                onClick={startRecognition}
                className="w-full bg-linear-to-r from-purple-500 to-indigo-600 text-white py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              >
                <span className="mr-4 text-2xl">🎤</span>
                Dictate Address
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecognition}
                className="w-full bg-linear-to-r from-red-500 to-rose-600 text-white py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              >
                <span className="mr-4 text-2xl">⏹️</span>
                Stop Dictation
              </button>
            )}
          </div>

          {/* --- Size Select --- */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">Package Size</label>
            <select
              name="size"
              value={pkg.size || 'small'}
              onChange={handleInputChange}
              className="w-full p-5 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-sm transition-all duration-300 bg-white"
            >
              <option value="small">📫 Small - Mailbox</option>
              <option value="medium">📦 Medium - Porch/Door</option>
              <option value="large">🏠 Large - House Delivery</option>
            </select>
          </div>

          {/* --- Notes --- */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">Notes (optional)</label>
            <input
              type="text"
              name="notes"
              value={pkg.notes || ''}
              onChange={handleInputChange}
              placeholder="Fragile • Signature required • COD $25"
              className="w-full p-5 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm transition-all duration-300"
            />
          </div>

          {/* --- Action Buttons --- */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-linear-to-r from-gray-400 to-gray-500 text-white py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            >
              {formContext === 'scan' ? (
                <>
                  <span className="mr-3 text-xl">🔄</span>
                  Rescan
                </>
              ) : (
                <>
                  <span className="mr-3 text-xl">❌</span>
                  Cancel
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!pkg.tracking?.trim() && !address.trim()}
              className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 text-white py-5 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="mr-3 text-xl">✅</span>
              {formContext === 'edit' ? 'Save Changes' : 'Add Package'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageForm;