import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../store'; // Using alias
import { Sparks } from './cyberpunk/SparkFX';
import { useSound } from '../../hooks/useSound';
import { type FxEventDetail } from '../../lib/theme-fx' // Using alias
import CyberpunkOverlay from './cyberpunk/CyberpunkOverlay';

const ThemeController: React.FC = () => {
  const theme = useAppSelector((state) => state.settings.theme);
  const { playTone } = useSound();
  
  // State for transient effects (sparks, etc)
  const [activeSparks, setActiveSparks] = useState<{id: number, x: number, y: number}[]>([]);

  useEffect(() => {
    const handleFx = (e: Event) => {
      const customEvent = e as CustomEvent<FxEventDetail>;
      const { type, rect } = customEvent.detail;

      // --- LOGIC: CYBERPUNK THEME ---
      if (theme === 'cyberpunk') {
        
        if (type === 'package-delivered' && rect) {
           // 1. Play Electric Sound
           playTone('success'); 
           
           // 2. Spawn Visual Sparks
           const id = Date.now();
           const centerX = rect.left + rect.width / 2;
           const centerY = rect.top + rect.height / 2;
           
           setActiveSparks(prev => [...prev, { id, x: centerX, y: centerY }]);
        }

        if (type === 'error') {
            playTone('error');
        }
      }
    };

    window.addEventListener('ruralmail-fx', handleFx);
    return () => window.removeEventListener('ruralmail-fx', handleFx);
  }, [theme, playTone]);

  const removeSpark = (id: number) => {
    setActiveSparks(prev => prev.filter(s => s.id !== id));
  };

  return (
    <>
      {/* 1. Global Ambient Layers */}
      {theme === 'cyberpunk' && <CyberpunkOverlay />}

      {/* 2. Transient FX Layers */}
      {activeSparks.map(spark => (
        <Sparks 
            key={spark.id} 
            x={spark.x} 
            y={spark.y} 
            onComplete={() => removeSpark(spark.id)} 
        />
      ))}
    </>
  );
};

export default ThemeController;