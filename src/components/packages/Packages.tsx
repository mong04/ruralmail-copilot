// src/components/packages/Packages.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../../store';
import {
  addPackage,
  deletePackage,
  loadPackagesFromDB,
  savePackagesToDB,
  clearPackagesFromDB,
} from '../../store/packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../db';
import ScannerView from './ScannerView';
import PackageList from './PackageList';
import PackageForm from './PackageForm';

interface PackagesProps {
  onBack: () => void;
  isScannerActive: boolean;
  showPackageForm: boolean;
  formContext: 'scan' | 'manual' | 'edit';
  onScanSuccess: (tracking: string) => void;
  onOpenScanner: () => void;
  onOpenManualForm: () => void;
  onCloseForm: () => void;
  onCloseScanner: () => void;
  onOpenEditForm: () => void;
}

const Packages: React.FC<PackagesProps> = ({
  onBack,
  isScannerActive,
  showPackageForm,
  formContext,
  onScanSuccess,
  onOpenScanner,
  onOpenManualForm,
  onCloseForm,
  onCloseScanner,
  onOpenEditForm,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { packages, loading, error } = useSelector(
    (state: RootState) => state.packages,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [newScanData, setNewScanData] = useState<{ tracking: string } | null>(
    null,
  );

  const [pkgToUndo, setPkgToUndo] = useState<Package | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    dispatch(loadPackagesFromDB());
  }, [dispatch]);

  const filteredPackages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return packages;
    return packages.filter(
      (pkg) =>
        (pkg.tracking && pkg.tracking.toLowerCase().includes(query)) ||
        (pkg.assignedAddress &&
          pkg.assignedAddress.toLowerCase().includes(query)) ||
        (pkg.notes && pkg.notes.toLowerCase().includes(query)),
    );
  }, [packages, searchQuery]);

  const handleLocalScanSuccess = (tracking: string) => {
    setEditingPackage(null);
    setNewScanData({ tracking });
    onScanSuccess(tracking);
  };

  const handleStartEdit = (pkg: Package) => {
    setNewScanData(null);
    setEditingPackage(pkg);
    onOpenEditForm();
  };

  const handleUndoDelete = () => {
    if (pkgToUndo) {
      dispatch(addPackage(pkgToUndo));
      toast.success('Action undone!');
      setPkgToUndo(null);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  };

  const handleDeletePackage = (pkg: Package) => {
    dispatch(deletePackage(pkg.id));
    setPkgToUndo(pkg);
    toastIdRef.current = toast.success('Package deleted.', {
      action: {
        label: 'Undo',
        onClick: handleUndoDelete,
      },
      onDismiss: () => {
        setPkgToUndo(null);
        toastIdRef.current = null;
      },
      onAutoClose: () => {
        setPkgToUndo(null);
        toastIdRef.current = null;
      },
    });
  };

  const handleSubmitSuccess = () => {
    setEditingPackage(null);
    setNewScanData(null);
    onCloseForm();
    toast.success(formContext === 'edit' ? 'Package updated!' : 'Package added!');
  };

  const handleCancelForm = () => {
    setEditingPackage(null);
    setNewScanData(null);
    onCloseForm();
    if (formContext === 'scan') {
      onOpenScanner();
    }
  };

  const handleSave = () => {
    dispatch(savePackagesToDB(packages));
    toast.success('Packages saved!');
  };

  const handleClear = () => {
    if (window.confirm('Clear all packages? This cannot be undone.')) {
      dispatch(clearPackagesFromDB());
      toast.success('All packages cleared.');
    }
  };

  if (loading) return <p>Loading packages...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    // **THE FIX:**
    // - Removed *all* layout classes (w-full, md:w-3/4, lg:max-w-4xl, bg-white, rounded-xl, shadow-lg, p-6)
    // - This component now just returns its content, and the parent (App.tsx) handles the "white box" layout.
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Manage Packages</h2>
      <button onClick={onBack} className="mb-4 text-blue-500">
        Back to Dashboard
      </button>

      {/* --- Render the Scanner --- */}
      {isScannerActive && (
        <ScannerView
          onScanSuccess={handleLocalScanSuccess}
          onClose={onCloseScanner}
        />
      )}

      {/* --- Add Buttons --- */}
      {!showPackageForm && (
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4 md:gap-0">
          <button
            onClick={onOpenScanner}
            className="group inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-full font-bold text-base shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="mr-4 text-3xl">📷</span>
            Scan Package
          </button>

          <button
            onClick={onOpenManualForm}
            className="group inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-full font-semibold text-base shadow-sm hover:shadow-md transition-all duration-300"
          >
            <span className="mr-3 text-xl">⌨️</span>
            Add Manual Package
          </button>
        </div>
      )}

      {/* --- Render the Package Form --- */}
      {showPackageForm && (
        <PackageForm
          show={showPackageForm}
          formContext={formContext}
          initialPackage={editingPackage || newScanData}
          onSubmitSuccess={handleSubmitSuccess}
          onCancel={handleCancelForm}
        />
      )}

      {/* --- Render the Package List --- */}
      {!showPackageForm && (
        <PackageList
          packages={filteredPackages}
          allPackages={packages}
          totalCount={packages.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleStartEdit}
          onDelete={handleDeletePackage}
        />
      )}

      {/* --- Save/Clear Buttons --- */}
      <div className="flex space-x-4 pt-6">
        <button
          onClick={handleClear}
          className="flex-1 bg-linear-to-r from-red-500 to-rose-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        >
          <span className="mr-3">🗑️</span>
          Clear All
        </button>
        <button
          onClick={handleSave}
          disabled={packages.length === 0}
          className="flex-1 bg-linear-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
        >
          <span className="mr-3">💾</span>
          Save Packages
        </button>
      </div>
    </div>
  );
};

export default Packages;