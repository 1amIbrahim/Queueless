import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const API_TARGET = 'http://127.0.0.1:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/hospitals': { target: API_TARGET, changeOrigin: true },
      '/tokens':    { target: API_TARGET, changeOrigin: true },
      '/queues':    { target: API_TARGET, changeOrigin: true },
      '/notifications': { target: API_TARGET, changeOrigin: true },
      '/health':    { target: API_TARGET, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@queueless/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
