import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../store';
import { type Package, type Stop } from '../../../../db';
import { StopCard } from './StopCard'; 
import { Box } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '../../../../lib/utils';

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
    <div className="flex flex-col pt-4 px-4 sm:px-6 space-y-4">
      <AnimatePresence initial={false}>
        {groupedStops.map(({ stopIndex, stop, packages }) => {
            // Unique key ensures full re-render if package count changes, 
            // fixing potential swipe-action glitches or badge count staleness.
            const signature = `${stopIndex}-${packages.length}-${packages.map(p=>p.id).join('')}`;
            
            return (
                <StopCard 
                    key={signature}
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
        <div className="flex flex-col items-center justify-center pt-32 text-muted-foreground opacity-60">
            <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mb-4 border-2 border-dashed",
                "bg-surface-muted border-border"
            )}>
                <Box size={40} className="text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tracking-tight">Manifest Empty</p>
            <p className="text-sm">Load packages to begin.</p>
        </div>
      )}
    </div>
  );
};

export default PackageList;