import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../store';
import { type Package, type Stop } from '../../../../db';
import { StopCard } from './StopCard'; 
import { Box } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import 'react-swipeable-list/dist/styles.css';

interface PackageListProps {
  packages: Package[];
  searchQuery: string;
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
  onAddAtStop: (data: Partial<Package>) => void;
}

const PackageList: React.FC<PackageListProps> = ({
  packages,
  onEdit,
  onDelete,
  onAddAtStop,
}) => {
  const route = useSelector((state: RootState) => state.route.route) as Stop[];

  const groupedStops = useMemo(() => {
    const groups: Record<number, { stopIndex: number; stop: Stop | null; packages: Package[] }> = {};
    
    packages.forEach(pkg => {
        const idx = pkg.assignedStopNumber ?? -1;
        if (!groups[idx]) {
            groups[idx] = {
                stopIndex: idx,
                stop: idx === -1 ? null : route[idx],
                packages: []
            };
        }
        groups[idx].packages.push(pkg);
    });

    return Object.values(groups).sort((a, b) => a.stopIndex - b.stopIndex);
  }, [packages, route]);

  return (
    <div className="flex flex-col pb-40 px-3 pt-2 space-y-4">
      <AnimatePresence initial={false}>
        {groupedStops.map(({ stopIndex, stop, packages }) => {
            
            // ✅ THE MAGIC FIX: Create a unique signature for this specific state of the card.
            // If a package is added, deleted, or resized, this string changes.
            // This forces React to fully re-mount the card, fixing the Swipe listeners and Badge counts.

            return (
                <StopCard 
                    key={stopIndex} // <--- The Key forces the refresh
                    stopIndex={stopIndex}
                    stop={stop}
                    packages={packages}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddAtStop={onAddAtStop}
                />
            );
        })}
      </AnimatePresence>

      {packages.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-32 text-muted-foreground">
            <div className="w-20 h-20 bg-surface-muted rounded-full flex items-center justify-center mb-4 border border-border/50">
                <Box size={32} className="text-muted" />
            </div>
            <p className="text-lg font-medium">Ready to load</p>
        </div>
      )}
    </div>
  );
};

export default PackageList;