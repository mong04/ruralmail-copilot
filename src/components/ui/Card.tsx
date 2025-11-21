import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        // Base Layout
        'relative overflow-hidden rounded-2xl transition-all',
        // Light Mode: Clean, subtle border, soft shadow
        'bg-white border border-gray-100 shadow-sm',
        // Dark Mode: The "Magical" part. Deep dark bg, subtle white inner ring for pop
        'dark:bg-[#18181b] dark:border-white/5 dark:shadow-none',
        'dark:ring-1 dark:ring-inset dark:ring-white/5',
        className
      )}
      {...props}
    />
  );
};