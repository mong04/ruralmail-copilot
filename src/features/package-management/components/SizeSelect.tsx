// src/features/package-management/components/SizeSelect.tsx
import React from 'react';
import { Mail, Package as PackageIcon, Home } from 'lucide-react';
import { type Package } from '../../../db';
import { cn } from '../../../lib/utils';

interface SizeSelectProps {
  pkg: Partial<Package>;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const sizeOptions: Array<{
  value: Package['size'];
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}> = [
  { value: 'small', label: 'Small', icon: Mail },
  { value: 'medium', label: 'Medium', icon: PackageIcon },
  { value: 'large', label: 'Large', icon: Home },
];

const SizeSelect: React.FC<SizeSelectProps> = ({ pkg, setPkg }) => {
  const selectedValue = pkg.size || 'medium';

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-4">Package Size</label>
      <div className="grid grid-cols-3 gap-3">
        {sizeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPkg((prev) => ({ ...prev, size: option.value }))}
            className={cn(
              'flex flex-col items-center justify-center p-4 h-24 rounded-xl border-2 shadow-sm transition-all duration-200',
              selectedValue === option.value
                ? 'bg-brand/10 border-brand text-brand ring-4 ring-brand/20'
                : 'bg-surface border-border text-muted hover:border-foreground'
            )}
            aria-pressed={selectedValue === option.value}
          >
            <option.icon className="w-8 h-8 mb-1" />
            <span className="font-semibold">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SizeSelect;