import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Add this import
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(), // Add the plugin here
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
      },
      manifest: {
        name: 'RuralMail Co-Pilot',
        short_name: 'RuralMail',
        description: 'The ultimate delivery assistant for rural USPS mail carriers',
        theme_color: '#4CAF50',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',  // Allows rounding/masking on home screens
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [  // Added for richer install UI
          {
            src: 'screenshot-mobile.png',
            sizes: '720x1280',  // Portrait for mobile
            type: 'image/png',
            form_factor: 'narrow',  // Explicit for mobile
          },
          {
            src: 'screenshot-desktop.png',
            sizes: '1280x720',  // Landscape for desktop
            type: 'image/png',
            form_factor: 'wide',
          },
        ],
      },
    }),
  ],
  // Aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Build options
  build: {
    sourcemap: process.env.NODE_ENV !== 'production', // Enable in dev
  },
});