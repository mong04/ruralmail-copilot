// src/features/package-management/components/TrackingInput.tsx
import React from 'react';
import { Check } from 'lucide-react';
import { type Package } from '../../../db';

interface TrackingInputProps {
  pkg: Partial<Package>;
  formContext: 'scan' | 'manual' | 'edit';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const TrackingInput: React.FC<TrackingInputProps> = ({
  pkg,
  formContext,
  handleInputChange,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-4">
        Tracking Number <span className="text-muted font-normal">(Optional)</span>
      </label>
      <input
        type="text"
        name="tracking"
        value={pkg.tracking || ''}
        onChange={handleInputChange}
        placeholder="9405 5082 0549 8741 0995"
        readOnly={formContext === 'edit'}
        className={`w-full p-5 font-mono text-lg font-semibold tracking-widest border-2 border-border rounded-xl focus:ring-4 focus:ring-brand/30 focus:border-brand shadow-sm transition-all duration-300 ${formContext === 'edit' ? 'bg-surface-muted cursor-not-allowed' : ''}`}
      />
      {formContext === 'edit' && (
        <p className="mt-3 text-center text-sm text-success bg-success/10 p-3 rounded-lg font-medium border border-success/20">
          <Check className="inline mr-1" size={16} /> Editing this package
        </p>
      )}
    </div>
  );
};

export default TrackingInput;