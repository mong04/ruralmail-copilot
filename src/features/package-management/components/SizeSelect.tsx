// src/features/package-management/components/SizeSelect.tsx
import React from 'react';
import { Mail, Home, Package as PackageIcon, ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { type Package } from '../../../db';

interface SizeSelectProps {
  pkg: Partial<Package>;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const SizeSelect: React.FC<SizeSelectProps> = ({ pkg, setPkg }) => {
  const sizeOptions: Array<{
    value: Package['size'];
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
  }> = [
    { value: 'small', label: 'Small - Mailbox', icon: Mail },
    { value: 'medium', label: 'Medium - Porch/Door', icon: PackageIcon },
    { value: 'large', label: 'Large - House Delivery', icon: Home },
  ];

  const selectedSize = sizeOptions.find(option => option.value === (pkg.size || 'medium'));

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-4">Package Size</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className="w-full p-5 text-lg border-2 border-border rounded-xl focus:ring-4 focus:ring-brand/30 focus:border-brand shadow-sm transition-all duration-300 bg-surface flex items-center justify-between"
          >
            <span className="flex items-center">
              {selectedSize && <selectedSize.icon className="mr-2" size={16} />}
              {selectedSize ? selectedSize.label : 'Select size'}
            </span>
            <ChevronDown size={16} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="bg-surface border border-border rounded-xl shadow-lg p-2 w-(--radix-popover-content-available-width)">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                className="w-full text-left p-3 hover:bg-accent flex items-center"
                onClick={() => setPkg((prev) => ({ ...prev, size: option.value }))}
              >
                <option.icon className="mr-2" size={16} />
                {option.label}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

export default SizeSelect;