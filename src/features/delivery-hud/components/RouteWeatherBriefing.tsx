import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Sun, CloudSun, CloudDrizzle, X } from 'lucide-react';
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
    Sun: <Sun className="w-16 h-16 text-yellow-500 dark:text-yellow-400" />,
    CloudSun: <CloudSun className="w-16 h-16 text-yellow-500 dark:text-yellow-400" />,
    CloudDrizzle: <CloudDrizzle className="w-16 h-16 text-blue-500 dark:text-blue-400" />,
};

export const RouteWeatherBriefing = ({ briefingData, onDismiss }: RouteWeatherBriefingProps) => {

  return (
    <AnimatePresence>
        {briefingData && briefingData.isVisible && (
          <>
            {/* Backdrop for better focus */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onDismiss}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center pointer-events-none p-0 md:p-4"
            >
                <div className="pointer-events-auto w-full max-w-3xl bg-white dark:bg-gray-950 rounded-t-2xl md:rounded-2xl shadow-2xl border-t md:border border-gray-200 dark:border-gray-800 overflow-hidden">
                
                <div className="p-6">
                    {/* Header / Alert Section */}
                    {briefingData.activeAlert.title && (
                        <div className="bg-red-500 dark:bg-red-600 rounded-lg p-3 flex items-center gap-2 mb-4 text-white shadow-sm">
                            <AlertTriangle className="text-white h-5 w-5" />
                            <p className="font-bold uppercase tracking-wide text-sm">{briefingData.activeAlert.title}</p>
                        </div>
                    )}

                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Route Weather Briefing</h2>
                        <button 
                            onClick={onDismiss}
                            className="p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mt-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-6">
                            {iconMap[briefingData.currentIcon] || <Sun className="w-16 h-16 text-yellow-500 dark:text-yellow-400" />}
                            <div>
                                <p className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    {Math.round(briefingData.currentTemp)}°F
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mt-1">
                                    Feels Like: {Math.round(briefingData.feelsLike)}°F
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mt-4 border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <CloudDrizzle className="w-6 h-6 text-blue-500 dark:text-blue-400"/>
                            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">{briefingData.precipSummary}</p>
                        </div>
                        <div className="text-right">
                             <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider block">High</span>
                             <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(briefingData.highTemp)}°</span>
                        </div>
                    </div>

                    {briefingData.activeAlert.title && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mt-4 border border-red-200 dark:border-red-800/50">
                            <h3 className="text-red-700 dark:text-red-300 font-bold uppercase text-sm tracking-wide">
                                {briefingData.activeAlert.title}
                            </h3>
                            <p className="text-red-600 dark:text-red-200 mt-1 text-sm truncate">
                                {briefingData.activeAlert.details}
                            </p>
                        </div>
                    )}

                    <div className="mt-6 md:mt-8 pb-4 md:pb-0">
                        <button
                        onClick={onDismiss}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 font-bold uppercase text-lg tracking-wide transition-all shadow-lg shadow-green-900/10 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                        >
                        START ROUTE
                        </button>
                    </div>
                </div>
                </div>
            </motion.div>
          </>
        )}
    </AnimatePresence>
  );
};