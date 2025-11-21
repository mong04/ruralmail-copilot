import React, { useState, useMemo } from 'react';
import { type Package, type Stop } from '../../../../db';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Box, Mail, Home, AlertCircle } from 'lucide-react';
import { formatAddressForDisplay } from '../../../../utils/addressFormat';
import { PackageListItem } from './PackageListItem';
import { Badge } from '../../../../components/ui/Badge'; 
import { Card } from '../../../../components/ui/Card';   
import { cn } from '../../../../lib/utils';

interface StopCardProps {
  stopIndex: number;
  stop: Stop | null;
  packages: Package[];
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
  onAddAtStop: (data: Partial<Package>) => void;
}

export const StopCard: React.FC<StopCardProps> = ({
  stopIndex,
  stop,
  packages,
  onEdit,
  onDelete,
  onAddAtStop,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isUnassigned = stopIndex === -1;
  const rawAddress = stop?.full_address || "Unassigned / Unknown";
  const { number, street } = formatAddressForDisplay(rawAddress);

  // 1. Calculate Summary Counters
  const summary = useMemo(() => {
    const stats = { small: 0, medium: 0, large: 0, heavy: 0 };
    packages.forEach(p => {
        if (p.size === 'small') stats.small++;
        else if (p.size === 'large') stats.large++;
        else stats.medium++;
        if (p.notes?.toLowerCase().includes('heavy')) stats.heavy++;
    });
    return stats;
  }, [packages]);

  // 2. ✅ MAGICAL SORTING: Group by Size (Small -> Medium -> Large)
  // This creates visual order without needing extra clicks.
  const sortedPackages = useMemo(() => {
    const sizeWeight = { small: 1, medium: 2, large: 3 };
    return [...packages].sort((a, b) => {
        const weightA = sizeWeight[a.size] || 2;
        const weightB = sizeWeight[b.size] || 2;
        return weightA - weightB;
    });
  }, [packages]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4" 
    >
      <Card className="overflow-hidden shadow-sm border border-border bg-surface">
        
        {/* HEADER */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center gap-4 bg-surface hover:bg-surface-muted/50 transition-colors text-left relative z-10"
        >
          {/* STOP BADGE */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm font-bold text-lg border border-border/50",
            isUnassigned ? "bg-surface-muted text-muted-foreground" : "bg-brand text-brand-foreground"
          )}>
            <span>{isUnassigned ? '?' : stopIndex + 1}</span>
          </div>

          {/* INFO & CARGO */}
          <div className="flex-1 min-w-0">
             <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-xl font-black text-foreground leading-none">{number}</span>
                <span className="text-base font-semibold text-foreground/80 truncate leading-none">{street}</span>
             </div>

             {/* REAL-TIME CARGO CLUSTER */}
             <div className="flex items-center gap-2 flex-wrap">
                {summary.small > 0 && (
                   <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 border-transparent">
                      <Mail size={12} /> {summary.small}
                   </Badge>
                )}
                {summary.medium > 0 && (
                   <Badge className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 border-transparent">
                      <Box size={12} /> {summary.medium}
                   </Badge>
                )}
                {summary.large > 0 && (
                   <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 border-transparent">
                      <Home size={12} /> {summary.large}
                   </Badge>
                )}
                
                {packages.length === 0 && <span className="text-xs text-muted">Empty stop</span>}
             </div>
          </div>

          <div className="text-muted-foreground/50">
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                  <ChevronDown size={20} />
              </motion.div>
          </div>
          
          {stop?.notes && (
              <div className="absolute top-0 right-0 p-1">
                  <div className="w-2 h-2 rounded-full bg-warning border border-surface" />
              </div>
          )}
        </button>

        {/* DRAWER CONTENT */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border bg-surface-muted/30"
            >
               {stop?.notes && (
                   <div className="px-4 py-2 bg-warning/10 text-warning text-xs font-semibold flex items-center gap-2 border-b border-warning/20">
                       <AlertCircle size={12} />
                       Stop Note: {stop.notes}
                   </div>
               )}

               {/* Use the SORTED packages list here */}
               <AnimatePresence initial={false} mode='popLayout'>
                 {sortedPackages.map((pkg, idx) => (
                   <motion.div
                      key={pkg.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                   >
                     <PackageListItem
                       pkg={pkg}
                       onEdit={() => onEdit(pkg)}
                       onDelete={() => onDelete(pkg)}
                       isLast={idx === sortedPackages.length - 1}
                     />
                   </motion.div>
                 ))}
               </AnimatePresence>

               <div className="p-2 flex justify-center border-t border-border/30 bg-surface-muted/30">
                  <button 
                      onClick={() => onAddAtStop({ 
                          assignedStopId: stop?.id, 
                          assignedStopNumber: stopIndex,
                          assignedAddress: stop?.full_address 
                      })}
                      className="flex items-center gap-2 text-xs font-bold text-brand py-2 px-6 bg-brand/5 hover:bg-brand/15 rounded-full transition-all active:scale-95"
                  >
                      <span>+</span> Add another here
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};