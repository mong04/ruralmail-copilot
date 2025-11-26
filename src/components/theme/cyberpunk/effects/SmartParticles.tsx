import { useRef, useEffect } from 'react';

export function SmartParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.6;

    const particles = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 4 + 1,
      life: 1,
      color: Math.random() > 0.5 ? "#ff0066" : "#00ff99",
    }));

    let frame = 0;
    const animate = () => {
      frame++;
      if (frame % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.005;

          if (p.life <= 0 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            p.x = Math.random() * canvas.width;
            p.y = Math.random() * canvas.height;
            p.life = 1;
          }

          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);

          // Occasional glitch spark
          if (Math.random() < 0.02) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
          }
        });
      }
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-30 mix-blend-screen"
      style={{ imageRendering: "pixelated", transform: "translateZ(0)" }}
    />
  );
}