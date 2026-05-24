import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base '/lunanusa/' hanya saat build (untuk GitHub Pages project site);
// dev server tetap di root '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/lunanusa/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}))
