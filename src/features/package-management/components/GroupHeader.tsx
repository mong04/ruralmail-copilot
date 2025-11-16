// src/features/package-management/components/GroupHeader.tsx
import React from 'react';
import { Badge } from '../../../components/ui/Badge';

// Define the types of notes we look for
export type StopNoteType = 'forward' | 'vacant' | 'note';

interface GroupHeaderProps {
  title: string;
  count: number;
  noteType: StopNoteType | null;
  style?: React.CSSProperties; // Style is optional now
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  title,
  count,
  noteType,
  style,
}) => {
  return (
    // This is now a static header, not a button
    <div
      style={style}
      className="p-3 bg-surface-muted text-foreground font-semibold flex justify-between items-center border-b border-border"
    >
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="truncate flex-1 font-bold">{title}</span>
        <span className="text-muted font-medium">({count})</span>
      </div>
      <div className="shrink-0 ml-2">
        {noteType === 'forward' && <Badge variant="warning">FORWARD</Badge>}
        {noteType === 'vacant' && <Badge variant="danger">VACANT</Badge>}
        {noteType === 'note' && <Badge variant="muted">Note</Badge>}
      </div>
    </div>
  );
};