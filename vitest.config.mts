import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "./coverage",
      // Setting `include` explicitly (rather than relying on the default
      // "only files touched by a test") reports every matching source
      // file, including ones with zero test coverage - an accurate
      // picture requires seeing the gaps, not just what's already tested.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "coverage/**",
        // Test files and test-only infrastructure - not application code.
        "**/*.test.{ts,tsx}",
        "src/test/**",
        // Type-only / ambient declaration files - nothing executable to cover.
        "**/*.d.ts",
        // Config files (this file included) and generated Next.js artifacts.
        "**/*.config.{ts,js,mts,mjs,cts,cjs}",
        "next-env.d.ts",
      ],
    },
  },
});
