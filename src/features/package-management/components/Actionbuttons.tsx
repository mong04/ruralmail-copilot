// src/features/package-management/components/ActionButtons.tsx
import React from 'react';
import { RotateCcw, X, Check } from 'lucide-react';

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
    <div className="flex space-x-4 pt-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 bg-linear-to-r from-muted to-subtle text-foreground py-5 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
      >
        {formContext === 'scan' ? (
          <>
            <RotateCcw className="mr-3" size={20} />
            Rescan
          </>
        ) : (
          <>
            <X className="mr-3" size={20} />
            Cancel
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="flex-1 bg-linear-to-r from-success to-success text-success-foreground py-5 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-muted disabled:to-subtle disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Check className="mr-3" size={20} />
        {formContext === 'edit' ? 'Save Changes' : 'Add Package'}
      </button>
    </div>
  );
};

export default ActionButtons;