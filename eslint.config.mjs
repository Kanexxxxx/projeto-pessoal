import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "test-results/**",
    "playwright-report/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // Inventários e relatórios privados não fazem parte do código.
    "privado/**",
    // Cópias de trabalho de agentes (git worktree) contariam o projeto duas vezes.
    ".claude/**",
  ]),
]);
