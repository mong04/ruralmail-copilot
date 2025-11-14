import React from 'react';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const button = cva(
  'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-foreground hover:bg-brand/90 focus:ring-brand',
        surface: 'bg-surface text-surface-foreground hover:bg-surface-muted focus:ring-brand border border-border',
        danger: 'bg-danger text-danger-foreground hover:bg-danger/90 focus:ring-danger',
        ghost: 'bg-transparent hover:bg-accent text-foreground focus:ring-brand',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'surface' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<Props> = ({ className, variant, size, ...props }) => {
  return <button className={twMerge(button({ variant, size }), className)} {...props} />;
};
