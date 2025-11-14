import React, { type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'muted';

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: ReactNode; // ✅ explicitly declare children
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, children }) => {
  const styles =
    variant === 'success'
      ? 'bg-success/15 text-success'
      : variant === 'warning'
      ? 'bg-warning/15 text-warning'
      : variant === 'danger'
      ? 'bg-danger/15 text-danger'
      : variant === 'muted'
      ? 'bg-accent text-muted'
      : 'bg-accent text-foreground';

  return (
    <span
      className={twMerge(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
        styles,
        className
      )}
    >
      {children}
    </span>
  );
};
