import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * PostgreSQL local sem instalação no sistema: usa os binários do pacote npm
 * da plataforma (@embedded-postgres/<plataforma>) e chama initdb/pg_ctl
 * diretamente.
 *
 * Não usamos a API JS do pacote `embedded-postgres`: ela registra um gancho
 * de saída (async-exit-hook) que chama process.exit(0) e apaga o código de
 * falha do processo — o Vitest passava "verde" com teste quebrado.
 */
type Binarios = { initdb: string; pg_ctl: string; postgres: string };

const PACOTES: Record<string, string> = {
  "win32-x64": "@embedded-postgres/windows-x64",
  "linux-x64": "@embedded-postgres/linux-x64",
  "darwin-arm64": "@embedded-postgres/darwin-arm64",
};

export async function binariosDoPostgres(): Promise<Binarios> {
  const pacote = PACOTES[`${process.platform}-${process.arch}`];
  if (!pacote) throw new Error(`Sem binário do PostgreSQL para ${process.platform}-${process.arch}.`);
  return (await import(pacote)) as Binarios;
}

/** Executa sem herdar stdio: o servidor iniciado pelo pg_ctl não segura nossos pipes. */
function executar(comando: string, argumentos: string[]): Promise<void> {
  return new Promise((ok, erro) => {
    const filho = spawn(comando, argumentos, { stdio: "ignore", windowsHide: true });
    filho.on("error", erro);
    filho.on("exit", (codigo) => (codigo === 0 ? ok() : erro(new Error(`${comando.split(/[\\/]/).pop()} saiu com código ${codigo}`))));
  });
}

export async function clusterExiste(pasta: string): Promise<boolean> {
  try {
    await access(join(pasta, "PG_VERSION"));
    return true;
  } catch {
    return false;
  }
}

/** initdb com senha do superusuário via arquivo temporário e autenticação scram-sha-256. */
export async function inicializarCluster(pasta: string, senhaAdmin: string): Promise<void> {
  const { initdb } = await binariosDoPostgres();
  const arquivoSenha = join(tmpdir(), `nexakeep-pw-${randomUUID()}`);
  await writeFile(arquivoSenha, senhaAdmin, { encoding: "utf8", mode: 0o600 });
  try {
    await executar(initdb, [
      "-D", pasta,
      "-U", "postgres",
      `--pwfile=${arquivoSenha}`,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
      "--no-instructions",
    ]);
  } finally {
    await rm(arquivoSenha, { force: true });
  }
}

export async function iniciarCluster(pasta: string, porta: number, arquivoLog: string): Promise<void> {
  const { pg_ctl } = await binariosDoPostgres();
  await executar(pg_ctl, [
    "-D", pasta,
    "-l", arquivoLog,
    "-w", "-t", "60",
    "-o", `-p ${porta} -c listen_addresses=127.0.0.1 -c timezone=UTC`,
    "start",
  ]);
}

export async function pararCluster(pasta: string): Promise<void> {
  const { pg_ctl } = await binariosDoPostgres();
  await executar(pg_ctl, ["-D", pasta, "-m", "fast", "-w", "-t", "60", "stop"]);
}

export async function clusterRodando(pasta: string): Promise<boolean> {
  const { pg_ctl } = await binariosDoPostgres();
  try {
    await executar(pg_ctl, ["-D", pasta, "status"]);
    return true;
  } catch {
    return false;
  }
}
