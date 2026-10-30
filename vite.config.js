import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative Pfade: läuft unter github.io/PartyBet/ genauso wie auf Firebase Hosting
  base: './',
  build: {
    chunkSizeWarningLimit: 700, // Firebase-SDK allein ~570 kB (170 kB gzip)
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'firebase', test: /node_modules[\\/]@?firebase/ }],
        },
      },
    },
  },
  test: { environment: 'node' },
});
