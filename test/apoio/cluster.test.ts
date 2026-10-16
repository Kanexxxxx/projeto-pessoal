import { access } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, it, vi } from "vitest";
import * as postgres from "../../scripts/lib/postgres-local";
import * as migracoes from "../../src/servidor/bd/migracoes";
import { subirCluster } from "./cluster";

it("encerra o PostgreSQL e remove dados temporários quando a migração falha", async () => {
  const iniciar = vi.spyOn(postgres, "iniciarCluster");
  const migrar = vi.spyOn(migracoes, "aplicarMigracoes").mockRejectedValueOnce(new Error("migração inválida de teste"));
  let pasta: string | undefined;
  try {
    await expect(subirCluster()).rejects.toThrow("migração inválida de teste");
    pasta = iniciar.mock.calls[0]?.[0];
    expect(pasta).toBeDefined();
    expect(await postgres.clusterRodando(pasta!)).toBe(false);
    await expect(access(dirname(pasta!))).rejects.toThrow();
  } finally {
    // Também limpa o recurso quando a regressão é executada contra a versão com falha.
    if (pasta && await postgres.clusterRodando(pasta)) await postgres.pararCluster(pasta);
    iniciar.mockRestore();
    migrar.mockRestore();
  }
}, 120_000);
