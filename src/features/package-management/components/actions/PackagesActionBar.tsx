import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { savePackagesToDB, clearPackagesFromDB } from '../../store/packageSlice';
import { Save, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { CyberpunkText } from '../../../../components/theme/cyberpunk/CyberpunkText'; // Import the effect
import { cn } from '../../../../lib/utils';

interface ActionBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const PackagesActionBar: React.FC<ActionBarProps> = ({ searchQuery, setSearchQuery }) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { packages } = useAppSelector((state) => state.packages);
  const { theme, richThemingEnabled } = useAppSelector((state) => state.settings);
  const [isSearchMode, setIsSearchMode] = useState(false);

  if (location.pathname !== '/packages') return null;

  const isCyberpunk = theme === 'cyberpunk';
  const isRich = isCyberpunk && richThemingEnabled;

  return (
    <div className="sticky top-0 z-40 w-full select-none">
      {/* SEMANTIC GLASS LAYER */}
      <div className={cn(
        "absolute inset-0 border-b shadow-sm backdrop-blur-md transition-colors",
        isCyberpunk 
          ? "bg-black/90 border-brand/30 shadow-[0_5px_15px_rgba(0,0,0,0.5)]" 
          : "bg-background/80 border-border"
      )} />
      
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
                  placeholder={isCyberpunk ? "SEARCH_MANIFEST..." : "Search tracking, address..."}
                  className={cn(
                    "w-full rounded-full pl-9 pr-4 py-2 text-sm outline-none border transition-all",
                    isCyberpunk
                      ? "bg-black/60 border-brand/50 text-brand placeholder:text-brand/40 focus:ring-1 focus:ring-brand"
                      : "bg-surface-muted text-foreground placeholder:text-muted-foreground border-border focus:ring-2 focus:ring-brand"
                  )}
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setIsSearchMode(false); setSearchQuery(''); }}
                className={cn(
                  "shrink-0", 
                  isCyberpunk ? "text-brand hover:bg-brand/10" : "text-muted-foreground hover:text-foreground"
                )}
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
              {/* --- TITLE SECTION WITH ENCRYPTION EFFECT --- */}
              {isRich ? (
                <div className="flex flex-col leading-none">
                   <CyberpunkText 
                      as="span" 
                      text="CARGO MANIFEST" 
                      className="font-black font-mono text-xl tracking-tighter text-brand drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                      scrambleSpeed={40}
                   />
                   <span className="text-[10px] font-mono text-brand/60 tracking-[0.3em] mt-1">
                      SECURE_LINK
                   </span>
                </div>
              ) : (
                <span className={cn(
                  "font-bold text-xl tracking-tight",
                  isCyberpunk ? "text-brand" : "text-foreground"
                )}>
                  Mailbag
                </span>
              )}
              
              <div className="flex items-center gap-2">
                 <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsSearchMode(true)}
                    className={cn(
                      "w-10 h-10 p-0 rounded-full transition-all",
                      isCyberpunk 
                        ? "text-brand hover:bg-brand/10 hover:text-brand-foreground" 
                        : "bg-surface-muted text-muted-foreground hover:text-foreground"
                    )}
                 >
                    <Search size={20} />
                 </Button>

                 <div className={cn(
                   "w-px h-6 mx-1", 
                   isCyberpunk ? "bg-brand/30" : "bg-border"
                 )} />

                 <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch(savePackagesToDB(packages))}
                    disabled={packages.length === 0}
                    className={cn(
                      "w-10 h-10 p-0 rounded-full transition-all disabled:opacity-30",
                      isCyberpunk
                        ? "text-brand hover:bg-brand/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        : "text-brand hover:bg-brand/10"
                    )}
                 >
                    <Save size={20} />
                 </Button>
                 
                 <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => { if(confirm('Clear all?')) dispatch(clearPackagesFromDB()) }}
                    className={cn(
                      "w-10 h-10 p-0 rounded-full transition-all",
                      isCyberpunk
                        ? "text-danger hover:bg-danger/20 hover:shadow-[0_0_15px_rgba(255,0,60,0.3)]"
                        : "text-danger hover:bg-danger/10"
                    )}
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