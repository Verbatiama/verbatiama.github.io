import { defineConfig } from "vite";

export default defineConfig({
  root: "FriendMap",
  build: {
    outDir: "assets",
    emptyOutDir: false,
    lib: {
      entry: "app.js",
      formats: ["es"],
      fileName: () => "app.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
