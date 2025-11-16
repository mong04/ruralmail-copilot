// src/features/delivery-hud/components/DeliveryMap.tsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';
import type { Stop, Package } from '../../../db';

interface Props {
  route: Stop[];
  fullRoute: Stop[];
  packages: Package[];
  currentStop: number;
  voiceEnabled: boolean;
  position: { lat: number; lng: number } | null;
  mapStyle: 'streets' | 'satellite';
  cameraMode: 'task' | 'follow' | 'overview';
}

import { MapControls } from './MapControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DeliveryMap: React.FC<Props> = ({
  route,
  fullRoute,
  packages,
  currentStop,
  // voiceEnabled,
  position,
  mapStyle,
  cameraMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

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

  // Redraw markers and move camera when inputs change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing route markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Draw Route Stop Markers
    (route ?? []).forEach((stop, idx) => {
      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.background = idx === currentStop ? '#ef4444' : '#2563eb'; // Red for current, blue for others
      el.style.boxShadow = '0 0 0 2px white';
      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Draw Package Markers (undelivered only)
    (packages ?? [])
      .filter((pkg) => !pkg.delivered)
      .forEach((pkg) => {
        let stop: Stop | undefined;
        if (pkg.assignedStopId) {
          stop = (fullRoute ?? []).find((s) => s.id === pkg.assignedStopId);
        } else if (typeof pkg.assignedStopNumber === 'number') {
          stop = (fullRoute ?? [])[pkg.assignedStopNumber];
        }
        if (!stop || typeof stop.lng !== 'number') return; // Skip if no valid stop

        const el = document.createElement('div');
        el.style.width = '8px';
        el.style.height = '8px';
        el.style.borderRadius = '50%';
        el.style.background = '#10b981'; // Green for packages
        el.style.boxShadow = '0 0 0 1px white';
        new mapboxgl.Marker(el)
          .setLngLat([stop.lng, stop.lat])
          .addTo(mapRef.current!);
      });

    // Draw User Position Marker
    if (position) {
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.background = '#007cbf'; // Blue dot for user
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 4px 2px rgba(0,0,0,0.1)';
        userMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([position.lng, position.lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([position.lng, position.lat]);
      }
    }

    // --- Update Camera ---
    const centerStop = route?.[currentStop];

    if (cameraMode === 'overview') {
      const bounds = new mapboxgl.LngLatBounds();
      packages
        .filter((pkg) => !pkg.delivered)
        .forEach((pkg) => {
          let stop: Stop | undefined;
          if (pkg.assignedStopId) {
            stop = (fullRoute ?? []).find((s) => s.id === pkg.assignedStopId);
          } else if (typeof pkg.assignedStopNumber === 'number') {
            stop = (fullRoute ?? [])[pkg.assignedStopNumber];
          }
          if (stop && typeof stop.lng === 'number' && typeof stop.lat === 'number') {
            bounds.extend([stop.lng, stop.lat]);
          }
        });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
      }
    } else if (cameraMode === 'follow' && position) {
      map.easeTo({
        center: [position.lng, position.lat],
        zoom: 16,
        duration: 500,
      });
    } else {
      // "Task" mode (default)
      if (position && centerStop) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([position.lng, position.lat]);
        bounds.extend([centerStop.lng, centerStop.lat]);
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 500 });
      } else if (centerStop) {
        map.easeTo({
          center: [centerStop.lng, centerStop.lat],
          duration: 500,
        });
      } else if (position) {
        map.easeTo({
          center: [position.lng, position.lat],
          duration: 500,
        });
      }
    }
  }, [
    route,
    fullRoute,
    packages,
    currentStop,
    position,
    cameraMode,
  ]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <MapControls />
    </div>
  );
};

export default DeliveryMap;