import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setMapStyle, cycleCameraMode, toggleVoice } from '../hudSlice';
import {
  Layers, Compass, LocateFixed, Globe2, MapPin, Navigation, Volume2, VolumeX,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface MapControlsProps {
  onRecenter: () => void;
  isMapOffCenter: boolean;
}

// Helper for the square control buttons
const ControlButton = ({ 
  onClick, 
  active, 
  icon: Icon, 
  label 
}: { 
  onClick: () => void; 
  active?: boolean; 
  icon: React.ElementType; 
  label?: string 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border transition-all active:scale-95",
      active 
        ? "bg-brand text-brand-foreground border-brand shadow-brand/20" 
        : "bg-surface text-foreground border-border hover:bg-surface-muted"
    )}
    aria-label={label}
  >
    <Icon size={20} strokeWidth={2.5} />
  </button>
);

export const MapControls: React.FC<MapControlsProps> = ({ onRecenter, isMapOffCenter }) => {
  const dispatch = useAppDispatch();
  const { mapStyle, cameraMode, voiceEnabled } = useAppSelector((state) => state.hud);
  const [isLayersOpen, setLayersOpen] = useState(false);
  const layersControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layersControlRef.current && !layersControlRef.current.contains(event.target as Node)) {
        setLayersOpen(false);
      }
    };
    if (isLayersOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayersOpen]);

  const getCameraIcon = () => {
    switch (cameraMode) {
      case 'task': return LocateFixed;
      case 'follow': return Navigation;
      case 'overview': return Compass;
      default: return LocateFixed;
    }
  };

  return (
    <div className="flex flex-col items-end gap-3 pointer-events-auto">
      {/* Layers Menu */}
      <div className="relative flex flex-col items-end" ref={layersControlRef}>
        {isLayersOpen && (
          <div className="absolute bottom-14 right-0 flex flex-col gap-2 p-2 bg-surface/95 backdrop-blur rounded-xl shadow-xl border border-border w-32 animate-in fade-in slide-in-from-right-4 mb-2">
            <button 
               onClick={() => dispatch(setMapStyle('streets'))}
               className={cn("flex items-center gap-2 p-2 rounded-lg text-sm font-bold transition-colors", mapStyle === 'streets' ? "bg-brand/10 text-brand" : "hover:bg-surface-muted text-foreground")}
            >
               <MapPin size={16} /> Street
            </button>
            <button 
               onClick={() => dispatch(setMapStyle('satellite'))}
               className={cn("flex items-center gap-2 p-2 rounded-lg text-sm font-bold transition-colors", mapStyle === 'satellite' ? "bg-brand/10 text-brand" : "hover:bg-surface-muted text-foreground")}
            >
               <Globe2 size={16} /> Satellite
            </button>
          </div>
        )}
        <ControlButton 
            icon={Layers} 
            active={isLayersOpen} 
            onClick={() => setLayersOpen(!isLayersOpen)} 
            label="Map Layers"
        />
      </div>

      {/* Camera Mode */}
      <ControlButton 
        icon={getCameraIcon()} 
        active={cameraMode === 'follow'}
        onClick={() => dispatch(cycleCameraMode())}
        label="Camera Mode"
      />

      {/* Voice Toggle */}
      <ControlButton 
        icon={voiceEnabled ? Volume2 : VolumeX} 
        active={voiceEnabled}
        onClick={() => dispatch(toggleVoice(!voiceEnabled))}
        label="Toggle Voice"
      />

      {/* Recenter (Conditional) */}
      <div className={cn("transition-all duration-300", isMapOffCenter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
        <button
          onClick={onRecenter}
          className="w-14 h-14 rounded-full bg-brand text-brand-foreground shadow-2xl flex items-center justify-center animate-bounce hover:bg-brand/90 transition-colors"
        >
          <Navigation size={24} className="fill-current" />
        </button>
      </div>
    </div>
  );
};