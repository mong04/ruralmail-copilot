import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mic, X, RefreshCw, Loader2, Search, Keyboard, AlertCircle } from 'lucide-react';
import { RouteBrain, type Prediction } from '../utils/RouteBrain';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useSound } from '../../../hooks/useSound';
import { type Stop, type Package } from '../../../db';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface VoiceEntryProps {
  route: Stop[];
  onPackageConfirmed: (pkg: Partial<Package>) => void;
  onClose: () => void;
  onManualFallback: (transcript: string) => void;
}

type ViewStatus = 'listening' | 'processing' | 'error' | 'success';

export const VoiceEntry: React.FC<VoiceEntryProps> = ({ 
  route, 
  onPackageConfirmed, 
  onClose,
  onManualFallback 
}) => {
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  const { transcript, isProcessing, reset, stop } = useVoiceInput(true);
  const { speak, playTone } = useSound(); 
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<ViewStatus>('listening'); // ✅ NEW: Explicit Status
  
  const [timer, setTimer] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 0. Start Blip
  useEffect(() => {
    playTone('start');
  }, [playTone]);

  // 1. Predict Logic (Updated with Status)
  useEffect(() => {
    if (isProcessing && transcript) {
      setStatus('processing'); // Visual feedback immediately
      
      const result = brain.predict(transcript);
      setPrediction(result);

      // 🛑 FAILURE HANDLING
      if (!result.stop || result.confidence < 0.4) {
        setStatus('error'); // Turn UI Red
        playTone('error');

        // Auto-Retry after 2s
        const retryTimer = setTimeout(() => {
           setPrediction(null);
           setStatus('listening'); // Reset UI
           reset(); 
        }, 2000);

        return () => clearTimeout(retryTimer);
      }
      
      // ⚠️ AMBIGUOUS (40% - 85%)
      else if (result.confidence <= 0.85) {
        playTone('start'); // Polite blip
        // Status remains 'processing' or we could add 'ambiguous'
      }

    } else if (!isProcessing && !transcript) {
        // If we just reset, go back to listening
        if (status !== 'error') setStatus('listening');
    }
  }, [isProcessing, transcript, brain, playTone, reset, status]);

  // 2. Confirm Handler
  const handleConfirm = useCallback((finalPred: Prediction | null) => {
    const target = finalPred || prediction;
    if (target?.stop) {
      setStatus('success');
      if (target.source === 'fuzzy') {
        brain.learn(target.originalTranscript, target.stop.id);
      }

      playTone('success');

      onPackageConfirmed({
        assignedStopId: target.stop.id,
        assignedAddress: target.stop.full_address,
        assignedStopNumber: route.findIndex(r => r.id === target.stop?.id)
      });
      
      setPrediction(null);
      setStatus('listening');
      reset(); 
    }
  }, [brain, onPackageConfirmed, route, prediction, reset, playTone]);

  // 3. Manual Fallback
  const handleManualFallback = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    window.speechSynthesis.cancel();
    onManualFallback(transcript);
  };

  // 4. Auto-Commit Logic
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setTimer(null);
    }

    if (prediction?.stop && prediction.confidence > 0.85) {
      const validStop = prediction.stop; 
      stop();

      // Wait for audio cleanup
      const audioDelay = setTimeout(() => {
        const conciseAddress = validStop.address_line1 || validStop.full_address || "Stop found";
        speak(conciseAddress);
      }, 150);

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

      return () => {
        clearInterval(interval);
        clearTimeout(audioDelay);
      };
    }
  }, [prediction, handleConfirm, speak, stop]);

  // --- RENDER HELPERS ---
  
  // Helper to determine the "Mic Circle" color
  const getCircleColor = () => {
    switch (status) {
        case 'error': return 'bg-danger text-danger-foreground';
        case 'success': return 'bg-success text-success-foreground';
        case 'processing': return 'bg-brand text-brand-foreground animate-pulse';
        default: return 'bg-brand text-brand-foreground';
    }
  };

  const getStatusText = () => {
      switch (status) {
          case 'error': return 'No match found. Retrying...';
          case 'processing': return 'Checking route...';
          case 'success': return 'Saved!';
          default: return 'Listening...';
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Voice Mode</h2>
        <button onClick={onClose} className="p-4 bg-surface-muted rounded-full active:scale-95 transition">
          <X size={32} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        
        <div className="text-center space-y-2">
          <p className="text-muted text-lg">I heard...</p>
          <p className="text-3xl font-mono font-bold text-foreground min-h-12">
            {transcript || "..."}
          </p>
        </div>

        {/* SHOW RESULT CARD only if we have a valid stop AND we are not in error state */}
        {prediction && prediction.stop && status !== 'error' ? (
          <Card className="w-full max-w-md p-6 border-4 border-brand bg-brand/5 transform transition-all duration-300 scale-105">
            <div className="text-center space-y-4">
              
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
          /* LISTENING / ERROR STATE */
          <div className="relative mt-8 flex flex-col items-center gap-8">
            <div className="relative">
                {/* Pulse animation only when listening normally */}
                {status === 'listening' && (
                    <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000"></div>
                )}
                
                {/* The Main Circle - Changes Color based on Status */}
                <div className={`relative p-10 rounded-full shadow-2xl transition-colors duration-300 ${getCircleColor()}`}>
                   {status === 'error' ? <AlertCircle size={64} /> : <Mic size={64} />}
                </div>
            </div>
            
            <div className="space-y-4 text-center">
                <p className={`font-medium text-lg ${status === 'error' ? 'text-danger' : 'text-muted'}`}>
                   {getStatusText()}
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