// src/lib/theme-fx.ts

// A typesafe event bus for UI effects
type FxType = 'package-delivered' | 'navigation-start' | 'navigation-end' | 'error';

export interface FxEventDetail {
  type: FxType;
  rect?: DOMRect; // Optional position for localized effects (sparks)
}

export const triggerThemeFx = (type: FxType, element?: HTMLElement | null) => {
  const rect = element?.getBoundingClientRect();
  
  const event = new CustomEvent<FxEventDetail>('ruralmail-fx', {
    detail: { type, rect },
  });
  
  window.dispatchEvent(event);
};