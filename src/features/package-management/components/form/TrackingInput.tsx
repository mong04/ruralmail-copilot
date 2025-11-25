import React from 'react';
import { ScanLine } from 'lucide-react';
import { type Package } from '../../../../db';
import { useAppSelector } from '../../../../store';
import { cn } from '../../../../lib/utils';

interface TrackingInputProps {
  pkg: Partial<Package>;
  formContext: 'scan' | 'manual' | 'edit';
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const TrackingInput: React.FC<TrackingInputProps> = ({ pkg, formContext, handleInputChange }) => {
  const theme = useAppSelector((state) => state.settings.theme);
  const isCyberpunk = theme === 'cyberpunk';

  return (
    <div className="relative">
      <div className="relative group">
        <ScanLine 
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
            isCyberpunk 
              ? "text-brand/60 group-focus-within:text-brand group-focus-within:drop-shadow-[0_0_8px_var(--brand)]" 
              : "text-muted-foreground group-focus-within:text-brand"
          )} 
          size={20} 
        />
        
        <input
          type="text"
          name="tracking"
          value={pkg.tracking || ''}
          onChange={handleInputChange}
          placeholder="Tracking Number (Optional)"
          readOnly={formContext === 'edit'}
          className={cn(
            "w-full pl-12 pr-4 py-4 rounded-xl outline-none transition-all duration-300 font-mono text-sm tracking-wide",
            // SEMANTIC GLOW RESTORED
            isCyberpunk 
              ? "bg-black/60 text-brand border border-brand/30 focus:border-brand focus:shadow-[0_0_25px_var(--brand-10)] placeholder:text-brand/30"
              : "bg-surface-muted text-foreground border border-border focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder:text-muted-foreground/50"
          )}
        />
      </div>
    </div>
  );
};

export default TrackingInput;