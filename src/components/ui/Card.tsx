import React from 'react';
import { twMerge } from 'tailwind-merge';
import { useAppSelector } from '../../store';
import { TechPanel } from '../theme/cyberpunk/TechPanel';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  const theme = useAppSelector((state) => state.settings.theme);

  // 1. Cyberpunk Mode (Redirect to TechPanel)
  // TechPanel internally handles 'richThemingEnabled' checks to determine complexity.
  if (theme === 'cyberpunk') {
    return (
      <TechPanel className={className} {...props}>
        {children}
      </TechPanel>
    );
  }

  // 2. Standard Mode
  return (
    <div
      className={twMerge(
        // Base Layout
        'relative overflow-hidden rounded-xl transition-all duration-300',
        // Semantic Colors (Works for Light & Dark standard themes)
        'bg-surface text-surface-foreground border border-border shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};