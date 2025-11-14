// src/features/package-management/components/PackageForm.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { type AppDispatch } from '../../../store';
import { addPackage, updatePackage } from '../packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../../db';
import { useIsMobile } from '../../../hooks/useIsMobile';
import AddressInput from './AddressInput';
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
}

const PackageForm: React.FC<PackageFormProps> = ({
  show,
  formContext,
  initialPackage,
  onSubmitSuccess,
  onCancel,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useIsMobile();

  const [pkg, setPkg] = useState<Partial<Package>>({
    tracking: '',
    size: 'medium',
    notes: '',
  });
  const [address, setAddress] = useState<string>('');

  // When the form is shown, load the initial data into its state
  useEffect(() => {
    if (show) {
      setPkg({
        tracking: initialPackage?.tracking || '',
        size: (initialPackage as Package)?.size || 'medium',
        notes: (initialPackage as Package)?.notes || '',
      });
      setAddress((initialPackage as Package)?.assignedAddress || '');
    }
  }, [show, initialPackage, formContext]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
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

      const finalPackage: Package = {
        id: (initialPackage as Package)?.id || generateUUID(),
        tracking: trimmedTracking || '',
        size: pkg.size || 'medium',
        notes: pkg.notes?.trim() || '',
        assignedStopId: undefined, // Managed in AddressInput
        assignedStopNumber: undefined, // Managed in AddressInput
        assignedAddress: trimmedAddress,
      };

      if (formContext === 'edit') {
        dispatch(updatePackage(finalPackage));
      } else {
        dispatch(addPackage(finalPackage));
      }

      onSubmitSuccess();
    } catch {
      toast.error('Failed to save package');
    }
  };

  return (
    <div
      className={`${
        isMobile
          ? 'fixed bottom-0 left-0 right-0 bg-linear-to-t from-surface-muted/95 via-surface to-surface/90 backdrop-blur-xl rounded-t-3xl p-6 pb-10 shadow-2xl border-t border-border max-h-[80vh] overflow-y-auto'
          : 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm'
      } transition-all duration-700 ease-out ${
        show ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-full scale-95 opacity-0 pointer-events-none'
      }`}
    >
      {show && (
        isMobile ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <AddressInput address={address} setAddress={setAddress} formContext={formContext} initialPackage={initialPackage} />
            <TrackingInput pkg={pkg} formContext={formContext} handleInputChange={handleInputChange} />
            <SizeSelect pkg={pkg} setPkg={setPkg} />
            <NotesInput pkg={pkg} handleInputChange={handleInputChange} />
            <ActionButtons formContext={formContext} onCancel={onCancel} onSubmit={handleSubmit} disabled={!pkg.tracking?.trim() && !address.trim()} />
          </div>
        ) : (
          <div className="bg-surface rounded-xl shadow-2xl border border-border p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="space-y-6">
              <AddressInput address={address} setAddress={setAddress} formContext={formContext} initialPackage={initialPackage} />
              <TrackingInput pkg={pkg} formContext={formContext} handleInputChange={handleInputChange} />
              <SizeSelect pkg={pkg} setPkg={setPkg} />
              <NotesInput pkg={pkg} handleInputChange={handleInputChange} />
              <ActionButtons formContext={formContext} onCancel={onCancel} onSubmit={handleSubmit} disabled={!pkg.tracking?.trim() && !address.trim()} />
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default PackageForm;