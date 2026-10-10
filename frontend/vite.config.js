import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
 
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // Server start hote hi important files pehle se ready kar lo,
    // taaki browser kholne par pehli load fast ho
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/components/layouts/MainLayout.jsx',
        './src/components/layouts/AuthLayout.jsx',
        './src/components/Navbar.jsx',
        './src/components/Footer.jsx',
        './src/pages/Home.jsx',
        './src/pages/Login.jsx',
      ],
    },
  },
  // Libraries ko pehle se pre-bundle kar do (dev mode mein pehli load kam slow hogi)
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-redux',
      'react-hot-toast',
      'framer-motion',
    ],
  },
  // Production build ke liye: vendor libraries alag chunk mein (better caching)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});