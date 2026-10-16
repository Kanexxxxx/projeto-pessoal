import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import pg from "pg";
import { clusterRodando, iniciarCluster, inicializarCluster, pararCluster } from "../../scripts/lib/postgres-local";
import { aplicarMigracoes } from "../../src/servidor/bd/migracoes";
import { PAPEIS, ajustarPermissoesDoBanco, provisionarBanco, provisionarPapeis } from "../../src/servidor/bd/provisionar";

/**
 * Cluster PostgreSQL descartável para testes e scripts: sobe numa pasta
 * temporária (fora do repositório e do OneDrive), numa porta livre, com
 * senhas aleatórias, e é apagado ao final.
 */
export type InfoCluster = {
  porta: number;
  senhaAdmin: string;
  senhaMigrador: string;
  senhaApp: string;
  modelo: string;
};

export const PASTA_MIGRACOES = resolve(import.meta.dirname, "../../db/migracoes");

export function url(info: Pick<InfoCluster, "porta">, usuario: string, senha: string, banco: string): string {
  return `postgres://${usuario}:${encodeURIComponent(senha)}@127.0.0.1:${info.porta}/${banco}`;
}

async function portaLivre(): Promise<number> {
  return new Promise((ok, erro) => {
    const s = createServer();
    s.unref();
    s.on("error", erro);
    s.listen(0, "127.0.0.1", () => {
      const endereco = s.address();
      const porta = typeof endereco === "object" && endereco ? endereco.port : 0;
      s.close(() => ok(porta));
    });
  });
}

const segredo = () => randomBytes(18).toString("base64url");

export async function subirCluster(opcoes: { modelo?: string; migrar?: boolean } = {}) {
  const raiz = await mkdtemp(join(tmpdir(), "nexakeep-pg-"));
  const pasta = join(raiz, "dados");
  const encerrar = async () => {
    const alvo = resolve(raiz);
    if (!alvo.startsWith(`${resolve(tmpdir())}${sep}`) || !basename(alvo).startsWith("nexakeep-pg-")) {
      throw new Error("Pasta temporária inesperada; nenhum dado foi removido.");
    }
    // Não remover dados enquanto o servidor ainda estiver rodando.
    if (await clusterRodando(pasta)) await pararCluster(pasta);
    await rm(alvo, { recursive: true, force: true });
  };
  try {
    const info: InfoCluster = {
      porta: await portaLivre(),
      senhaAdmin: segredo(),
      senhaMigrador: segredo(),
      senhaApp: segredo(),
      modelo: opcoes.modelo ?? "nexakeep_modelo",
    };
    await inicializarCluster(pasta, info.senhaAdmin);
    await iniciarCluster(pasta, info.porta, join(raiz, "postgres.log"));

    const conectar = async (banco: string, usuario = "postgres", senha = info.senhaAdmin) => {
      const c = new pg.Client({ connectionString: url(info, usuario, senha, banco) });
      await c.connect();
      return c;
    };

    const admin = await conectar("postgres");
    try {
      await provisionarPapeis(admin, { migrador: info.senhaMigrador, app: info.senhaApp });
      await provisionarBanco(admin, info.modelo, (b) => conectar(b));
    } finally {
      await admin.end();
    }

    if (opcoes.migrar !== false) {
      const migrador = await conectar(info.modelo, PAPEIS.migrador, info.senhaMigrador);
      try {
        await aplicarMigracoes(migrador, PASTA_MIGRACOES);
      } finally {
        await migrador.end();
      }
    }

    return {
      info,
      conectar,
      encerrar,
    };
  } catch (erro) {
    try {
      await encerrar();
    } catch (limpeza) {
      throw new AggregateError([erro, limpeza], "Falha ao preparar e ao encerrar o PostgreSQL de teste.");
    }
    throw erro;
  }
}

/** Novo banco copiado do modelo já migrado: cada arquivo de teste começa limpo. */
export async function clonarModelo(info: InfoCluster, nome: string): Promise<void> {
  const admin = new pg.Client({ connectionString: url(info, "postgres", info.senhaAdmin, "postgres") });
  await admin.connect();
  try {
    await admin.query(
      `create database ${admin.escapeIdentifier(nome)} template ${admin.escapeIdentifier(info.modelo)} owner ${PAPEIS.dono}`,
    );
    await ajustarPermissoesDoBanco(admin, nome);
  } finally {
    await admin.end();
  }
}
