import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => {
  return (
    <div className="relative">
      <select
        className={twMerge(
          'w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm font-medium transition-all duration-200',
          'bg-surface-muted text-foreground border border-border',
          'focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
};