import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Allows using describe, it, expect globally
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"], // A setup file for mocks
    include: ["src/**/*.test.ts"],
  },
});
