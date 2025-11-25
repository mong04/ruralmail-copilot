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

  // 2. Cyberpunk Basic (Low Power)
  if (!richThemingEnabled) {
     return (
      <div className={cn("bg-surface border border-brand/30 relative p-1", className)} {...props}>
        <div className="absolute inset-0.5 border border-brand/10 pointer-events-none" />
        {children}
      </div>
    );
  }

  // 3. Cyberpunk FULL (High Voltage)
  const borderColor = 
    variant === 'alert' ? '#ff003c' : 
    variant === 'success' ? '#0aff60' : 
    '#00f0ff'; 

  return (
    <div 
      className={cn(
        "relative bg-surface/90 border-l border-r border-border backdrop-blur-xl transition-all duration-300",
        "bg-grid-pattern",
        "flex flex-col p-1",
        className 
      )}
      style={{
        // GLOW UPGRADE: Double-layer shadow for "Bloom" effect
        // Layer 1: Tight, bright (40% opacity)
        // Layer 2: Wide, ambient (20% opacity)
        boxShadow: `0 0 15px ${borderColor}66, 0 0 40px ${borderColor}33`,
        borderColor: `${borderColor}80` // Brighter physical border
      }}
      {...props}
    >
      {/* --- DECORATIONS --- */}
      {/* Brackets - Increased stroke width slightly for visibility */}
      <svg className="absolute -top-[1px] -left-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 0 24 V 0 H 24" fill="none" stroke={borderColor} strokeWidth="3" />
      </svg>
      <svg className="absolute -top-[1px] -right-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 0 0 H 24 V 24" fill="none" stroke={borderColor} strokeWidth="3" />
      </svg>
      <svg className="absolute -bottom-[1px] -right-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 24 0 V 24 H 0" fill="none" stroke={borderColor} strokeWidth="3" />
      </svg>
      <svg className="absolute -bottom-[1px] -left-[1px] w-6 h-6 z-0 pointer-events-none" viewBox="0 0 24 24">
        <path d="M 24 24 H 0 V 0" fill="none" stroke={borderColor} strokeWidth="3" />
      </svg>

      <div className="absolute top-0 left-8 right-8 h-[1px] bg-border/50 pointer-events-none z-0" />
      <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-border/50 pointer-events-none z-0" />

      {children}
    </div>
  );
};