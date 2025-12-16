import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    resolve: true
  },
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"], // 👉 IMPORTANT
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  },
  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
