// src/features/package-management/components/AddressInput.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { type AppDispatch } from '../../../../store';
import { matchAddressToStop } from '../../store/packageSlice';
import { toast } from 'sonner';
import { Check, MapPin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  // We don't need the full route here anymore since we removed the notes logic
  // but keeping useSelector hook available if we need it later is fine.

  const [suggestions, setSuggestions] = useState<AddressMatch[]>([]);
  const [isInteracted, setIsInteracted] = useState<boolean>(false);

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
      if (match) {
        onMatchChange(null);
      }
      return;
    }

    // Case 2: The text in the box *is* the currently assigned match.
    if (match && trimmed === match.address) {
      setSuggestions([]);
      return;
    }

    // Case 3: User is typing something new
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
          toast.info(`Linked to Stop #${bestMatch.stopNumber + 1}`);
        }
      } else {
        setSuggestions([]);
      }
    }, 400);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [address, isInteracted, dispatch, setAddress, match, onMatchChange]);

  const handleSuggestionClick = (newMatch: NonNullable<AddressMatch>): void => {
    onMatchChange(newMatch);
    setAddress(newMatch.address);
    setSuggestions([]);
  };

  const handleFocus = () => {
    if (isInteracted) return;
    setIsInteracted(true);

    if (formContext !== 'edit' || !match) {
      const trimmed = address.trim();
      if (trimmed.length > 2) {
        dispatch(matchAddressToStop(trimmed))
          .unwrap()
          .then((matches) => {
            const validMatches = matches.filter((m): m is NonNullable<AddressMatch> => m !== null);
            if (validMatches.length > 0) {
              setSuggestions(validMatches);
            }
          })
          .catch(() => setSuggestions([]));
      }
    }
  };

  const showSuggestions: boolean = suggestions.length > 0;

  return (
    <div className="relative group z-20">
      {/* Hero Input Field */}
      <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
             {/* Show Search icon when typing, MapPin when idle */}
             {showSuggestions ? <Search size={24} /> : <MapPin size={24} />}
          </div>
          
          <input
            type="text"
            value={address}
            onChange={(e) => { setIsInteracted(true); setAddress(e.target.value); }}
            onFocus={handleFocus}
            placeholder="Search Address..."
            className="w-full pl-12 pr-4 py-4 text-xl font-bold bg-surface-muted/50 border-2 border-transparent focus:bg-surface focus:border-brand rounded-2xl outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-normal shadow-inner"
          />
      </div>

      {/* Suggestion List (Floating) */}
      <AnimatePresence>
        {showSuggestions && (
            <motion.ul 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute z-30 w-full mt-2 bg-surface border border-border/50 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
            >
                {suggestions.map((item) => {
                    if (!item) return null;
                    return (
                      <li key={item.stopId || item.stopNumber}>
                          <button 
                            onClick={() => handleSuggestionClick(item)} 
                            className="w-full text-left p-4 hover:bg-brand/10 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
                          >
                              <div className="bg-brand text-brand-foreground w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                                  {/* Fix 3: Use nullish coalescing (??) instead of non-null assertion (!) */}
                                  {(item.stopNumber ?? 0) + 1}
                              </div>
                              <span className="font-semibold text-lg truncate">{item.address}</span>
                          </button>
                      </li>
                    );
                })}
            </motion.ul>
        )}
      </AnimatePresence>
      
      {/* Linked Status Badge */}
      {match && (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="mt-2 flex items-center gap-2 text-brand font-medium px-2"
        >
            <Check size={16} />
            {/* Fix 3: Safe access here as well */}
            <span>Linked to Stop #{(match.stopNumber ?? 0) + 1}</span>
        </motion.div>
      )}
    </div>
  );
};

export default AddressInput;