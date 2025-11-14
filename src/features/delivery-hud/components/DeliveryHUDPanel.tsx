// src/features/delivery-hud/components/DeliveryHUDPanel.tsx
import React from "react";
import { motion } from "framer-motion";
import { type Package, type Stop } from "../../../db";

interface HUDProps {
  currentStop: number;
  route: Stop[];          // filtered activeStops
  packages: Package[];
  weatherAlerts: string[];
  onAdvanceStop: () => void;
  onExit: () => void;
}

const DeliveryHUDPanel: React.FC<HUDProps> = ({
  currentStop,
  route,
  packages,
  weatherAlerts,
  onAdvanceStop,
  onExit,
}) => {
  const currentStopObj = route[currentStop];

  // If no stop exists, show "End of Route" and hide package info
  if (!currentStopObj) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-surface rounded-t-xl shadow-lg border border-border"
      >
        <h2 className="text-xl font-bold mb-2">End of Route</h2>
        <p className="mb-2">No more stops to display.</p>
        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={onExit}
            className="h-11 px-4 rounded-xl bg-danger text-danger-foreground hover:bg-danger/90 focus:ring-2 focus:ring-danger"
          >
            Exit
          </button>
        </div>
      </motion.div>
    );
  }

  const currentStopId = currentStopObj.id;
  const pkgs = packages.filter(
    (p) =>
      p.assignedStopId === currentStopId ||
      (typeof p.assignedStopNumber === "number" &&
        route[p.assignedStopNumber]?.id === currentStopId)
  );

  const counts: Record<Package["size"], number> = { small: 0, medium: 0, large: 0 };
  pkgs.forEach((p) => {
    counts[p.size] = (counts[p.size] ?? 0) + 1;
  });

  const packageDetails: string[] = [];
  if (counts.large > 0) packageDetails.push(`${counts.large} Large`);
  if (counts.medium > 0) packageDetails.push(`${counts.medium} Medium`);
  if (counts.small > 0) packageDetails.push(`${counts.small} Small`);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-surface rounded-t-xl shadow-lg border border-border"
    >
      <h2 className="text-xl font-bold mb-2">{currentStopObj.full_address}</h2>

      <p className="mb-2">
        Packages: {pkgs.length}
        {packageDetails.length > 0 ? ` (${packageDetails.join(", ")})` : ""}
      </p>

      <p className="mb-2 text-danger">
        {weatherAlerts.length > 0 ? weatherAlerts.join(", ") : "No alerts"}
      </p>

      <div className="flex justify-between mt-4 gap-2">
        <button
          onClick={onAdvanceStop}
          className="h-11 px-4 rounded-xl bg-success text-success-foreground hover:bg-success/90 focus:ring-2 focus:ring-success"
        >
          Mark Delivered
        </button>

        <button
          onClick={onExit}
          className="h-11 px-4 rounded-xl bg-danger text-danger-foreground hover:bg-danger/90 focus:ring-2 focus:ring-danger"
        >
          Exit
        </button>
      </div>
    </motion.div>
  );
};

export default DeliveryHUDPanel;
