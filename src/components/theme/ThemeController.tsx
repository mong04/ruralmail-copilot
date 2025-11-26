// src/components/theme/ThemeController.tsx
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { useAppSelector } from '../../store';
import { Sparks } from './cyberpunk/SparkFX';
import { useSound } from '../../hooks/useSound';
import { type FxEventDetail } from '../../lib/theme-fx';
import CyberpunkOverlay from './cyberpunk/CyberpunkOverlay';

const ThemeController: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Get State
  const theme = useAppSelector((state) => state.settings.theme || 'light');
  const richThemingEnabled = useAppSelector((state) => state.settings.richThemingEnabled ?? true);
  const { playTone } = useSound();

  const [activeSparks, setActiveSparks] = useState<{ id: number; x: number; y: number }[]>([]);

  // 2. Calculate if we are in "Full Cyberpunk Mode"
  const isCyberpunkActive = theme === 'cyberpunk' && richThemingEnabled;

  // 3. APPLY TO HTML TAG (Crucial Fix)
  // Your CSS uses [data-theme="cyberpunk"], so we must set this attribute on the root.
  useLayoutEffect(() => {
    const root = document.documentElement;
    
    if (isCyberpunkActive) {
      root.setAttribute('data-theme', 'cyberpunk');
      root.classList.add('theme-cyberpunk'); // Keep class for backward compatibility
    } else {
      // Fallback: If rich theming is off, or theme isn't cyberpunk, 
      // revert to standard light/dark modes.
      const fallbackTheme = theme === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-theme', fallbackTheme);
      root.classList.remove('theme-cyberpunk');
      
      // Ensure Tailwind dark mode works if you use class-based dark mode
      if (fallbackTheme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [isCyberpunkActive, theme]);

  // 4. Spark FX Logic (Unchanged)
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
      {/* 1. Cyberpunk effects layer */}
      {isCyberpunkActive && (
        <div className="fixed inset-0 pointer-events-none z-40"> 
          <CyberpunkOverlay />
        </div>
      )}

      {/* 2. App Content */}
      <div> 
        {children}
      </div>

      {/* 3. Sparks */}
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