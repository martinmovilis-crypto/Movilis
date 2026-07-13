import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Genera un único index.html autocontenido (todo el JS/CSS embebido),
// para que se pueda abrir directo en el navegador (doble clic, sin servidor)
// y también se pueda desplegar en Netlify tal cual.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
