# Voice Load Experience – Architecture & Philosophy

## Overview
The LoadTruck voice loading feature is engineered for **flow-state preservation** – carriers never interrupt their physical loading workflow to interact with the UI. The entire experience is driven by voice commands, haptic/sonic feedback, and predictive confidence visualization.

## Core Design Principles

### 1. **Flow State First**
- **Minimal visual interruption**: Display only essential state (address, confidence, action required)
- **Always-on microphone**: Carrier can speak at any time without explicit activation
- **Predictive feedback**: System responds before the carrier finishes speaking
- **Voice-first UX**: Every action can be triggered via voice command

### 2. **Confidence-Driven Routing**
The system uses three confidence tiers to determine user experience:

| Confidence | Behavior | Sonic Feedback |
|-----------|----------|---|
| **> 0.88** | Auto-lock with 4-second voice confirmation window | Ascending pitch tone (800→1200Hz) |
| **0.5–0.88** | Show up to 3 alternatives; user selects via "option 1/2/3" | Alert double-beep (800Hz) |
| **< 0.5** | Retry request; play error tone | Descending pitch tone (600→400Hz) |

### 3. **Voice Command Hierarchy**
Commands are always available (interruptible):

```
GLOBAL (anytime):
  "pause" / "stop listening" / "quiet" → Pause with lock-on tone
  "resume" / "start listening" / "go" → Resume listening
  "no" / "wrong" / "cancel" / "nope" → Interrupt current prediction
  "undo" / "delete last" / "oops" / "revert" → Undo last package
  
SUGGESTION MODE (when showing candidates):
  "option 1/2/3" → Select and confirm candidate
  
CONFIRMATION MODE (when locked on address):
  "yes" / "confirm" / "correct" / "ok" → Accept prediction
  Auto-confirms after 4 seconds
```

### 4. **Sonic Design Language**
Each state transition plays a unique procedural tone (no MP3s—pure Web Audio API):

- **Start** (880Hz): Blip – system ready
- **Lock** (1200Hz ascending): Target acquired – high confidence match
- **Alert** (800Hz double-beep): Ambiguity – awaiting clarification
- **Success** (523→659Hz): Confirmation – package saved
- **Error** (150→50Hz sawtooth): Problem – retry or adjust

Tones are **volume-normalized** for outdoor use with Bluetooth earbuds.

### 5. **Session Telemetry**
Every load session tracks:
- Total transcripts processed
- Matched predictions
- Failed matches
- Average confidence level
- Voice errors
- Undo count

(Future: Dashboard analytics showing accuracy, efficiency metrics)

## State Machine

```
booting → speaking ("Loading mode activated")
    ↓
listening ← ← ← ← ← ← (default state, always resumable)
    ↑               ↓
    ├─ PAUSE ──────→ paused (awaiting "resume")
    │
    ├─ TRANSCRIPT FINALIZED
    │       ↓
    │ processing (brain.predict)
    │       ↓
    └─ PREDICTION_COMPLETE
            ├─ HIGH CONFIDENCE (>0.88)
            │       ↓
            │ confirming (4-sec auto-confirm window)
            │       ↓
            │ (user says "yes" OR timeout)
            ├─→ saved → ✓ package added
            │       ↓
            │ speaking ("Stop N locked. Next address.")
            │       ↓
            └─→ listening
            
            ├─ MEDIUM CONFIDENCE (0.5–0.88)
            │       ↓
            │ suggestion (show 3 alternatives)
            │       ↓
            │ (user says "option 1/2/3" OR selects)
            │       ↓
            │ confirming
            │       ↓
            └─→ saved
            
            ├─ LOW CONFIDENCE (<0.5)
            │       ↓
            │ error ("No match. Try again.")
            │       ↓
            └─→ listening (retry)
```

## Implementation Details

### State Management (React Reducer)
- **Predictable**: All state transitions explicit and testable
- **Debuggable**: Action log shows exact sequence of commands
- **Offline-ready**: Runs entirely in-memory; can batch-sync later

### Voice Input Hook (`useVoiceInput`)
- Wraps Web Speech API with error resilience
- Auto-restarts on network glitch
- Wake-lock integration (keeps screen awake during load)
- Interim + final transcript handling

### Sound Hook (`useSound`)
- Text-to-Speech (speaker feedback)
- Procedural audio (confidence-aware tones)
- Speaker selection (Google US English if available)
- Graceful fallback (no crash if audio unavailable)

### RouteBrain Integration
- Fuzzy address matching with learned aliases
- Stop number detection ("one", "two" → "1", "2")
- Entity extraction (package size, priority flags)
- Confidence scoring via Fuse.js

## UX Patterns

### Confidence Visualization
- **Animated ring** around mic icon expands with confidence
- **Progress bar** fills from 0–100% as prediction solidifies
- **Visual transition**: Listening → Processing → Confirming → Saved

### Error Recovery
- Soft errors (no speech) auto-dismiss after 2s
- Hard errors (permissions) show retry button
- Voice errors don't crash—gracefully fallback to manual entry

### Session History
- Sticky log footer shows last 10 packages
- Each entry animates in with success checkmark
- Cleared when session ends

## Future Enhancements

1. **Bulk operations**: "Skip next 5" / "Confirm all" for known stops
2. **Contextual awareness**: Learn frequent stops, suggest proactively
3. **Multi-language**: Spanish, Portuguese (common in rural US routes)
4. **Offline caching**: Load session persists if connection drops
5. **Accessibility**: Haptic feedback for deaf/hard-of-hearing carriers
6. **Wearable integration**: Smartwatch confidence display
7. **Route deviation detection**: Alert if carrier deviates from expected path

## Testing Checklist

- [ ] Voice input works on iOS Safari (essential for rural carriers)
- [ ] Bluetooth earbuds connect; audio routes correctly
- [ ] Offline mode degrades gracefully
- [ ] Wake-lock prevents screen sleep
- [ ] Fast/slow speech recognized equally
- [ ] Accent variance handled (fuzzy matching)
- [ ] 50+ packages loaded in single session without lag
- [ ] Session survives network interruption
- [ ] Dark mode contrast meets WCAG AA
- [ ] Touch targets ≥44px (accessibility)

## Performance Notes

- **Tree-shaking**: Unused icons/utilities stripped in prod build
- **Code-splitting**: LoadTruck lazy-loaded only when needed
- **Animation frame budgeting**: Framer Motion respects 60fps
- **Memory**: Session telemetry capped at 100 entries
- **Bundle impact**: +0 bytes (uses existing motion/audio libraries)

## Theme Integration

LoadTruck will receive rich theme support (Cyberpunk 2077 aesthetic planned):
- Neon cyan borders + scanlines
- Glitch effects on error states
- Holographic confidence visualization
- Font: monospace (Courier New fallback)

Current: Light/Dark theme compatible with all features.
