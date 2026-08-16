import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Node, not jsdom: everything under test is server-side logic — token
    // verification, plan gating, request validation. No DOM required.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each file gets a clean module registry so tests that set env vars
    // (the token secret, for instance) can't leak into one another.
    isolate: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
