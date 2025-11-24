import React from 'react';
import { motion } from 'framer-motion';
import { type Package, type Stop } from '../../../db';
import { Check, X, ChevronRight, ChevronLeft, Navigation } from 'lucide-react';
import { DynamicHudAlert, type DynamicHudAlertProps } from './DynamicHudAlert';

interface HUDProps {
  currentStop: number;
  route: Stop[];
  fullRoute: Stop[];
  packages: Package[];
  isNavigating: boolean;
  hudAlertData: DynamicHudAlertProps['hudAlertData'];
  onAdvanceStop: () => void;
  onMarkDelivered: () => void;
  onNavigate: () => void;
  onExit: () => void;
  onStopNavigation: () => void;
}

const DeliveryHUDPanel = React.forwardRef<HTMLDivElement, HUDProps>(
  (
    {
      currentStop,
      route,
      fullRoute,
      packages,
      isNavigating,
      hudAlertData,
      onAdvanceStop,
      onMarkDelivered,
      onNavigate,
      onExit,
      onStopNavigation,
    },
    ref
  ) => {
    const currentStopObj: Stop | undefined = route[currentStop] ?? fullRoute.find(s => s.id === route[currentStop]?.id);

    if (!currentStopObj) {
      return (
        <motion.div
          ref={ref}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          // Opaque bg-surface, no top radius, border top for separation
          className="bottom-0 left-0 right-0 z-10 p-4 bg-surface border-t border-border text-foreground shadow-2xl"
        >
          <h2 className="text-xl font-bold mb-2">End of Route</h2>
          <p className="mb-4 text-muted-foreground">No more stops to display.</p>
          <div className="flex justify-end gap-2">
            <button 
              onClick={onExit}
              className="h-12 px-6 rounded-xl bg-danger text-danger-foreground hover:bg-danger/90 font-semibold flex items-center gap-2 transition-all"
            >
              <X size={20} />
              Exit
            </button>
          </div>
        </motion.div>
      );
    }

    const currentStopId = currentStopObj.id;
    const pkgs = packages.filter(
      (p) =>
        !p.delivered &&
        (p.assignedStopId === currentStopId ||
          (!p.assignedStopId && typeof p.assignedStopNumber === 'number' && fullRoute[p.assignedStopNumber]?.id === currentStopId))
    );

    const counts: Record<Package['size'], number> = { small: 0, medium: 0, large: 0 };
    pkgs.forEach((p) => { counts[p.size] = (counts[p.size] ?? 0) + 1; });

    const packageDetails: string[] = [];
    if (counts.large > 0) packageDetails.push(`${counts.large} Large`);
    if (counts.medium > 0) packageDetails.push(`${counts.medium} Medium`);
    if (counts.small > 0) packageDetails.push(`${counts.small} Small`);

    return (
      <motion.div
        ref={ref}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        // Solid opaque surface background, square top
        className="bottom-0 left-0 right-0 z-10 p-4 bg-surface border-t border-border text-foreground shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-2xl font-black tracking-tight truncate text-foreground">
              {currentStopObj.address_line1}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <span className="bg-surface-muted px-2 py-0.5 rounded text-foreground border border-border">
                Stop {route.findIndex(s => s.id === currentStopObj.id) + 1}
              </span>
              <span>•</span>
              <span>{pkgs.length} pkg{pkgs.length !== 1 && 's'}</span>
              {packageDetails.length > 0 && <span className="opacity-75">({packageDetails.join(', ')})</span>}
            </div>
          </div>
          
          <div className="shrink-0 pt-1">
            <DynamicHudAlert hudAlertData={hudAlertData} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="h-14 w-14 rounded-xl bg-surface-muted hover:bg-surface-muted/80 text-muted-foreground border border-border shrink-0 flex items-center justify-center transition-colors"
            aria-label="Exit Delivery"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="flex-1 grid grid-cols-2 gap-3">
            {isNavigating ? (
              <button
                onClick={onStopNavigation}
                className="h-14 px-4 rounded-xl bg-danger text-danger-foreground hover:bg-danger/90 font-bold text-lg shadow-lg shadow-danger/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <X size={20} />
                Stop Nav
              </button>
            ) : (
              <button
                onClick={onNavigate}
                className="h-14 px-4 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-bold text-lg shadow-lg shadow-brand/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Navigation size={20} />
                Navigate
              </button>
            )}
            
            <button
              onClick={onMarkDelivered}
              className="h-14 px-4 rounded-xl bg-success text-success-foreground hover:bg-success/90 font-bold text-lg shadow-lg shadow-success/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Check size={22} strokeWidth={3} />
              Deliver
            </button>
          </div>

          <button
            onClick={onAdvanceStop}
            className="h-14 w-14 rounded-xl bg-surface-muted hover:bg-surface-muted/80 text-foreground border border-border shrink-0 flex items-center justify-center transition-colors"
            aria-label="Next Stop"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </motion.div>
    );
  }
);

export default DeliveryHUDPanel;