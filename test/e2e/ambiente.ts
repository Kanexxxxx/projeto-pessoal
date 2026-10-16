import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Ambiente do teste de navegador: banco próprio no cluster local de
 * desenvolvimento, porta própria e pasta de e-mails temporária.
 */
export const PORTA = 3100;
export const BANCO = "nexakeep_e2e";
export const DADOS = join(tmpdir(), "nexakeep-e2e");

export function carregarAmbienteLocal() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    throw new Error("Falta o .env.local. Rode: npm run preparar && npm run bd:subir");
  }
  const exigir = (nome: string) => {
    const v = process.env[nome];
    if (!v) throw new Error(`Falta ${nome} no .env.local`);
    return v;
  };
  const porta = Number(process.env.NEXAKEEP_BD_PORTA ?? 54329);
  const senhas = {
    admin: exigir("NEXAKEEP_BD_SENHA_ADMIN"),
    migrador: exigir("NEXAKEEP_BD_SENHA_MIGRADOR"),
    app: exigir("NEXAKEEP_BD_SENHA_APP"),
  };
  const url = (usuario: string, senha: string, banco = BANCO) =>
    `postgres://${usuario}:${encodeURIComponent(senha)}@127.0.0.1:${porta}/${banco}`;
  return { porta, senhas, url, segredoAuth: exigir("BETTER_AUTH_SECRET") };
}
