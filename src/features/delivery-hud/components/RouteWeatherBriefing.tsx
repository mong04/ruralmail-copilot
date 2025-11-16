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
    activeAlert: {
      title?: string;
      details?: string;
    };
  } | null;
  onDismiss: () => void;
}

// A map for icons, can be expanded
const iconMap: { [key: string]: React.ReactNode } = {
    Sun: <Sun className="w-16 h-16 text-yellow-400" />,
    CloudSun: <CloudSun className="w-16 h-16 text-yellow-400" />,
    CloudDrizzle: <CloudDrizzle className="text-blue-400" />,
    // ... add other icons based on weather conditions
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
            className="fixed inset-0 z-50 bg-black/90 flex items-end"
          >
            <div className="bg-gray-900 w-full rounded-t-lg p-4 max-w-3xl mx-auto">
              {briefingData.activeAlert.title && (
                <div className="bg-red-600 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="text-white" />
                  <p className="text-white font-bold uppercase">{briefingData.activeAlert.title}</p>
                </div>
              )}
      
              <h2 className="text-white font-bold text-2xl mt-4">Route Weather Briefing</h2>
      
              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-4">
                  {iconMap[briefingData.currentIcon] || <Sun className="w-16 h-16 text-yellow-400" />}
                  <div>
                    <p className="text-white font-bold text-5xl">{Math.round(briefingData.currentTemp)}°F</p>
                    <p className="text-gray-300 text-lg">Feels Like: {Math.round(briefingData.feelsLike)}°F</p>
                  </div>
                </div>
              </div>
      
              <div className="bg-gray-800 rounded-lg p-4 mt-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {iconMap['CloudDrizzle']}
                  <p className="text-white text-lg">{briefingData.precipSummary}</p>
                </div>
                <p className="text-gray-300">High: {Math.round(briefingData.highTemp)}°</p>
              </div>
      
              {briefingData.activeAlert.title && (
                <div className="bg-gray-800 rounded-lg p-4 mt-4 border-2 border-red-600">
                  <h3 className="text-white font-bold uppercase">{briefingData.activeAlert.title}</h3>
                  <p className="text-gray-300 mt-2 truncate">{briefingData.activeAlert.details}</p>
                </div>
              )}
      
              <div className="mt-6 pb-4">
                <button
                  onClick={onDismiss}
                  className="w-full bg-green-500 hover:bg-green-600 transition-colors rounded-lg p-4 text-white font-bold uppercase text-lg"
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