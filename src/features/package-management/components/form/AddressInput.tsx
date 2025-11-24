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
  const [suggestions, setSuggestions] = useState<AddressMatch[]>([]);
  const [isInteracted, setIsInteracted] = useState<boolean>(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (!isInteracted) return;

    const trimmed = address.trim();
    if (trimmed.length <= 2) {
      setSuggestions([]);
      if (match) onMatchChange(null);
      return;
    }

    if (match && trimmed === match.address) {
      setSuggestions([]);
      return;
    }

    if (match) onMatchChange(null);

    timeoutId = setTimeout(async () => {
      const resultAction = await dispatch(matchAddressToStop(trimmed));
      if (matchAddressToStop.fulfilled.match(resultAction)) {
        const matches = resultAction.payload.filter((m): m is NonNullable<AddressMatch> => m !== null);
        setSuggestions(matches);
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

    return () => { if (timeoutId) clearTimeout(timeoutId); };
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
            if (validMatches.length > 0) setSuggestions(validMatches);
          })
          .catch(() => setSuggestions([]));
      }
    }
  };

  const showSuggestions: boolean = suggestions.length > 0;

  return (
    <div className="relative group z-20">
      <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
             {showSuggestions ? <Search size={24} /> : <MapPin size={24} />}
          </div>
          
          <input
            type="text"
            value={address}
            onChange={(e) => { setIsInteracted(true); setAddress(e.target.value); }}
            onFocus={handleFocus}
            placeholder="Search Address..."
            // FIX: Semantic colors for background and text
            className="w-full pl-12 pr-4 py-4 text-xl font-bold bg-surface-muted text-foreground border-2 border-transparent focus:border-brand rounded-2xl outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-normal shadow-inner"
          />
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
            <motion.ul 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                // FIX: Semantic colors for dropdown
                className="absolute z-30 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
            >
                {suggestions.map((item) => {
                    if (!item) return null;
                    return (
                      <li key={item.stopId || item.stopNumber}>
                          <button 
                            onClick={() => handleSuggestionClick(item)} 
                            className="w-full text-left p-4 hover:bg-surface-muted transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
                          >
                              <div className="bg-brand text-brand-foreground w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                                  {(item.stopNumber ?? 0) + 1}
                              </div>
                              <span className="font-semibold text-lg truncate text-foreground">{item.address}</span>
                          </button>
                      </li>
                    );
                })}
            </motion.ul>
        )}
      </AnimatePresence>
      
      {match && (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="mt-2 flex items-center gap-2 text-brand font-medium px-2"
        >
            <Check size={16} />
            <span>Linked to Stop #{(match.stopNumber ?? 0) + 1}</span>
        </motion.div>
      )}
    </div>
  );
};

export default AddressInput;