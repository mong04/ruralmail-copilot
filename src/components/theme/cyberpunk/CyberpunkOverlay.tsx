// src/features/delivery-hud/cyberpunk/CyberpunkOverlay.tsx
import React, { useEffect, useRef } from 'react';

// Define the animation keyframes outside the component for clarity
const scanlineAnimation = `
@keyframes scanline-anim {
  0% { background-position: 0 0; }
  100% { background-position: 0 500px; } 
}
.animate-scanline {
  animation: scanline-anim 15s linear infinite;
}`;

export const CyberpunkOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const drops: { x: number; y: number; speed: number; length: number; opacity: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initRain = () => {
      drops.length = 0;
      const count = Math.floor(window.innerWidth / 15);
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight - window.innerHeight,
          speed: 10 + Math.random() * 15,
          length: 8 + Math.random() * 15,
          opacity: 0.05 + Math.random() * 0.1,
        });
      }
    };

    resize();
    initRain();
    window.addEventListener('resize', () => { resize(); initRain(); });

    const animate = () => {
      // CRITICAL FIX: Use clearRect to ensure full transparency and stop rain accumulation.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#00f0ff'; 
      ctx.lineWidth = 1;

      drops.forEach(drop => {
        ctx.globalAlpha = drop.opacity;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        
        // Reset
        if (drop.y > window.innerHeight) {
          drop.y = -50;
          drop.x = Math.random() * window.innerWidth;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
  <div className="fixed inset-0 pointer-events-none z-[40]">
    {/* Inject the animation CSS directly to ensure keyframes are loaded */}
    <style>{scanlineAnimation}</style>
    
    {/* Animated Scanlines and Static Aberration Lines */}
    <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
      <div 
        className="absolute inset-0 animate-scanline bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]" 
      />
    </div>

    {/* Rain canvas - Renders on top of the static effects */}
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 45,
        mixBlendMode: 'screen', // Crucial for the neon glow effect
      }}
    />
  </div>
);
};

export default CyberpunkOverlay;