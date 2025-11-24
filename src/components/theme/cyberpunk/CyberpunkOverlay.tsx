import React, { useEffect, useRef } from 'react';

const CyberpunkOverlay: React.FC = () => {
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
      const count = Math.floor(window.innerWidth / 10);
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight - window.innerHeight,
          speed: 15 + Math.random() * 20, // Faster, harder rain
          length: 10 + Math.random() * 20,
          opacity: 0.1 + Math.random() * 0.3,
        });
      }
    };

    resize();
    initRain();
    window.addEventListener('resize', () => { resize(); initRain(); });

    const animate = () => {
      // Clear with slight trail for motion blur feel
      ctx.fillStyle = 'rgba(10, 0, 20, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {/* 1. Base Scanlines (Static CSS) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-1 bg-size-[100%_2px,3px_100%] pointer-events-none" />

      {/* 2. CRT Flicker Animation */}
      <div className="absolute inset-0 bg-white opacity-[0.02] animate-pulse pointer-events-none z-2" />

      {/* 3. Vignette (Darkens corners heavily) */}
      <div 
        className="absolute inset-0 z-3 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 50%, #000000 100%)',
        }}
      />

      {/* 4. Rain Canvas (Background layer) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
      />
    </div>
  );
};

export default CyberpunkOverlay;