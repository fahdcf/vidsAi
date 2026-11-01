import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js','resources/js/editor/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve:{dedupe:['react','react-dom','remotion','@remotion/player','zod'],alias:{'@vidsai/contracts':path.resolve(import.meta.dirname,'../remotion-api/packages/contracts/dist/index.js'),'@vidsai/editing-core':path.resolve(import.meta.dirname,'../remotion-api/packages/editing-core/dist/index.js'),'@vidsai/compositions':path.resolve(import.meta.dirname,'../remotion-api/packages/compositions/dist/index.js')}},
    server:{fs:{allow:['..']}},
});
