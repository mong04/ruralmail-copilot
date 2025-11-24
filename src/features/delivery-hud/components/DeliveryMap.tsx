import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setCurrentStop, setMapOffCenter } from '../hudSlice';
import type { Stop, Package } from '../../../db';
import { UserMarker } from '../components/UserMarker';

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

// Helper to validate coordinates prevent Mapbox crashes
const isValidCoord = (lat: number | undefined, lng: number | undefined): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
};

// Safety check for import.meta env vars
const getEnvToken = () => {
  try {
    return import.meta.env.VITE_MAPBOX_TOKEN;
  } catch {
    return '';
  }
};

if (mapboxgl) {
  mapboxgl.accessToken = getEnvToken();
}

const MapPopupContent: React.FC<{ stop: Stop; stopNumber: number; packageCount: number }> = ({
  stop,
  stopNumber,
  packageCount,
}) => (
  <div className="text-sm text-foreground bg-surface p-2 rounded-md border border-border shadow-md">
    <strong className="text-base">Stop {stopNumber}</strong>
    <p className="text-surface-foreground">{stop.address_line1}</p>
    <p className="text-muted">{packageCount} package(s) at this stop</p>
  </div>
);

const StopMarkerIcon: React.FC<{ stopNumber: number; isCurrent: boolean }> = ({
  stopNumber,
  isCurrent,
}) => {
  const fill = isCurrent ? 'var(--color-danger)' : 'var(--color-brand)';
  const text = isCurrent ? 'var(--color-danger-foreground)' : 'var(--color-brand-foreground)';

  return (
    <div className="w-8 h-10">
      <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-lg">
        <path
          d="M16 0C7.163 0 0 7.163 0 16c0 2.69.663 5.205 1.833 7.41L16 40l14.167-16.59C31.337 21.205 32 18.69 32 16 32 7.163 24.837 0 16 0z"
          fill={fill}
        />
        <text x="16" y="19" fontSize="14" fontWeight="bold" fill={text} textAnchor="middle" dy=".1em">
          {stopNumber}
        </text>
      </svg>
    </div>
  );
};

const DeliveryMap = forwardRef<{ recenterOnCurrent: () => void }, Props>((props, ref) => {
  const {
    route,
    fullRoute,
    packages,
    currentStopIndex,
    position,
    mapStyle,
    cameraMode,
    children,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  const navigationData = useAppSelector(s => s.hud.navigationData);
  const isNavigating = useAppSelector(s => s.hud.isNavigating);
  
  const theme = useAppSelector(s => s.settings.theme);
  const isCyberpunk = theme === 'cyberpunk';

  const styleUrl = mapStyle === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : isCyberpunk 
        ? 'mapbox://styles/mapbox/dark-v11' 
        : 'mapbox://styles/mapbox/streets-v12';

  const OFF_CENTER_THRESHOLD = 150;

  const checkIfOffCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || isNavigating) {
      dispatch(setMapOffCenter(false));
      return;
    }

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const bounds = map.getBounds();

    let expectedCenter: mapboxgl.LngLat | null = null;
    let expectedZoom = 16;

    const stop = fullRoute[currentStopIndex];

    if (cameraMode === 'follow' && position && isValidCoord(position.lat, position.lng)) {
      expectedCenter = new mapboxgl.LngLat(position.lng, position.lat);
    } else if (cameraMode === 'overview') {
      let allVisible = true;
      route.forEach(s => {
        if (isValidCoord(s.lat, s.lng) && bounds && !bounds.contains([s.lng, s.lat])) allVisible = false;
      });
      dispatch(setMapOffCenter(!allVisible || zoom > 17 || zoom < 10 || Math.abs(bearing) > 20));
      return;
    } else if (cameraMode === 'task') {
      // Strict checks before math to avoid NaN
      const hasStop = stop && isValidCoord(stop.lat, stop.lng);
      const hasPos = position && isValidCoord(position.lat, position.lng);

      if (hasPos && hasStop) {
        // Midpoint
        expectedCenter = new mapboxgl.LngLat(
          (position!.lng + stop!.lng) / 2,
          (position!.lat + stop!.lat) / 2
        );
      } else if (hasStop) {
        expectedCenter = new mapboxgl.LngLat(stop!.lng, stop!.lat);
      } else if (hasPos) {
        expectedCenter = new mapboxgl.LngLat(position!.lng, position!.lat);
      }
      expectedZoom = 15;
    }

    if (!expectedCenter) {
      dispatch(setMapOffCenter(false));
      return;
    }

    const distance = center.distanceTo(expectedCenter);
    const zoomDiff = Math.abs(zoom - expectedZoom);
    const bearingDiff = Math.min(Math.abs(bearing), 360 - Math.abs(bearing));

    dispatch(setMapOffCenter(
      distance > OFF_CENTER_THRESHOLD || zoomDiff > 1.5 || bearingDiff > 20
    ));
  }, [position, currentStopIndex, cameraMode, isNavigating, fullRoute, route, dispatch]);

  // Map movement listener
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => checkIfOffCenter();

    map.on('moveend', update);
    map.on('zoomend', update);
    map.on('rotateend', update);

    return () => {
      map.off('moveend', update);
      map.off('zoomend', update);
      map.off('rotateend', update);
    };
  }, [checkIfOffCenter]);

  // Camera mode auto-snap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Validate position before camera update
    if (isNavigating && position && isValidCoord(position.lat, position.lng)) {
      map.easeTo({
        center: [position.lng, position.lat],
        zoom: 18,
        pitch: 60,
        bearing: position.heading ?? map.getBearing(),
        duration: 1000,
      });
    } else if (cameraMode === 'overview') {
      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;
      route.forEach(stop => {
        if (isValidCoord(stop.lat, stop.lng)) {
          bounds.extend([stop.lng, stop.lat]);
          hasPoints = true;
        }
      });
      if (hasPoints && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
      }
    } else if (cameraMode === 'follow' && position && isValidCoord(position.lat, position.lng)) {
      map.easeTo({
        center: [position.lng, position.lat],
        zoom: 16,
        pitch: 0,
        duration: 600,
      });
    }
  }, [isNavigating, position, cameraMode, route]);

  const recenterOnCurrent = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (cameraMode === 'overview') {
      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;
      route.forEach(stop => {
        if (isValidCoord(stop.lat, stop.lng)) {
          bounds.extend([stop.lng, stop.lat]);
          hasPoints = true;
        }
      });
      if (hasPoints && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
      }
    } else if (cameraMode === 'follow' && position && isValidCoord(position.lat, position.lng)) {
      map.easeTo({
        center: [position.lng, position.lat],
        zoom: 16,
        pitch: 0,
        duration: 600,
      });
    } else {
      const stop = fullRoute[currentStopIndex];
      // STRICT Check: stop must exist and have valid numbers
      if (stop && isValidCoord(stop.lat, stop.lng)) {
        if (position && isValidCoord(position.lat, position.lng)) {
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([position.lng, position.lat]);
          bounds.extend([stop.lng, stop.lat]);
          map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
        } else {
          map.easeTo({
            center: [stop.lng, stop.lat],
            zoom: 16,
            duration: 600,
          });
        }
      }
    }

    dispatch(setMapOffCenter(false));
  }, [route, fullRoute, currentStopIndex, position, cameraMode, dispatch]);

  useImperativeHandle(ref, () => ({
    recenterOnCurrent,
  }));

  // Map initialization
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl) {
        toast.error('Mapbox GL not loaded');
        return;
    }

    try {
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [-79.59574, 40.787342], // Default Safe Center
        zoom: 12,
        attributionControl: false, // Cleaner UI
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current.on('error', () => toast.error('Map error — check token or network.'));
      
      // Initial load
      mapRef.current.once('load', () => recenterOnCurrent());

    } catch {
      toast.error('Map failed to initialize.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style change handler
  useEffect(() => {
    mapRef.current?.setStyle(styleUrl);
  }, [styleUrl]);

  // Markers handling
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    (route ?? []).forEach(stop => {
      // Skip stops with invalid coordinates to prevent crashes
      if (!isValidCoord(stop.lat, stop.lng)) return;

      const stopNumber = fullRoute.findIndex(s => s.id === stop.id);
      if (stopNumber === -1) return;

      const packageCount = packages.filter(p =>
        !p.delivered &&
        (p.assignedStopId === stop.id ||
          (!p.assignedStopId && typeof p.assignedStopNumber === 'number' && fullRoute[p.assignedStopNumber]?.id === stop.id))
      ).length;

      const popupEl = document.createElement('div');
      const popupRoot = createRoot(popupEl);
      popupRoot.render(<MapPopupContent stop={stop} stopNumber={stopNumber + 1} packageCount={packageCount} />);
      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupEl);

      const el = document.createElement('div');
      el.dataset.stopIndex = stopNumber.toString();
      const markerRoot = createRoot(el);
      (el as HTMLElement & { _reactRootContainer?: ReturnType<typeof createRoot> })._reactRootContainer = markerRoot;
      markerRoot.render(<StopMarkerIcon stopNumber={stopNumber + 1} isCurrent={false} />);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.lng, stop.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => dispatch(setCurrentStop(stopNumber)));

      markersRef.current.push(marker);
    });
  }, [route, fullRoute, packages, dispatch]);

  // User Marker Logic
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !isValidCoord(position.lat, position.lng)) return;

    // Create the marker only once
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      const root = createRoot(el);
      root.render(<UserMarker />);
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      // Update position smoothly
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [position]);

  // Navigation line with Cyberpunk support
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const id = 'navigation-route';
    if (!navigationData) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
      return;
    }

    const source = map.getSource(id) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(navigationData.geometry as GeoJSON.GeoJSON);
    } else {
      map.addSource(id, { type: 'geojson', data: navigationData.geometry as GeoJSON.GeoJSON });
      
      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 
            'line-color': isCyberpunk ? '#00ffff' : '#3b82f6',
            'line-width': isCyberpunk ? 8 : 8, 
            'line-opacity': 0.9,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, 
      });
    }
    
    if (map.getLayer(id)) {
        map.setPaintProperty(id, 'line-color', isCyberpunk ? '#00ffff' : '#3b82f6');
    }

  }, [navigationData, isCyberpunk]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      
      {isCyberpunk && isNavigating && (
          <div className="absolute inset-0 pointer-events-none cyberpunk-grid-overlay" />
      )}

      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4 pointer-events-none">
        {children}
      </div>
    </div>
  );
});

DeliveryMap.displayName = 'DeliveryMap';

export default DeliveryMap;