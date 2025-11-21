import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input
      className={twMerge(
        // Base
        'w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        // Light Mode: Clean, subtle depth
        'bg-white border border-gray-200 shadow-sm text-gray-900 placeholder:text-gray-400',
        'focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none',
        // Dark Mode: Glassy, inner depth
        'dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30',
        'dark:focus:bg-black/40 dark:focus:border-brand/50 dark:focus:ring-brand/20',
        className
      )}
      {...props}
    />
  );
};