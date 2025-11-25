import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

const button = cva(
  'relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed overflow-hidden select-none',
  {
    variants: {
      variant: {
        primary: [
          'bg-brand text-brand-foreground',
          'hover:brightness-110', 
          'border border-transparent', 
        ],
        surface: [
          'bg-surface text-foreground border border-border',
          'hover:bg-surface-muted hover:border-border/80',
        ],
        danger: [
          // FULLY SEMANTIC: Uses defined CSS variables for danger state
          'bg-danger/10 text-danger border border-danger/20',
          'hover:bg-danger/20 hover:border-danger/30',
        ],
        ghost: [
          'bg-transparent text-muted-foreground',
          'hover:bg-surface-muted hover:text-foreground',
        ],
        glass: [
            // Special case for overlay elements, kept neutral but theme-aware
            'bg-surface/10 backdrop-blur-md border border-white/20 text-white',
            'hover:bg-surface/20 hover:border-white/30 shadow-sm'
        ]
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-10 px-4 text-sm rounded-xl',
        lg: 'h-12 px-6 text-base rounded-2xl',
        icon: 'h-10 w-10 p-0 rounded-xl', 
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & 
  VariantProps<typeof button> & {
  isLoading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({ 
  className, 
  variant, 
  size, 
  children,
  isLoading,
  ...props 
}) => {
  return (
    <button className={twMerge(button({ variant, size }), className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
      
      {/* Gloss Effect for Primary Buttons only */}
      {variant === 'primary' && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
      )}
    </button>
  );
};