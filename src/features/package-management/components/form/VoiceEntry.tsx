import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mic, X, AlertCircle, Keyboard, CheckCircle2 } from 'lucide-react';
import { RouteBrain, type Prediction } from '../../utils/RouteBrain';
import { useVoiceInput } from '../../../../hooks/useVoiceInput';
import { useSound } from '../../../../hooks/useSound';
import { type Stop, type Package } from '../../../../db';
import { Button } from '../../../../components/ui/Button';

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
  // 1. Initialize Brain
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  // 2. Mic & Sound
  // We use 'stop' to physically cut the mic during the countdown
  // We removed 'speak' because this view is designed for rapid, silent confirmation
  const { transcript, isProcessing, reset, stop } = useVoiceInput(true);
  const { playTone } = useSound(); 
  
  // 3. State
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<'listening' | 'processing' | 'error' | 'success'>('listening'); 
  const [timer, setTimer] = useState<number | null>(null);
  
  // 4. Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOGIC ---

  const handleConfirm = useCallback((finalPred: Prediction | null) => {
    const target = finalPred || prediction;
    if (target?.stop) {
      setStatus('success');
      playTone('success');

      if (target.source === 'fuzzy') {
        brain.learn(target.originalTranscript, target.stop.id);
      }

      onPackageConfirmed({
        assignedStopId: target.stop.id,
        assignedAddress: target.stop.full_address,
        assignedStopNumber: route.findIndex(r => r.id === target.stop?.id)
      });
      
      // Cleanup & Reset
      setPrediction(null);
      setTimer(null);
      setStatus('listening');
      // Reactivate mic for next entry
      reset(); 
    }
  }, [brain, onPackageConfirmed, route, prediction, reset, playTone]);

  // PREDICTION LOOP
  useEffect(() => {
    // GUARD: If countdown is active, ignore all input
    if (timer !== null) return; 

    if (isProcessing && transcript) {
      const cleanText = transcript.toLowerCase().trim();
      
      // 1. Cancel Commands
      if (['cancel', 'stop', 'no', 'wrong'].includes(cleanText)) {
         setPrediction(null); 
         setStatus('listening');
         playTone('error'); 
         reset(); 
         return;
      }

      setStatus('processing');
      
      const result = brain.predict(transcript);
      setPrediction(result);

      // 2. Low Confidence / No Match
      if (!result.stop || result.confidence < 0.4) {
        setStatus('error');
      }
    } else if (!isProcessing && !transcript && status !== 'error' && status !== 'success') {
        setStatus('listening');
    }
  }, [isProcessing, transcript, brain, playTone, reset, status, timer]);

  // AUTO-COMMIT LOGIC
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // If High Confidence Match...
    if (prediction?.stop && prediction.confidence > 0.85) {
      
      // 1. CUT THE MIC
      // This prevents the "Feedback Loop" and background noise processing
      stop(); 
      
      // 2. Visual Lock
      playTone('lock');
      
      // 3. Start Countdown
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

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
        setTimer(null);
    }
  }, [prediction, handleConfirm, playTone, stop]);

  // --- RENDER HELPERS ---

  const getStatusColor = () => {
    switch (status) {
        case 'error': return 'text-danger border-danger animate-pulse';
        case 'success': return 'text-success border-success';
        case 'processing': return 'text-brand border-brand animate-pulse';
        default: return 'text-brand border-brand';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-xl font-bold text-muted-foreground flex items-center gap-2">
            <Mic size={20} className="text-brand" /> Voice Input
        </h2>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="rounded-full hover:bg-danger/10 hover:text-danger"
        >
          <X size={24} />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        
        {/* Transcript */}
        <div className="text-center space-y-2 min-h-[100px] w-full max-w-lg">
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">Live Transcript</p>
          <p className="text-2xl md:text-3xl font-mono font-bold text-foreground wrap-break-word leading-tight">
            {transcript || <span className="opacity-20">Listening...</span>}
          </p>
        </div>

        {/* Match Card */}
        {prediction && prediction.stop && status !== 'error' ? (
          <div className="w-full max-w-md relative animate-in zoom-in-95 duration-200">
             
             <div className="relative w-full p-8 bg-surface border border-brand/50 flex flex-col items-center text-center shadow-2xl rounded-xl overflow-hidden">
                
                {/* Timer Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-surface-muted">
                    {timer !== null && (
                        <div 
                           className="h-full bg-brand transition-all duration-1000 ease-linear" 
                           style={{ width: `${(timer / 3) * 100}%` }} 
                        />
                    )}
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight mt-4">
                   {prediction.stop.full_address}
                </h3>
                
                <div className="mt-4 px-4 py-1 bg-success/10 text-success border border-success/30 rounded-full text-sm font-bold">
                  Stop #{route.findIndex(r => r.id === prediction.stop?.id) + 1}
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full mt-8">
                   <Button 
                     variant="ghost"
                     onClick={() => {
                        setTimer(null);
                        setPrediction(null);
                        // Reactivate Mic manually if they click Wrong
                        reset();
                     }}
                     className="flex-1 border border-border text-muted-foreground hover:text-foreground"
                   >
                     Wrong?
                   </Button>
                   
                   {(timer === null || timer > 0) && (
                      <Button 
                        variant="primary"
                        onClick={() => handleConfirm(prediction)}
                        className="flex-1 shadow-lg shadow-brand/20 gap-2"
                      >
                        <CheckCircle2 size={18} />
                        CONFIRM {timer !== null && `(${timer}s)`}
                      </Button>
                   )}
                </div>
            </div>
          </div>
        ) : (
          /* Idle Visual */
          <div className="relative mt-8">
             <div className={`absolute inset-0 rounded-full opacity-20 ${status === 'listening' ? 'animate-ping bg-brand' : ''}`}></div>
             <div className={`relative p-8 rounded-full border-2 ${getStatusColor()} transition-colors duration-300 bg-surface shadow-xl`}>
                {status === 'error' ? <AlertCircle size={48} /> : <Mic size={48} />}
             </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-auto flex justify-center pb-4">
         <Button 
            variant="ghost" 
            className="text-muted-foreground gap-2 hover:text-foreground" 
            onClick={() => onManualFallback(transcript)}
         >
            <Keyboard size={16} /> Switch to Manual Keyboard
         </Button>
      </div>
    </div>
  );
};