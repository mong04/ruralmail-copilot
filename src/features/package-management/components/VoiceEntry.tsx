import React, { useEffect, useState, useMemo } from 'react';
import { Mic, Check, X, RefreshCw } from 'lucide-react';
import { RouteBrain, type Prediction } from '../utils/RouteBrain'; // Import from Step 2
import { useVoiceInput } from '../../../hooks/useVoiceInput'; // Import from Step 3
import { type Stop, type Package } from '../../../db';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface VoiceEntryProps {
  route: Stop[];
  onPackageConfirmed: (pkg: Partial<Package>) => void;
  onClose: () => void;
}

export const VoiceEntry: React.FC<VoiceEntryProps> = ({ route, onPackageConfirmed, onClose }) => {
  // Initialize Brain once
  const brain = useMemo(() => new RouteBrain(route), [route]);
  
  const { transcript, isProcessing, reset } = useVoiceInput(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  // Effect: When transcript becomes "Final" (isProcessing), ask the Brain
  useEffect(() => {
    if (isProcessing && transcript) {
      const result = brain.predict(transcript);
      setPrediction(result);
    }
  }, [isProcessing, transcript, brain]);

  const handleConfirm = () => {
    if (prediction?.stop) {
      // Teach the brain if it was a fuzzy match (reinforcement)
      if (prediction.source === 'fuzzy') {
        brain.learn(transcript, prediction.stop.id);
      }

      onPackageConfirmed({
        assignedStopId: prediction.stop.id,
        assignedAddress: prediction.stop.full_address,
        assignedStopNumber: route.findIndex(r => r.id === prediction.stop?.id)
      });
    }
  };

  const handleReject = () => {
    setPrediction(null);
    reset(); // Listen again
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col p-6 animate-in fade-in">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Voice Entry</h2>
        <button onClick={onClose} className="p-2 bg-surface-muted rounded-full">
          <X size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        
        {/* 1. The "Heard" Text */}
        <div className="text-center space-y-2">
          <p className="text-muted text-lg">I heard...</p>
          <p className="text-3xl font-mono font-bold text-foreground min-h-[2.5rem]">
            {transcript || "..."}
          </p>
        </div>

        {/* 2. The "Result" Card */}
        {prediction && prediction.stop ? (
          <Card className="w-full max-w-md p-6 border-2 border-brand bg-brand/5">
            <div className="text-center space-y-4">
              <Badge variant="success" className="mb-2">
                {Math.round(prediction.confidence * 100)}% Match
              </Badge>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground">
                   {prediction.stop.full_address}
                </h3>
                {/* Hiding Stop Number as requested, but keeping ID for debugging if needed */}
              </div>

              <div className="flex gap-4 pt-4">
                 <button 
                   onClick={handleReject}
                   className="flex-1 py-4 bg-surface-muted rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                 >
                   <RefreshCw size={20} /> Retry
                 </button>
                 <button 
                   onClick={handleConfirm}
                   className="flex-1 py-4 bg-brand text-brand-foreground rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
                 >
                   <Check size={20} /> Confirm
                 </button>
              </div>
            </div>
          </Card>
        ) : (
          /* 3. The Listening State */
          <div className="relative mt-8">
            <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping"></div>
            <div className="relative bg-brand text-brand-foreground p-8 rounded-full shadow-2xl">
               <Mic size={48} />
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center text-muted mt-auto">
        {isProcessing ? "Processing..." : "Listening for address..."}
      </div>
    </div>
  );
};