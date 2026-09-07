import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import fs from "fs"

// Plugin to duplicate index.html as 404.html for SPA static hosting (Render, GitHub Pages)
function copyIndexTo404Plugin() {
  return {
    name: 'copy-index-to-404',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      const notFoundPath = path.join(distDir, '404.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
        console.log('[Build] Successfully generated dist/404.html for SPA client-side routing');
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copyIndexTo404Plugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
