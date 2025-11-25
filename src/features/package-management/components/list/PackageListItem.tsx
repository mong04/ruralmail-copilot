import React from 'react';
import { type Package } from '../../../../db';
import { Edit, Box, Mail, Home, Hash } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SwipeableRow } from '../../../../components/ui/SwipeableRow';

interface PackageListItemProps {
  pkg: Package;
  onEdit: () => void;
  onDelete: () => void;
  isLast: boolean;
}

export const PackageListItem: React.FC<PackageListItemProps> = ({ pkg, onEdit, onDelete, isLast }) => {
  
  // Map size to Semantic Badge Variants implicitly via color classes
  const SizeConfig = {
    small: { icon: Mail, label: "Small / Envelope", bg: "bg-brand/10", text: "text-brand" },
    medium: { icon: Box, label: "Medium Box", bg: "bg-warning/10", text: "text-warning" },
    large: { icon: Home, label: "Large Parcel", bg: "bg-danger/10", text: "text-danger" }
  }[pkg.size] || { icon: Box, label: "Package", bg: "bg-surface-muted", text: "text-muted-foreground" };

  const Icon = SizeConfig.icon;
  const primaryText = pkg.notes || SizeConfig.label;
  const isNotePrimary = !!pkg.notes;

  const handleCopyTracking = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pkg.tracking) {
      navigator.clipboard.writeText(pkg.tracking);
      // Assuming parent handles toast or just silent copy
    }
  };

  return (
    <SwipeableRow 
      onEdit={onEdit} 
      onDelete={onDelete} 
      className={isLast ? "" : "border-b border-border/40"}
    >
      <div 
        onClick={onEdit}
        className="w-full flex items-center gap-4 py-3 px-4 bg-surface active:bg-surface-muted/50 transition-colors cursor-pointer relative group"
      >
        
        {/* 1. Visual Anchor (Icon) - SEMANTIC COLORS */}
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
          SizeConfig.bg,
          SizeConfig.text
        )}>
          <Icon size={20} strokeWidth={2.5} />
        </div>

        {/* 2. Information Cluster */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          
          {/* Primary Identifier */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-bold text-sm truncate",
              isNotePrimary ? "text-brand" : "text-foreground"
            )}>
              {primaryText}
            </span>
            {/* Context Badge */}
            {isNotePrimary && (
               <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-muted text-muted-foreground uppercase font-bold">
                 {pkg.size}
               </span>
            )}
          </div>

          {/* Secondary Metadata Row */}
          <div className="flex items-center gap-2">
             {pkg.tracking ? (
               <button 
                 onClick={handleCopyTracking}
                 className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-muted hover:bg-brand/10 text-[10px] font-mono text-muted-foreground hover:text-brand transition-colors border border-border/50"
               >
                 <Hash size={10} />
                 <span>•••• {pkg.tracking.slice(-4)}</span>
               </button>
             ) : (
               <span className="text-[10px] text-muted-foreground/40 italic">No Tracking</span>
             )}
          </div>
        </div>

        {/* 3. Subtle Action Hint */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30">
           <Edit size={14} />
        </div>

      </div>
    </SwipeableRow>
  );
};