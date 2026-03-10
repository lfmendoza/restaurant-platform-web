import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/users': 'http://localhost:3000',
      '/restaurants': 'http://localhost:3000',
      '/menu-items': 'http://localhost:3000',
      '/carts': 'http://localhost:3000',
      '/orders': 'http://localhost:3000',
      '/reviews': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/analytics': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/simulation': 'http://localhost:3000',
    }
  }
})
