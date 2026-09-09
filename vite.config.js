/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Split the animation lib into its own chunk so it can be cached separately.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('framer-motion') || id.includes('/motion')) return 'motion'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('/react') || id.includes('/scheduler')) return 'react'
          return undefined
        },
      },
    },
  },
})
