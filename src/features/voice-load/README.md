# Voice Load 2077

A next-generation, hands-free, magical voice-driven package loading system for rural mail carriers.

## Features
- Always-on, error-proof voice input/output
- Fuzzy address/package matching (Fuse.js)
- Undo/redo, session summary, and contextual help—all by voice
- Analytics and offline persistence
- Theme-aware, accessible, and beautiful UI
- Works with Bluetooth earbuds, offline, and on low-end devices

## Architecture
- `VoiceLoadMachine.ts` — Atomic state machine
- `useVoiceEngine.ts` — Unified voice input/output/tones
- `VoiceLoadHUD.tsx` — Main UI/HUD
- `fuzzyMatch.ts` — Fuzzy matching utility
- `VoiceSessionAnalytics.ts` — Analytics/session summary
- `voiceThemes.ts` — Theme tokens

## Usage
Import and render `<VoiceLoadHUD />` in your app. All logic is self-contained and error-proof.

---

**Built for the future of rural delivery.**
