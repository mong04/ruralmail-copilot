// src/components/packages/PackageList.tsx
import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../store';
import { type Package, type Stop } from '../../db';
import { SwipeableList } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { PackageListItem } from './PackageListItem';
import { GroupHeader } from './GroupHeader';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useIsMobile } from '../../hooks/useIsMobile';

interface PackageListProps {
  packages: Package[]; // Flat, filtered list
  allPackages: Package[]; // Complete, unfiltered list
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
}

// Virtualization types
type VirtualRow =
  | { type: 'header'; stopIndex: number; count: number; title: string }
  | { type: 'package'; pkg: Package };

/**
 * PackageList component with virtualization and swipe actions.
 * Groups packages by stop and supports fuzzy search.
 */
const PackageList: React.FC<PackageListProps> = ({
  packages,
  allPackages,
  totalCount,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const route = useSelector((state: RootState) => state.route.route) as Stop[];
  const isMobile = useIsMobile();

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([-1]));

  const toggleGroup = useCallback((stopIndex: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(stopIndex)) {
        next.delete(stopIndex);
      } else {
        next.add(stopIndex);
      }
      return next;
    });
  }, []);

  const { flatRows } = useMemo(() => {
    const groups: { [key: number]: Package[] } = { [-1]: [] };
    for (const pkg of allPackages) {
      const stopIndex = pkg.assignedStop ?? -1;
      if (!groups[stopIndex]) groups[stopIndex] = [];
      groups[stopIndex].push(pkg);
    }

    const flatRows: VirtualRow[] = [];
    Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).forEach(([key, pkgs]) => {
      const stopIndex = Number(key);
      const title = stopIndex === -1 ? 'Unassigned' : route[stopIndex]?.full_address ?? `Stop ${stopIndex + 1}`;
      flatRows.push({ type: 'header', stopIndex, count: pkgs.length, title });
      if (expandedGroups.has(stopIndex)) {
        pkgs.forEach(pkg => flatRows.push({ type: 'package', pkg }));
      }
    });
    return { flatRows };
  }, [allPackages, expandedGroups, route]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 60, // Average row height
  });

  const items = virtualizer.getVirtualItems();

  const handleSwipeStart = useCallback(() => {
    // Optional: Pause virtualizer on swipe if needed
  }, []);

  const handleSwipeEnd = useCallback(() => {
    // Optional: Resume
  }, []);

  const renderListContent = useCallback(() => {
    if (items.length === 0) return <p className="text-center text-gray-500">No packages</p>;

    return (
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((virtualRow: VirtualItem) => {
          const row = flatRows[virtualRow.index];
          const style = {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          };

          if (row.type === 'header') {
            return (
              <GroupHeader
                key={row.stopIndex}
                title={row.title}
                count={row.count}
                isExpanded={expandedGroups.has(row.stopIndex)}
                onToggle={() => toggleGroup(row.stopIndex)}
                style={style}
              />
            );
          }

          return (
            <SwipeableList
              key={row.pkg.id}
              destructiveCallbackDelay={300}
              style={{
                ...style,
                position: 'absolute' as const,
                paddingBottom: '8px',
              }}
            >
              <PackageListItem
                pkg={row.pkg}
                onEdit={() => onEdit(row.pkg)}
                onDelete={() => onDelete(row.pkg)}
                onSwipeStart={handleSwipeStart}
                onSwipeEnd={handleSwipeEnd}
                style={{}}
              />
            </SwipeableList>
          );
        })}
      </div>
    );
  }, [items, flatRows, expandedGroups, toggleGroup, onEdit, onDelete, handleSwipeStart, handleSwipeEnd, virtualizer]);

  return (
    <div className="mb-8" role="region" aria-label="Package List">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-3">📋</span>
        Today's Packages ({totalCount})
      </h3>

      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tracking or address..."
          className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm transition-all duration-300"
          aria-label="Search packages"
        />
      </div>

      <div
        ref={scrollContainerRef}
        className={`overflow-y-auto bg-gray-50 rounded-xl p-4 border border-gray-200 ${isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'}`}
        role="list"
        aria-label="Package items"
      >
        {renderListContent()}
      </div>
    </div>
  );
};

export default PackageList;