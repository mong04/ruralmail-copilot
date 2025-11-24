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
    <div className="flex gap-3 pt-2">
      <Button
        variant="surface"
        size="lg"
        type="button"
        onClick={onCancel}
        className="flex-1 h-14 text-lg font-bold text-muted-foreground hover:text-foreground"
      >
        {formContext === 'scan' ? (
          <>
            <RotateCcw className="mr-2 h-5 w-5" strokeWidth={2.5} />
            Rescan
          </>
        ) : (
          <>
            <X className="mr-2 h-5 w-5" strokeWidth={2.5} />
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
        className="flex-1 h-14 text-lg font-black tracking-wide shadow-xl shadow-brand/20"
      >
        <Check className="mr-2 h-6 w-6" strokeWidth={3} />
        {formContext === 'edit' ? 'Save' : 'Add Pkg'}
      </Button>
    </div>
  );
};

export default ActionButtons;