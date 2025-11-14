// src/features/delivery-hud/components/DeliveryMap.tsx
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { toast } from "sonner";
import type { Stop, Package } from "../../../db";

interface Props {
  route: Stop[];        // filtered stops to plot
  fullRoute: Stop[];    // entire route for resolving packages
  packages: Package[];
  currentStop: number;
  voiceEnabled: boolean;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DeliveryMap: React.FC<Props> = ({ route, fullRoute, packages, currentStop }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) {
      console.error("[Mapbox] Container ref is null");
      toast.error("Map container not ready.");
      return;
    }
    if (mapRef.current) return;

    try {
      const centerLng = route?.[currentStop]?.lng ?? -79.59574;
      const centerLat = route?.[currentStop]?.lat ?? 40.787342;

      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [centerLng, centerLat],
        zoom: 12,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl());
      console.log("[Mapbox] Map initialized");

      mapRef.current.on("error", (ev) => {
        console.error("[Mapbox] Mapbox emitted error", (ev as { error?: unknown }).error || ev);
        toast.error("Map error — check token, style, or network.");
      });
    } catch (e) {
      console.error("[Mapbox] Map init failed:", e);
      toast.error("Map initialization failed.");
    }

    return () => {
      if (mapRef.current) {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        console.log("[Mapbox] Map removed");
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers when inputs change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Stop markers
    (route ?? []).forEach((stop, idx) => {
      const { lng, lat } = stop;
      if (typeof lng !== "number" || typeof lat !== "number") {
        console.warn("[Mapbox] Invalid stop coordinates", stop);
        return;
      }
      const el = document.createElement("div");
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "50%";
      el.style.background = idx === currentStop ? "#ef4444" : "#2563eb";
      el.style.boxShadow = "0 0 0 2px white";
      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(marker);
    });
    // Package markers (resolve by ID first, then number)
    (packages ?? []).forEach((pkg) => {
      let stop: Stop | undefined;

      if (pkg.assignedStopId) {
        console.log("[Mapbox] Resolving by ID:", pkg.assignedStopId);
        stop = (fullRoute ?? []).find((s) => s.id === pkg.assignedStopId);
      } else if (typeof pkg.assignedStopNumber === "number") {
        console.log("[Mapbox] Resolving by index:", pkg.assignedStopNumber);
        stop = (fullRoute ?? [])[pkg.assignedStopNumber];
      } else {
        console.warn("[Mapbox] Package missing stop reference", pkg);
        return;
      }

      if (!stop) {
        console.warn("[Mapbox] No stop found for package", pkg, {
          assignedStopId: pkg.assignedStopId,
          assignedStopNumber: pkg.assignedStopNumber,
          fullRouteIds: (fullRoute ?? []).map((s) => s.id),
        });
        return;
      }

      const { lng, lat } = stop;
      if (typeof lng !== "number" || typeof lat !== "number") {
        console.warn("[Mapbox] Invalid stop coordinates for package", pkg, stop);
        return;
      }

      const el = document.createElement("div");
      el.style.width = "8px";
      el.style.height = "8px";
      el.style.borderRadius = "50%";
      el.style.background = "#10b981";
      el.style.boxShadow = "0 0 0 1px white";
      new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(mapRef.current!);
    });

    // Re-center to current stop if available
    const centerStop = route?.[currentStop];
    if (centerStop && typeof centerStop.lng === "number" && typeof centerStop.lat === "number") {
      map.setCenter([centerStop.lng, centerStop.lat]);
    }

    // Fit bounds to filtered route
    if ((route ?? []).length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      (route ?? []).forEach((s) => {
        if (typeof s.lng === "number" && typeof s.lat === "number") {
          bounds.extend([s.lng, s.lat]);
        }
      });
      map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      console.log("[Mapbox] Bounds fitted to route", route.length);
    }
  }, [route, fullRoute, packages, currentStop]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default DeliveryMap;
