import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2017",

  // 🚀 IMPORTANT FIX
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": "{}",
    process: "{}"
  },

  // React should be external
  external: ["react", "react-dom", "clsx", "react/jsx-runtime"],

  // These need bundling to remove Node code
  noExternal: [
    "class-variance-authority",
    "@radix-ui"
  ],

  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
  },

  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
