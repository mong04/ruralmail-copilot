import React from 'react';
import { ScanLine } from 'lucide-react';
import { type Package } from '../../../../db';

interface TrackingInputProps {
  pkg: Partial<Package>;
  formContext: 'scan' | 'manual' | 'edit';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const TrackingInput: React.FC<TrackingInputProps> = ({ pkg, formContext, handleInputChange }) => {
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
          className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand outline-none transition-all font-mono text-sm tracking-wide"
        />
      </div>
    </div>
  );
};

export default TrackingInput;