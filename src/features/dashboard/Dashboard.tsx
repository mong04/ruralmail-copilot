import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Card } from '../../components/ui/Card';
import { CyberpunkText } from '../../components/theme/cyberpunk/CyberpunkText';
import { 
  List, 
  Mails, 
  Settings, 
  Truck, 
  MapPin, 
  Activity, 
  Zap,
  ShieldCheck,
  ChevronRight 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const getDashboardContent = (theme: string, richEnabled: boolean) => {
  const isCyberpunk = theme === 'cyberpunk' && richEnabled;

  if (isCyberpunk) {
    return {
      greeting: "SYSTEM READY",
      subtext: "DRIVER_UPLINK_ESTABLISHED",
      actions: {
        start: "INITIATE RUN",
        mailbag: "CARGO MANIFEST",
        route: "NAV VECTORS",
        settings: "SYS CONFIG",
      },
      status: {
        title: "VEHICLE TELEMETRY",
        row1: "DATA LINK",
        row1Value: "SECURE",
        row2: "GPS SIGNAL",
        row2Value: "LOCKED",
      }
    };
  }

  return {
    greeting: "RuralMail",
    subtext: "Ready for your route?",
    actions: {
      start: "Start Delivery",
      mailbag: "Mailbag",
      route: "Route Setup",
      settings: "Settings",
    },
    status: {
      title: "Shift Status",
      row1: "Manifest",
      row1Value: "Ready",
      row2: "Tracking",
      row2Value: "Active",
    }
  };
};

const Dashboard: React.FC = () => {
  const { theme, richThemingEnabled } = useAppSelector((state) => state.settings);
  
  const content = useMemo(() => 
    getDashboardContent(theme || 'light', richThemingEnabled ?? true), 
  [theme, richThemingEnabled]);
  
  const isCyberpunkTheme = theme === 'cyberpunk';
  const isRich = isCyberpunkTheme && richThemingEnabled;

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6 pb-32 space-y-5 select-none">
      
      {/* 1. HEADER - Big & Clear */}
      <div className="text-center space-y-1 pt-2">
        {isRich ? (
          <CyberpunkText 
            text={content.greeting} 
            as="h1" 
            className="text-3xl sm:text-4xl font-black tracking-tighter text-brand drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]" 
          />
        ) : (
          <h1 className={cn("text-3xl font-bold tracking-tight", isCyberpunkTheme ? "text-brand" : "text-foreground")}>
            {content.greeting}
          </h1>
        )}
        <p className={cn(
          "text-sm font-medium",
          isRich ? "text-brand/80 font-mono tracking-widest uppercase" : "text-muted-foreground"
        )}>
          {content.subtext}
        </p>
      </div>

      {/* 2. HERO ACTION - Massive Target */}
      <Link to="/delivery" className="group relative block w-full">
         {isRich && (
            <div className="absolute inset-0 bg-brand/20 blur-xl rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
         )}
         
         <div className={cn(
           "relative flex flex-col items-center justify-center h-32 rounded-2xl border transition-all duration-300 active:scale-[0.98]",
           isCyberpunkTheme
             ? "bg-black border-brand text-brand shadow-[0_0_20px_rgba(0,240,255,0.15)] group-hover:bg-brand/10" 
             : "bg-brand text-brand-foreground border-transparent shadow-lg shadow-brand/20 hover:bg-brand/90"
         )}>
            <Truck size={48} strokeWidth={isRich ? 1.5 : 2.5} className="mb-2" />
            <span className={cn(
              "text-2xl font-black",
              isRich ? "font-mono tracking-[0.2em]" : "tracking-wide"
            )}>
              {content.actions.start}
            </span>
            
            {isRich && (
              <>
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brand" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-brand" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-brand" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brand" />
              </>
            )}
         </div>
      </Link>

      {/* 3. PRIMARY GRID - Large Icons, Readable Text */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Mailbag */}
        <Link to="/packages" className="col-span-1">
          <Card className={cn(
            "h-40 p-0 hover:border-brand/50 transition-colors group",
            "flex flex-col items-center justify-center gap-4",
            isRich ? "bg-black/50" : "bg-surface"
          )}>
            <div className={cn(
              "flex items-center justify-center transition-transform group-hover:scale-110 duration-300 mb-1",
              "w-20 h-20 rounded-3xl", // Increased Icon Container Size
              isCyberpunkTheme 
                ? "bg-transparent text-brand border border-brand/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]" 
                : "bg-surface-muted text-brand"
            )}>
               <Mails size={40} strokeWidth={isRich ? 1.5 : 2} />
            </div>
            <span className={cn(
              "font-bold text-center px-2 leading-tight",
              // Font size bumped for glanceability
              "text-base sm:text-lg", 
              isRich ? "font-mono text-brand/90 tracking-wider" : "text-foreground"
            )}>
              {content.actions.mailbag}
            </span>
          </Card>
        </Link>

        {/* Route Setup */}
        <Link to="/route-setup" className="col-span-1">
           <Card className={cn(
            "h-40 p-0 hover:border-warning/50 transition-colors group",
            "flex flex-col items-center justify-center gap-4",
            isRich ? "bg-black/50" : "bg-surface"
          )}>
            <div className={cn(
              "flex items-center justify-center transition-transform group-hover:scale-110 duration-300 mb-1",
              "w-20 h-20 rounded-3xl",
              isCyberpunkTheme 
                ? "bg-transparent text-warning border border-warning/30 shadow-[0_0_15px_rgba(252,238,10,0.1)]" 
                : "bg-surface-muted text-warning"
            )}>
               <List size={40} strokeWidth={isRich ? 1.5 : 2} />
            </div>
            <span className={cn(
              "font-bold text-center px-2 leading-tight",
              "text-base sm:text-lg",
              isRich ? "font-mono text-warning/90 tracking-wider" : "text-foreground"
            )}>
              {content.actions.route}
            </span>
          </Card>
        </Link>

        {/* Settings - Full Width Bar */}
        <Link to="/settings" className="col-span-2">
           <Card className={cn(
            "h-24 px-6 hover:border-muted-foreground/50 transition-colors group",
            "flex flex-row items-center", 
            isRich ? "bg-black/50" : "bg-surface"
          )}>
            <div className="flex items-center justify-center gap-5 w-full relative">
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center transition-transform group-hover:rotate-90 duration-500",
                  "p-3 rounded-xl",
                  isCyberpunkTheme
                    ? "bg-transparent text-muted-foreground border border-border/30"
                    : "bg-surface-muted text-muted-foreground"
                )}>
                  <Settings size={32} />
                </div>
                
                {/* Text - Bold & Large */}
                <span className={cn(
                  "font-bold truncate max-w-[60%]",
                  isRich 
                    ? "font-mono text-muted-foreground tracking-widest text-2xl" 
                    : "text-xl text-foreground"
                )}>
                  {content.actions.settings}
                </span>

                {/* Chevron */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    {isCyberpunkTheme ? (
                       <ChevronRight size={32} className="text-muted-foreground group-hover:text-brand transition-colors" />
                    ) : (
                       <div className="w-3 h-3 rounded-full bg-success ring-4 ring-success/20" />
                    )}
                </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* 4. STATUS READOUT - High Contrast & Larger Text */}
      <Card className={cn(
        "p-5 sm:p-6 space-y-4",
        // Added extra padding bottom for Cyberpunk mode to clear decorators
        isRich ? "bg-black/40 border-dashed border-border pb-12" : "bg-surface/50"
      )}>
        <h3 className={cn(
          "text-sm font-bold uppercase tracking-[0.2em] mb-2",
          isRich ? "text-brand/60" : "text-muted-foreground"
        )}>
          {content.status.title}
        </h3>
        
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                   {isRich ? <Zap size={20} className="text-warning" /> : <MapPin size={20} className="text-muted-foreground" />}
                   {/* Text increased to text-base (16px) */}
                   <span className="text-base font-semibold text-foreground">{content.status.row1}</span>
                </div>
                <span className={cn(
                    "text-sm font-bold px-3 py-1.5 rounded",
                    isRich ? "bg-brand/10 text-brand border border-brand/20 font-mono shadow-[0_0_10px_rgba(0,240,255,0.2)]" : "bg-success/10 text-success"
                )}>
                    {content.status.row1Value}
                </span>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                   {isRich ? <ShieldCheck size={20} className="text-success" /> : <Activity size={20} className="text-muted-foreground" />}
                   <span className="text-base font-semibold text-foreground">{content.status.row2}</span>
                </div>
                <span className={cn(
                    "text-sm font-bold px-3 py-1.5 rounded",
                    isRich ? "bg-success/10 text-success border border-success/20 font-mono shadow-[0_0_10px_rgba(10,255,96,0.2)]" : "bg-surface-muted text-muted-foreground"
                )}>
                    {content.status.row2Value}
                </span>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;