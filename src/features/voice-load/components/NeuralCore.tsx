import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Expanded to match VoiceLoadState in VoiceLoadMachine.ts
export interface NeuralCoreProps {
  mode: 'booting' | 'listening' | 'processing' | 'confirming' | 'success' | 'error' | 'paused' | 'suggesting' | 'summary';
}

export const NeuralCore: React.FC<NeuralCoreProps> = ({ mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let t = 0;

    const getColors = () => {
      const style = getComputedStyle(document.body);
      return {
        brand: style.getPropertyValue('--brand').trim() || '#00f0ff',
        success: style.getPropertyValue('--success').trim() || '#0aff60',
        danger: style.getPropertyValue('--danger').trim() || '#ff003c',
        warning: style.getPropertyValue('--warning').trim() || '#fcee0a',
      };
    };

    const render = () => {
      const { width, height } = canvas;
      const colors = getColors();
      ctx.clearRect(0, 0, width, height);
      t += 0.05;

      const centerX = width / 2;
      const centerY = height / 2;

      ctx.lineWidth = 2;
      
      // VISUAL MAPPING
      if (mode === 'listening' || mode === 'summary') {
        // Breathing Sine Wave
        ctx.strokeStyle = colors.brand;
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
          const y = centerY + Math.sin(i * 0.05 + t) * 20 * Math.sin(t * 0.5);
          ctx.lineTo(i, y);
        }
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 40 + Math.sin(t) * 5, 0, Math.PI * 2);
        ctx.stroke();
      } 
      else if (mode === 'processing' || mode === 'suggesting') {
        // Chaotic Glitch Rings
        ctx.strokeStyle = colors.brand;
        ctx.beginPath();
        const radius = 40;
        for (let i = 0; i < 6; i++) {
           ctx.beginPath();
           ctx.arc(centerX, centerY, radius + (i * 10), t * i, t * i + 1.5);
           ctx.stroke();
        }
      }
      else if (mode === 'confirming') {
        // Solid Lock Target
        ctx.strokeStyle = colors.success;
        ctx.fillStyle = colors.success;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
      else if (mode === 'error') {
        // Jagged Warning
        ctx.strokeStyle = colors.danger;
        ctx.beginPath();
        for (let i = 0; i < width; i+=10) {
           ctx.lineTo(i, centerY + (Math.random() - 0.5) * 50);
        }
        ctx.stroke();
      }

      frameId = requestAnimationFrame(render);
    };

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = '300px';
    canvas.style.height = '300px';

    render();
    return () => cancelAnimationFrame(frameId);
  }, [mode]);

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "backOut" }}
      className="relative flex items-center justify-center w-[300px] h-[300px]"
    >
       <canvas 
         ref={canvasRef} 
         className="absolute inset-0 z-10 filter drop-shadow-[0_0_10px_var(--brand)]"
       />
       <div className="z-20 text-4xl font-black mix-blend-hard-light text-foreground/80 pointer-events-none">
         {mode === 'success' && '📦'}
         {mode === 'error' && '⚠️'}
       </div>
    </motion.div>
  );
};