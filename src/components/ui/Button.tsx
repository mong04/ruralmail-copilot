import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

const button = cva(
  // Base: Physics (scale), Layout (flex), and Focus states
  'relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed overflow-hidden select-none',
  {
    variants: {
      variant: {
        primary: [
          'bg-brand text-brand-foreground',
          'hover:bg-brand/90',
          'border border-transparent', 
        ],
        surface: [
          'bg-surface text-foreground border border-border/50',
          'hover:bg-surface-muted hover:border-border',
        ],
        danger: [
          'bg-red-500/10 text-red-600 border border-red-500/20',
          'hover:bg-red-500/20 hover:border-red-500/30',
          'dark:text-red-400 dark:border-red-400/20',
        ],
        ghost: [
          'bg-transparent text-muted-foreground',
          'hover:bg-surface-muted hover:text-foreground',
        ],
        glass: [
            'bg-white/10 backdrop-blur-md border border-white/20 text-white',
            'hover:bg-white/20 hover:border-white/30 shadow-sm'
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
      
      {/* Subtle Highlight Overlay for "Glossy" feel on primary buttons */}
      {variant === 'primary' && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
      )}
    </button>
  );
};