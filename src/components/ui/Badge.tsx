import React, { type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'outline';

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, children }) => {
  const variants = {
    default: 'bg-brand/10 text-brand border-brand/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    muted:   'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-transparent',
    outline: 'bg-transparent border-border text-muted-foreground',
  };

  return (
    <span
      className={twMerge(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};