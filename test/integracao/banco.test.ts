import { cp, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { getMigrations } from "better-auth/db/migration";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aplicarMigracoes, lerMigracoes } from "../../src/servidor/bd/migracoes";
import { PAPEIS, provisionarBanco } from "../../src/servidor/bd/provisionar";
import { PASTA_MIGRACOES, url } from "../apoio/cluster";
import { bancoDeTeste, contextoDeAcesso } from "../apoio/banco";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;

beforeAll(async () => {
  banco = await bancoDeTeste();
});
afterAll(async () => {
  await banco.encerrar();
});

describe("migrações", () => {
  it("comando usa DATABASE_URL_MIGRACAO e recusa a credencial da aplicação sem expô-la", async () => {
    const rodar = promisify(execFile);
    const script = resolve(import.meta.dirname, "../../scripts/migrar.ts");
    const executar = (usuario: string, senha: string) => rodar(process.execPath, ["--import", "tsx", script], {
      env: { ...process.env, DATABASE_URL_MIGRACAO: url(banco.info, usuario, senha, banco.nome) },
    });
    const resultado = await executar(PAPEIS.migrador, banco.info.senhaMigrador);
    expect(resultado.stdout).toContain("Nenhuma migração pendente");
    try {
      await executar(PAPEIS.app, banco.info.senhaApp);
      throw new Error("A aplicação não pode aplicar migrações");
    } catch (erro) {
      expect(erro).toMatchObject({ code: 1 });
      const saida = erro as { stdout: string; stderr: string };
      expect(saida.stderr).toContain("Falha na migração");
      expect(saida.stderr + saida.stdout).not.toContain(banco.info.senhaApp);
    }
  });

  it("sobem do zero num banco vazio e reaplicar não faz nada", async () => {
    const admin = await banco.conectar("postgres");
    const vazio = `vazio_${Date.now()}`;
    try {
      await provisionarBanco(admin, vazio, async (b) => {
        const c = new pg.Client({ connectionString: url(banco.info, "postgres", banco.info.senhaAdmin, b) });
        await c.connect();
        return c;
      });
    } finally {
      await admin.end();
    }
    const migrador = new pg.Client({ connectionString: url(banco.info, PAPEIS.migrador, banco.info.senhaMigrador, vazio) });
    await migrador.connect();
    try {
      const todas = (await lerMigracoes(PASTA_MIGRACOES)).map((m) => `${m.versao}_${m.nome}`);
      expect(await aplicarMigracoes(migrador, PASTA_MIGRACOES)).toEqual(todas);
      expect(await aplicarMigracoes(migrador, PASTA_MIGRACOES)).toEqual([]);
    } finally {
      await migrador.end();
    }
  });

  it("recusam migração alterada depois de aplicada", async () => {
    const pasta = await mkdtemp(join(tmpdir(), "nexakeep-migracoes-"));
    try {
      await cp(PASTA_MIGRACOES, pasta, { recursive: true });
      const [primeira] = (await readdir(pasta)).sort();
      await writeFile(join(pasta, primeira!), "-- editada depois de aplicada\nselect 1;\n");
      const migrador = await banco.conectar(PAPEIS.migrador);
      try {
        await expect(aplicarMigracoes(migrador, pasta)).rejects.toThrow(/alterada depois de aplicada/);
      } finally {
        await migrador.end();
      }
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });

  it("recusam arquivo que tenta controlar a transação", async () => {
    const pasta = await mkdtemp(join(tmpdir(), "nexakeep-migracoes-"));
    try {
      await writeFile(join(pasta, "0001_ruim.sql"), "begin;\ncreate table x (id int);\ncommit;\n");
      await expect(lerMigracoes(pasta)).rejects.toThrow(/não pode controlar transação/);
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  });
});

describe("papel da aplicação", () => {
  it("não é superusuário, não ignora RLS e não é dono de nenhuma tabela", async () => {
    const app = await banco.conectar(PAPEIS.app);
    try {
      const papel = await app.query("select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb from pg_roles where rolname = current_user");
      expect(papel.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false });
      const donas = await app.query("select count(*)::int as n from pg_tables where schemaname = 'public' and tableowner = current_user");
      expect(donas.rows[0].n).toBe(0);
    } finally {
      await app.end();
    }
  });

  it("não lê o controle de migrações nem reescreve a auditoria", async () => {
    const app = await banco.conectar(PAPEIS.app);
    try {
      await expect(app.query("select * from nexakeep_migracoes")).rejects.toThrow(/permission denied/);
      await app.query("insert into auditoria (acao) values ('teste.evento')");
      await expect(app.query("update auditoria set acao = 'teste.outro'")).rejects.toThrow(/permission denied/);
      await expect(app.query("delete from auditoria")).rejects.toThrow(/permission denied/);
      await expect(app.query("create table invasora (id int)")).rejects.toThrow(/permission denied/);
    } finally {
      await app.end();
    }
  });
});

describe("esquema da autenticação", () => {
  it("está em dia com o que a biblioteca espera (rodar scripts/gerar-sql-auth.ts se falhar)", async () => {
    const { auth } = contextoDeAcesso(banco.pool, banco.db);
    const plano = await getMigrations(auth.options, { throwOnUnsafe: false });
    expect(plano.toBeCreated.map((t) => t.table)).toEqual([]);
    expect(plano.toBeAdded.map((t) => `${t.table}: ${Object.keys(t.fields).join(", ")}`)).toEqual([]);
    expect(plano.schemaProblems).toEqual([]);
  });
});
