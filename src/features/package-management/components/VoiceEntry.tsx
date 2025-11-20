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
  const [status, setStatus] = useState<ViewStatus>('listening'); 
  
  const [timer, setTimer] = useState<number | null>(null);
  
  const delayRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 0. Start Blip
  useEffect(() => {
    playTone('start');
  }, [playTone]);

  // 1. Predict Logic
  useEffect(() => {
    if (isProcessing && transcript) {
      // ✅ NEW: Handle Explicit Cancel Commands
      const cleanText = transcript.toLowerCase().trim();
      if (cleanText === 'cancel' || cleanText === 'stop' || cleanText === 'no') {
         setPrediction(null); // This kills the Auto-Commit timer
         setStatus('listening');
         playTone('start'); // Polite blip
         reset(); // Clear input
         return;
      }

      setStatus('processing');
      
      const result = brain.predict(transcript);
      setPrediction(result);

      if (!result.stop || result.confidence < 0.4) {
        setStatus('error');
        playTone('error');

        const retryTimer = setTimeout(() => {
           setPrediction(null);
           setStatus('listening');
           reset(); 
        }, 2000);

        return () => clearTimeout(retryTimer);
      }
      
      else if (result.confidence <= 0.85) {
        playTone('start');
      }

    } else if (!isProcessing && !transcript) {
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
    if (delayRef.current) clearTimeout(delayRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    window.speechSynthesis.cancel();
    onManualFallback(transcript);
  };

// 4. Auto-Commit Logic (The "Magic" Sequence)
  useEffect(() => {
    if (delayRef.current) clearTimeout(delayRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(null);

    if (prediction?.stop && prediction.confidence > 0.85) {
      const validStop = prediction.stop; 
      
      // 1. Kill Mic
      stop();
      
      // 🔊 2. INSTANT FEEDBACK: "Lock-on" Chirp
      playTone('lock'); 

      // 3. Wait for Bluetooth/Audio driver...
      delayRef.current = setTimeout(() => {
        
        const conciseAddress = validStop.address_line1 || validStop.full_address || "Stop found";
        
        // 4. Robot Voice Verification
        speak(conciseAddress, () => {
           
           // 5. Re-open Mic for Commands ("Cancel")
           reset(); 
           
           // 6. Start Visual Timer
           let timeLeft = 3; 
           setTimer(timeLeft);

           intervalRef.current = setInterval(() => {
             timeLeft -= 1;
             setTimer(timeLeft);
             if (timeLeft <= 0) {
               if (intervalRef.current) clearInterval(intervalRef.current);
               handleConfirm(prediction); 
             }
           }, 1000);
        });
        
      }, 400); // The "Bluetooth Breath" delay

      return () => {
        if (delayRef.current) clearTimeout(delayRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [prediction, handleConfirm, speak, stop, reset, playTone]); // Added playTone

  // Render Helpers
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

        {prediction && prediction.stop && status !== 'error' ? (
          <Card className="w-full max-w-md p-6 border-4 border-brand bg-brand/5 transform transition-all duration-300 scale-105">
            <div className="text-center space-y-4">
              
              {timer !== null && timer > 0 ? (
                 <div className="flex items-center justify-center gap-2 text-brand font-bold animate-pulse">
                    <Loader2 className="animate-spin" />
                    Auto-saving in {timer}s...
                 </div>
              ) : (
                 <div className="h-6 text-muted font-medium">Verifying...</div>
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
                 
                 {(timer === null || timer > 0) && (
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
          <div className="relative mt-8 flex flex-col items-center gap-8">
            <div className="relative">
                {status === 'listening' && (
                    <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping duration-2000"></div>
                )}
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