import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        // Base Layout
        'relative overflow-hidden rounded-xl transition-all duration-300',
        // Semantic Colors (Works for Light, Dark, AND Cyberpunk)
        'bg-surface text-surface-foreground border border-border shadow-sm',
        className
      )}
      {...props}
    />
  );
};