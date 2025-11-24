import { AlertTriangle, CloudDrizzle, CloudSnow, Sun, Wind, type LucideProps } from 'lucide-react';
import React from 'react';

export interface DynamicHudAlertProps {
  hudAlertData: {
    priority: 'severe' | 'imminent' | 'info' | 'clear';
    icon: string;
    text: string;
    color: string;
  } | null;
}

const iconMap: { [key: string]: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>> } = {
    AlertTriangle, CloudDrizzle, CloudSnow, Sun, Wind,
};

export const DynamicHudAlert = ({ hudAlertData }: DynamicHudAlertProps) => {
  if (!hudAlertData) return <div className="h-6" />;

  const Icon = iconMap[hudAlertData.icon] || AlertTriangle;

  let colorClass = 'text-muted-foreground';
  let bgClass = 'bg-surface-muted';

  switch (hudAlertData.priority) {
      case 'severe':
          colorClass = 'text-danger';
          bgClass = 'bg-danger/10 border-danger/20';
          break;
      case 'imminent':
          colorClass = 'text-warning';
          bgClass = 'bg-warning/10 border-warning/20';
          break;
      case 'info':
          colorClass = 'text-brand';
          bgClass = 'bg-brand/10 border-brand/20';
          break;
      case 'clear':
          colorClass = 'text-success';
          bgClass = 'bg-success/10 border-success/20';
          break;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bgClass} transition-colors`}>
      <Icon className={`w-4 h-4 ${colorClass}`} strokeWidth={2.5} />
      <p className={`text-xs font-bold uppercase tracking-wide ${colorClass}`}>
        {hudAlertData.text}
      </p>
    </div>
  );
};