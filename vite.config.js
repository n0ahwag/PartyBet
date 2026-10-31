import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// MediaPipe-WASM (Face-Tracking fürs Starr-Duell) selbst ausliefern statt vom CDN
const MP_WASM = resolve('node_modules/@mediapipe/tasks-vision/wasm');
const MP_FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

function mediapipeWasm() {
  let outDir;
  return {
    name: 'mediapipe-wasm',
    configResolved(cfg) { outDir = resolve(cfg.root, cfg.build.outDir); },
    configureServer(server) {
      server.middlewares.use('/mediapipe', (req, res, next) => {
        const file = req.url.replace(/^\//, '').split('?')[0];
        if (!MP_FILES.includes(file)) return next();
        res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        createReadStream(resolve(MP_WASM, file)).pipe(res);
      });
    },
    closeBundle() {
      mkdirSync(resolve(outDir, 'mediapipe'), { recursive: true });
      for (const f of MP_FILES) cpSync(resolve(MP_WASM, f), resolve(outDir, 'mediapipe', f));
    },
  };
}

/**
 * AdSense: Bestätigungs-Tag im <head> (für die Website-Prüfung) und ads.txt (Pflicht).
 * Beides nur, wenn eine Publisher-ID gesetzt ist.
 */
function adsTxt() {
  let outDir;
  const client = process.env.VITE_ADSENSE_CLIENT || '';
  const valid = /^ca-pub-\d+$/.test(client);
  return {
    name: 'ads-txt',
    configResolved(cfg) { outDir = resolve(cfg.root, cfg.build.outDir); },
    transformIndexHtml() {
      return valid ? [{ tag: 'meta', attrs: { name: 'google-adsense-account', content: client }, injectTo: 'head' }] : [];
    },
    closeBundle() {
      if (!valid) return;
      writeFileSync(resolve(outDir, 'ads.txt'), `google.com, ${client.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
    },
  };
}

export default defineConfig({
  plugins: [react(), mediapipeWasm(), adsTxt()],
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
