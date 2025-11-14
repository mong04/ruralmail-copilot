// src/features/delivery-hud/components/VoiceToggleButton.tsx
import React from "react";
import { VolumeX, Volume2 } from "lucide-react"; // or any icon set you prefer

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const VoiceToggleButton: React.FC<Props> = ({ enabled, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className="absolute bottom-24 right-4 z-50 flex items-center justify-center
                w-12 h-12 rounded-full bg-white shadow-lg border border-gray-300
                hover:bg-gray-100 transition"
    >
      {enabled ? (
        <Volume2 className="w-6 h-6 text-green-600" />
      ) : (
        <VolumeX className="w-6 h-6 text-red-600" />
      )}
    </button>
  );
};

export default VoiceToggleButton;