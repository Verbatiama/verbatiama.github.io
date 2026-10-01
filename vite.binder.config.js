import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "binder-src",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../Binder",
    emptyOutDir: true,
  },
});
