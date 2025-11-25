import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input
      className={twMerge(
        // Layout
        'w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
        // SEMANTIC COLORS
        'bg-surface-muted text-foreground border border-border',
        'placeholder:text-muted-foreground/60',
        // Focus
        'focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none',
        // Disabled
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
};