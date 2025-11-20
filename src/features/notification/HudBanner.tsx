import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { hideNotification, type NotificationType } from './notificationSlice';
import { cn } from '../../lib/utils';

const notificationConfig: Record<
  NotificationType,
  { icon: React.ElementType; bgClass: string; textClass: string }
> = {
  info: { icon: Info, bgClass: 'bg-brand', textClass: 'text-brand-foreground' },
  success: { icon: CheckCircle, bgClass: 'bg-success', textClass: 'text-success-foreground' },
  warning: { icon: AlertTriangle, bgClass: 'bg-warning', textClass: 'text-warning-foreground' },
  error: { icon: XCircle, bgClass: 'bg-danger', textClass: 'text-danger-foreground' },
};

export const HudBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const { message, description, type, visible, id } = useAppSelector((state) => state.notification);
  const isNavigating = useAppSelector((state) => state.hud.isNavigating);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        dispatch(hideNotification());
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [visible, id, dispatch]);

  const { icon: Icon, bgClass, textClass } = notificationConfig[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={id}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'absolute left-0 right-0 z-50 transition-all duration-300 ease-in-out',
            isNavigating ? 'top-23' : 'top-0' // Position below nav panel if navigating
          )}
        >
          <div
            className={cn(
              'max-w-md mx-auto flex items-center gap-3 p-3 rounded-b-lg shadow-lg',
              bgClass,
              textClass
            )}
          >
            <Icon className="w-6 h-6 shrink-0" />
            <div className="grow">
              <p className="font-bold">{message}</p>
              {description && <p className="text-sm opacity-90">{description}</p>}
            </div>
            <button
              onClick={() => dispatch(hideNotification())}
              className="shrink-0 p-1 rounded-full hover:bg-black/20"
              aria-label="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};