import React, { useEffect, useRef, useState } from 'react';

interface TerminalProps {
  logsRef: React.MutableRefObject<string[]>; // Read directly from mutable memory
  onClear: () => void;
}

export const CyberpunkTerminal: React.FC<TerminalProps> = ({ logsRef, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0); // Used only to trigger re-renders

  // 1. THE GAME LOOP
  // Force a re-render 20 times a second to visualize the Ref state.
  // This bypasses React's state batching for the data itself.
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 50); // 20fps is plenty for text
    return () => clearInterval(interval);
  }, []);

  // 2. Auto-scroll on tick
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tick]);

  // Safe slice of last 30 logs
  const visibleLogs = logsRef.current.slice(-30);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-100 border-t-2 border-brand bg-black/95 backdrop-blur-md font-mono text-[10px] leading-3 shadow-[0_-5px_20px_rgba(0,240,255,0.2)]">
      {/* Header */}
      <div className="flex justify-between items-center px-2 py-1 bg-brand/10 border-b border-brand/20">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
           <span className="text-brand font-bold tracking-widest">SYS.LOG // REALTIME</span>
        </div>
        <button onClick={onClear} className="text-brand/50 hover:text-brand uppercase hover:bg-brand/10 px-2 rounded transition-colors">CLR</button>
      </div>

      {/* Log Feed */}
      <div 
        ref={scrollRef}
        className="h-32 overflow-y-auto p-2 space-y-1 scrollbar-hide select-text"
      >
        {visibleLogs.map((log, i) => {
           const isError = log.includes('Error') || log.includes('Failed') || log.includes('Lost');
           const isSuccess = log.includes('Success') || log.includes('Confirmed') || log.includes('Loaded');
           const isHardware = log.includes('Mic') || log.includes('Audio') || log.includes('TTS');
           const isEvent = log.includes('Event');
           
           return (
             <div key={i} className={`wrap-break-word font-mono ${
                 isError ? 'text-[#ff003c] font-bold' : 
                 isSuccess ? 'text-[#0aff60]' : 
                 isHardware ? 'text-[#fcee0a]' : 
                 isEvent ? 'text-brand/50' :
                 'text-brand/80'
             }`}>
               <span className="opacity-30 mr-2 text-[9px]">[{i}]</span>
               {log}
             </div>
           );
        })}
        <div className="h-4" /> {/* Spacer */}
      </div>

      {/* Decorative Scanline */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-101 bg-size-[100%_2px,3px_100%] opacity-20"></div>
    </div>
  );
};