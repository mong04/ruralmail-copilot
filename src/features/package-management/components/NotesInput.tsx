// src/features/package-management/components/NotesInput.tsx
import React from 'react';
import { type Package } from '../../../db';

interface NotesInputProps {
  pkg: Partial<Package>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const NotesInput: React.FC<NotesInputProps> = ({ pkg, handleInputChange }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-4">Notes (optional)</label>
      <input
        type="text"
        name="notes"
        value={pkg.notes || ''}
        onChange={handleInputChange}
        placeholder="Fragile - Signature required - COD $25"
        className="w-full p-5 text-lg border-2 border-border rounded-xl focus:ring-4 focus:ring-warning/30 focus:border-warning shadow-sm transition-all duration-300"
      />
    </div>
  );
};

export default NotesInput;