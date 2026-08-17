import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Tmizan',
        short_name: 'Tmizan',
        description: 'Tmizan — hifz i učenje Kur\'ana',
        theme_color: '#1D9E75',
        background_color: '#1D9E75',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          // Supabase REST i auth pozivi namjerno nisu u runtimeCaching.
          // Service worker koji presreće te pozive (čak i sa NetworkFirst) je
          // izazivao nasumične "No API key found in request" 500/400 greške
          // (sessions, monthly_plans), vjerovatno zbog gubljenja apikey i Authorization
          // headera prilikom presretanja cross-origin zahtjeva sa custom
          // headerima. Autentificirani API pozivi ionako ne bi trebali biti
          // keširani u dijeljenom browser kešu (rizik zastarjelih/pomiješanih
          // podataka), pa ide direktno na mrežu, bez SW interferencije.
          {
            // Statične slike i fontovi: prvo keš, pa mreža.
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dana
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, 
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Sluša na svim mrežnim adresama, da se aplikacija može otvoriti i s
    // telefona na istoj mreži, radi provjere PWA ponašanja na mobilnom.
    host: true,
  },
  preview: {
    // Isto vrijedi i za produkcijski build pokrenut kroz `npm run preview`.
    host: true,
  },
})
