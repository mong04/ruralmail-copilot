import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={twMerge(
        'w-full max-w-md mx-auto flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-muted border border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
