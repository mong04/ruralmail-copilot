import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input
      className={twMerge(
        // Base
        'w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
        // Semantic Colors
        'bg-surface-muted text-foreground border border-border',
        'placeholder:text-muted-foreground',
        // Focus State
        'focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none',
        className
      )}
      {...props}
    />
  );
};