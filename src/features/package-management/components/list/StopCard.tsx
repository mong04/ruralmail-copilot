import React, { useState, useMemo } from 'react';
import { type Package, type Stop } from '../../../../db'; // Adjust imports based on file location!
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mb-4" 
    >
      {/* Added: border-border to ensure visibility on all backgrounds */}
      <Card className="overflow-hidden shadow-sm border border-border bg-surface group">
        
        {/* HEADER */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center gap-4 bg-surface hover:bg-surface-muted/50 transition-colors text-left relative z-10"
        >
          {/* STOP BADGE */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm font-bold text-lg border",
            isUnassigned 
                ? "bg-surface-muted text-muted-foreground border-border" 
                : "bg-brand text-brand-foreground border-brand/50 shadow-brand/20"
          )}>
            <span>{isUnassigned ? '?' : stopIndex + 1}</span>
          </div>

          {/* INFO & CARGO */}
          <div className="flex-1 min-w-0">
             <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-xl font-black text-foreground leading-none tracking-tight">{number}</span>
                <span className="text-sm font-semibold text-muted-foreground truncate leading-none">{street}</span>
             </div>

             {/* CARGO CLUSTER */}
             <div className="flex items-center gap-2 flex-wrap">
                 {summary.small > 0 && (
                   <Badge className="gap-1.5 badge-info border-transparent px-2 py-0.5">
                     <Mail size={12} /> {summary.small}
                   </Badge>
                 )}
                 {summary.medium > 0 && (
                   <Badge className="gap-1.5 badge-warning border-transparent px-2 py-0.5">
                     <Box size={12} /> {summary.medium}
                   </Badge>
                 )}
                 {summary.large > 0 && (
                   <Badge className="gap-1.5 badge-danger border-transparent px-2 py-0.5">
                     <Home size={12} /> {summary.large}
                   </Badge>
                 )}
                {packages.length === 0 && <span className="text-xs text-muted">Empty stop</span>}
             </div>
          </div>

          {/* CHEVRON */}
          <div className="text-muted-foreground/40 group-hover:text-foreground/70 transition-colors">
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                  <ChevronDown size={20} />
              </motion.div>
          </div>
          
          {/* Warning Dot */}
          {stop?.notes && (
              <div className="absolute top-3 right-3 p-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 border border-surface shadow-sm" />
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
                   <div className="px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wide flex items-center gap-2 border-b border-amber-500/20">
                       <AlertCircle size={12} />
                       {stop.notes}
                   </div>
               )}

               <AnimatePresence initial={false} mode='popLayout'>
                 {packages.map((pkg, idx) => (
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
                       isLast={idx === packages.length - 1}
                     />
                   </motion.div>
                 ))}
               </AnimatePresence>

                 <div className="p-3 flex justify-center border-t border-border/30 bg-surface-muted/50">
                  <button 
                    onClick={() => onAddAtStop({ 
                      assignedStopId: stop?.id, 
                      assignedStopNumber: stopIndex,
                      assignedAddress: stop?.full_address 
                    })}
                    className="flex items-center gap-2 text-xs font-bold btn-primary py-2 px-6 rounded-full transition-all active:scale-95 border border-brand/10"
                  >
                    <span>+</span> Add Package
                  </button>
                 </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};