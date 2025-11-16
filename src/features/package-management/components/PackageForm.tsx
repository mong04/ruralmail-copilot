// src/features/package-management/components/PackageForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // ✅ Import useSelector
import { type AppDispatch, type RootState } from '../../../store'; // ✅ Import RootState
import { addPackage, updatePackage } from '../packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../../db';
import { useIsMobile } from '../../../hooks/useIsMobile';
import AddressInput, { type AddressMatch } from './AddressInput';
import TrackingInput from './TrackingInput';
import SizeSelect from './SizeSelect';
import NotesInput from './NotesInput';
import ActionButtons from './Actionbuttons';

/**
 * Fallback UUID generator for non-secure contexts (http://)
 */
function fallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Secure, robust UUID generator.
 */
function generateUUID(): string {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  } else {
    return fallbackUUID();
  }
}

interface PackageFormProps {
  show: boolean;
  formContext: 'scan' | 'manual' | 'edit';
  initialPackage: Partial<Package> | null;
  onSubmitSuccess: () => void;
  onCancel: () => void;
  onScanRequest: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({
  show,
  formContext,
  initialPackage,
  onSubmitSuccess,
  onCancel,
  onScanRequest,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useIsMobile();
  const formContentRef = useRef<HTMLDivElement>(null);
  const route = useSelector((state: RootState) => state.route.route); // ✅ Get route from Redux

  const [pkg, setPkg] = useState<Partial<Package>>({
    tracking: '',
    size: 'medium',
    notes: '',
  });
  const [address, setAddress] = useState<string>('');
  const [match, setMatch] = useState<AddressMatch | null>(null);

  // When the form is shown, load the initial data into its state
  useEffect(() => {
    if (show) {
      setPkg({
        tracking: initialPackage?.tracking || '',
        size: (initialPackage as Package)?.size || 'medium',
        notes: (initialPackage as Package)?.notes || '',
      });

      const initStopNumber = initialPackage?.assignedStopNumber;
      const initAddr = initialPackage?.assignedAddress;

      // ✅ THE FIX: We check for initStopNumber, which we know exists.
      if (typeof initStopNumber === 'number' && initAddr) {
        // This is an *assigned* package.
        const matchingStop = route[initStopNumber]; // Find the stop in our route
        const newMatch = {
          // Use the *real* stopId from the route, (it might be undefined, that's OK)
          stopId: matchingStop?.id,
          stopNumber: initStopNumber,
          address: initAddr,
        };
        setMatch(newMatch);
        setAddress(initAddr); // Sync address field
      } else {
        // This is an *unassigned* package or a new package.
        setMatch(null);
        setAddress(initialPackage?.assignedAddress || ''); // Use manual address or empty
      }
    }
  }, [show, initialPackage, formContext, route]); // ✅ Add 'route' to dependency array

  // Handle text/textarea changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setPkg((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const trimmedTracking = pkg.tracking?.trim();
      const trimmedAddress = address.trim();

      if (!trimmedTracking && !trimmedAddress) {
        toast.error('Must provide a tracking # or an address');
        return;
      }

      // This logic is now robust because 'match' is set correctly by the form itself.
      const finalPackage: Package = {
        id: (initialPackage as Package)?.id || generateUUID(),
        tracking: trimmedTracking || '',
        size: pkg.size || 'medium',
        notes: pkg.notes?.trim() || '',
        assignedStopId: match?.stopId, // Use the match object
        assignedStopNumber: match?.stopNumber, // Use the match object
        assignedAddress: match?.address || trimmedAddress, // Use match address or fall back to raw
      };

      if (formContext === 'edit') {
        dispatch(updatePackage(finalPackage));
      } else {
        dispatch(addPackage(finalPackage));
      }

      onSubmitSuccess();
    } catch (err) {
      toast.error('Failed to save package');
      console.error('Error in handleSubmit:', err);
    }
  };

  const isSubmitDisabled = !pkg.tracking?.trim() && !address.trim();
  const navBarHeight = 72; // pixels

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click was on the backdrop itself, not on the form content
    if (formContentRef.current && !formContentRef.current.contains(e.target as Node)) {
      onCancel();
    }
  };

  // ✅ NEW: This function is passed to AddressInput.
  // It's called when a user *clicks a suggestion*.
  const handleMatchChange = (newMatch: AddressMatch) => {
    setMatch(newMatch);
    if (newMatch) {
      setAddress(newMatch.address);
    }
  };

  return (
    <div
      className={`
        ${
          isMobile
            ? `fixed z-50 left-0 right-0 max-w-md mx-auto bg-surface backdrop-blur-xl rounded-t-3xl p-4 pb-4 shadow-2xl border-t border-border overflow-y-auto`
            : 'fixed z-50 inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm'
        } 
        transition-all duration-500 ease-out 
        ${show ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-full scale-95 opacity-0 pointer-events-none'}
      `}
      style={
        isMobile
          ? {
              bottom: `${navBarHeight}px`,
              maxHeight: `calc(100vh - ${navBarHeight + 60}px)`,
            }
          : {}
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="package-form-title"
      // Add click listener to the backdrop (desktop only)
      onClick={!isMobile ? handleBackdropClick : undefined}
    >
      {show && (
        <div
          // Attach ref and stop propagation
          ref={formContentRef}
          onClick={!isMobile ? (e) => e.stopPropagation() : undefined}
          className={
            isMobile
              ? 'space-y-4 animate-in slide-in-from-bottom-2 duration-500 w-full'
              : 'bg-surface rounded-xl shadow-2xl border border-border p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto space-y-4'
          }
        >
          <h2 id="package-form-title" className="text-xl font-bold sr-only">
            {formContext === 'edit' ? 'Edit Package' : 'Add Package'}
          </h2>
          <AddressInput
            address={address}
            setAddress={setAddress}
            formContext={formContext}
            // ✅ PASSING DOWN: Pass the 'match' state down
            match={match}
            // ✅ PASSING DOWN: Pass the *new* handler down
            onMatchChange={handleMatchChange}
          />
          <TrackingInput
            pkg={pkg}
            formContext={formContext}
            handleInputChange={handleInputChange}
            onScanClick={onScanRequest}
          />
          <SizeSelect pkg={pkg} setPkg={setPkg} />
          <NotesInput pkg={pkg} handleInputChange={handleInputChange} setPkg={setPkg} />
          <ActionButtons
            formContext={formContext}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            disabled={isSubmitDisabled}
          />
        </div>
      )}
    </div>
  );
};

export default PackageForm;