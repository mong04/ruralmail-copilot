// src/features/delivery-hud/components/MapControls.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setMapStyle, cycleCameraMode, toggleVoice } from '../hudSlice';
import {
  Layers,
  Compass,
  LocateFixed,
  Globe2,
  MapPin,
  Navigation,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { toast } from 'sonner';

interface MapControlsProps {
  onRecenter: () => void;
  isMapOffCenter: boolean;
}

const ToggleBtn: React.FC<{
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 transition-colors',
      isActive
        ? 'bg-brand/10 border-brand text-brand'
        : 'bg-surface border-border text-muted hover:bg-surface-muted'
    )}
  >
    <Icon size={24} className="mb-1" />
    <span className="text-xs font-semibold">{label}</span>
  </button>
);

export const MapControls: React.FC<MapControlsProps> = ({ onRecenter }) => {
  const dispatch = useAppDispatch();
  const { mapStyle, cameraMode, voiceEnabled, position, isMapOffCenter } = useAppSelector(
    (state) => state.hud
  );
  const [isLayersOpen, setLayersOpen] = useState(false);
  const layersControlRef = useRef<HTMLDivElement>(null);

  // Close layers menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        layersControlRef.current &&
        !layersControlRef.current.contains(event.target as Node)
      ) {
        setLayersOpen(false);
      }
    };

    if (isLayersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLayersOpen]);

  const handleCameraCycle = () => {
    if (cameraMode === 'task' && !position) {
      dispatch(cycleCameraMode());
      dispatch(cycleCameraMode());
      toast.error('Current location not available for "Follow" mode.');
    } else {
      dispatch(cycleCameraMode());
    }
  };

  const getCameraIcon = () => {
    switch (cameraMode) {
      case 'task':
        return LocateFixed;
      case 'follow':
        return Navigation;
      case 'overview':
        return Compass;
      default:
        return LocateFixed;
    }
  };
  const CameraIcon = getCameraIcon();

  return (
    <div className="flex flex-col items-end gap-3">
      {/* Layers */}
      <div className="relative flex flex-col items-end" ref={layersControlRef}>
        {isLayersOpen && (
          <div className="flex gap-2 mb-1 p-1.5 bg-surface rounded-xl shadow-lg border border-border">
            <ToggleBtn
              label="Street"
              icon={MapPin}
              isActive={mapStyle === 'streets'}
              onClick={() => dispatch(setMapStyle('streets'))}
            />
            <ToggleBtn
              label="Satellite"
              icon={Globe2}
              isActive={mapStyle === 'satellite'}
              onClick={() => dispatch(setMapStyle('satellite'))}
            />
          </div>
        )}
        <Button
          variant="surface"
          size="lg"
          className="w-12 h-12 p-0 shadow-lg"
          onClick={() => setLayersOpen(!isLayersOpen)}
          aria-label="Map Layers"
        >
          <Layers size={20} />
        </Button>
      </div>

      {/* Camera Mode */}
      <Button
        variant="surface"
        size="lg"
        className="w-12 h-12 p-0 shadow-lg"
        onClick={handleCameraCycle}
        aria-label="Cycle Camera Mode"
      >
        <CameraIcon size={20} />
      </Button>

      {/* Voice Toggle */}
      <Button
        variant="surface"
        size="lg"
        className="w-12 h-12 p-0 shadow-lg"
        onClick={() => dispatch(toggleVoice(!voiceEnabled))}
        aria-label="Toggle Voice Guidance"
      >
        {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </Button>

      {/* Recenter Button — appears only when map is off-center */}
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          isMapOffCenter
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-0 pointer-events-none'
        )}
      >
        <Button
          variant="surface"
          size="lg"
          className="w-14 h-14 p-0 shadow-2xl ring-4 ring-brand/30 animate-pulse"
          onClick={onRecenter}
          aria-label="Recenter map"
        >
          <Navigation size={26} className="rotate-45" />
        </Button>
      </div>
    </div>
  );
};