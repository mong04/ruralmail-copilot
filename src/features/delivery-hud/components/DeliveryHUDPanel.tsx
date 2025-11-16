// src/features/delivery-hud/components/DeliveryHUDPanel.tsx
import React from 'react'; // ✅ Import React to use forwardRef
import { motion } from 'framer-motion';
import { type Package, type Stop } from '../../../db';
import { MapPin, Check, X } from 'lucide-react';

interface HUDProps {
  currentStop: number;
  route: Stop[]; // filtered activeStops
  fullRoute: Stop[];
  packages: Package[];
  weatherAlerts: string[];
  onAdvanceStop: () => void;
  onNavigate: () => void;
  onExit: () => void;
}

const DeliveryHUDPanel = React.forwardRef<HTMLDivElement, HUDProps>(
  (
    {
      currentStop,
      route,
      fullRoute,
      packages,
      weatherAlerts,
      onAdvanceStop,
      onNavigate,
      onExit,
    },
    ref
  ) => {
    const currentStopObj = route[currentStop];

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
            <button
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
    // ✅ Robust package filtering
    const pkgs = packages.filter(
      (p) =>
        !p.delivered && // Only show undelivered packages
        (p.assignedStopId === currentStopId ||
          (typeof p.assignedStopNumber === 'number' &&
            fullRoute[p.assignedStopNumber]?.id === currentStopId))
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
        <h2 className="text-xl font-bold mb-2">
          {currentStopObj.full_address}
        </h2>

        <p className="mb-2">
          Packages: {pkgs.length}
          {packageDetails.length > 0 ? ` (${packageDetails.join(', ')})` : ''}
        </p>

        <p className="mb-2 text-danger">
          {weatherAlerts.length > 0 ? weatherAlerts.join(', ') : 'No alerts'}
        </p>

        {/* ✅ Updated button layout */}
        <div className="flex justify-between mt-4 gap-2">
          <button
            onClick={onExit}
            className="h-12 px-4 rounded-xl bg-surface text-danger-foreground border border-border hover:bg-surface-muted shrink-0 flex items-center gap-2"
          >
            <X size={18} className="text-danger" />
          </button>

          <button
            onClick={onNavigate}
            className="h-12 px-5 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 focus:ring-2 focus:ring-brand flex-1 flex items-center justify-center gap-2"
          >
            <MapPin size={18} />
            Navigate
          </button>

          <button
            onClick={onAdvanceStop}
            className="h-12 px-5 rounded-xl bg-success text-success-foreground hover:bg-success/90 focus:ring-2 focus:ring-success flex-1 flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Delivered
          </button>
        </div>
      </motion.div>
    );
  }
);

export default DeliveryHUDPanel;