import React from 'react';
import { motion, type PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Edit } from 'lucide-react';

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
  
  // --- PARALLAX & PHYSICS DEFINITIONS ---

  // 1. Background Opacity: Only show the relevant side
  const editBgOpacity = useTransform(x, [0, 10], [0, 1]);
  const deleteBgOpacity = useTransform(x, [-10, 0], [1, 0]);

  // 2. Icon Scale: Grow from 0.5 to 1.1 as you drag to threshold (80px)
  const iconScaleLeft = useTransform(x, [0, 80], [0.5, 1.1]);
  const iconScaleRight = useTransform(x, [-80, 0], [1.1, 0.5]);

  // 3. Parallax Position: Icons slide in slightly to meet the user
  // Edit (Left): Starts at x=-30 (hidden), moves to 0
  const iconXLeft = useTransform(x, [0, 80], [-30, 0]);
  // Delete (Right): Starts at x=30, moves to 0
  const iconXRight = useTransform(x, [-80, 0], [0, 30]);

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe Left (Delete)
    if (offset < -80 || velocity < -500) {
      if (onDelete) {
        // Complete the swipe off-screen
        await controls.start({ x: -500, transition: { duration: 0.2, ease: "easeIn" } });
        onDelete();
      } else {
        controls.start({ x: 0 });
      }
    } 
    // Swipe Right (Edit)
    else if (offset > 80 || velocity > 500) {
      if (onEdit) {
        // Snap back to center after trigger (Rubber band effect)
        onEdit();
        controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
      } else {
        controls.start({ x: 0 });
      }
    } 
    // Snap Back (Did not reach threshold)
    else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      
      {/* --- BACKGROUND ACTIONS LAYER --- */}
      <div className="absolute inset-0 flex justify-between items-center pointer-events-none">
        
        {/* LEFT ACTION (EDIT) */}
        {/* Only visible when dragging right (x > 0) */}
        <motion.div 
          style={{ opacity: editBgOpacity }}
          className="flex items-center justify-start pl-6 w-full h-full bg-brand absolute left-0"
        >
          <motion.div style={{ scale: iconScaleLeft, x: iconXLeft }}>
             <Edit className="text-white" size={22} strokeWidth={2.5} />
          </motion.div>
        </motion.div>

        {/* RIGHT ACTION (DELETE) */}
        {/* Only visible when dragging left (x < 0) */}
        <motion.div 
          style={{ opacity: deleteBgOpacity }}
          className="flex items-center justify-end pr-6 w-full h-full bg-danger absolute right-0"
        >
          <motion.div style={{ scale: iconScaleRight, x: iconXRight }}>
             <Trash2 className="text-white" size={22} strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      </div>

      {/* --- FOREGROUND CONTENT --- */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }} // Elastic drag
        dragElastic={0.2} // 0.2 = Stiff resistance (feels premium)
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: "pan-y" }} // Allow vertical scroll while touching
        className="relative bg-surface z-10"
      >
        {children}
      </motion.div>
    </div>
  );
};