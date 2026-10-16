import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const raiz = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(raiz, "src"),
      // `server-only` lança fora do runtime do Next; nos testes vira no-op.
      "server-only": resolve(raiz, "test/apoio/server-only.ts"),
    },
  },
  test: {
    // UTC de propósito: o código nunca pode depender do fuso da máquina.
    env: { TZ: "UTC" },
    projects: [
      {
        extends: true,
        test: {
          name: "unidade",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "test/apoio/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integracao",
          environment: "node",
          include: ["test/integracao/**/*.test.ts"],
          // Sobe um PostgreSQL real e descartável uma vez por execução.
          globalSetup: ["test/apoio/postgres-global.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
