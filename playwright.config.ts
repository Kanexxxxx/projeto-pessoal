import { defineConfig } from "@playwright/test";
import { BANCO, DADOS, PORTA, carregarAmbienteLocal } from "./test/e2e/ambiente";

/**
 * Teste de navegador com o Microsoft Edge do próprio sistema (channel
 * "msedge"): nenhum navegador é baixado. Sobe um `next dev` na porta 3100
 * contra um banco só do teste, recriado a cada execução.
 *
 *   npm run bd:subir && npm run test:e2e
 */
const ambiente = carregarAmbienteLocal();

export default defineConfig({
  testDir: "test/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./test/e2e/preparar.ts",
  use: {
    channel: "msedge",
    headless: true,
    baseURL: `http://app.localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  outputDir: "test-results",
  webServer: {
    command: `npx next dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXAKEEP_DIST_DIR: ".next-e2e",
      NEXAKEEP_DOMINIO_BASE: `localhost:${PORTA}`,
      NEXAKEEP_PROTOCOLO: "http",
      DATABASE_URL: ambiente.url("nexakeep_app", ambiente.senhas.app, BANCO),
      NEXAKEEP_EMAIL_TRANSPORTE: "arquivo",
      NEXAKEEP_DADOS_LOCAIS: DADOS,
    },
  },
});
