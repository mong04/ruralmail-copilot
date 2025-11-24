import React from 'react';
import { useAppSelector } from '../../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, CornerUpLeft, CornerUpRight, MapPin, Navigation2 } from 'lucide-react';

const ManeuverIcon: React.FC<{ type?: string; modifier?: string }> = ({ type, modifier }) => {
  const className = "h-10 w-10 text-foreground"; // Unified size/color
  
  switch (type) {
    case 'turn':
    case 'fork':
    case 'off ramp':
      if (modifier?.includes('left')) return <CornerUpLeft className={className} />;
      if (modifier?.includes('right')) return <CornerUpRight className={className} />;
      break;
    case 'arrive':
      return <MapPin className="h-10 w-10 text-brand" />; // Special color for arrival
    default:
      return <ArrowUp className={className} />;
  }
  return <Navigation2 className={className} />;
};

const formatDistance = (distanceInMeters: number): string => {
  const distanceInMiles = distanceInMeters / 1609.34;
  if (distanceInMiles >= 0.25) return `${distanceInMiles.toFixed(1)} mi`;
  const distanceInFeet = distanceInMeters * 3.28084;
  return `${Math.round(distanceInFeet / 10) * 10} ft`;
};

const NavigationPanel: React.FC = () => {
  const { navigationData, isNavigating, navigationStepIndex } = useAppSelector((state) => state.hud);
  const currentStep = isNavigating && navigationData ? navigationData.steps[navigationStepIndex] : null;

  return (
    <AnimatePresence>
      {currentStep && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-[90vw] sm:max-w-sm mx-auto"
        >
          {/* Theme-aware container: Explicit bg-surface and text-foreground */}
          <div className="bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 flex items-center gap-5 border-2 border-brand/50 relative overflow-hidden">
            
            {/* Progress Bar Background (Optional flair) */}
            <div className="absolute bottom-0 left-0 h-1 bg-brand/20 w-full">
               <div className="h-full bg-brand w-1/3 animate-pulse" />
            </div>

            <div className="shrink-0 p-3 bg-surface-muted rounded-xl border border-border">
              <ManeuverIcon type={currentStep.maneuver.type} modifier={currentStep.maneuver.modifier} />
            </div>
            
            <div className="grow min-w-0">
              <p className="font-black text-2xl text-foreground leading-none mb-1">
                {formatDistance(currentStep.distance)}
              </p>
              <p className="text-muted-foreground font-medium truncate text-lg">
                {currentStep.maneuver.instruction}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavigationPanel;