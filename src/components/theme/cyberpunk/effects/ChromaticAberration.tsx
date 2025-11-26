// src/components/theme/cyberpunk/effects/ChromaticAberration.tsx
export function ChromaticAberration({ intensity }: { intensity: "low" | "high" | "off"}) {
  if (intensity === "off") return null;

  const offset = intensity === "high" ? 1.5 : 0.8;

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Red channel — shifted right/down */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "rgba(255, 0, 100, 0.18)",
          transform: `translate(${offset}px, ${offset}px)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Cyan channel — shifted left/up */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "rgba(0, 255, 255, 0.18)",
          transform: `translate(${-offset}px, ${-offset}px)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}