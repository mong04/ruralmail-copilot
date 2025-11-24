import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import UIPortal from '../../ui/Portal'; // Renamed to avoid type collision

interface SparksProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export const Sparks: React.FC<SparksProps> = ({ x, y, onComplete }) => {
  const [particles] = useState(() => Array.from({ length: 8 }));

  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <UIPortal>
      <div 
        className="fixed pointer-events-none z-100" 
        style={{ left: x, top: y }}
      >
        {particles.map((_, i) => {
           const angle = (i / particles.length) * 360;
           return (
             <motion.div
               key={i}
               className="absolute w-1 h-8 bg-cyan-400 shadow-[0_0_10px_#00ffff]"
               initial={{ rotate: angle, scaleY: 0.5, opacity: 1, y: 0 }}
               animate={{ 
                 scaleY: [1, 0], 
                 opacity: [1, 0],
                 y: -50 + Math.random() * -50, // Fly outward/up
                 x: (Math.random() - 0.5) * 100
               }}
               transition={{ duration: 0.6, ease: "easeOut" }}
               style={{ transformOrigin: 'bottom center' }}
             />
           );
        })}
        {/* Central Flash */}
        <motion.div 
            className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full blur-xl"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.3 }}
        />
      </div>
    </UIPortal>
  );
};