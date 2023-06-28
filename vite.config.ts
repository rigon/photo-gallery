import { defineConfig } from 'vite';
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

function renderChunks(deps: string[]) {
    const ret = {};
    
    for (const [key, regs] of Object.entries(chunks))
        ret[key] = regs.flatMap(reg => deps.filter(dep => new RegExp("^"+reg+"$").test(dep)));
    
    // Remaining depedencies that were not included in the previous step
    const regs = Object.values(chunks).flatMap(regs => regs.map(reg => new RegExp("^"+reg+"$")));
    const remaining = deps.filter(dep => !regs.find(reg => reg.test(dep)));
    remaining.forEach(dep => ret[dep] = [dep]);

    console.log(ret);
    return ret;
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), eslint()],
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
