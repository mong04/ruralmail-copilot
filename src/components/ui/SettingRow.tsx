// src/features/settings/components/SettingRow.tsx
import React from 'react';
import { cn } from '../../lib/utils';

interface SettingRowProps {
  title: string;
  icon: React.ElementType;
  color?: string;
  children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  title,
  icon: Icon,
  color = 'text-brand',
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b border-border/40 last:border-0 hover:bg-surface-muted/30 transition-colors">
    <div className="flex items-center gap-3">
      <div className={cn('p-2 rounded-lg bg-surface-muted/50', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
    <div className="w-full sm:w-1/2 flex justify-end">
      {children}
    </div>
  </div>
);