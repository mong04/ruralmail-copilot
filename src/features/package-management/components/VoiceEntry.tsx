import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mic, X, RefreshCw, Loader2, Search, Keyboard } from 'lucide-react';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useSound } from '../../../hooks/useSound'; // ✅ Import Sound Hook
import { type Stop, type Package } from '../../../db';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface VoiceEntryProps {
  route: Stop[];
  onPackageConfirmed: (pkg: Partial<Package>) => void;
  onClose: () => void;
  onManualFallback: (transcript: string) => void;
}

export const VoiceEntry: React.FC<VoiceEntryProps> = ({ 
  route, 
  onPackageConfirmed, 
  onClose,
  onManualFallback 
}) => {
  const brain = useMemo(() => new RouteBrain(route), [route]);
  const { transcript, isProcessing, reset } = useVoiceInput(true);
  const { speak, playTone } = useSound(); // ✅ Init Sound
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  
  // Auto-Commit State
  const [timer, setTimer] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 0. Play Start Blip on Mount
  useEffect(() => {
    playTone('start');
  }, [playTone]);

  // 1. Predict Logic
  useEffect(() => {
    if (isProcessing && transcript) {
      const result = brain.predict(transcript);
      setPrediction(result);
    }
  }, [isProcessing, transcript, brain]);

  // 2. Confirm Handler
  const handleConfirm = useCallback((finalPred: Prediction | null) => {
    const target = finalPred || prediction;
    if (target?.stop) {
      // Reinforce learning if it was a fuzzy match
      if (target.source === 'fuzzy') {
        brain.learn(target.originalTranscript, target.stop.id);
      }

      // 🔊 Play Success Tone
      playTone('success');

      // Send back to parent
      onPackageConfirmed({
        assignedStopId: target.stop.id,
        assignedAddress: target.stop.full_address,
        assignedStopNumber: route.findIndex(r => r.id === target.stop?.id)
      });
      
      // Reset for the NEXT package
      setPrediction(null);
      reset(); 
    }
  }, [brain, onPackageConfirmed, route, prediction, reset, playTone]);

  // 3. Manual Fallback Handler
  const handleManualFallback = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onManualFallback(transcript);
  };

  // 4. Auto-Commit Logic
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setTimer(null);
    }

    // Only auto-commit if we have a GOOD match
    if (prediction?.stop && prediction.confidence > 0.85) {
      // 🔊 Speak the address (with fallback string to fix TS error)
      speak(prediction.stop.full_address || "Stop found");

      let timeLeft = 3; 
      setTimer(timeLeft);

      const interval = setInterval(() => {
        timeLeft -= 1;
        setTimer(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          handleConfirm(prediction); 
        }
      }, 1000);

      // Cleanup
      return () => {
        clearInterval(interval);
      };
    }
  }, [prediction, handleConfirm, speak]); // ✅ Added 'speak' dependency

  return (
    <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Voice Mode</h2>
        <button onClick={onClose} className="p-4 bg-surface-muted rounded-full active:scale-95 transition">
          <X size={32} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        
        {/* Transcript Display */}
        <div className="text-center space-y-2">
          <p className="text-muted text-lg">I heard...</p>
          <p className="text-3xl font-mono font-bold text-foreground min-h-12">
            {transcript || "..."}
          </p>
        </div>

        {/* Result Card */}
        {prediction && prediction.stop ? (
          <Card className="w-full max-w-md p-6 border-4 border-brand bg-brand/5 transform transition-all duration-300 scale-105">
            <div className="text-center space-y-4">
              
              {/* Auto-Commit Timer */}
              {timer !== null && timer > 0 && (
                 <div className="flex items-center justify-center gap-2 text-brand font-bold animate-pulse">
                    <Loader2 className="animate-spin" />
                    Auto-saving in {timer}s...
                 </div>
              )}

              <div>
                <h3 className="text-3xl font-bold text-foreground leading-tight">
                   {prediction.stop.full_address}
                </h3>
                <Badge variant="success" className="mt-2 text-lg px-3 py-1">
                  Stop #{route.findIndex(r => r.id === prediction.stop?.id) + 1}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6">
                 <button 
                   onClick={handleManualFallback}
                   className="flex-1 py-6 bg-surface-muted text-foreground rounded-2xl font-bold text-xl flex items-center justify-center gap-2 active:bg-surface-muted/80 transition-colors"
                 >
                   <Search size={24} /> Search
                 </button>
                 
                 {(timer === null || timer <= 0) && (
                    <button 
                      onClick={() => handleConfirm(prediction)}
                      className="flex-1 py-6 bg-brand text-brand-foreground rounded-2xl font-bold text-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                    >
                      <RefreshCw size={24} /> Save Now
                    </button>
                 )}
              </div>
            </div>
          </Card>
        ) : (
          /* Listening State */
          <div className="relative mt-8 flex flex-col items-center gap-8">
            <div className="relative">
                <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000"></div>
                <div className="relative bg-brand text-brand-foreground p-10 rounded-full shadow-2xl">
                   <Mic size={64} />
                </div>
            </div>
            
            <div className="space-y-4 text-center">
                <p className="text-muted font-medium animate-pulse">
                   Listening...
                </p>
                
                <button 
                    onClick={handleManualFallback}
                    className="text-muted hover:text-foreground font-semibold flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent hover:border-border transition-all"
                >
                    <Keyboard size={20} /> Switch to Manual
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};