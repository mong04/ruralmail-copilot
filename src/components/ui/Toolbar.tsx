import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={twMerge(
        // Floating Glass Effect
        'flex items-center gap-1 p-1.5',
        // The Shape & Look
        'rounded-full border border-white/10 shadow-2xl shadow-black/20',
        'bg-zinc-900/80 backdrop-blur-xl backdrop-saturate-150',
        // Light mode override 
        'light:bg-white/80 light:border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};