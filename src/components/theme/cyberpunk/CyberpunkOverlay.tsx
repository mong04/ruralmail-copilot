// src/components/theme/cyberpunk/CyberpunkOverlay.tsx
import { motion, useReducedMotion } from "framer-motion";
import { useAppSelector } from "../../../store";
import { useEffect, useState } from "react";

// import { Scanlines } from "./effects/Scanlines";
// import { ChromaticAberration } from "./effects/ChromaticAberration";
import { NeonGrid } from "./effects/NeonGrid";
import { GlobalGlow } from "./effects/GlobalGlow";
// import { SmartParticles } from "./effects/SmartParticles";
import { LetterGlitchFX } from './effects/LetterGlitchFX';

// Proper BatteryManager type (2025 standard)
interface NavigatorWithBattery {
  getBattery?: () => Promise<BatteryManager>;
}

interface BatteryManager {
  charging: boolean;
  level: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export default function CyberpunkOverlay() {
  const theme = useAppSelector((state) => state.settings.theme);
  const richEnabled = useAppSelector((state) => state.settings.richThemingEnabled ?? true);
  const prefersReduced = useReducedMotion();

  const [intensity, setIntensity] = useState<"off" | "low" | "high">("off");

  useEffect(() => {
    if (theme !== "cyberpunk" || !richEnabled || prefersReduced) {
      setIntensity("off");
      return;
    }

    let isMounted = true;
    let hidden = document.hidden;

    const updateIntensity = () => {
      if (!isMounted || hidden || prefersReduced) {
        setIntensity("off");
        return;
      }

      const nav = navigator as NavigatorWithBattery;

      if (nav.getBattery) {
        nav.getBattery()
          .then((battery: BatteryManager) => {
            if (!isMounted) return;

            const updateFromBattery = () => {
              if (!isMounted) return;
              const lowPower = !battery.charging && battery.level < 0.3;
              setIntensity(lowPower ? "low" : "high");
            };

            updateFromBattery(); // Initial

            // Real-time updates
            battery.addEventListener("levelchange", updateFromBattery);
            battery.addEventListener("chargingchange", updateFromBattery);

            return () => {
              battery.removeEventListener("levelchange", updateFromBattery);
              battery.removeEventListener("chargingchange", updateFromBattery);
            };
          })
          .catch(() => {
            if (isMounted) setIntensity("high");
          });
      } else {
        setIntensity("high");
      }
    };

    updateIntensity();

    const onVisibility = () => {
      hidden = document.hidden;
      updateIntensity();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [theme, richEnabled, prefersReduced]);

  if (intensity === "off") return null;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-2147483647 overflow-hidden cyberpunk-fx-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      style={{
        contain: "strict",
        isolation: "isolate",
        transform: "translateZ(0)",
        mixBlendMode: "normal",
        // background: "rgba(10, 0, 30, 0.92)",
      }}
    >
      {/* <Scanlines intensity={intensity} /> */}
      {/* <ChromaticAberration intensity={intensity} /> */}
      <NeonGrid  />
      <GlobalGlow  />
      <LetterGlitchFX  />
      {/* {intensity === "high" && <SmartParticles />} */}
    </motion.div>
  );
}