import { sql, type Kysely, type Transaction } from "kysely";
import type { BD } from "../bd/tipos";

export type Trx = Transaction<BD>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Executa `fn` numa transação com o escopo da loja: as políticas de RLS só
 * deixam ver e gravar linhas dessa loja. O `true` do set_config limita o valor
 * à transação, então a conexão volta ao pool sem escopo nenhum.
 *
 * O tenantId vem sempre da loja resolvida no servidor (subdomínio ou slug da
 * rota conferido contra o vínculo), nunca de campo de formulário.
 *
 * O escopo de loja zera `app.usuario_id` de propósito: a política de leitura
 * da equipe também libera "os próprios vínculos em qualquer loja", e com o
 * usuário definido aqui uma consulta sem filtro de loja enxergaria o vínculo
 * da pessoa com OUTRA loja (defeito pego pelo teste de isolamento).
 */
export async function comLoja<T>(db: Kysely<BD>, tenantId: string, fn: (trx: Trx) => Promise<T>): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await definirEscopo(trx, tenantId);
    return fn(trx);
  });
}

/** Define o escopo da loja dentro de uma transação já aberta. */
export async function definirEscopo(trx: Kysely<BD>, tenantId: string): Promise<void> {
  if (!UUID.test(tenantId)) throw new Error("Loja inválida.");
  await sql`select set_config('app.tenant_id', ${tenantId}, true), set_config('app.usuario_id', '', true)`.execute(trx);
}

/** Escopo só de usuário: enxerga os próprios vínculos em qualquer loja e nada mais. */
export async function comUsuario<T>(db: Kysely<BD>, usuarioId: string, fn: (trx: Trx) => Promise<T>): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', '', true), set_config('app.usuario_id', ${usuarioId}, true)`.execute(trx);
    return fn(trx);
  });
}

/**
 * Trava da agenda da loja, até o fim da transação. Reserva, remarcação e
 * bloqueio passam por ela: assim um bloqueio criado no painel e uma reserva
 * feita no site no mesmo instante não se cruzam (BASE-ANTERIOR.md §4, regra 6).
 */
export async function travarAgenda(trx: Trx, tenantId: string): Promise<void> {
  await sql`select pg_advisory_xact_lock(7101, hashtext(${tenantId}))`.execute(trx);
}
