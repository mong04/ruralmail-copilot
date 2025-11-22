// src/components/ui/Toolbar.tsx
import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={twMerge(
        // Floating Glass Effect
        'flex items-center gap-1 p-1.5',
        // The Shape & Look
        // FIX: Use semantic border/50 instead of white/10
        'rounded-full border border-border/50 shadow-2xl shadow-black/20',
        // FIX: Use bg-surface/80 instead of hardcoded zinc/white overrides
        'bg-surface/80 backdrop-blur-xl backdrop-saturate-150',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};