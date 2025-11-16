// src/features/delivery-hud/components/MapControls.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
// ✅ ADDED toggleVoice
import { setMapStyle, setCameraMode, toggleVoice } from '../hudSlice';
// ✅ ADDED MapPin, Navigation, Volume2, VolumeX
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
import { toast } from 'sonner'; // ✅ Import toast for error handling

// Re-usable toggle button
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

export const MapControls: React.FC = () => {
  const dispatch = useAppDispatch();
  // ✅ Get position to check if 'Follow' is possible
  const { mapStyle, cameraMode, voiceEnabled, position } = useAppSelector(
    (state) => state.hud
  );
  const [isOpen, setIsOpen] = useState(false);

  // ✅ NEW: Smart click handler for "Follow"
  const handleFollowClick = () => {
    if (position) {
      dispatch(setCameraMode('follow'));
    } else {
      toast.error('Current location not available yet.');
    }
  };

  return (
    // ✅ YOUR FIX (Position):
    // Using your hard-coded value that you found works perfectly.
    <div className="absolute bottom-4 right-4 z-30">
      <Button
        variant="surface"
        size="lg"
        className="w-12 h-12 p-0 shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Map Layers"
      >
        <Layers size={20} />
      </Button>

      {isOpen && (
        // ✅ POSITION: Menu now opens *upwards* from the button
        <div className="absolute bottom-14 right-0 w-72 bg-surface rounded-xl shadow-lg border border-border p-3 space-y-3">
          {/* Map Style Section */}
          <div>
            <label className="text-xs font-semibold text-muted pl-1">
              Map Type
            </label>
            <div className="flex justify-between gap-2 mt-1">
              <ToggleBtn
                label="Street"
                icon={MapPin} // This will now be found
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
          </div>

          {/* Camera Mode Section */}
          <div>
            <label className="text-xs font-semibold text-muted pl-1">
              Camera View
            </label>
            <div className="flex justify-between gap-2 mt-1">
              <ToggleBtn
                label="Task" // Renamed
                icon={LocateFixed}
                isActive={cameraMode === 'task'}
                onClick={() => dispatch(setCameraMode('task'))}
              />
              <ToggleBtn
                label="Follow" // New
                icon={Navigation}
                isActive={cameraMode === 'follow'}
                onClick={handleFollowClick} // ✅ Use smart handler
              />
              <ToggleBtn
                label="Overview"
                icon={Compass}
                isActive={cameraMode === 'overview'}
                onClick={() => dispatch(setCameraMode('overview'))}
              />
            </div>
          </div>

          {/* ✅ NEW: Voice Toggle Section */}
          <div>
            <label className="text-xs font-semibold text-muted pl-1">
              Audio
            </label>
            <div className="flex justify-between gap-2 mt-1">
              <ToggleBtn
                label="Voice On"
                icon={Volume2}
                isActive={voiceEnabled}
                onClick={() => dispatch(toggleVoice(true))}
              />
              <ToggleBtn
                label="Voice Off"
                icon={VolumeX}
                isActive={!voiceEnabled}
                onClick={() => dispatch(toggleVoice(false))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};