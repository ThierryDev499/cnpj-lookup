import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Em dev, base "/" (local). Em build em CI no GitHub Pages, base = "/cnpj-lookup/"
// porque o projeto fica sob https://<user>.github.io/cnpj-lookup/.
// A action define `BASE_PATH=/cnpj-lookup/` antes de rodar o build.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
