import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      manifest: {
        name: 'StoreView - Daily Outlook',
        short_name: 'StoreView',
        description: 'Device protection catalog with UPC and MDN lookup',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#0f0f0f',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 }
            }
          },
          {
            urlPattern: /^https:\/\/docs\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sheets-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 5, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ]
});
