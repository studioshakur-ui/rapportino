import { defineConfig } from "tsup";

// Bundles src/index.ts + its relative imports (incl. the reused pure CORE agents
// normalizer.agent.ts / classifier.agent.ts) into a single CJS file.
// package.json dependencies (express, supabase, zod, dotenv) stay external.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
});
