// src/hooks/useIsMobile.ts
import { useState, useLayoutEffect } from 'react';

// Use a CSS media query to check for "mobile" (screens < 768px, Tailwind's 'md' breakpoint)
const getIsMobile = () => window.matchMedia('(max-width: 767px)').matches;

/**
 * A hook to check if the user is on a mobile-sized screen.
 * Updates on resize.
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    
    const handleResize = () => {
      setIsMobile(getIsMobile());
    };

    // 'change' event is the new, efficient way
    mediaQuery.addEventListener('change', handleResize);
    
    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  return isMobile;
};