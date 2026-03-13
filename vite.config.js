import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'icon-192x192.png', 'icon-512x512.png', 'favicon.ico'],
      manifest: {
        name: 'ProtectForever Workspace',
        short_name: 'ProtectForever',
        description: 'Mobile-ready retail workspace for protection lookup, appointments, CRM, sales, and portability.',
        start_url: '/',
        display: 'standalone',
        background_color: '#050816',
        theme_color: '#111827',
        orientation: 'any',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
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
