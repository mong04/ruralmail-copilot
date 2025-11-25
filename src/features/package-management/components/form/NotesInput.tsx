import React from 'react';
import { type Package } from '../../../../db';
import { Button } from '../../../../components/ui/Button';
import { useAppSelector } from '../../../../store';
import { cn } from '../../../../lib/utils';

interface NotesInputProps {
  pkg: Partial<Package>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const quickTags = ['Bin 1', 'Bin 2', 'Front Seat', 'Back Door', 'Heavy', 'Fragile'];

const NotesInput: React.FC<NotesInputProps> = ({ pkg, handleInputChange, setPkg }) => {
  const theme = useAppSelector((state) => state.settings.theme);
  const isCyberpunk = theme === 'cyberpunk';

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
      <label className={cn(
        "block text-xs font-bold uppercase tracking-wider mb-2 ml-1",
        isCyberpunk ? "text-brand/70" : "text-muted-foreground"
      )}>
        Notes / Location
      </label>
      
      <textarea
        name="notes"
        value={pkg.notes || ''}
        onChange={handleInputChange}
        placeholder="e.g. Bin 3, Front Shelf..."
        className={cn(
          "w-full p-4 text-base rounded-xl outline-none transition-all duration-300 min-h-20 resize-none",
          // SEMANTIC GLOW
          isCyberpunk
            ? "bg-black/60 text-brand border border-brand/30 focus:border-brand focus:shadow-[0_0_25px_var(--brand-10)] placeholder:text-brand/30"
            : "bg-surface-muted text-foreground border border-border focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder:text-muted-foreground/50"
        )}
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
            className={cn(
              "text-xs h-8 rounded-lg transition-all duration-300",
              isCyberpunk
                // Inactive: Neutral Grey wireframe. Hover: Glows Brand Color.
                ? "bg-black/40 border-white/10 text-muted-foreground hover:bg-brand/10 hover:border-brand hover:text-brand hover:shadow-[0_0_15px_var(--brand-10)]"
                : "bg-surface border-border hover:border-brand/50 hover:text-brand"
            )}
          >
            + {tag}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default NotesInput;