import { Sun, Cloud, CloudDrizzle, CloudSnow, AlertCircle, type LucideProps } from 'lucide-react';
import React from 'react';

// A map for icons
const iconMap: { [key: string]: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>> } = {
    Sun,
    Cloud,
    CloudDrizzle,
    CloudSnow,
};

interface LookAheadItem {
    temp: number;
    precip: number;
    icon: string;
    time: string;
}

export interface LookAheadWidgetProps {
  lookAheadData: {
    now: LookAheadItem;
    next_3h: LookAheadItem;
    next_6h: LookAheadItem;
  } | null,
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const LookAheadItemDisplay = ({ label, data }: { label: string; data: LookAheadItem }) => {
    const Icon = iconMap[data.icon] || Sun;
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-200">{label}:</span>
            <div className="flex items-center gap-1">
                <span className="text-white font-medium">{Math.round(data.temp)}°F</span>
                {data.precip > 0 && <span className="text-gray-300">({data.precip}%)</span>}
                <Icon className="w-4 h-4 text-white" />
            </div>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-600 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-600 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-600 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-600 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-600 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-600 rounded w-1/3 animate-pulse"></div>
        </div>
    </div>
);

export const LookAheadWidget = ({ lookAheadData, status }: LookAheadWidgetProps) => {
  const renderContent = () => {
    if (status === 'loading' || status === 'idle') {
      return <SkeletonLoader />;
    }

    if (status === 'failed') {
      return (
        <div className="flex items-center gap-2 text-yellow-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Weather data unavailable.</span>
        </div>
      );
    }

    if (status === 'succeeded' && lookAheadData) {
      return (
        <div className="space-y-1">
          <LookAheadItemDisplay label={lookAheadData.now.time} data={lookAheadData.now} />
          <LookAheadItemDisplay label={lookAheadData.next_3h.time} data={lookAheadData.next_3h} />
          <LookAheadItemDisplay label={lookAheadData.next_6h.time} data={lookAheadData.next_6h} />
        </div>
      );
    }

    return null; // Should not happen in practice
  };

  return (
    <div className="absolute top-20 right-3 z-40 bg-black/60 backdrop-blur-sm rounded-lg p-3 w-48">
      <h3 className="text-white font-bold text-sm mb-2">Look-Ahead</h3>
      {renderContent()}
    </div>
  );
};
