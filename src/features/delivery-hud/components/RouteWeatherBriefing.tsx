import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Sun, CloudSun, CloudDrizzle } from 'lucide-react';
import React from 'react';

// Define props interface
export interface RouteWeatherBriefingProps {
  briefingData: {
    isVisible: boolean;
    currentIcon: string;
    currentTemp: number;
    feelsLike: number;
    highTemp: number;
    precipSummary: string;
    activeAlert: { title?: string; details?: string };
  } | null;
  onDismiss: () => void;
}

// A map for icons, can be expanded
const iconMap: { [key: string]: React.ReactNode } = {
    Sun: <Sun className="w-16 h-16 text-yellow-400" />,
    CloudSun: <CloudSun className="w-16 h-16 text-yellow-400" />,
    CloudDrizzle: <CloudDrizzle className="text-blue-400" />,
};


export const RouteWeatherBriefing = ({ briefingData, onDismiss }: RouteWeatherBriefingProps) => {

  return (
    <AnimatePresence>
        {briefingData && briefingData.isVisible && (
            <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="viewport-above-nav z-50 bg-surface/90 flex items-end"
          >
            <div className="bg-surface w-full rounded-t-lg p-4 max-w-3xl mx-auto">
              {briefingData.activeAlert.title && (
                <div className="bg-danger rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="text-surface-foreground" />
                  <p className="text-surface-foreground font-bold uppercase">{briefingData.activeAlert.title}</p>
                </div>
              )}

              <h2 className="text-surface-foreground font-bold text-2xl mt-4">Route Weather Briefing</h2>

              <div className="bg-surface-muted rounded-lg p-4 mt-4">
                <div className="flex items-center gap-4">
                  {iconMap[briefingData.currentIcon] || <Sun className="w-16 h-16 text-yellow-400" />}
                  <div>
                    <p className="text-surface-foreground font-bold text-5xl">{Math.round(briefingData.currentTemp)}°F</p>
                    <p className="text-muted-foreground text-lg">Feels Like: {Math.round(briefingData.feelsLike)}°F</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-muted rounded-lg p-4 mt-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {iconMap['CloudDrizzle']}
                  <p className="text-surface-foreground text-lg">{briefingData.precipSummary}</p>
                </div>
                <p className="text-muted-foreground">High: {Math.round(briefingData.highTemp)}°</p>
              </div>

              {briefingData.activeAlert.title && (
                <div className="bg-surface-muted rounded-lg p-4 mt-4 border-2 border-danger">
                  <h3 className="text-surface-foreground font-bold uppercase">{briefingData.activeAlert.title}</h3>
                  <p className="text-muted-foreground mt-2 truncate">{briefingData.activeAlert.details}</p>
                </div>
              )}

              <div className="mt-6 pb-4">
                <button
                  onClick={onDismiss}
                  className="w-full btn-success transition-colors rounded-lg p-4 font-bold uppercase text-lg"
                >
                  START ROUTE
                </button>
              </div>
            </div>
          </motion.div>
        )}
    </AnimatePresence>
  );
};