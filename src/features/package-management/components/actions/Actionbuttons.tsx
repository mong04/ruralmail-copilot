import React from 'react';
import { RotateCcw, X, Check } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

interface ActionButtonsProps {
  formContext: 'scan' | 'manual' | 'edit';
  onCancel: () => void;
  onSubmit: () => void;
  disabled: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  formContext,
  onCancel,
  onSubmit,
  disabled,
}) => {
  return (
    <div className="flex gap-4 pt-4">
      <Button
        variant="ghost"
        size="lg"
        type="button"
        onClick={onCancel}
        // Removed 'uppercase tracking-wider'. 
        // Hover state remains semantic (danger = red) which is standard for Cancel actions.
        className="flex-1 font-bold text-muted-foreground hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all"
      >
        {formContext === 'scan' ? (
          <>
            <RotateCcw className="mr-2 h-5 w-5" />
            Rescan
          </>
        ) : (
          <>
            <X className="mr-2 h-5 w-5" />
            Cancel
          </>
        )}
      </Button>
      
      <Button
        variant="primary"
        size="lg"
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        // Using shadow-brand/20 is safe. 
        // In Light Mode: Subtle blue shadow. In Cyberpunk: Neon Cyan glow.
        className="flex-1 font-black shadow-lg shadow-brand/20 hover:shadow-brand/40"
      >
        <Check className="mr-2 h-6 w-6" strokeWidth={3} />
        {formContext === 'edit' ? 'Save Data' : 'Add Cargo'}
      </Button>
    </div>
  );
};

export default ActionButtons;