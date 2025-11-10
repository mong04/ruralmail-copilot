// src/components/packages/PackageList.tsx
import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../store';
import { type Package } from '../../db';
import { SwipeableList } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { PackageListItem } from './PackageListItem';
import { GroupHeader } from './GroupHeader';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';

interface PackageListProps {
  packages: Package[]; // This is the flat, filtered list
  allPackages: Package[]; // This is the complete, unfiltered list
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
}

// --- VIRTUALIZATION TYPES ---
type VirtualRow =
  | { type: 'header'; stopIndex: number; count: number; title: string }
  | { type: 'package'; pkg: Package };

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
  const route = useSelector((state: RootState) => state.route.route);

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    new Set([-1]),
  );

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
      if (stopIndex < 0) {
        groups[-1].push(pkg);
      } else {
        if (!groups[stopIndex]) groups[stopIndex] = [];
        groups[stopIndex].push(pkg);
      }
    }

    const rows: VirtualRow[] = [];
    if (groups[-1].length > 0) {
      rows.push({
        type: 'header',
        stopIndex: -1,
        count: groups[-1].length,
        title: 'Unassigned',
      });
      if (expandedGroups.has(-1)) {
        groups[-1].forEach((pkg) => rows.push({ type: 'package', pkg }));
      }
    }
    route.forEach((stop, index) => {
      const stopPackages = groups[index] || [];
      if (stopPackages.length > 0) {
        rows.push({
          type: 'header',
          stopIndex: index,
          count: stopPackages.length,
          title: `Stop ${index + 1}: ${stop.full_address}`,
        });
        if (expandedGroups.has(index)) {
          stopPackages.forEach((pkg) => rows.push({ type: 'package', pkg }));
        }
      }
    });
    return { flatRows: rows };
  }, [allPackages, route, expandedGroups]);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index: number) => {
      return flatRows[index].type === 'header' ? 48 : 72;
    },
    measureElement: (element: Element) => element.getBoundingClientRect().height,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const handleSwipeStart = () => {
    document.body.style.overflow = 'hidden';
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.overflowY = 'hidden';
    }
  };
  const handleSwipeEnd = () => {
    document.body.style.overflow = '';
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.overflowY = 'auto';
    }
  };

  const renderListContent = () => {
    if (searchQuery.trim()) {
      return packages.length > 0 ? (
        <SwipeableList destructiveCallbackDelay={300}>
          {packages.map((pkg) => (
            <PackageListItem
              key={pkg.id}
              pkg={pkg}
              onEdit={() => onEdit(pkg)}
              onDelete={() => onDelete(pkg)}
              onSwipeStart={handleSwipeStart}
              onSwipeEnd={handleSwipeEnd}
              style={{}}
            />
          ))}
        </SwipeableList>
      ) : (
        <p className="text-center text-gray-500 italic py-8">
          No packages match your search.
        </p>
      );
    }

    if (totalCount === 0) {
      return (
        <p className="text-center text-gray-500 italic py-8">
          No packages added yet. Start scanning!
        </p>
      );
    }

    return (
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow: VirtualItem) => {
          const row = flatRows[virtualRow.index];
          const style = {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
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
  };

  return (
    <div className="mb-8">
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
        />
      </div>

      {/* **THE FIX:**
        - 'max-h-[60vh]' (Mobile-first default)
        - 'md:max-h-[70vh]' (Allow it to be taller on medium+ screens)
      */}
      <div
        ref={scrollContainerRef}
        className="max-h-[60vh] md:max-h-[70vh] overflow-y-auto bg-gray-50 rounded-xl p-4 border border-gray-200"
      >
        {renderListContent()}
      </div>
    </div>
  );
};

export default PackageList;