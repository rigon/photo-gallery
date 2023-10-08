import { defineConfig } from 'vite';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import pkg from './package.json';

const chunks = {
    "vendor": ['react', 'react-router-dom', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
    "material": ['@mui/.*', '@emotion/.*', '@fontsource/.*'],
    "uploady": ['@rpldy/.*'],
    "react-window": ['react-window', 'react-virtualized-auto-sizer'],
    "leaflet": ['leaflet', 'react-leaflet'],
}

const pwaConfig: Partial<VitePWAOptions> = {
    registerType: 'autoUpdate',
    includeAssets: ['apple-touch-icon.png'],
    manifest: {
        name: 'Photo Gallery',
        theme_color: '#1976d2',
        icons: [
            {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
            },
            {
                src: 'vite.svg',
                type: 'image/svg',
                purpose: 'any maskable'
            },
        ]
    }
}

function renderChunks(deps: string[]) {
    const ret = {};
    
    // Get dependencies as set in chunks
    for (const [key, regs] of Object.entries(chunks))
        ret[key] = regs.flatMap(reg => deps.filter(dep => new RegExp("^"+reg+"$").test(dep)));
    
    // Remaining depedencies that were not included in the previous step
    const regs = Object.values(chunks).flatMap(regs => regs.map(reg => new RegExp("^"+reg+"$")));
    const remaining = deps.filter(dep => !regs.find(reg => reg.test(dep)));
    remaining.forEach(dep => ret[dep] = [dep]);

    return ret;
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), eslint(), VitePWA(pwaConfig)],
    build: {
        outDir: "build",
        rollupOptions: {
            output: {
                manualChunks: renderChunks(Object.keys(pkg.dependencies)),
            },
        },
    },
    server: {
        port: 3000,
        proxy: {
            "/api": "http://localhost:3080"
        },
    },
    define: {
        APP_VERSION: JSON.stringify(pkg.version)
    }
});
