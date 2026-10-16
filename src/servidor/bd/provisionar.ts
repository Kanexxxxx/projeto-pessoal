import type pg from "pg";

/**
 * Papéis e permissões do PostgreSQL (ARQUITETURA.md §4).
 *
 * - `nexakeep_dono`: sem login; é dono de todas as tabelas. Ninguém se conecta
 *   como ele.
 * - `nexakeep_migrador`: aplica migrações fazendo `SET ROLE nexakeep_dono`.
 *   Usado só por scripts, nunca pela aplicação.
 * - `nexakeep_app`: o papel da aplicação e do worker. Só DML, sem superusuário,
 *   sem BYPASSRLS e sem ser dono de nada — então o RLS vale para ele.
 *
 * Tudo aqui roda como superusuário e é idempotente: serve para o banco local,
 * para os testes e como roteiro da VPS.
 */
export const PAPEIS = {
  dono: "nexakeep_dono",
  migrador: "nexakeep_migrador",
  app: "nexakeep_app",
} as const;

export const EXTENSOES = ["btree_gist", "citext", "pgcrypto"] as const;

async function papelExiste(admin: pg.Client, nome: string): Promise<boolean> {
  const r = await admin.query("select 1 from pg_roles where rolname = $1", [nome]);
  return (r.rowCount ?? 0) > 0;
}

async function criarOuAtualizarPapel(admin: pg.Client, nome: string, atributos: string): Promise<void> {
  const verbo = (await papelExiste(admin, nome)) ? "alter" : "create";
  await admin.query(`${verbo} role ${admin.escapeIdentifier(nome)} with ${atributos}`);
}

export async function provisionarPapeis(admin: pg.Client, senhas: { migrador: string; app: string }): Promise<void> {
  const restritos = "nosuperuser nocreatedb nocreaterole noreplication nobypassrls";
  await criarOuAtualizarPapel(admin, PAPEIS.dono, `nologin ${restritos}`);
  await criarOuAtualizarPapel(admin, PAPEIS.migrador, `login ${restritos} password ${admin.escapeLiteral(senhas.migrador)}`);
  await criarOuAtualizarPapel(admin, PAPEIS.app, `login ${restritos} noinherit password ${admin.escapeLiteral(senhas.app)}`);
  // O migrador pode assumir o papel de dono, mas não herda os privilégios dele.
  await admin.query(`grant ${PAPEIS.dono} to ${PAPEIS.migrador} with inherit false, set true`);
}

/** Permissões no nível do banco. Não são copiadas de um banco modelo, por isso ficam separadas. */
export async function ajustarPermissoesDoBanco(admin: pg.Client, banco: string): Promise<void> {
  const b = admin.escapeIdentifier(banco);
  await admin.query(`revoke all on database ${b} from public`);
  await admin.query(`grant connect, temporary on database ${b} to ${PAPEIS.app}, ${PAPEIS.migrador}`);
}

/**
 * Cria o banco (se faltar) e prepara o schema `public`: extensões, dono e
 * privilégios padrão — toda tabela criada pelo dono já nasce com DML para a
 * aplicação. Tabelas que a aplicação não pode alterar revogam na migração.
 */
export async function provisionarBanco(
  admin: pg.Client,
  banco: string,
  conectarComo: (banco: string) => Promise<pg.Client>,
): Promise<void> {
  const existe = await admin.query("select 1 from pg_database where datname = $1", [banco]);
  if (!existe.rowCount) {
    await admin.query(
      `create database ${admin.escapeIdentifier(banco)} owner ${PAPEIS.dono} encoding 'UTF8' template template0`,
    );
  }
  await ajustarPermissoesDoBanco(admin, banco);

  const c = await conectarComo(banco);
  try {
    for (const extensao of EXTENSOES) await c.query(`create extension if not exists ${extensao}`);
    await c.query(`alter schema public owner to ${PAPEIS.dono}`);
    await c.query("revoke all on schema public from public");
    await c.query(`grant usage on schema public to ${PAPEIS.app}`);
    const padrao = `alter default privileges for role ${PAPEIS.dono} in schema public`;
    await c.query(`${padrao} grant select, insert, update, delete on tables to ${PAPEIS.app}`);
    await c.query(`${padrao} grant usage, select on sequences to ${PAPEIS.app}`);
    await c.query(`${padrao} revoke execute on functions from public`);
    await c.query(`${padrao} grant execute on functions to ${PAPEIS.app}`);
  } finally {
    await c.end();
  }
}
