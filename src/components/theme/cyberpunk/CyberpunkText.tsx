import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../../store'; // Ensure path is correct based on your folder structure

interface CyberpunkTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p' | 'div';
  scrambleSpeed?: number;
  alwaysShow?: boolean;
}

const CHARS = 'ABCDEF0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export const CyberpunkText: React.FC<CyberpunkTextProps> = ({
  text,
  className = '',
  as: Component = 'span',
  scrambleSpeed = 30,
  alwaysShow = false,
}) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  
  // Connect to Redux to check if we should actually run the effect
  const theme = useAppSelector((state) => state.settings.theme);
  const richThemingEnabled = useAppSelector((state) => state.settings.richThemingEnabled);
  const isActive = alwaysShow || (theme === 'cyberpunk' && richThemingEnabled);

  useEffect(() => {
    // If effects are disabled, just show the plain text immediately
    if (!isActive) {
      setDisplayedText(text);
      return;
    }

    let iteration = 0;
    let interval: NodeJS.Timeout;

    const startScramble = () => {
      interval = setInterval(() => {
        // FIX: Removed 'prev' argument since we rebuild the string from the 'text' prop
        setDisplayedText(() =>
          text
            .split('')
            .map((_, index) => {
              if (index < iteration) return text[index];
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );

        if (iteration >= text.length) {
          clearInterval(interval);
        }

        iteration += 1 / 3; // Slowed down slightly for better legibility
      }, scrambleSpeed);
    };

    startScramble();

    return () => clearInterval(interval);
  }, [text, scrambleSpeed, isHovered, isActive]);

  if (!isActive) {
    return <Component className={className}>{text}</Component>;
  }

  return (
    <Component
      className={`text-glitch ${className}`}
      data-text={text}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {displayedText}
    </Component>
  );
};