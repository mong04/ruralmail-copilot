export function Scanlines({ intensity }: { intensity: "low" | "high" }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none mix-blend-multiply opacity-40"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)",
        animation: intensity === "high" 
          ? "crt-flicker 4s infinite steps(1)" 
          : "crt-flicker 8s infinite steps(1)",
      }}
    />
  );
}