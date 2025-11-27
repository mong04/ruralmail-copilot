import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface NeuralCoreProps {
  mode: 'booting' | 'listening' | 'processing' | 'confirming' | 'success' | 'error' | 'paused' | 'suggesting' | 'summary';
  variant?: 'professional' | 'cyberpunk';
}

export const NeuralCore: React.FC<NeuralCoreProps> = ({ mode, variant = 'professional' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let t = 0;

    const getColors = () => {
      const style = getComputedStyle(document.documentElement);
      
      const brand = style.getPropertyValue('--brand').trim();
      const success = style.getPropertyValue('--success').trim();
      const danger = style.getPropertyValue('--danger').trim();

      // Force high-contrast Cyan fallback if brand is missing or we are on a dark bg
      const safeBrand = brand || '#00f0ff'; 
      
      return {
        brand: safeBrand,
        success: success || '#0aff60',
        danger: danger || '#ff003c',
        muted: 'rgba(255, 255, 255, 0.2)' // Added for standby state
      };
    };

    const render = () => {
      // 1. Setup Scaling (High DPI Fix)
      const dpr = window.devicePixelRatio || 1;
      const logicalSize = 300; // We know our CSS size is 300px
      
      // Update physical size
      canvas.width = logicalSize * dpr;
      canvas.height = logicalSize * dpr;
      
      // Normalize coordinate system: 0-300
      ctx.scale(dpr, dpr);
      
    //   const { width, height } = canvas; // These are physical pixels
      const colors = getColors();
      
      // Clear using LOGICAL coordinates (since we scaled)
      ctx.clearRect(0, 0, logicalSize, logicalSize);
      
      t += 0.05;

      // 2. Calculate Center in LOGICAL pixels
      // (Before, we used width/2 which was 450. 450 * 3 = 1350 = Off Screen)
      const centerX = logicalSize / 2; 
      const centerY = logicalSize / 2;
      
      ctx.lineWidth = variant === 'cyberpunk' ? 2 : 3;

      // --- VISUAL LOGIC ---

      // A. BOOTING / STANDBY (The Fix for Empty Box)
      if (mode === 'booting' || mode === 'paused') {
          ctx.strokeStyle = colors.muted;
          ctx.setLineDash([5, 15]); // Dashed "Standby" ring
          ctx.beginPath();
          ctx.arc(centerX, centerY, 60, t * 0.1, t * 0.1 + (Math.PI * 2));
          ctx.stroke();
          ctx.setLineDash([]); // Reset
          
          // Inner dot
          ctx.fillStyle = colors.muted;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
          ctx.fill();
      }

      // B. PROFESSIONAL MODE
      else if (variant === 'professional') {
        if (mode === 'listening' || mode === 'summary') {
            ctx.strokeStyle = colors.brand;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40 + Math.sin(t) * 5, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = colors.brand;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8 + Math.sin(t*2)*2, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (mode === 'processing' || mode === 'suggesting') {
            ctx.strokeStyle = colors.brand;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 45, t * 5, t * 5 + 4); // Faster spin
            ctx.stroke();
        }
        else if (mode === 'confirming') {
            ctx.strokeStyle = colors.success;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
            ctx.stroke();
            // Checkmark
            ctx.beginPath();
            ctx.moveTo(centerX - 15, centerY);
            ctx.lineTo(centerX - 5, centerY + 10);
            ctx.lineTo(centerX + 15, centerY - 10);
            ctx.stroke();
        }
        else if (mode === 'error') {
            ctx.strokeStyle = colors.danger;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = colors.danger;
            ctx.font = "bold 40px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("!", centerX, centerY);
        }
      } 
      // C. CYBERPUNK MODE
      else {
        if (mode === 'listening' || mode === 'summary') {
            ctx.strokeStyle = colors.brand;
            
            // Audio Waveform
            ctx.beginPath();
            for (let i = 0; i < logicalSize; i++) {
               // Limit wave to center area
               if (i > 50 && i < 250) {
                  const dist = Math.abs(i - centerX);
                  const envelope = Math.max(0, 1 - dist/100); // Fade edges
                  const y = centerY + Math.sin(i * 0.1 + t) * 20 * envelope;
                  ctx.lineTo(i, y);
               }
            }
            ctx.stroke();
            
            // Outer Ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40 + Math.sin(t) * 5, 0, Math.PI * 2);
            ctx.stroke();
        } 
        else if (mode === 'processing' || mode === 'suggesting') {
            ctx.strokeStyle = colors.brand;
            ctx.beginPath();
            const radius = 40;
            for (let i = 0; i < 3; i++) {
               ctx.beginPath();
               ctx.arc(centerX, centerY, radius + (i * 15), t * (i+1), t * (i+1) + 1.5);
               ctx.stroke();
            }
        }
        else if (mode === 'confirming') {
            ctx.strokeStyle = colors.success;
            ctx.fillStyle = colors.success;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        else if (mode === 'error') {
            ctx.strokeStyle = colors.danger;
            ctx.beginPath();
            // Glitchy jagged line
            ctx.moveTo(centerX - 50, centerY);
            for (let i = centerX - 50; i < centerX + 50; i+=10) {
               ctx.lineTo(i, centerY + (Math.random() - 0.5) * 40);
            }
            ctx.stroke();
        }
      }

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [mode, variant]);

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      // Explicitly set 300px size in CSS so logical size matches
      className="relative flex items-center justify-center w-[300px] h-[300px]"
    >
       <canvas 
         ref={canvasRef} 
         // Force CSS size to 300px to prevent layout squashing
         style={{ width: '300px', height: '300px' }}
         className={`absolute inset-0 z-10 ${variant === 'cyberpunk' ? 'filter drop-shadow-[0_0_10px_var(--brand)]' : ''}`}
       />
       
       {variant === 'cyberpunk' && (
         <div className="z-20 text-4xl font-black mix-blend-hard-light text-foreground/80 pointer-events-none">
           {mode === 'success' && '📦'}
           {mode === 'error' && '⚠️'}
         </div>
       )}
    </motion.div>
  );
};