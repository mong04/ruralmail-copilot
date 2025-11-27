import { useEffect, useRef, useState } from 'react';

/**
 * World-class Wake Lock hook.
 * Re-acquires lock on visibility change and handles browser incompatibilities.
 */
export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => setIsLocked(false));
        setIsLocked(true);
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  };

  const releaseLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    // Acquire lock on mount
    requestLock();

    // Re-acquire on visibility change (e.g. user switching tabs back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, []);

  return { isLocked };
}