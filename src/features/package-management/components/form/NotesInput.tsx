import React from 'react';
import { type Package } from '../../../../db';
import { Button } from '../../../../components/ui/Button';

interface NotesInputProps {
  pkg: Partial<Package>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const quickTags = ['Bin 1', 'Bin 2', 'Front Seat', 'Back Door', 'Heavy', 'Fragile'];

const NotesInput: React.FC<NotesInputProps> = ({ pkg, handleInputChange, setPkg }) => {
  const handleTagClick = (tag: string) => {
    const currentNotes = pkg.notes || '';
    if (!currentNotes.toLowerCase().includes(tag.toLowerCase())) {
      setPkg((prev) => ({
        ...prev,
        notes: currentNotes ? `${currentNotes}, ${tag}` : tag,
      }));
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">
        Notes / Location
      </label>
      <textarea
        name="notes"
        value={pkg.notes || ''}
        onChange={handleInputChange}
        placeholder="e.g. Bin 3, Front Shelf..."
        // SEMANTIC TEXTAREA
        className="w-full p-4 text-base bg-surface-muted text-foreground border border-border rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all min-h-20 placeholder:text-muted-foreground/50 resize-none"
        rows={3}
      />
      <div className="flex flex-wrap gap-2 mt-3">
        {quickTags.map((tag) => (
          <Button
            key={tag}
            type="button"
            variant="surface"
            size="sm"
            onClick={() => handleTagClick(tag)}
            className="text-xs h-8 rounded-lg bg-surface border-border hover:border-brand/50 hover:text-brand transition-colors"
          >
            + {tag}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default NotesInput;