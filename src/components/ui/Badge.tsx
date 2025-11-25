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
    // SEMANTIC MAPPING
    default: 'bg-brand/10 text-brand border-brand/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger:  'bg-danger/10 text-danger border-danger/20',
    muted:   'bg-surface-muted text-muted-foreground border-transparent',
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