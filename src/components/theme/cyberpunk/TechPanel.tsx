import React from 'react';
import { useAppSelector } from '../../../store';
import { cn } from '../../../lib/utils';

interface TechPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'alert' | 'success';
}

export const TechPanel: React.FC<TechPanelProps> = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}) => {
  const theme = useAppSelector((state) => state.settings.theme);
  const richThemingEnabled = useAppSelector((state) => state.settings.richThemingEnabled);

  // 1. Basic fallback (Not Cyberpunk)
  if (theme !== 'cyberpunk') {
    return (
      <div className={cn("bg-surface rounded-xl border border-border shadow-sm", className)} {...props}>
        {children}
      </div>
    );
  }

  // 2. Cyberpunk Basic (Rich Effects OFF)
  // Just a dark box with sharp borders, no expensive rendering
  if (!richThemingEnabled) {
     return (
      <div className={cn("bg-surface border border-brand/30 p-1", className)} {...props}>
        <div className="border border-brand/10 bg-black/40 h-full p-2">
           {children}
        </div>
      </div>
    );
  }

  // 3. Cyberpunk FULL (Rich Effects ON)
  const borderColor = 
    variant === 'alert' ? '#ff003c' : 
    variant === 'success' ? '#0aff60' : 
    '#00f0ff'; // Brand cyan

  return (
    <div 
      className={cn(
        "relative bg-surface/80 border-l border-r border-border backdrop-blur-md p-1 transition-all duration-300",
        "bg-grid-pattern", // Adds subtle grid texture
        className
      )}
      style={{
        boxShadow: `0 0 10px ${borderColor}10`, // Subtle ambient glow
      }}
      {...props}
    >
      {/* Top Left Bracket */}
      <svg className="absolute -top-px -left-px w-6 h-6 z-10 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 0 24 V 0 H 24" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>

      {/* Top Right Bracket */}
      <svg className="absolute -top-px -right-px w-6 h-6 z-10 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 0 0 H 24 V 24" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>

      {/* Bottom Right Bracket */}
      <svg className="absolute -bottom-px -right-px w-6 h-6 z-10 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 24 0 V 24 H 0" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>

      {/* Bottom Left Bracket */}
      <svg className="absolute -bottom-px -left-px w-6 h-6 z-10 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 24 24 H 0 V 0" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>

      {/* Decoration Lines */}
      <div className="absolute top-0 left-8 right-8 h-px bg-border/50 pointer-events-none" />
      <div className="absolute bottom-0 left-8 right-8 h-px bg-border/50 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};