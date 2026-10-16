import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type pg from "pg";
import { PAPEIS } from "./provisionar";

/**
 * Migrações SQL numeradas em `db/migracoes/NNNN_nome.sql`, aplicadas em ordem,
 * cada uma na sua transação e como `nexakeep_dono`.
 *
 * Reprodutível de propósito (lição da base anterior, docs/BASE-ANTERIOR.md):
 * o banco sobe do zero só com estes arquivos; uma migração aplicada nunca
 * muda — o checksum é conferido e a divergência interrompe tudo.
 */
const NOME_ARQUIVO = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const TRAVA = 7_354_210; // chave da trava consultiva: dois processos não migram ao mesmo tempo

export type Migracao = { versao: string; nome: string; sql: string; sha256: string };

export async function lerMigracoes(pasta: string): Promise<Migracao[]> {
  const arquivos = (await readdir(pasta)).filter((a) => a.endsWith(".sql")).sort();
  const vistas = new Set<string>();
  const migracoes: Migracao[] = [];
  for (const arquivo of arquivos) {
    const m = NOME_ARQUIVO.exec(arquivo);
    if (!m) throw new Error(`Nome de migração fora do padrão NNNN_nome.sql: ${arquivo}`);
    const [, versao, nome] = m as unknown as [string, string, string];
    if (vistas.has(versao)) throw new Error(`Versão de migração repetida: ${versao}`);
    vistas.add(versao);
    // Checksum sobre LF: o mesmo arquivo com CRLF (checkout no Windows) não "muda".
    const sql = (await readFile(join(pasta, arquivo), "utf8")).replace(/\r\n/g, "\n");
    if (/^\s*(begin|commit|rollback)\s*;/im.test(sql)) {
      throw new Error(`A migração ${arquivo} não pode controlar transação; o executor já abre uma.`);
    }
    migracoes.push({ versao, nome, sql, sha256: createHash("sha256").update(sql).digest("hex") });
  }
  return migracoes;
}

export async function aplicarMigracoes(cliente: pg.Client, pasta: string): Promise<string[]> {
  const migracoes = await lerMigracoes(pasta);
  await cliente.query("select pg_advisory_lock($1)", [TRAVA]);
  // O migrador não herda privilégios: assume o papel de dono só durante a migração.
  await cliente.query(`set role ${PAPEIS.dono}`);
  try {
    await cliente.query(`
      create table if not exists nexakeep_migracoes (
        versao text primary key,
        nome text not null,
        sha256 text not null,
        aplicada_em timestamptz not null default now()
      )`);
    await cliente.query(`revoke all on nexakeep_migracoes from ${PAPEIS.app}`);

    const { rows } = await cliente.query<{ versao: string; sha256: string }>(
      "select versao, sha256 from nexakeep_migracoes",
    );
    const aplicadas = new Map(rows.map((r) => [r.versao, r.sha256]));
    const conhecidas = new Set(migracoes.map((m) => m.versao));
    for (const versao of aplicadas.keys()) {
      if (!conhecidas.has(versao)) throw new Error(`O banco tem a migração ${versao}, que não existe nesta versão do código.`);
    }

    const novas: string[] = [];
    for (const m of migracoes) {
      const sha = aplicadas.get(m.versao);
      if (sha !== undefined) {
        if (sha !== m.sha256) {
          throw new Error(`A migração ${m.versao}_${m.nome} foi alterada depois de aplicada. Crie uma nova migração.`);
        }
        continue;
      }
      await cliente.query("begin");
      try {
        await cliente.query(m.sql);
        await cliente.query("insert into nexakeep_migracoes (versao, nome, sha256) values ($1, $2, $3)", [
          m.versao,
          m.nome,
          m.sha256,
        ]);
        await cliente.query("commit");
      } catch (erro) {
        await cliente.query("rollback");
        throw new Error(`Falha na migração ${m.versao}_${m.nome}: ${(erro as Error).message}`);
      }
      novas.push(`${m.versao}_${m.nome}`);
    }
    return novas;
  } finally {
    await cliente.query("reset role");
    await cliente.query("select pg_advisory_unlock($1)", [TRAVA]);
  }
}
