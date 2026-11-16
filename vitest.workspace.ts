import { defineWorkspace } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineWorkspace([
  // Pure-function packages — no DOM, no network
  {
    test: {
      name: "packages",
      include: ["packages/*/src/**/*.test.ts", "tests/unit/**/*.test.ts"],
      environment: "node",
    },
  },
  // API integration tests
  {
    resolve: {
      alias: {
        fastify: path.resolve(__dirname, "apps/api/node_modules/fastify"),
        "fastify-plugin": path.resolve(__dirname, "apps/api/node_modules/fastify-plugin"),
      },
    },
    test: {
      name: "api",
      include: ["tests/integration/**/*.test.ts"],
      environment: "node",
      globalSetup: ["tests/integration/setup.ts"],
    },
  },
]);
