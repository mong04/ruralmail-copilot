// src/features/package-management/components/PackageList.tsx
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../store';
import { type Package, type Stop } from '../../../db';
import { SwipeableList } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { PackageListItem } from './PackageListItem';
import { GroupHeader, type StopNoteType } from './GroupHeader';
import { Search } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

interface PackageListProps {
  packages: Package[]; // This is already the *filtered* list
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
}

/**
 * Helper to check route notes for keywords.
 */
const getNoteType = (notes: string | undefined): StopNoteType | null => {
  if (!notes) return null;
  const lowerNotes = notes.toLowerCase();
  if (lowerNotes.includes('vacant')) return 'vacant';
  if (lowerNotes.includes('forward')) return 'forward';
  if (lowerNotes.trim().length > 0) return 'note';
  return null;
};

// This is the new data structure for our list
interface GroupedStop {
  stopIndex: number;
  stop: Stop | null; // null for "Unassigned"
  packages: Package[];
  noteType: StopNoteType | null;
}

const PackageList: React.FC<PackageListProps> = ({
  packages,
  searchQuery,
  onSearchChange,
  onEdit,
  onDelete,
}) => {
  const route = useSelector((state: RootState) => state.route.route) as Stop[];

  // This logic now creates the groups for our cards
  const groupedStops = useMemo(() => {
    const groups: Record<number, GroupedStop> = {
      [-1]: {
        stopIndex: -1,
        stop: null,
        packages: [],
        noteType: null,
      },
    };

    // Initialize all route stops, even if they have 0 packages in the filtered list
    // This ensures cards are stable, though we will only show ones with packages.
    route.forEach((stop, index) => {
      groups[index] = {
        stopIndex: index,
        stop: stop,
        packages: [],
        noteType: getNoteType(stop.notes),
      };
    });

    // Populate packages into the groups
    for (const pkg of packages) {
      const stopIndex = pkg.assignedStopNumber ?? -1;
      if (groups[stopIndex]) {
        groups[stopIndex].packages.push(pkg);
      } else {
        // This case should not happen if route is loaded, but a good fallback
        groups[-1].packages.push(pkg);
      }
    }

    // Sort and filter: sort by stop index, and only show groups that have packages
    return Object.values(groups)
      .filter((group) => group.packages.length > 0)
      .sort((a, b) => a.stopIndex - b.stopIndex);
  }, [packages, route]);

  return (
    // ✅ NO MORE 'overflow-y-auto' or 'max-h'. This list just grows.
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Package ID, Address, or Notes..."
          className="w-full h-12 pl-10 pr-4 border-2 border-border rounded-xl bg-surface-muted focus:ring-2 focus:ring-brand focus:border-brand"
          aria-label="Search packages"
        />
        <Search className="absolute left-3 top-3.5 text-muted" size={20} />
      </div>

      {/* ✅ NEW: Card-based list */}
      <div className="space-y-4">
        {groupedStops.length > 0 ? (
          groupedStops.map(({ stopIndex, stop, packages, noteType }) => (
            <Card key={stopIndex} className="overflow-hidden shadow-sm">
              <GroupHeader
                title={stop ? `Stop ${stopIndex + 1}: ${stop.full_address}` : 'Unassigned'}
                count={packages.length}
                noteType={noteType}
              />
              <div className="divide-y divide-border">
                {packages.map((pkg) => (
                  // SwipeableList wraps each item, not the whole card
                  <SwipeableList key={pkg.id} destructiveCallbackDelay={300}>
                    <PackageListItem
                      pkg={pkg}
                      onEdit={() => onEdit(pkg)}
                      onDelete={() => onDelete(pkg)}
                      onSwipeStart={() => {}}
                      onSwipeEnd={() => {}}
                      style={{}} // Style is no longer needed here
                    />
                  </SwipeableList>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center text-muted p-10">
            {searchQuery
              ? 'No packages match your search.'
              : 'No packages for today. Tap "Scan" to add one!'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageList;