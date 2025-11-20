import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mic, X, RefreshCw, Loader2 } from 'lucide-react';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { type Stop, type Package } from '../../../db';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface VoiceEntryProps {
  route: Stop[];
  onPackageConfirmed: (pkg: Partial<Package>) => void;
  onClose: () => void;
}

export const VoiceEntry: React.FC<VoiceEntryProps> = ({ route, onPackageConfirmed, onClose }) => {
  const brain = useMemo(() => new RouteBrain(route), [route]);
  const { transcript, isProcessing, reset } = useVoiceInput(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  
  // Auto-Commit State
  const [timer, setTimer] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Predict Logic
  useEffect(() => {
    if (isProcessing && transcript) {
      const result = brain.predict(transcript);
      setPrediction(result);
    }
  }, [isProcessing, transcript, brain]);

  // ✅ FIXED: Wrapped in useCallback to stabilize dependencies
  const handleConfirm = useCallback((finalPred: Prediction | null) => {
    const target = finalPred || prediction;
    if (target?.stop) {
      // Reinforce learning
      if (target.source === 'fuzzy') {
        brain.learn(target.originalTranscript, target.stop.id);
      }

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
  }, [brain, onPackageConfirmed, route, prediction, reset]);

  const handleReject = useCallback(() => {
    setPrediction(null);
    reset();
  }, [reset]);

  // 2. Auto-Commit Logic
  useEffect(() => {
    // Clear existing timer if prediction changes or is lost
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setTimer(null);
    }

    // Only auto-commit if we have a GOOD match
    if (prediction?.stop && prediction.confidence > 0.85) {
      let timeLeft = 3; // 3 Seconds to cancel
      setTimer(timeLeft);

      const interval = setInterval(() => {
        timeLeft -= 1;
        setTimer(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          handleConfirm(prediction); // Auto-fire!
        }
      }, 1000);

      timeoutRef.current = setTimeout(() => {
         // Redundant safety backup, interval handles the firing
      }, 3500);

      // Cleanup interval if user cancels/changes
      return () => {
        clearInterval(interval);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [prediction, handleConfirm]); // ✅ handleConfirm is now a stable dependency

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
              
              {/* The Auto-Commit Timer UI */}
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

              {/* Manual Overrides */}
              <div className="flex gap-4 pt-6">
                 <button 
                   onClick={handleReject}
                   className="flex-1 py-6 bg-danger/10 text-danger rounded-2xl font-bold text-xl flex items-center justify-center gap-2 active:bg-danger/20"
                 >
                   <X size={24} /> Cancel
                 </button>
                 
                 {(timer === null || timer <= 0) && (
                    <button 
                      onClick={() => handleConfirm(prediction)}
                      className="flex-1 py-6 bg-brand text-brand-foreground rounded-2xl font-bold text-xl flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                      <RefreshCw size={24} /> Save Now
                    </button>
                 )}
              </div>
            </div>
          </Card>
        ) : (
          /* Listening State */
          <div className="relative mt-8">
            <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000"></div>
            <div className="relative bg-brand text-brand-foreground p-10 rounded-full shadow-2xl">
               <Mic size={64} />
            </div>
            <p className="mt-8 text-center text-muted font-medium animate-pulse">
               Listening...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};