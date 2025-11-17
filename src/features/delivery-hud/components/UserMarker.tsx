// src/features/delivery-hud/components/UserMarker.tsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * A dynamic, animated map marker to represent the user's current position.
 * It uses a gentle pulsing and floating animation to create a "3D" effect,
 * making it feel more alive and responsive on the map.
 */
export const UserMarker: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center">
      {/* The Marker itself with a floating animation */}
      <motion.div
        className="w-5 h-5 bg-brand rounded-full border-2 border-white shadow-lg"
        animate={{
          y: [0, -4, 0], // Bobbing effect
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* The Shadow with a pulsing animation */}
      <motion.div
        className="absolute bottom-[-4px] w-3 h-1 bg-black/30 rounded-full"
        style={{ filter: 'blur(2px)' }}
        animate={{
          scale: [1, 0.8, 1], // Shrinks and grows as the marker bobs
          opacity: [0.7, 0.5, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

export default UserMarker;