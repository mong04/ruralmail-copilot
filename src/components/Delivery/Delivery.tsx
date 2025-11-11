import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { type AppDispatch, type RootState } from '../../store';
import { updatePosition, advanceStop, fetchWeatherAlerts } from '../../store/hudSlice';
import { toast } from 'sonner';
import { type Package, type Stop } from '../../db';
import * as turf from '@turf/turf';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * Delivery component providing HUD for navigation and package info.
 * Uses Mapbox for mapping, geolocation for tracking, and voice for guidance.
 * Reference: Mapbox GL JS docs[](https://docs.mapbox.com/mapbox-gl-js/api/) for map init.
 */
const Delivery: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { route } = useSelector((state: RootState) => state.route) as { route: Stop[] }; // Explicitly typed to use Stop
  const { packages } = useSelector((state: RootState) => state.packages);
  const { currentStop, weatherAlerts, position, loading } = useSelector((state: RootState) => state.hud);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const hasSpoken = useRef(false);
  const proximityTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    dispatch(fetchWeatherAlerts());
  }, [dispatch]);

  // Initialize map
  const initMap = useCallback(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [position?.lng ?? -74.5, position?.lat ?? 40],
      zoom: 9,
    });
    // Add offline fallback
    map.current.on('error', () => toast.error('Map load failed - check connection'));
  }, [position]);

  useEffect(() => {
    initMap();
    return () => map.current?.remove();
  }, [initMap]);

  // Geolocation watch
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => dispatch(updatePosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })),
      (err) => {
        let msg = 'GPS error';
        if (err.code === 1) msg = 'Location permission denied - check settings';
        if (err.code === 2) msg = 'Location unavailable - check device GPS';
        if (err.code === 3) msg = 'Location timeout - try again';
        toast.error(msg);
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [dispatch]);

  // Reset spoken flag on stop change
  useEffect(() => {
    hasSpoken.current = false;
  }, [currentStop]);

  const groupPackages = useCallback((): Package[] => {
    return packages.filter((pkg) => pkg.assignedStop === currentStop);
  }, [packages, currentStop]);

  /**
   * Speaks guidance using Web Speech API.
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
   */
  const speakGuidance = useCallback(() => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); // Cancel ongoing

    const pkgs = groupPackages();
    const msg = `Approaching ${route[currentStop]?.full_address || 'unknown'}. Packages: ${pkgs.length}, large: ${pkgs.filter(p => p.size === 'large').length}. Notes: ${pkgs.map(p => p.notes).filter(Boolean).join(', ') || 'none'}.`;
    const utterance = new SpeechSynthesisUtterance(msg);
    speechSynthesis.speak(utterance);
  }, [voiceEnabled, groupPackages, route, currentStop]);

  // Proximity check with debounce (depends on speakGuidance, so declared after)
  useEffect(() => {
    if (!position || !route[currentStop]) return;

    const stopCoord = [route[currentStop].lng, route[currentStop].lat];
    const userCoord = [position.lng, position.lat];
    const dist = turf.distance(userCoord, stopCoord, { units: 'kilometers' });

    if (dist < 0.1 && !hasSpoken.current) {
      if (proximityTimeout.current) clearTimeout(proximityTimeout.current);
      proximityTimeout.current = setTimeout(() => {
        speakGuidance();
        hasSpoken.current = true;
      }, 1000); // 1s debounce
    }
  }, [position, currentStop, route, voiceEnabled, speakGuidance]); // Added speakGuidance per exhaustive-deps

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 flex flex-col">
        <div ref={mapContainer} className="flex-1" aria-hidden="true" />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="p-4 bg-white rounded-t-xl shadow-lg">
          <h2 className="text-xl font-bold mb-2">{route[currentStop]?.full_address || 'End of Route'}</h2>
          <p className="mb-2">
            Packages: {groupPackages().length} ({groupPackages().filter((p) => p.size === 'large').length} Large)
          </p>
          <p className="mb-2 text-red-500">{weatherAlerts.join(', ') || 'No alerts'}</p>
          <div className="flex justify-between mt-4">
            <button
              onClick={speakGuidance}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
              aria-label="Voice Guidance"
            >
              Voice Guidance
            </button>
            <button
              onClick={() => dispatch(advanceStop())}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 focus:ring-2 focus:ring-green-500"
              aria-label="Mark Delivered"
            >
              Mark Delivered
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 focus:ring-2 focus:ring-red-500"
              aria-label="Exit Delivery"
            >
              Exit
            </button>
          </div>
          <div className="mt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="mr-2"
                aria-label="Enable Voice Guidance"
              />
              Enable Voice
            </label>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Delivery;