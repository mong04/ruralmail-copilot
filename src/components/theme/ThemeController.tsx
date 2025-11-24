// src/components/theme/ThemeController.tsx
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { useAppSelector } from '../../store';
import { Sparks } from './cyberpunk/SparkFX';
import { useSound } from '../../hooks/useSound';
import { type FxEventDetail } from '../../lib/theme-fx';
import CyberpunkOverlay from './cyberpunk/CyberpunkOverlay';

const ThemeController: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppSelector((state) => state.settings.theme || 'light');
  const richThemingEnabled = useAppSelector((state) => state.settings.richThemingEnabled ?? true);
  const { playTone } = useSound();

  const [activeSparks, setActiveSparks] = useState<{ id: number; x: number; y: number }[]>([]);

  const isCyberpunkActive = theme === 'cyberpunk' && richThemingEnabled;

  // Apply global class immediately
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('theme-cyberpunk', isCyberpunkActive);
    document.body.style.background = isCyberpunkActive ? '#0d0015' : '';
  }, [isCyberpunkActive]);

  useEffect(() => {
    if (!isCyberpunkActive) {
      setActiveSparks([]);
      return;
    }

    const handleFx = (e: Event) => {
      const ev = e as CustomEvent<FxEventDetail>;
      const { type, rect } = ev.detail;

      if (type === 'package-delivered' && rect) {
        playTone('success');
        const id = Date.now();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        setActiveSparks(prev => [...prev, { id, x, y }]);
      }
      if (type === 'error') playTone('error');
    };

    window.addEventListener('ruralmail-fx', handleFx);
    return () => window.removeEventListener('ruralmail-fx', handleFx);
  }, [isCyberpunkActive, playTone]);

  const removeSpark = (id: number) => {
    setActiveSparks(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="relative min-h-screen">
      {/* 1. Cyberpunk background + overlay — rendered FIRST in React tree */}
      {isCyberpunkActive && (
        <div className="fixed inset-0 -z-20 pointer-events-none">
          <div className="absolute inset-0 bg-[#0d0015]" />
          <CyberpunkOverlay />
        </div>
      )}

      {/* 2. Your actual app content — on top */}
      <div className={isCyberpunkActive ? 'relative z-10' : ''}>
        {children}
      </div>

      {/* 3. Sparks — on top of everything */}
      {isCyberpunkActive &&
        activeSparks.map(spark => (
          <Sparks
            key={spark.id}
            x={spark.x}
            y={spark.y}
            onComplete={() => removeSpark(spark.id)}
          />
        ))}
    </div>
  );
};

export default ThemeController;