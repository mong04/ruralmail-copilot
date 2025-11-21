// src/features/package-management/components/TrackingInput.tsx
import React from 'react';
import { Camera, ScanLine } from 'lucide-react';
import { type Package } from '../../../../db';

interface TrackingInputProps {
  pkg: Partial<Package>;
  formContext: 'scan' | 'manual' | 'edit';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onScanClick: () => void;
}

const TrackingInput: React.FC<TrackingInputProps> = ({ pkg, formContext, handleInputChange, onScanClick }) => {
  return (
    <div className="relative">
      <div className="relative group">
        <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        
        <input
          type="text"
          name="tracking"
          value={pkg.tracking || ''}
          onChange={handleInputChange}
          placeholder="Tracking Number (Optional)"
          readOnly={formContext === 'edit'}
          className="w-full pl-12 pr-14 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand outline-none transition-all font-mono text-sm tracking-wide"
        />

        {formContext !== 'edit' && (
          <button
            type="button"
            onClick={onScanClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-surface-muted hover:bg-brand/10 text-foreground rounded-lg transition-colors"
          >
            <Camera size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackingInput;