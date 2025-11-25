import React from 'react';
import { motion, type PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Edit } from 'lucide-react';
import { useAppSelector } from '../../store';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ 
  children, 
  onEdit, 
  onDelete, 
  className 
}) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const theme = useAppSelector((state) => state.settings.theme);
  const isCyberpunk = theme === 'cyberpunk';

  // --- PARALLAX & PHYSICS ---
  const editBgOpacity = useTransform(x, [0, 10], [0, 1]);
  const deleteBgOpacity = useTransform(x, [-10, 0], [1, 0]);

  // Cyberpunk Scale: More aggressive, "glitchy" movement
  const iconScaleLeft = useTransform(x, [0, 80], [0.5, isCyberpunk ? 1.2 : 1.1]);
  const iconScaleRight = useTransform(x, [-80, 0], [isCyberpunk ? 1.2 : 1.1, 0.5]);

  const iconXLeft = useTransform(x, [0, 80], [-30, 0]);
  const iconXRight = useTransform(x, [-80, 0], [0, 30]);

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -80 || velocity < -500) {
      if (onDelete) {
        await controls.start({ x: -500, transition: { duration: 0.2, ease: "easeIn" } });
        onDelete();
      } else {
        controls.start({ x: 0 });
      }
    } 
    else if (offset > 80 || velocity > 500) {
      if (onEdit) {
        onEdit();
        controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
      } else {
        controls.start({ x: 0 });
      }
    } 
    else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
    }
  };

  // Dynamic Styles for Backgrounds
  // Standard: bg-brand / bg-danger
  // Cyberpunk: Neon gradients + Glitch borders
  const editBgClass = isCyberpunk 
    ? "bg-black border-r-2 border-[#00f0ff] shadow-[inset_-10px_0_20px_rgba(0,240,255,0.2)]" 
    : "bg-brand";
  
  const deleteBgClass = isCyberpunk
    ? "bg-black border-l-2 border-[#ff003c] shadow-[inset_10px_0_20px_rgba(255,0,60,0.2)]"
    : "bg-danger";

  const iconColor = isCyberpunk ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" : "text-white";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      
      {/* --- BACKGROUND ACTIONS LAYER --- */}
      <div className="absolute inset-0 flex justify-between items-center pointer-events-none">
        
        {/* LEFT ACTION (EDIT) */}
        <motion.div 
          style={{ opacity: editBgOpacity }}
          className={`flex items-center justify-start pl-6 w-full h-full absolute left-0 ${editBgClass}`}
        >
          <motion.div style={{ scale: iconScaleLeft, x: iconXLeft }}>
             <Edit className={iconColor} size={22} strokeWidth={2.5} />
          </motion.div>
        </motion.div>

        {/* RIGHT ACTION (DELETE) */}
        <motion.div 
          style={{ opacity: deleteBgOpacity }}
          className={`flex items-center justify-end pr-6 w-full h-full absolute right-0 ${deleteBgClass}`}
        >
          <motion.div style={{ scale: iconScaleRight, x: iconXRight }}>
             <Trash2 className={iconColor} size={22} strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      </div>

      {/* --- FOREGROUND CONTENT --- */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: "pan-y" }}
        className={`relative z-10 ${isCyberpunk ? "bg-transparent" : "bg-surface"}`}
      >
        {children}
      </motion.div>
    </div>
  );
};