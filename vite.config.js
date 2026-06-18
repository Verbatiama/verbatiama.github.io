import { defineConfig } from "vite";

export default defineConfig({
  root: "FriendMap",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
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
