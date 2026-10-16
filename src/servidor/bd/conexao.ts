import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config";
import type { BD } from "./tipos";

/**
 * Toda sessão do banco roda em UTC e com tempo máximo por comando: datas nunca
 * dependem do fuso da máquina e uma consulta travada não segura a conexão.
 */
export function criarPool(url: string, nomeAplicacao: string, max = 10): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: nomeAplicacao,
    options: "-c timezone=UTC -c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000",
  });
}

export function criarBd(pool: pg.Pool): Kysely<BD> {
  return new Kysely<BD>({ dialect: new PostgresDialect({ pool }) });
}

// O Next recarrega módulos no desenvolvimento; o pool fica no globalThis para
// não abrir conexões novas a cada edição.
const global = globalThis as unknown as { __nexakeepPool?: pg.Pool; __nexakeepBd?: Kysely<BD> };

export function poolDaAplicacao(): pg.Pool {
  global.__nexakeepPool ??= criarPool(config().bancoUrl, "nexakeep-web");
  return global.__nexakeepPool;
}

export function bd(): Kysely<BD> {
  global.__nexakeepBd ??= criarBd(poolDaAplicacao());
  return global.__nexakeepBd;
}
