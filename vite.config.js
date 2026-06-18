import { defineConfig } from "vite";

function fixDeckGlLayerUniforms() {
  return {
    name: "fix-deck-layer-uniforms",
    transform(code, id) {
      if (!id.includes("@deck.gl/core") || !code.includes("uniform float opacity;")) {
        return null;
      }

      return {
        code: code.replaceAll("uniform float opacity;", "float opacity;"),
        map: null,
      };
    },
  };
}

export default defineConfig({
  root: "FriendMap",
  plugins: [fixDeckGlLayerUniforms()],
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
