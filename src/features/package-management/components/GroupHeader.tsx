// src/features/package-management/components/GroupHeader.tsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GroupHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  style: React.CSSProperties;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({ title, count, isExpanded, onToggle, style }) => {
  return (
    <div style={style} className="p-2 bg-surface-muted text-foreground font-semibold flex justify-between items-center cursor-pointer" onClick={onToggle}>
      {title} ({count})
      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </div>
  );
};