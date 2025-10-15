import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy Socket.IO requests to backend
      '/socket.io/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
      // Proxy API requests to backend
      '/api/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
