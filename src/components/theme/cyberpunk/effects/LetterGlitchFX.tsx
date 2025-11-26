// src/components/theme/cyberpunk/effects/LetterGlitchFX.tsx
import { useEffect, useRef } from "react";
import { useAppSelector } from "../../../../store";

const GLITCH_CHARS = [
  "█", "▓", "▒", "░", "▌", "▐", "◆", "◇", "★", "☆", "✦", "⬤", "◉",
  "ｱ", "ｲ", "ｳ", "ｴ", "ｵ", "ｶ", "ｷ", "ｸ", "ｹ", "ｺ", "ｻ", "ｼ", "ｽ",
  "ﾀ", "ﾁ", "ﾂ", "ﾃ", "ﾄ", "Ａ", "Ｂ", "Ｃ", "Ｄ", "Ｅ", "Ｆ", "Ｇ", "Ｈ",
  "０", "１", "２", "３", "４", "５", "６", "７", "８", "９",
  "Æ", "Ø", "ß", "Ð", "Ł", "Ŧ", "Ǝ", "Ɔ",
] as const;

// We need a simple object to hold the data for each active glitch
type GlitchEntry = {
  original: string;
  timeoutId: NodeJS.Timeout;
};

export function LetterGlitchFX() {
  const theme = useAppSelector((state) => state.settings.theme);
  const richEnabled = useAppSelector((state) => state.settings.richThemingEnabled ?? true);
  const isActive = theme === "cyberpunk" && richEnabled;

  const rafRef = useRef<number | null>(null);
  
  // THIS IS THE KEY: A registry (Map) to store the "Captured" character
  // Key = The Text Node in the DOM
  // Value = The original string and the timer ID
  const activeGlitches = useRef<Map<Text, GlitchEntry>>(new Map());
  
  const nextBurstRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isActive) return;

    const glitchNode = (node: Text) => {
      // 1. Check if we are already glitching this node. 
      // If we are, DON'T glitch it again, or we might capture the "glitch" 
      // as the "original" text, which would permanently break it.
      if (activeGlitches.current.has(node)) return;

      const text = node.textContent;
      if (!text || !node.isConnected) return;

      // 2. CAPTURE THE ORIGINAL CHARACTER (Your logic!)
      const original = text;
      
      const chars = original.split("");
      const indices = new Set<number>();

      // Decide how many chars to glitch (1, 2, or 3)
      const targetCount = Math.random() < 0.75 ? 1 : Math.random() < 0.95 ? 2 : 3;
      let attempts = 0;
      while (indices.size < targetCount && attempts < 20) {
        const idx = Math.floor(Math.random() * chars.length);
        if (/[a-zA-Z0-9]/i.test(chars[idx]) && !indices.has(idx)) {
          indices.add(idx);
        }
        attempts++;
      }
      if (indices.size === 0) return;

      // 3. APPLY THE GLITCH
      node.textContent = chars
        .map((c, i) => indices.has(i) ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c)
        .join("");

      const duration = 80 + Math.random() * 120;
      
      const timeoutId = setTimeout(() => {
        // 4. RESTORE IT (Normal behavior)
        // We only try to restore if the text node is still part of the document
        if (node.parentElement?.isConnected) {
          node.textContent = original;
        }
        // Remove from the safety log because it finished successfully
        activeGlitches.current.delete(node);
      }, duration);

      // 5. SAVE TO REGISTRY
      // This ensures we can "force restore" it if the component unmounts early
      activeGlitches.current.set(node, { original, timeoutId });
    };

    const triggerBurst = () => {
    const candidates: Text[] = [];
    document.querySelectorAll("h1,h2,h3,h4,h5,p,span,div,li,button,label,a,[data-glitch]").forEach(el => {
        el.childNodes.forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const textNode = node as Text;

        if (!textNode.textContent || textNode.textContent.trim().length <= 2) return;
        if (activeGlitches.current.has(textNode)) return;

        candidates.push(textNode);
        });
    });

    if (candidates.length === 0) return;

    const burstSize = Math.random() < 0.7 ? 2 : Math.random() < 0.95 ? 3 : Math.random() < 0.99 ? 5 : 6;
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    shuffled.slice(0, burstSize).forEach(glitchNode);
    };

    const loop = () => {
      const now = performance.now();
      if (now >= nextBurstRef.current) {
        triggerBurst();
        nextBurstRef.current = now + 1200 + Math.random() * 2600;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    nextBurstRef.current = performance.now() + 800;
    rafRef.current = requestAnimationFrame(loop);

    // CLEANUP FUNCTION
    return () => {
      // Kill the animation loop
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      // IMPLEMENTING YOUR FIX:
      // Instead of just clearing the timer (which leaves the glitch stuck),
      // we iterate through our captured list and FORCE everything back to normal.
      activeGlitches.current.forEach(({ original, timeoutId }, node) => {
        clearTimeout(timeoutId);
        if (node.isConnected) {  // ← safer than parentElement check
            node.textContent = original;
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      activeGlitches.current.clear();
    };

  }, [isActive]);

  return null;
}