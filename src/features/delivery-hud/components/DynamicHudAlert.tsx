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
    AlertTriangle,
    CloudDrizzle,
    CloudSnow,
    Sun,
    Wind,
};

export const DynamicHudAlert = ({ hudAlertData }: DynamicHudAlertProps) => {
  if (!hudAlertData) {
    return <div className="h-6" />; // Placeholder for layout stability
  }

  const IconComponent = iconMap[hudAlertData.icon];

  return (
    <div className="flex items-center gap-2">
      {IconComponent && <IconComponent className={`w-5 h-5 ${hudAlertData.color}`} />}
      <p className={`font-bold ${hudAlertData.color || 'text-white'}`}>{hudAlertData.text}</p>
    </div>
  );
};