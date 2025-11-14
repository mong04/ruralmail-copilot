// src/components/packages/PackageListItem.tsx
import React from 'react';
import { type Package } from '../../../db';
import { SwipeableListItem, SwipeAction, LeadingActions, TrailingActions } from 'react-swipeable-list';
import { Badge } from '../../../components/ui/Badge';

interface PackageListItemProps {
  pkg: Package;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeStart: () => void;
  onSwipeEnd: () => void;
  style: React.CSSProperties;
}

export const PackageListItem: React.FC<PackageListItemProps> = ({ pkg, onEdit, onDelete, onSwipeStart, onSwipeEnd, style }) => {
  const sizeLabel =
    pkg.size === 'small' ? <Badge variant="success">SMALL</Badge> : pkg.size === 'medium' ? <Badge>MEDIUM</Badge> : <Badge variant="warning">LARGE</Badge>;

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
              <div className="flex items-center justify-center h-full px-6 bg-brand text-brand-foreground font-bold">Edit</div>
            </SwipeAction>
          </LeadingActions>
        }
        trailingActions={
          <TrailingActions>
            <SwipeAction onClick={onDelete} destructive={true} aria-label="Delete package">
              <div className="flex items-center justify-center h-full px-6 bg-danger text-danger-foreground font-bold">Delete</div>
            </SwipeAction>
          </TrailingActions>
        }
      >
        <button
          type="button"
          onClick={onEdit}
          className="w-full flex items-center justify-between p-4 bg-surface rounded-lg shadow-sm border border-border text-left"
          aria-label={`Edit package ${pkg.tracking || 'No Tracking'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono font-semibold text-sm break-all">{pkg.tracking || 'No Tracking #'}</div>
            <div className="flex items-center mt-1 gap-3 text-sm text-muted">
              {sizeLabel}
              {pkg.notes && <span className="ml-auto text-warning">• {pkg.notes}</span>}
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-muted md:hidden">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </SwipeableListItem>
    </div>
  );
};