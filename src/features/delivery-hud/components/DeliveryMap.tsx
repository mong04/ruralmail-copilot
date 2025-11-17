import React, { useEffect, useRef, type ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setCurrentStop } from '../hudSlice';
import type { Stop, Package } from '../../../db';
import { UserMarker } from './UserMarker';

// import { LookAheadWidget } from './LookAheadWidget';
// import { selectLookAheadData } from '../hudSlice';

interface Props {
  route: Stop[];
  fullRoute: Stop[];
  packages: Package[];
  currentStopIndex: number;
  voiceEnabled: boolean;
  position: { lat: number; lng: number; heading?: number } | null;
  mapStyle: 'streets' | 'satellite';
  cameraMode: 'task' | 'follow' | 'overview';
  children?: ReactNode;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * A React component for the popup content to ensure it's themed correctly.
 */
const MapPopupContent: React.FC<{ stop: Stop; stopNumber: number; packageCount: number }> = ({
  stop,
  stopNumber,
  packageCount,
}) => (
  // ✅ ADDED: Background, padding, border, and shadow for legibility
  <div className="text-sm text-foreground bg-surface p-2 rounded-md border border-border shadow-md">
    <strong className="text-base">Stop {stopNumber}</strong>
    {/* ✅ ADDED: text-surface-foreground for better contrast on surface background */}
    <p className="text-surface-foreground">{stop.address_line1}</p>
    <p className="text-muted">{packageCount} package(s) at this stop</p>
  </div>
);

/**
 * A self-contained, theme-aware SVG map marker component.
 * This renders a professional "pin" shape with the stop number inside.
 */
const StopMarkerIcon: React.FC<{ stopNumber: number; isCurrent: boolean }> = ({
  stopNumber,
  isCurrent,
}) => {
  const fillColor = isCurrent ? 'var(--color-danger)' : 'var(--color-brand)';
  const textColor = isCurrent ? 'var(--color-danger-foreground)' : 'var(--color-brand-foreground)';

  return (
    <div className="w-8 h-10 relative transition-transform duration-150 ease-in-out">
      <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-lg">
        {/* Pin body */}
        <path
          d="M16 0C7.163 0 0 7.163 0 16c0 2.69.663 5.205 1.833 7.41L16 40l14.167-16.59C31.337 21.205 32 18.69 32 16 32 7.163 24.837 0 16 0z"
          fill={fillColor}
        />
        {/* Stop number text */}
        <text x="16" y="19" fontSize="14" fontWeight="bold" fill={textColor} textAnchor="middle" dy=".1em">
          {stopNumber}
        </text>
      </svg>
    </div>
  );
};

// Helper to get the current theme from the document
const getCurrentTheme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const DeliveryMap: React.FC<Props> = ({
  route,
  fullRoute,
  packages,
  currentStopIndex,
  // voiceEnabled,
  position,
  mapStyle,
  cameraMode,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const navigationData = useAppSelector((state) => state.hud.navigationData);
  const isNavigating = useAppSelector((state) => state.hud.isNavigating);

  // Get the correct Mapbox style URL
  const styleUrl =
    mapStyle === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/streets-v12';

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) {
      console.error('[Mapbox] Container ref is null');
      toast.error('Map container not ready.');
      return;
    }
    if (mapRef.current) return;

    try {
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current!,
        style: styleUrl,
        center: [-79.59574, 40.787342], // Default center
        zoom: 12,
      });

      // ✅ ADDED BACK: Map controls and error handling
      mapRef.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
        }),
        'top-right'
      );

      console.log('[Mapbox] Map initialized');

      mapRef.current.on('error', (ev) => {
        console.error(
          '[Mapbox] Mapbox emitted error',
          (ev as { error?: unknown }).error || ev
        );
        toast.error('Map error — check token, style, or network.');
      });
    } catch (e) {
      console.error('[Mapbox] Map init failed:', e);
      toast.error('Map initialization failed.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for style changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(styleUrl);
    }
  }, [styleUrl]);

  // Effect to draw/update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // --- Cleanup previous markers ---
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // --- Draw Stop Markers ---
    (route ?? []).forEach((stop) => {
      const stopNumber = fullRoute.findIndex(s => s.id === stop.id);
      if (stopNumber === -1) return; // Should not happen

      // The container for our React-rendered marker
      const el = document.createElement('div');
      el.dataset.stopIndex = `${stopNumber}`;
      el.style.cursor = 'pointer';

      // Render the new SVG marker component into the container
      const markerRoot = createRoot(el);
      // We render it here, but the styling (isCurrent) will be updated in the effect hook
      markerRoot.render(<StopMarkerIcon stopNumber={stopNumber + 1} isCurrent={false} />);

      // Add hover effects to improve interactivity feedback
      // The transform is now on the div inside the React component
      el.addEventListener('mouseenter', () => {
        const innerDiv = el.firstChild as HTMLDivElement;
        if (innerDiv) innerDiv.style.transform = 'scale(1.1)';
      });
      el.addEventListener('mouseleave', () => {
        const innerDiv = el.firstChild as HTMLDivElement;
        if (innerDiv) innerDiv.style.transform = 'scale(1.0)';
      });
      
      const packagesAtStop = packages.filter(p => p.assignedStopId === stop.id).length;

      // Create a container for the React-rendered popup content
      const popupContainer = document.createElement('div');
      // Apply the current theme to the popup container
      popupContainer.className = getCurrentTheme();

      const popupRoot = createRoot(popupContainer);
      popupRoot.render(
        <MapPopupContent
          stop={stop}
          stopNumber={stopNumber + 1}
          packageCount={packagesAtStop}
        />
      );

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setDOMContent(popupContainer); 

      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.lng, stop.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        dispatch(setCurrentStop(stopNumber));
      });

      markersRef.current.push(marker);
    });

  }, [route, fullRoute, packages, dispatch]);

  // Effect to update current stop styling and popup
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      // ✅ Read the correct index from the data attribute
      const markerStopIndex = parseInt(el.dataset.stopIndex ?? '-1', 10);

      const isCurrent = markerStopIndex === currentStopIndex;

      // Re-render the marker component with the correct `isCurrent` prop
      // This is more declarative and robust than manually toggling CSS classes.
      const root = (el as unknown as { _reactRootContainer: ReturnType<typeof createRoot> })._reactRootContainer; // Access the root we created earlier
      if (root) {
        const stopNumber = parseInt(el.innerText, 10);
        root.render(<StopMarkerIcon stopNumber={stopNumber} isCurrent={isCurrent} />);
      } 

      // Toggle popup
      const popup = marker.getPopup();
      if (isCurrent && popup && !popup.isOpen()) {
        marker.togglePopup();
      } else if (!isCurrent && popup && popup.isOpen()) {
        marker.togglePopup();
      }
    });
  }, [currentStopIndex]);

  // Effect for user position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (!userMarkerRef.current) {
      // Create a container and render the React component into it.
      const el = document.createElement('div');
      const root = createRoot(el);
      root.render(<UserMarker />);
      userMarkerRef.current = new mapboxgl.Marker(el).setLngLat([position.lng, position.lat]).addTo(map);
    } else {
      // Just update the position if the marker already exists.
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [position]);

  // Effect to update camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const centerStop = fullRoute?.[currentStopIndex];
    
    // Priority 1: Active Navigation View
    if (isNavigating && position) {
      map.easeTo({
        center: [position.lng, position.lat],
        zoom: 18,
        pitch: 60, // 3D-like tilt
        bearing: position.heading ?? map.getBearing(), // Use GPS heading if available
        duration: 1000,
      });
    } else if (cameraMode === 'overview') {
      const bounds = new mapboxgl.LngLatBounds();
      route.forEach(stop => {
        if (stop && typeof stop.lng === 'number' && typeof stop.lat === 'number') {
          bounds.extend([stop.lng, stop.lat]);
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
      }
    } else if (cameraMode === 'follow' && position) { // Standard follow (not navigating)
      map.easeTo({
        center: [position.lng, position.lat],
        zoom: 16,
        pitch: 0, // Ensure map is flat
        duration: 500
      });
    } else { // "Task" mode
      if (position && centerStop) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([position.lng, position.lat]);
        bounds.extend([centerStop.lng, centerStop.lat]);
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
      } else if (centerStop) {
        map.easeTo({ center: [centerStop.lng, centerStop.lat], duration: 500 });
      } else if (position) {
        map.easeTo({ center: [position.lng, position.lat], duration: 500 });
      }
    }
  }, [fullRoute, route, currentStopIndex, position, cameraMode, isNavigating]);

  // Effect to draw the navigation route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'navigation-route';

    // If there's no navigation data, remove the layer and source if they exist
    if (!navigationData) {
      if (map.getLayer(sourceId)) map.removeLayer(sourceId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    // If the source already exists, just update the data. Otherwise, add it.
    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(navigationData.geometry as GeoJSON.GeoJSON);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: navigationData.geometry as GeoJSON.GeoJSON,
      });
      map.addLayer({
        id: sourceId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3887be', 'line-width': 8, 'line-opacity': 0.9 },
      });
    }

    // This effect should only re-run when navigationData changes.
  }, [navigationData]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* A simple grid container for overlay children. pointer-events-none allows map interaction. */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

export default DeliveryMap;