import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
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
          // Supabase REST/auth pozivi  nisu u runtimeCaching.
          // Service worker koji presreće te pozive (čak i sa NetworkFirst) je
          // izazivao nasumične "No API key found in request" 500/400 greške
          // (sessions, monthly_plans) — vjerovatno gubljenje apikey/Authorization
          // headera prilikom presretanja cross-origin zahtjeva sa custom
          // headerima. Autentificirani API pozivi ionako ne bi trebali biti
          // keširani u dijeljenom browser kešu (rizik zastarjelih/pomiješanih
          // podataka), pa ide direktno na mrežu, bez SW interferencije.
          {
            // statične slike/fontovi — cache-first
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
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // izloži na mreži (0.0.0.0) — da telefon na istom WiFi-ju može pristupiti
  },
  preview: {
    host: true, // i za `npm run preview` (produkcijski build)
  },
})
