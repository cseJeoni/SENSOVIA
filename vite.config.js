import { defineConfig } from 'vite'

export default defineConfig({
  root: 'app',
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: 'pages/main.html'
    }
  },
  server: {
    port: 5173
  }
})
