// src/features/package-management/components/TrackingInput.tsx
import React from 'react';
import { Check, Camera } from 'lucide-react';
import { type Package } from '../../../db';
import { Button } from '../../../components/ui/Button';

interface TrackingInputProps {
  pkg: Partial<Package>;
  formContext: 'scan' | 'manual' | 'edit';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onScanClick: () => void;
}

const TrackingInput: React.FC<TrackingInputProps> = ({
  pkg,
  formContext,
  handleInputChange,
  onScanClick,
}) => {
  const isScanned = formContext === 'scan' || (formContext === 'edit' && !!pkg.tracking);

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-4">
        Tracking Number
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          name="tracking"
          value={pkg.tracking || ''}
          onChange={handleInputChange}
          placeholder="9405 5082 0549..."
          readOnly={formContext === 'edit'} // Tracking # is immutable
          className={`flex-1 w-full p-5 font-mono text-lg font-semibold tracking-widest border-2 border-border rounded-xl focus:ring-4 focus:ring-brand/30 focus:border-brand shadow-sm transition-all duration-300 ${
            formContext === 'edit' ? 'bg-surface-muted cursor-not-allowed' : ''
          }`}
        />
        {formContext !== 'edit' && (
          <Button
            type="button"
            variant="surface"
            size="lg"
            onClick={onScanClick}
            className="h-auto aspect-square"
            aria-label="Scan barcode"
          >
            <Camera size={24} />
          </Button>
        )}
      </div>

      {isScanned && (
        <p className="mt-3 text-sm text-success bg-success/10 p-3 rounded-lg font-medium border border-success/20 flex items-center justify-center gap-2">
          <Check size={16} />
          {formContext === 'scan' ? 'Scanned Successfully' : 'Editing this package'}
        </p>
      )}
    </div>
  );
};

export default TrackingInput;