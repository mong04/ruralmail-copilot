// src/components/packages/PackageListItem.tsx
import React from 'react';
import { type Package } from '../../../db';
import { SwipeableListItem, SwipeAction, LeadingActions, TrailingActions } from 'react-swipeable-list';
import { Badge } from '../../../components/ui/Badge';
import { ChevronRight, Edit, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface PackageListItemProps {
  pkg: Package;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeStart: () => void;
  onSwipeEnd: () => void;
  style: React.CSSProperties;
}

export const PackageListItem: React.FC<PackageListItemProps> = ({ pkg, onEdit, onDelete, onSwipeStart, onSwipeEnd, style }) => {
  const sizeMap: Record<Package['size'], { label: string; variant: 'default' | 'success' | 'warning' }> = {
    small: { label: 'Small', variant: 'success' },
    medium: { label: 'Medium', variant: 'default' },
    large: { label: 'Large', variant: 'warning' },
  };
  const sizeInfo = sizeMap[pkg.size] || sizeMap.medium;

  return (
    <div style={style}>
      <SwipeableListItem
        onSwipeStart={onSwipeStart}
        onSwipeEnd={onSwipeEnd}
        swipeStartThreshold={5}
        threshold={0.3}
        fullSwipe={true}
        leadingActions={
          <LeadingActions>
            <SwipeAction onClick={onEdit} aria-label="Edit package">
              <div className="flex items-center justify-center h-full px-6 bg-brand text-brand-foreground font-bold">
                <Edit size={20} className="mr-2" /> Edit
              </div>
            </SwipeAction>
          </LeadingActions>
        }
        trailingActions={
          <TrailingActions>
            <SwipeAction onClick={onDelete} destructive={true} aria-label="Delete package">
              <div className="flex items-center justify-center h-full px-6 bg-danger text-danger-foreground font-bold">
                <Trash2 size={20} className="mr-2" /> Delete
              </div>
            </SwipeAction>
          </TrailingActions>
        }
      >
        <button
          type="button"
          onClick={onEdit}
          className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-muted text-left transition-colors"
          aria-label={`Edit package ${pkg.tracking || 'No Tracking'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono font-semibold text-sm break-all">
              {pkg.tracking || 'No Tracking #'}
            </div>
            <div className="flex items-center flex-wrap mt-1 gap-2 text-sm text-muted">
              <Badge variant={sizeInfo.variant}>{sizeInfo.label}</Badge>
              {pkg.notes && (
                <span
                  className={cn(
                    'font-medium truncate',
                    pkg.notes.toLowerCase().includes('fragile') ? 'text-danger' : 'text-muted'
                  )}
                >
                  • {pkg.notes}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="shrink-0 w-5 h-5 text-muted ml-2" />
        </button>
      </SwipeableListItem>
    </div>
  );
};