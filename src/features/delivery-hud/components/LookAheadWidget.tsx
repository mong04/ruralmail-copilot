import { Sun, Cloud, CloudDrizzle, CloudSnow, type LucideProps } from 'lucide-react';
import React from 'react';

const iconMap: { [key: string]: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>> } = {
    Sun, Cloud, CloudDrizzle, CloudSnow,
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
        <div className="flex justify-between items-center text-xs sm:text-sm py-1">
            <span className="text-muted-foreground font-medium w-12">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-bold tabular-nums">{Math.round(data.temp)}°</span>
              {data.precip > 0 && <span className="text-blue-400 text-xs font-bold">({data.precip}%)</span>}
              <Icon className="w-4 h-4 text-foreground/80" />
            </div>
        </div>
    );
};

export const LookAheadWidget = ({ lookAheadData, status }: LookAheadWidgetProps) => {
  if (status === 'failed') return null; // Hide on error to reduce clutter

  if (status === 'loading' || !lookAheadData) {
      // Tiny skeleton
      return (
        <div className="bg-surface/80 backdrop-blur-md border border-border rounded-xl p-3 w-40 shadow-lg animate-pulse">
           <div className="h-4 bg-surface-muted rounded mb-2 w-2/3"></div>
           <div className="h-3 bg-surface-muted rounded mb-1 w-full"></div>
           <div className="h-3 bg-surface-muted rounded w-full"></div>
        </div>
      );
  }

  return (
    <div className="bg-surface/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-xl p-3 w-44 transition-all hover:bg-surface">
      <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1">
        Forecast
      </h3>
      <div className="space-y-0.5">
        <LookAheadItemDisplay label={lookAheadData.now.time} data={lookAheadData.now} />
        <LookAheadItemDisplay label={lookAheadData.next_3h.time} data={lookAheadData.next_3h} />
        <LookAheadItemDisplay label={lookAheadData.next_6h.time} data={lookAheadData.next_6h} />
      </div>
    </div>
  );
};