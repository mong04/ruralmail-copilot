import React from 'react';
import { Mail, Box, Home } from 'lucide-react';
import { type Package } from '../../../../db';
import { cn } from '../../../../lib/utils';

interface SizeSelectProps {
  pkg: Partial<Package>;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const options = [
  { value: 'small', label: 'Small', icon: Mail },
  { value: 'medium', label: 'Medium', icon: Box },
  { value: 'large', label: 'Large', icon: Home },
] as const;

const SizeSelect: React.FC<SizeSelectProps> = ({ pkg, setPkg }) => {
  const selected = pkg.size || 'medium';

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Package Size</label>
      <div className="flex p-1 bg-surface-muted rounded-xl border border-border">
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPkg(p => ({ ...p, size: opt.value }))}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all",
                isActive 
                  ? "bg-surface text-foreground shadow-sm ring-1 ring-border" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <opt.icon size={18} className={isActive ? "text-brand" : "text-muted-foreground"} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeSelect;