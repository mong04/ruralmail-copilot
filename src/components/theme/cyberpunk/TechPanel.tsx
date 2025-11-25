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

  // 1. Standard Theme
  if (theme !== 'cyberpunk') {
    return (
      <div className={cn("bg-surface rounded-xl border border-border shadow-sm", className)} {...props}>
        {children}
      </div>
    );
  }

  // 2. Cyberpunk Basic
  if (!richThemingEnabled) {
     return (
      <div className={cn("bg-surface border border-brand/30 relative p-1", className)} {...props}>
        <div className="absolute inset-0.5 border border-brand/10 pointer-events-none" />
        {children}
      </div>
    );
  }

  // 3. Cyberpunk FULL
  const borderColor = 
    variant === 'alert' ? '#ff003c' : 
    variant === 'success' ? '#0aff60' : 
    '#00f0ff'; 

  return (
    <div 
      className={cn(
        "relative bg-surface/80 border-l border-r border-border backdrop-blur-md transition-all duration-300",
        "bg-grid-pattern",
        "flex flex-col",
        "p-1", // FIX: Moved padding here so it can be overridden by className (e.g. pb-12)
        className 
      )}
      style={{
        boxShadow: `0 0 10px ${borderColor}10`,
        // Removed inline padding to allow overrides
      }}
      {...props}
    >
      {/* --- DECORATIONS --- */}
      <svg className="absolute -top-[1px] -left-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 0 24 V 0 H 24" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>
      <svg className="absolute -top-[1px] -right-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 0 0 H 24 V 24" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>
      <svg className="absolute -bottom-[1px] -right-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 24 0 V 24 H 0" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>
      <svg className="absolute -bottom-[1px] -left-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 24 24 H 0 V 0" fill="none" stroke={borderColor} strokeWidth="2" />
      </svg>

      <div className="absolute top-0 left-8 right-8 h-[1px] bg-border/50 pointer-events-none z-0" />
      <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-border/50 pointer-events-none z-0" />

      {children}
    </div>
  );
};