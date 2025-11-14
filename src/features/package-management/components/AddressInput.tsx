// src/features/package-management/components/AddressInput.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { type AppDispatch } from '../../../store';
import { matchAddressToStop } from '../packageSlice';
import { toast } from 'sonner';
import { Check, AlertTriangle, Search } from 'lucide-react';
import { type Package } from '../../../db';

// This is the type we expect from matchAddressToStop (updated)
type AddressMatch = {
  stopId: string;
  stopNumber: number;
  address: string;
} | null;

interface AddressInputProps {
  address: string;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  formContext: 'scan' | 'manual' | 'edit';
  initialPackage: Partial<Package> | null;
}

const AddressInput: React.FC<AddressInputProps> = ({
  address,
  setAddress,
  formContext,
  initialPackage,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [tempMatch, setTempMatch] = useState<AddressMatch>(null);
  const [suggestions, setSuggestions] = useState<AddressMatch[]>([]);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  useEffect(() => {
    const initStopId = (initialPackage as Package)?.assignedStopId;
    const initStopNumber = (initialPackage as Package)?.assignedStopNumber;
    const initAddr = (initialPackage as Package)?.assignedAddress;

    if (initStopId && typeof initStopNumber === 'number' && initAddr) {
      setTempMatch({
        stopId: initStopId,
        stopNumber: initStopNumber,
        address: initAddr,
      });
    } else {
      setTempMatch(null);
    }
    setSuggestions([]);
  }, [initialPackage, formContext]);

  // Live address matching with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const trimmed = address.trim();
    if (trimmed.length <= 2) {
      setSuggestions([]);
      setIsMatching(false);
      if (tempMatch && trimmed !== tempMatch?.address) {
        setTempMatch(null);
      }
      return;
    }

    if (tempMatch && trimmed === tempMatch.address) {
      setSuggestions([]);
      setIsMatching(false);
      return;
    }

    setTempMatch(null);
    setIsMatching(true);

    timeoutId = setTimeout(async () => {
      const resultAction = await dispatch(matchAddressToStop(trimmed));
      if (matchAddressToStop.fulfilled.match(resultAction)) {
        const matches = resultAction.payload.filter((m): m is NonNullable<AddressMatch> => m !== null);
        setSuggestions(matches);
        if (matches.length === 1) {
          const bestMatch = matches[0];
          setTempMatch(bestMatch);
          setAddress(bestMatch.address);  // Sync input
          toast.info(`Auto-assigned to ${bestMatch.address} (Stop #${bestMatch.stopNumber + 1})`);
        } else if (matches.length > 1) {
          // Optional: Auto-select top if score < 0.1 (very confident)
          // Currently disabled as score is not available; implement if needed by updating thunk
        }
      } else {
        setSuggestions([]);
        if (tempMatch) setTempMatch(null);  // Clear if no matches
      }
      setIsMatching(false);
    }, 400);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [address, tempMatch, dispatch, setAddress]);

  // Handler for "Tap-to-Fill"
  const handleSuggestionClick = (match: AddressMatch): void => {
    if (match) {
      setAddress(match.address);
      setTempMatch(match);
      setSuggestions([]); // Close dropdown
    }
  };

  const showSuggestions: boolean = suggestions.length > 0 && !tempMatch;

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-foreground mb-4">
        Delivery Address
      </label>
      <input
        type="text"
        name="delivery-address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g. 123 Main St or 'Smith Farm'"
        className="w-full p-5 text-lg border-2 border-border rounded-xl focus:ring-4 focus:ring-brand/30 focus:border-brand shadow-sm transition-all duration-300"
      />

      {isMatching && (
        <div className="mt-4">
          <div className="flex items-center justify-center p-4 rounded-xl shadow-sm border border-border">
            <div className="animate-spin w-6 h-6 mr-4 border-2 border-brand border-t-transparent rounded-full"></div>
            <Search className="text-brand" size={16} />
            <span className="text-sm font-medium text-brand">Matching to your route stops...</span>
          </div>
        </div>
      )}

      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <ul className="divide-y divide-border">
            {suggestions
              .filter((m): m is NonNullable<AddressMatch> => m !== null)
              .map((match) => (
                <li key={match.stopId}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(match)}
                    className="w-full text-left p-4 hover:bg-accent"
                  >
                    <span className="font-medium text-foreground">{match.address}</span>
                    <span className="text-sm text-muted ml-2">
                      (Stop #{match.stopNumber + 1})
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Assignment Status Badge */}
      {tempMatch && (
        <div className="mt-3 p-3 bg-accent border border-brand/20 rounded-lg">
          <p className="text-sm font-medium text-brand flex items-center gap-2">
            <Check size={20} />
            Assigned to <strong>Stop #{tempMatch.stopNumber + 1}</strong>: {tempMatch.address}
          </p>
        </div>
      )}
      {!tempMatch && address.trim() && (
        <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-sm text-warning flex items-center gap-2">
            <AlertTriangle size={20} />
            No stop matched—will be unassigned unless you select from suggestions.
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressInput;