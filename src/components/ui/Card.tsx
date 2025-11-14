import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge('bg-surface text-surface-foreground rounded-xl shadow-lg border border-border', className)}
      {...props}
    />
  );
};
