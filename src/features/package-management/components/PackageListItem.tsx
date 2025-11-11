// src/components/packages/PackageListItem.tsx
import React from 'react';
import { type Package } from '../../../db';
import {
  SwipeableListItem,
  SwipeAction,
  LeadingActions,
  TrailingActions,
} from 'react-swipeable-list';

interface PackageListItemProps {
  pkg: Package;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeStart: () => void;
  onSwipeEnd: () => void;
  style: React.CSSProperties;
}

/**
 * PackageListItem component with swipe actions for edit/delete.
 */
export const PackageListItem: React.FC<PackageListItemProps> = ({
  pkg,
  onEdit,
  onDelete,
  onSwipeStart,
  onSwipeEnd,
  style,
}) => {
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
              <div className="flex items-center justify-center h-full px-6 bg-blue-500 text-white font-bold">
                <span>Edit</span>
              </div>
            </SwipeAction>
          </LeadingActions>
        }
        trailingActions={
          <TrailingActions>
            <SwipeAction onClick={onDelete} destructive={true} aria-label="Delete package">
              <div className="flex items-center justify-center h-full px-6 bg-red-600 text-white font-bold">
                <span>Delete</span>
              </div>
            </SwipeAction>
          </TrailingActions>
        }
      >
        <button
          type="button"
          onClick={onEdit}
          className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 text-left"
          aria-label={`Edit package ${pkg.tracking || 'No Tracking'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono font-semibold text-sm text-gray-900 break-all">
              {pkg.tracking || 'No Tracking #'}
            </div>
            <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  pkg.size === 'small'
                    ? 'bg-green-100 text-green-800'
                    : pkg.size === 'medium'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {pkg.size.toUpperCase()}
              </span>
              {pkg.notes && (
                <span className="ml-auto text-amber-600">• {pkg.notes}</span>
              )}
            </div>
          </div>

          <div className="ml-1 text-gray-300 md:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>
      </SwipeableListItem>
    </div>
  );
};