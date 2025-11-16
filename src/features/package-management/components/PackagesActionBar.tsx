import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store';
import { savePackagesToDB, clearPackagesFromDB } from '../packageSlice';
import { Button } from '../../../components/ui/Button';
import { Save, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const PackagesActionBar: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { packages } = useAppSelector((state) => state.packages);

  const isVisible = location.pathname === '/packages';

  const handleSave = () => {
    dispatch(savePackagesToDB(packages));
  };

  const handleClear = () => {
    if (window.confirm('Clear all packages? This cannot be undone.')) {
      dispatch(clearPackagesFromDB());
    }
  };

  return (
    <div
      className={cn(
        'sticky bottom-[72px] w-full bg-surface/95 backdrop-blur border-t border-border transition-transform duration-300',
        // ✅ THE FIX:
        // When visible: show at z-30
        // When hidden: move down *and* send to z-[-10] to go *behind* the page content
        isVisible ? 'translate-y-0 z-30' : 'translate-y-full -z-10'
      )}
      // 72px is the height of the BottomNav (h-12 + p-3*2)
    >
      <div className="max-w-md mx-auto p-4">
        <div className="flex gap-3">
          <Button onClick={handleClear} variant="danger" className="flex-1">
            <Trash2 className="mr-2" size={16} /> Clear All
          </Button>
          <Button
            onClick={handleSave}
            disabled={packages.length === 0}
            variant="primary"
            className="flex-1"
          >
            <Save className="mr-2" size={16} /> Save Packages
          </Button>
        </div>
      </div>
    </div>
  );
};