// src/features/package-management/components/NotesInput.tsx
import React from 'react';
import { type Package } from '../../../../db';
import { Button } from '../../../../components/ui/Button';

interface NotesInputProps {
  pkg: Partial<Package>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const quickTags = ['Bin 1', 'Bin 2', 'Front Seat', 'Back Door'];

const NotesInput: React.FC<NotesInputProps> = ({ pkg, handleInputChange, setPkg }) => {
  const handleTagClick = (tag: string) => {
    const currentNotes = pkg.notes || '';
    // Append tag if not already present
    if (!currentNotes.toLowerCase().includes(tag.toLowerCase())) {
      setPkg((prev) => ({
        ...prev,
        notes: currentNotes ? `${currentNotes}, ${tag}` : tag,
      }));
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        Load Location / Notes (Optional)
      </label>
      <textarea
        name="notes"
        value={pkg.notes || ''}
        onChange={handleInputChange}
        placeholder="e.g. Bin 3, Front Shelf or Fragile"
        className="w-full p-4 text-base border-2 border-border rounded-xl focus:ring-4 focus:ring-brand/30 focus:border-brand shadow-sm transition-all duration-300 min-h-20"
        rows={3}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {quickTags.map((tag) => (
          <Button
            key={tag}
            type="button"
            variant="surface"
            size="sm"
            onClick={() => handleTagClick(tag)}
          >
            + {tag}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default NotesInput;