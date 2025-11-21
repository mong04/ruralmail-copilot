// src/features/package-management/components/GroupHeader.tsx
import React from 'react';
import { Badge } from '../../../../components/ui/Badge';

export type StopNoteType = 'forward' | 'vacant' | 'note';

interface GroupHeaderProps {
  title: string;
  stopNumber: number; // Explicit number
  count: number;
  noteType: StopNoteType | null;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  title,
  stopNumber,
  count,
  noteType,
}) => {
  const isUnassigned = stopNumber === -1;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border py-3 px-4 flex items-center justify-between shadow-sm transition-all">
      <div className="flex items-center gap-3 min-w-0">
        {/* BIG STOP NUMBER */}
        <div className={`
            flex items-center justify-center w-10 h-10 rounded-xl font-bold text-lg shrink-0
            ${isUnassigned ? 'bg-muted text-muted-foreground' : 'bg-brand text-brand-foreground shadow-brand/20 shadow-lg'}
        `}>
          {isUnassigned ? '?' : stopNumber + 1}
        </div>

        <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground truncate text-sm leading-tight">
                {title}
            </span>
            <span className="text-xs text-muted font-medium flex items-center gap-1">
                {count} package{count !== 1 && 's'}
            </span>
        </div>
      </div>

      {/* Badges */}
      <div className="shrink-0 flex gap-1">
        {noteType === 'forward' && <Badge variant="warning" className="text-[10px]">FWD</Badge>}
        {noteType === 'vacant' && <Badge variant="danger" className="text-[10px]">VAC</Badge>}
      </div>
    </div>
  );
};