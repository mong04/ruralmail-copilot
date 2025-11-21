import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => {
  return (
    <div className="relative">
      <select
        className={twMerge(
          // Base (Same as Input + extra padding for arrow)
          'w-full appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm font-medium transition-all duration-200',
          'bg-white border border-gray-200 shadow-sm text-gray-900',
          'focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none',
          // Dark Mode
          'dark:bg-white/5 dark:border-white/10 dark:text-white',
          'dark:focus:bg-black/40 dark:focus:border-brand/50 dark:focus:ring-brand/20',
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