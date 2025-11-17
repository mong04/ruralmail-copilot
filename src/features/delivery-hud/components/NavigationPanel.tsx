import React from 'react';
import { useAppSelector } from '../../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, CornerUpLeft, CornerUpRight, MapPin } from 'lucide-react';

/**
 * Renders a maneuver icon based on the step's type and modifier.
 */
const ManeuverIcon: React.FC<{ type?: string; modifier?: string }> = ({ type, modifier }) => {
  switch (type) {
    case 'turn':
    case 'fork':
    case 'off ramp':
      if (modifier?.includes('left')) return <CornerUpLeft className="h-8 w-8" />;
      if (modifier?.includes('right')) return <CornerUpRight className="h-8 w-8" />;
      break;
    case 'arrive':
      return <MapPin className="h-8 w-8 text-brand" />;
    default:
      return <ArrowUp className="h-8 w-8" />;
  }
  return <ArrowUp className="h-8 w-8" />;
};

/**
 * Formats a distance in meters into a user-friendly imperial unit string (miles or feet).
 * @param distanceInMeters The distance in meters from the API.
 * @returns A formatted string, e.g., "1.2 mi" or "500 ft".
 */
const formatDistance = (distanceInMeters: number): string => {
  const distanceInMiles = distanceInMeters / 1609.34;

  // If the distance is a quarter mile or more, display it in miles.
  if (distanceInMiles >= 0.25) {
    return `${distanceInMiles.toFixed(1)} mi`;
  }

  // Otherwise, convert to feet and round to the nearest 10 for a cleaner display.
  const distanceInFeet = distanceInMeters * 3.28084;
  const roundedFeet = Math.round(distanceInFeet / 10) * 10;
  return `${roundedFeet} ft`;
};

/**
 * A UI component that displays the current turn-by-turn navigation instruction.
 * It appears when navigation is active and shows the maneuver, instruction, and distance.
 */
const NavigationPanel: React.FC = () => {
  const { navigationData, isNavigating, navigationStepIndex } = useAppSelector((state) => state.hud);

  const currentStep = isNavigating && navigationData ? navigationData.steps[navigationStepIndex] : null;

  return (
    <AnimatePresence>
      {currentStep && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          // Removed width constraints to allow the panel to fit its content.
          className="max-w-sm" // Keep a max-width for very long instructions
        >
          <div className="bg-surface/90 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center gap-4 border border-border">
            <div className="flex-shrink-0">
              <ManeuverIcon type={currentStep.maneuver.type} modifier={currentStep.maneuver.modifier} />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-bold text-lg truncate">{currentStep.maneuver.instruction}</p>
              <p className="text-muted-foreground">
                in {formatDistance(currentStep.distance)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavigationPanel;