import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { savePackagesToDB, clearPackagesFromDB } from '../../store/packageSlice';
import { Save, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';

interface ActionBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const PackagesActionBar: React.FC<ActionBarProps> = ({ searchQuery, setSearchQuery }) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { packages } = useAppSelector((state) => state.packages);
  const [isSearchMode, setIsSearchMode] = useState(false);

  if (location.pathname !== '/packages') return null;

  return (
    <div className="sticky top-0 z-40 w-full">
      {/* SEMANTIC GLASS LAYER */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-b border-border shadow-sm support-[backdrop-filter]:bg-background/60" />
      
      <div className="relative max-w-md mx-auto flex items-center gap-3 h-16 px-4">
        <AnimatePresence mode="wait">
          {isSearchMode ? (
            <motion.div 
              key="search"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  autoFocus
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracking, address..."
                  // SEMANTIC INPUT STYLES
                  className="w-full bg-surface-muted text-foreground placeholder:text-muted-foreground rounded-full pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none border border-border transition-all"
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex justify-between items-center"
            >
              <span className="font-bold text-xl tracking-tight text-foreground">Mailbag</span>
              
              <div className="flex items-center gap-2">
                 <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsSearchMode(true)}
                    className="w-10 h-10 p-0 rounded-full bg-surface-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
                 >
                    <Search size={20} />
                 </Button>

                 <div className="w-px h-6 bg-border mx-1 opacity-50"></div>

                 <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch(savePackagesToDB(packages))}
                    disabled={packages.length === 0}
                    className="w-10 h-10 p-0 rounded-full text-brand hover:bg-brand/10 disabled:opacity-30"
                 >
                    <Save size={20} />
                 </Button>
                 
                 <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => { if(confirm('Clear all?')) dispatch(clearPackagesFromDB()) }}
                    className="w-10 h-10 p-0 rounded-full text-danger hover:bg-danger/10"
                 >
                    <Trash2 size={20} />
                 </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PackagesActionBar;