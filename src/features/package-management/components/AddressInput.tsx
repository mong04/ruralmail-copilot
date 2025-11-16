// src/features/package-management/components/AddressInput.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../../../store';
import { matchAddressToStop } from '../packageSlice';
import { toast } from 'sonner';
import { Check, AlertTriangle, Search } from 'lucide-react';
import { type Stop } from '../../../db';

// This is the type we expect from matchAddressToStop (updated)
export type AddressMatch = {
  stopId: string;
  stopNumber: number;
  address: string;
} | null;

interface AddressInputProps {
  address: string;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  formContext: 'scan' | 'manual' | 'edit';
  match: AddressMatch | null;
  onMatchChange: (match: AddressMatch | null) => void;
}

const AddressInput: React.FC<AddressInputProps> = ({
  address,
  setAddress,
  formContext,
  match,
  onMatchChange,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const route = useSelector((state: RootState) => state.route.route);

  const [suggestions, setSuggestions] = useState<AddressMatch[]>([]);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchedStopNotes, setMatchedStopNotes] = useState<string | null>(null);
  const [isInteracted, setIsInteracted] = useState<boolean>(false);

  // Effect to find notes when the 'match' prop changes
  useEffect(() => {
    if (match) {
      const stop = route.find((s: Stop) => s.id === match.stopId);
      setMatchedStopNotes(stop?.notes || null);
    } else {
      setMatchedStopNotes(null);
    }
  }, [match, route]);

  // Live address matching with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (!isInteracted) {
      return;
    }

    const trimmed = address.trim();

    // Case 1: Field is empty or too short.
    if (trimmed.length <= 2) {
      setSuggestions([]);
      setIsMatching(false);
      // If user clears the field, then unassign.
      if (match) {
        onMatchChange(null);
      }
      return;
    }

    // Case 2: The text in the box *is* the currently assigned match.
    if (match && trimmed === match.address) {
      setIsMatching(false);
      setSuggestions([]); // Clear any old suggestions
      return; // The match is already correct, do nothing.
    }

    // Case 3: User is typing something new, and it's not the current match.
    setIsMatching(true);
    // Clear the *old* match, since the text no longer corresponds to it.
    if (match) {
      onMatchChange(null);
    }

    timeoutId = setTimeout(async () => {
      const resultAction = await dispatch(matchAddressToStop(trimmed));
      if (matchAddressToStop.fulfilled.match(resultAction)) {
        const matches = resultAction.payload.filter((m): m is NonNullable<AddressMatch> => m !== null);
        setSuggestions(matches);

        // Auto-select if *only one* match is found
        if (matches.length === 1) {
          const bestMatch = matches[0];
          onMatchChange(bestMatch);
          setAddress(bestMatch.address);
          setSuggestions([]);
          toast.info(`Auto-assigned to ${bestMatch.address} (Stop #${bestMatch.stopNumber + 1})`);
        }
      } else {
        setSuggestions([]);
      }
      setIsMatching(false);
    }, 400);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [address, isInteracted, dispatch, setAddress, match, onMatchChange]);

  // Handler for "Tap-to-Fill"
  const handleSuggestionClick = (newMatch: AddressMatch): void => {
    if (newMatch) {
      onMatchChange(newMatch); // ✅ Tell parent about the new match
      setAddress(newMatch.address);
      setSuggestions([]); // Close dropdown
    }
  };

  const handleFocus = () => {
    if (isInteracted) {
      return; // Already interacted
    }
    setIsInteracted(true);

    if (formContext !== 'edit' || !match) {
      const trimmed = address.trim();
      if (trimmed.length > 2) {
        setIsMatching(true);
        dispatch(matchAddressToStop(trimmed))
          .unwrap()
          .then((matches) => {
            const validMatches = matches.filter((m): m is NonNullable<AddressMatch> => m !== null);
            if (validMatches.length === 1) {
              onMatchChange(validMatches[0]);
              setAddress(validMatches[0].address);
              toast.info(`Re-matched to ${validMatches[0].address}`);
            } else if (validMatches.length > 1) {
              setSuggestions(validMatches);
            }
          })
          .catch(() => setSuggestions([]))
          .finally(() => setIsMatching(false));
      }
    }
  };

  const showSuggestions: boolean = suggestions.length > 0;

  const getNoteWarningType = (): 'danger' | 'warning' | 'info' => {
    if (!matchedStopNotes) return 'info';
    const notes = matchedStopNotes.toLowerCase();
    if (notes.includes('vacant')) return 'danger';
    if (notes.includes('forward')) return 'warning';
    return 'info';
  };
  const noteWarningType = getNoteWarningType();

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-foreground mb-2">
        Delivery Address
      </label>
      <input
        type="text"
        name="delivery-address"
        value={address}
        onChange={(e) => {
          setIsInteracted(true); // Always set interacted on change
          setAddress(e.target.value);
        }}
        onFocus={handleFocus} // Use the new focus handler
        placeholder="e.g. 123 Main St or 'Smith Farm'"
        className="w-full p-4 text-base border-2 border-border rounded-xl focus:ring-4 focus:ring-brand/30 focus:border-brand shadow-sm transition-all duration-300"
      />

      {isMatching && (
        <div className="mt-4">
          <div className="flex items-center justify-center p-3 rounded-xl shadow-sm border border-border">
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
                <li key={match.stopId || match.stopNumber}>
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

      {/* Assignment Status Badge - now driven by prop */}
      {match && (
        <div className="mt-2 p-3 bg-accent border border-brand/20 rounded-lg">
          <p className="text-sm font-medium text-brand flex items-center gap-2">
            <Check size={20} />
            Assigned to <strong>Stop #{match.stopNumber + 1}</strong>: {match.address}
          </p>
        </div>
      )}

      {/* Important Route Notes Box - driven by prop */}
      {matchedStopNotes && (
        <div
          className={`mt-2 p-3 rounded-lg border ${
            noteWarningType === 'danger'
              ? 'bg-danger/10 border-danger/20 text-danger'
              : noteWarningType === 'warning'
              ? 'bg-warning/10 border-warning/20 text-warning'
              : 'bg-surface-muted border-border text-muted'
          }`}
        >
          <p className="font-bold text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            Important Route Notes:
          </p>
          <p className="text-sm font-medium mt-1">{matchedStopNotes}</p>
        </div>
      )}

      {/* Warning - driven by prop */}
      {!match && address.trim().length > 2 && !isMatching && isInteracted && (
        <div className="mt-2 p-3 bg-warning/10 border-warning/20 rounded-lg">
          <p className="text-sm text-warning flex items-center gap-2">
            <AlertTriangle size={20} />
            No stop matched. Package will be unassigned.
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressInput;