import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pg from "pg";
import { clusterExiste, clusterRodando, iniciarCluster } from "../../scripts/lib/postgres-local";
import { aplicarMigracoes } from "../../src/servidor/bd/migracoes";
import { PAPEIS, provisionarBanco } from "../../src/servidor/bd/provisionar";
import { pastaDadosLocaisPadrao } from "../../src/servidor/config";
import { BANCO, DADOS, carregarAmbienteLocal } from "./ambiente";

/** Recria o banco do teste de navegador do zero e limpa os e-mails gravados. */
export default async function preparar() {
  const a = carregarAmbienteLocal();
  const raiz = resolve(process.env.NEXAKEEP_DADOS_LOCAIS || pastaDadosLocaisPadrao(), "pg-dev");
  const dados = join(raiz, "dados");
  if (!(await clusterExiste(dados))) throw new Error("Banco local não criado. Rode: npm run bd:subir");
  if (!(await clusterRodando(dados))) await iniciarCluster(dados, a.porta, join(raiz, "postgres.log"));

  const conectar = async (banco: string, usuario = "postgres", senha = a.senhas.admin) => {
    const c = new pg.Client({ connectionString: a.url(usuario, senha, banco) });
    await c.connect();
    return c;
  };

  const admin = await conectar("postgres");
  try {
    await admin.query(`drop database if exists ${BANCO} with (force)`);
    await provisionarBanco(admin, BANCO, (b) => conectar(b));
  } finally {
    await admin.end();
  }
  const migrador = await conectar(BANCO, PAPEIS.migrador, a.senhas.migrador);
  try {
    await aplicarMigracoes(migrador, resolve(import.meta.dirname, "../../db/migracoes"));
  } finally {
    await migrador.end();
  }

  if (resolve(DADOS) !== resolve(tmpdir(), "nexakeep-e2e")) {
    throw new Error("Pasta de e-mails E2E inesperada; nenhum arquivo removido.");
  }
  await rm(resolve(DADOS), { recursive: true, force: true });
  await mkdir(DADOS, { recursive: true });
}
