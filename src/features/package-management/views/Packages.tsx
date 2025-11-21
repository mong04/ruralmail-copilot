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
import Portal from '../../../components/ui/Portal'; // ✅ NEW IMPORT

// Icons & Utils
import { Keyboard, Truck } from 'lucide-react';
import { cn } from '../../../lib/utils';

const Packages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const { packages, loading, error } = useSelector((state: RootState) => state.packages);
  const route = useSelector((state: RootState) => state.route.route);

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

  // --- HANDLERS (Unchanged) ---
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

  if (loading) return <div className="p-6 text-center animate-pulse text-foreground">Loading manifest...</div>;
  if (error) return <div className="p-6 text-center text-danger">Error: {error}</div>;

  if (route.length === 0) {
    return (
      <div className="text-center space-y-4 p-6 flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold text-danger">Route Not Found</h2>
        <p className="text-muted">You must set up your route before you can add packages.</p>
        <Button onClick={() => navigate('/route-setup')}>Go to Route Setup</Button>
      </div>
    );
  }

  return (
    // 1. Use h-full to fit within the parent layout (BottomNavLayout)
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      
      {/* 2. Sticky Header */}
      <div className="flex-none z-20">
        <PackagesActionBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>

      {/* 3. Scrollable Content */}
      {/* Added pb-32 to ensure last item clears the FABs */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth pb-32">
        <div className={cn("w-full max-w-3xl mx-auto", isFormActive ? 'hidden' : 'block')}>
          <PackageList
            packages={filteredPackages}
            searchQuery={searchQuery}
            onEdit={handleStartEdit}
            onDelete={handleDeletePackage}
            onAddAtStop={handleAddAtStop}
          />
        </div>
      </div>

      {/* 4. PORTALLED INTERFACE ELEMENTS (Break out of layout) */}
      <Portal>
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
            
            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent z-0" />

            {/* FAB Cluster - Positioned absolutely above bottom nav */}
            {/* bottom-[88px] accounts for Nav Bar (approx 60-70px) + padding */}
            <div className="relative z-10 pb-[88px] px-6 w-full max-w-md mx-auto">
                <div className="flex items-end justify-center gap-8 pointer-events-auto">
                    
                    {/* Manual Entry */}
                    <Button
                        onClick={() => {
                            setEditingPackage(null);
                            setFormContext('manual');
                            setSearchParams({ form: 'true' });
                        }}
                        variant="surface"
                        className="w-12 h-12 rounded-full shadow-lg p-0 border border-white/10 bg-surface/80 backdrop-blur-md active:scale-90 transition-all hover:border-white/30"
                    >
                        <Keyboard size={20} className="text-muted-foreground" />
                    </Button>

                    {/* LOAD TRUCK (Hero) */}
                    <button
                        onClick={() => navigate('/load-truck')}
                        className="relative group -top-1"
                    >
                        <div className="absolute inset-0 bg-brand/50 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                        <div className="relative bg-brand text-brand-foreground w-16 h-16 rounded-full shadow-2xl shadow-brand/30 flex items-center justify-center transform transition-all active:scale-95 hover:scale-105 border-2 border-white/20">
                            <Truck size={32} className="-ml-0.5" />
                        </div>
                    </button>

                    {/* Ghost Spacer for symmetry (Optional) */}
                    <div className="w-12" />
                </div>
            </div>
        </div>

        {/* Manual Form (Also Portalled automatically by its own implementation? Check PackageForm) */}
        {/* If PackageForm uses Portal internally, we are good. If not, we should wrap it or leave it. */}
        {/* PackageForm usually creates its own Fixed overlay, so it's fine in the main tree. */}
      </Portal>

      {/* Form is rendered here but uses fixed positioning */}
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