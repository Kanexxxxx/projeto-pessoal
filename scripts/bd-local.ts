/**
 * Banco PostgreSQL de desenvolvimento, sem instalação no sistema.
 *
 *   npm run bd:subir     cria (se faltar), liga, provisiona papéis e migra
 *   npm run bd:parar     desliga
 *   npm run bd:estado    mostra se está ligado e as migrações aplicadas
 *   npm run bd:migrar    aplica migrações pendentes
 *   npm run bd:recriar -- --confirmar   apaga os dados locais e recria do zero
 *
 * Os dados ficam em NEXAKEEP_DADOS_LOCAIS/pg-dev (padrão %LOCALAPPDATA%\Nexakeep),
 * fora do repositório e do OneDrive: banco ativo em pasta sincronizada corrompe.
 */
import { mkdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import pg from "pg";
import { aplicarMigracoes, lerMigracoes } from "../src/servidor/bd/migracoes";
import { PAPEIS, provisionarBanco, provisionarPapeis } from "../src/servidor/bd/provisionar";
import { pastaDadosLocaisPadrao } from "../src/servidor/config";
import { clusterExiste, clusterRodando, iniciarCluster, inicializarCluster, pararCluster } from "./lib/postgres-local";

const PASTA_MIGRACOES = resolve(import.meta.dirname, "../db/migracoes");
const BANCO = "nexakeep";

function carregarAmbiente() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    console.error("Falta o .env.local. Rode primeiro: npm run preparar");
    process.exit(1);
  }
  const exigir = (nome: string) => {
    const valor = process.env[nome];
    if (!valor) {
      console.error(`Falta ${nome} no .env.local (veja .env.example).`);
      process.exit(1);
    }
    return valor;
  };
  const raiz = resolve(process.env.NEXAKEEP_DADOS_LOCAIS || pastaDadosLocaisPadrao(), "pg-dev");
  return {
    raiz,
    dados: join(raiz, "dados"),
    log: join(raiz, "postgres.log"),
    porta: Number(process.env.NEXAKEEP_BD_PORTA ?? 54329),
    senhaAdmin: exigir("NEXAKEEP_BD_SENHA_ADMIN"),
    senhaMigrador: exigir("NEXAKEEP_BD_SENHA_MIGRADOR"),
    senhaApp: exigir("NEXAKEEP_BD_SENHA_APP"),
  };
}

type Ambiente = ReturnType<typeof carregarAmbiente>;

async function conectar(a: Ambiente, banco: string, usuario = "postgres", senha = a.senhaAdmin) {
  const c = new pg.Client({ host: "127.0.0.1", port: a.porta, user: usuario, password: senha, database: banco });
  await c.connect();
  return c;
}

async function migrar(a: Ambiente) {
  const migrador = await conectar(a, BANCO, PAPEIS.migrador, a.senhaMigrador);
  try {
    const novas = await aplicarMigracoes(migrador, PASTA_MIGRACOES);
    console.log(novas.length ? `Migrações aplicadas: ${novas.join(", ")}` : "Nenhuma migração pendente.");
  } finally {
    await migrador.end();
  }
}

async function subir(a: Ambiente) {
  if (!(await clusterExiste(a.dados))) {
    await mkdir(a.raiz, { recursive: true });
    await inicializarCluster(a.dados, a.senhaAdmin);
    console.log(`Cluster criado em ${a.dados}`);
  }
  if (!(await clusterRodando(a.dados))) {
    await iniciarCluster(a.dados, a.porta, a.log);
  }
  const admin = await conectar(a, "postgres");
  try {
    await provisionarPapeis(admin, { migrador: a.senhaMigrador, app: a.senhaApp });
    await provisionarBanco(admin, BANCO, (b) => conectar(a, b));
  } finally {
    await admin.end();
  }
  await migrar(a);
  console.log(`Banco local pronto em 127.0.0.1:${a.porta}. Para desligar: npm run bd:parar`);
}

async function estado(a: Ambiente) {
  if (!(await clusterExiste(a.dados))) return console.log("Banco local ainda não criado (npm run bd:subir).");
  if (!(await clusterRodando(a.dados))) return console.log(`Banco local criado em ${a.dados}, desligado.`);
  const migrador = await conectar(a, BANCO, PAPEIS.migrador, a.senhaMigrador);
  try {
    await migrador.query(`set role ${PAPEIS.dono}`);
    const { rows } = await migrador.query<{ versao: string; nome: string }>("select versao, nome from nexakeep_migracoes order by versao");
    const existentes = await lerMigracoes(PASTA_MIGRACOES);
    console.log(`Ligado em 127.0.0.1:${a.porta}. Migrações: ${rows.length} de ${existentes.length} aplicadas.`);
  } finally {
    await migrador.end();
  }
}

async function recriar(a: Ambiente) {
  if (!process.argv.includes("--confirmar")) {
    console.error("Isto apaga todos os dados do banco local. Repita com: npm run bd:recriar -- --confirmar");
    process.exit(1);
  }
  // Trava contra configuração errada: só apaga uma pasta que termina em pg-dev.
  if (!a.raiz.endsWith(`${sep}pg-dev`)) throw new Error(`Pasta inesperada, nada apagado: ${a.raiz}`);
  if (await clusterRodando(a.dados)) await pararCluster(a.dados);
  await rm(a.raiz, { recursive: true, force: true });
  console.log("Dados locais apagados.");
  await subir(a);
}

const comandos: Record<string, (a: Ambiente) => Promise<unknown>> = {
  subir,
  parar: async (a) => {
    if (await clusterRodando(a.dados)) await pararCluster(a.dados);
    console.log("Banco local desligado.");
  },
  estado,
  migrar,
  recriar,
};

const nome = process.argv[2] ?? "";
const comando = comandos[nome];
if (!comando) {
  console.error(`Uso: tsx scripts/bd-local.ts <${Object.keys(comandos).join("|")}>`);
  process.exit(1);
}
await comando(carregarAmbiente());
