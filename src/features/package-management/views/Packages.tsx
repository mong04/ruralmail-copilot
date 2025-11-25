import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type AppDispatch, type RootState } from '../../../store';
import { addPackage, deletePackage } from '../store/packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../../db';

// Components
import PackageList from '../components/list/PackageList';
import PackageForm from '../components/form/PackageForm';
import { PackagesActionBar } from '../components/actions/PackagesActionBar';
import { Button } from '../../../components/ui/Button';
// Removed Portal import - we will render inline for better Z-index control

// Icons & Utils
import { Keyboard, Truck, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

const Packages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  // Selectors
  const { packages, loading, error } = useSelector((state: RootState) => state.packages);
  const route = useSelector((state: RootState) => state.route.route);
  const { theme, richThemingEnabled } = useSelector((state: RootState) => state.settings);

  const isCyberpunk = theme === 'cyberpunk';
  const isRich = isCyberpunk && richThemingEnabled;

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPackage, setEditingPackage] = useState<Partial<Package> | null>(null);
  const [formContext, setFormContext] = useState<'manual' | 'edit'>('manual');

  const pkgToUndoRef = useRef<Package | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const isFormActive = searchParams.get('form') === 'true';

  // Filter Logic
  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) =>
      (pkg.tracking && pkg.tracking.toLowerCase().includes(q)) ||
      (pkg.assignedAddress && pkg.assignedAddress.toLowerCase().includes(q)) ||
      (pkg.notes && pkg.notes.toLowerCase().includes(q))
    );
  }, [packages, searchQuery]);

  // --- EFFECTS ---
  useEffect(() => {
    const handlePopState = () => {
      if (isFormActive) {
        setSearchParams({}, { replace: true });
      } else {
        navigate('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isFormActive, navigate, setSearchParams]);

  // --- HANDLERS ---
  const handleStartEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormContext('edit');
    setSearchParams({ form: 'true' });
  };

  const handleAddAtStop = (stopData: Partial<Package>) => {
    setEditingPackage(stopData);
    setFormContext('manual');
    setSearchParams({ form: 'true' });
  };

  const handleUndoDelete = () => {
    if (pkgToUndoRef.current) {
      dispatch(addPackage(pkgToUndoRef.current));
      toast.success('Action undone!');
      pkgToUndoRef.current = null;
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    }
  };

  const handleDeletePackage = (pkg: Package) => {
    dispatch(deletePackage(pkg.id));
    pkgToUndoRef.current = pkg;
    toastIdRef.current = toast.error('Package deleted.', {
      action: { label: 'Undo', onClick: handleUndoDelete },
      duration: 5000,
    });
  };

  const handleSubmitSuccess = () => {
    setEditingPackage(null);
    setSearchParams({});
    toast.success(formContext === 'edit' ? 'Package updated!' : 'Package added!');
    setFormContext('manual');
  };

  const handleCancelForm = () => {
    setEditingPackage(null);
    setSearchParams({});
    setFormContext('manual');
  };

  // --- RENDER ---

  if (loading) return <div className="p-6 text-center animate-pulse text-foreground font-medium">Loading manifest...</div>;
  if (error) return <div className="p-6 text-center text-danger font-bold">Error: {error}</div>;

  if (route.length === 0) {
    return (
      <div className="text-center space-y-6 p-8 flex flex-col items-center justify-center h-full bg-background">
        <div className="p-6 bg-surface rounded-full border border-dashed border-border">
           <Truck size={48} className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Route Not Found</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">You must import or create a route before managing packages.</p>
        </div>
        <Button onClick={() => navigate('/route-setup')} size="lg">Go to Route Setup</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      
      {/* 1. Sticky Header (z-40 to sit above list items but below form backdrop) */}
      <div className="flex-none z-40">
        <PackagesActionBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth no-scrollbar">
        <div className={cn("w-full max-w-3xl mx-auto pb-32", isFormActive ? 'hidden' : 'block')}>
          <PackageList
            packages={filteredPackages}
            searchQuery={searchQuery}
            onEdit={handleStartEdit}
            onDelete={handleDeletePackage}
            onAddAtStop={handleAddAtStop}
          />
        </div>
      </div>

      {/* 3. THEME-AWARE FABS (Inline Absolute) */}
      {/* Removed Portal. Now absolute positioned relative to this container.
          z-30 ensures it is above the list (z-0) and header shadow, 
          but correctly covered by the PackageForm backdrop (z-60). 
      */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col justify-end">
          
          {/* Gradient Fade */}
          <div
            className="absolute left-0 right-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent z-0"
            style={{ bottom: 0 }} 
          />

          {/* FAB Cluster */}
          <div className="relative z-10 px-6 w-full max-w-md mx-auto pb-4">
              <div className="flex items-end justify-center gap-6 pointer-events-auto">
                  
                  {/* A. MANUAL ENTRY */}
                  <Button
                      onClick={() => {
                          setEditingPackage(null);
                          setFormContext('manual');
                          setSearchParams({ form: 'true' });
                      }}
                      variant="surface"
                      className={cn(
                          "w-14 h-14 rounded-2xl shadow-lg p-0 border active:scale-95 transition-all",
                          isCyberpunk 
                              ? "bg-black/80 border-brand/30 text-brand hover:bg-brand/10 hover:border-brand/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]" 
                              : "bg-surface border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                      aria-label="Manual Entry"
                  >
                      {isCyberpunk ? <Keyboard size={24} /> : <Plus size={28} />}
                  </Button>

                  {/* B. LOAD TRUCK (Hero) */}
                  <button
                      onClick={() => navigate('/load-truck')}
                      className="relative group -top-2"
                      aria-label="Load Truck Mode"
                  >
                      {/* Glow Layer */}
                      <div className={cn(
                          "absolute inset-0 rounded-full blur-xl transition-opacity duration-500",
                          isRich ? "bg-brand/40 opacity-60 group-hover:opacity-100 animate-pulse" : "bg-brand/20 opacity-0 group-hover:opacity-50"
                      )} />
                      
                      {/* Button Body */}
                      <div className={cn(
                          "relative w-20 h-20 rounded-full flex items-center justify-center transform transition-all duration-300 active:scale-95 hover:scale-105",
                          isCyberpunk 
                              ? "bg-black border-2 border-brand text-brand shadow-[0_0_20px_rgba(0,240,255,0.3)]" 
                              : "bg-brand text-brand-foreground shadow-xl shadow-brand/30"
                      )}>
                          <Truck size={36} strokeWidth={isRich ? 1.5 : 2.5} className="-ml-0.5" />
                      </div>
                  </button>

                  {/* Spacer for balance */}
                  <div className="w-14" /> 
              </div>
          </div>
      </div>

      {/* 4. PACKAGE FORM DRAWER (z-60+) */}
      <PackageForm
        show={isFormActive}
        formContext={formContext}
        initialPackage={editingPackage}
        onSubmitSuccess={handleSubmitSuccess}
        onCancel={handleCancelForm}
      />
    </div>
  );
};

export default Packages;