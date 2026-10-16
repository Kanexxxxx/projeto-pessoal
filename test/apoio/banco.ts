import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { inject } from "vitest";
import { criarAuth } from "../../src/servidor/auth/instancia";
import { criarBd, criarPool } from "../../src/servidor/bd/conexao";
import { PAPEIS } from "../../src/servidor/bd/provisionar";
import { lerConfig } from "../../src/servidor/config";
import { enviadorEmMemoria } from "../../src/servidor/email/enviador";
import { clonarModelo, url } from "./cluster";

/** Banco novo, copiado do modelo migrado, conectado com o papel da aplicação. */
export async function bancoDeTeste() {
  const info = inject("cluster");
  const nome = `teste_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  await clonarModelo(info, nome);
  const pool = criarPool(url(info, PAPEIS.app, info.senhaApp, nome), "teste", 5);
  const db = criarBd(pool);

  const conectar = async (usuario: "postgres" | typeof PAPEIS.migrador | typeof PAPEIS.app) => {
    const senha = usuario === "postgres" ? info.senhaAdmin : usuario === PAPEIS.migrador ? info.senhaMigrador : info.senhaApp;
    const c = new pg.Client({ connectionString: url(info, usuario, senha, nome) });
    await c.connect();
    return c;
  };

  return {
    nome,
    info,
    pool,
    db,
    conectar,
    async encerrar() {
      await db.destroy();
    },
  };
}

/**
 * Contexto de acesso completo (autenticação + banco + e-mail em memória).
 * `segredos` fixa BETTER_AUTH_SECRET/BETTER_AUTH_SECRETS para simular rotação.
 */
export function contextoDeAcesso(
  pool: pg.Pool,
  db: ReturnType<typeof criarBd>,
  segredos: { BETTER_AUTH_SECRET?: string; BETTER_AUTH_SECRETS?: string } = {},
) {
  const config = lerConfig({
    NODE_ENV: "test",
    NEXAKEEP_DOMINIO_BASE: "localhost:3000",
    NEXAKEEP_PROTOCOLO: "http",
    DATABASE_URL: "postgres://definido-pelo-teste",
    BETTER_AUTH_SECRET: randomBytes(32).toString("base64url"),
    NEXAKEEP_EMAIL_TRANSPORTE: "memoria",
    ...segredos,
  });
  const enviador = enviadorEmMemoria();
  const auth = criarAuth({ pool, config, enviador });
  return { auth, db, config, enviador };
}
