import React, { useState, useMemo } from 'react';
import { type Package, type Stop } from '../../../../db';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Box, Mail, Home, AlertCircle, Plus } from 'lucide-react';
import { formatAddressForDisplay } from '../../../../utils/addressFormat';
import { PackageListItem } from './PackageListItem';
import { Badge } from '../../../../components/ui/Badge'; 
import { Card } from '../../../../components/ui/Card';   
import { cn } from '../../../../lib/utils';
import { useAppSelector } from '../../../../store';

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
  const theme = useAppSelector((state) => state.settings.theme);
  const isCyberpunk = theme === 'cyberpunk';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mb-2" 
    >
      <Card className="overflow-hidden bg-surface group shadow-sm hover:shadow-md transition-all duration-300">
        
        {/* HEADER - CLICKABLE AREA */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 sm:p-5 flex items-center gap-4 text-left relative z-10 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        >
          {/* 1. STOP BADGE (Number) */}
          <div className={cn(
            "w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm font-black text-xl border transition-all duration-300",
            isUnassigned 
                ? "bg-surface-muted text-muted-foreground border-border" 
                : isCyberpunk 
                    ? "bg-black border-brand text-brand shadow-[0_0_10px_rgba(0,240,255,0.2)]" 
                    : "bg-brand text-brand-foreground border-transparent shadow-brand/20"
          )}>
            <span>{isUnassigned ? '?' : stopIndex + 1}</span>
          </div>

          {/* 2. INFO & CARGO */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             {/* Address */}
             <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-black text-foreground leading-none tracking-tight">{number}</span>
                <span className="text-base font-semibold text-muted-foreground truncate leading-none">{street}</span>
             </div>

             {/* Cargo Badges */}
             <div className="flex items-center gap-2 flex-wrap">
                 {summary.small > 0 && (
                   <Badge variant="default" className="gap-1.5 px-2.5 py-1 text-xs">
                     <Mail size={14} /> {summary.small}
                   </Badge>
                 )}
                 {summary.medium > 0 && (
                   <Badge variant="warning" className="gap-1.5 px-2.5 py-1 text-xs">
                     <Box size={14} /> {summary.medium}
                   </Badge>
                 )}
                 {summary.large > 0 && (
                   <Badge variant="danger" className="gap-1.5 px-2.5 py-1 text-xs">
                     <Home size={14} /> {summary.large}
                   </Badge>
                 )}
                {packages.length === 0 && <span className="text-xs font-medium text-muted-foreground/60 italic">Empty stop</span>}
             </div>
          </div>

          {/* 3. CHEVRON */}
          <div className="text-muted-foreground/40 group-hover:text-foreground/70 transition-colors">
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                  <ChevronDown size={24} strokeWidth={3} />
              </motion.div>
          </div>
          
          {/* 4. WARNING DOT (Absolute) */}
          {stop?.notes && (
              <div className="absolute top-4 right-4">
                  <div className="w-3 h-3 rounded-full bg-warning border-2 border-surface shadow-sm animate-pulse" />
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
               {/* NOTES BANNER */}
               {stop?.notes && (
                   <div className="px-5 py-3 bg-warning/10 text-warning text-xs sm:text-sm font-bold uppercase tracking-wide flex items-center gap-2 border-b border-warning/20">
                       <AlertCircle size={16} />
                       {stop.notes}
                   </div>
               )}

               {/* PACKAGE LIST */}
               <div className="divide-y divide-border/40">
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
               </div>

                 {/* ADD BUTTON (Footer) */}
                 <div className="p-4 flex justify-center border-t border-border/30 bg-surface-muted/50">
                  <button 
                    onClick={() => onAddAtStop({ 
                      assignedStopId: stop?.id, 
                      assignedStopNumber: stopIndex,
                      assignedAddress: stop?.full_address 
                    })}
                    className={cn(
                        "flex items-center gap-2 text-sm font-bold py-3 px-8 rounded-xl transition-all active:scale-95 shadow-sm",
                        isCyberpunk 
                            ? "bg-black border border-brand text-brand hover:bg-brand/10" 
                            : "bg-surface border border-border text-foreground hover:bg-surface-muted"
                    )}
                  >
                    <Plus size={18} strokeWidth={3} /> Add Package Here
                  </button>
                 </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};