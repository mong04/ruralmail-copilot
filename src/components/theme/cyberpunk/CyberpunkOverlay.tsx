import React, { useEffect, useRef } from 'react';
import Portal from '../../ui/Portal'; // Adjusted import path

const CyberpunkOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let raf = 0;
    const drops: { x: number; y: number; len: number; speed: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Initialize Rain
    const initRain = () => {
      drops.length = 0;
      const count = Math.floor(window.innerWidth / 15); // Responsive density
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          len: 20 + Math.random() * 30,
          speed: 4 + Math.random() * 8, // Fast, hard rain
          alpha: 0.1 + Math.random() * 0.2,
        });
      }
    };

    resize();
    initRain();
    window.addEventListener('resize', () => { resize(); initRain(); });

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00ffff'; // Cyan rain
      ctx.lineWidth = 1;

      for (const d of drops) {
        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y + d.len);
        ctx.stroke();

        d.y += d.speed;
        // Loop from top
        if (d.y > canvas.height) {
          d.y = -d.len;
          d.x = Math.random() * canvas.width;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <Portal>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* CSS Scanlines */}
        <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20" />
        <div className="absolute inset-0 z-10 cyberpunk-scanlines" />
        
        {/* Rain Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 z-20 opacity-40 mix-blend-screen" />
        
        {/* Vignette */}
        <div className="absolute inset-0 z-30 bg-radial-gradient-vignette opacity-50" />
      </div>
    </Portal>
  );
};

export default CyberpunkOverlay;