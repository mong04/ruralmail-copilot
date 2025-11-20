// src/features/delivery-hud/components/DeliveryHUDPanel.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { type Package, type Stop } from '../../../db';
import { Check, X, ChevronRight, ChevronLeft, Navigation } from 'lucide-react';
import { DynamicHudAlert, type DynamicHudAlertProps } from './DynamicHudAlert';

interface HUDProps {
  currentStop: number;
  route: Stop[]; // filtered activeStops
  fullRoute: Stop[];
  packages: Package[];
  isNavigating: boolean;
  hudAlertData: DynamicHudAlertProps['hudAlertData']; // Use the prop type from the component
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

    // If no stop exists, show "End of Route"
    if (!currentStopObj) {
      return (
        <motion.div
          ref={ref}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bottom-0 left-0 right-0 z-10 p-4 bg-surface rounded-t-xl shadow-lg border-border"
        >
          <h2 className="text-xl font-bold mb-2">End of Route</h2>
          <p className="mb-2">No more stops to display.</p>
          <div className="flex justify-end mt-4 gap-2">
            <button // Re-using button style from main view for consistency
              onClick={onExit}
              className="h-11 px-4 rounded-xl bg-danger text-danger-foreground hover:bg-danger/90 focus:ring-2 focus:ring-danger flex items-center gap-2"
            >
              <X size={18} />
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
        (p.assignedStopId === currentStopId ||  // ← Primary: UUID match (always correct)
          (!p.assignedStopId && typeof p.assignedStopNumber === 'number' && fullRoute[p.assignedStopNumber]?.id === currentStopId)) // ← Legacy fallback only if no UUID
    );

    const counts: Record<Package['size'], number> = {
      small: 0,
      medium: 0,
      large: 0,
    };
    pkgs.forEach((p) => {
      counts[p.size] = (counts[p.size] ?? 0) + 1;
    });

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
        className="bottom-0 left-0 right-0 z-10 p-4 bg-surface rounded-t-xl shadow-lg border border-border"
      >
        {/* Top Row: Stop Info & Alerts */}
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-1 truncate">{currentStopObj.full_address}</h2>
            <p className="text-sm text-muted-foreground">
              Packages: {pkgs.length}
              {packageDetails.length > 0 ? ` (${packageDetails.join(', ')})` : ''}
            </p>
          </div>
          <div className="shrink-0 ml-2 pt-1">
            <DynamicHudAlert hudAlertData={hudAlertData} />
          </div>
        </div>

        {/* Bottom Row: Action Buttons */}
        <div className="flex items-center mt-4 gap-2">
          <button
            onClick={onExit}
            className="h-12 w-12 rounded-xl bg-surface text-foreground border border-border hover:bg-surface-muted shrink-0 flex items-center justify-center"
            aria-label="Exit Delivery"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex-1 grid grid-cols-2 gap-2">
            {isNavigating ? (
              <button
                onClick={onStopNavigation}
                className="h-12 px-5 rounded-xl bg-danger text-danger-foreground hover:bg-danger/90 focus:ring-2 focus:ring-danger flex items-center justify-center gap-2"
              >
                <X size={18} />
                Stop Nav
              </button>
            ) : (
              <button
                onClick={onNavigate}
                className="h-12 px-5 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 focus:ring-2 focus:ring-brand flex items-center justify-center gap-2"
              >
                <Navigation size={18} />
                Navigate
              </button>
            )}
            <button
              onClick={onMarkDelivered}
              className="h-12 px-5 rounded-xl bg-success text-success-foreground hover:bg-success/90 focus:ring-2 focus:ring-success flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Delivered
            </button>
          </div>

          <button
            onClick={onAdvanceStop}
            className="h-12 w-12 rounded-xl bg-surface text-foreground border border-border hover:bg-surface-muted shrink-0 flex items-center justify-center"
            aria-label="Next Stop"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </motion.div>
    );
  }
);

export default DeliveryHUDPanel;
