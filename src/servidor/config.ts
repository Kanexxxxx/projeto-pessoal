import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/**
 * Configuração lida do ambiente, validada uma vez.
 *
 * Marca, domínio e remetente ficam aqui, e não no código, para a troca de
 * marca não exigir caça a texto fixo (PLANO.md §6). Erro de configuração cita
 * só o NOME da variável, nunca o valor.
 */
const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXAKEEP_MARCA: z.string().trim().min(1).max(40).default("Nexakeep"),
  NEXAKEEP_DOMINIO_BASE: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+(:\d{2,5})?$/, "use só o domínio, com porta opcional (ex.: localhost:3000)"),
  NEXAKEEP_PROTOCOLO: z.enum(["http", "https"]).default("https"),
  DATABASE_URL: z.string().startsWith("postgres"),
  BETTER_AUTH_SECRET: z.string().min(32, "precisa de pelo menos 32 caracteres"),
  BETTER_AUTH_SECRETS: z.string().optional(),
  NEXAKEEP_CABECALHO_IP: z.string().toLowerCase().regex(/^[a-z0-9-]+$/).default("x-real-ip"),
  NEXAKEEP_EMAIL_TRANSPORTE: z.enum(["arquivo", "memoria"]).default("arquivo"),
  NEXAKEEP_EMAIL_REMETENTE: z.string().trim().min(3).default("Nexakeep <acesso@nexakeep.site>"),
  NEXAKEEP_DADOS_LOCAIS: z.string().trim().optional(),
});

export type Config = {
  ambiente: "development" | "test" | "production";
  marca: string;
  dominioBase: string;
  protocolo: "http" | "https";
  bancoUrl: string;
  segredoAuth: string;
  segredosAuth?: { version: number; value: string }[];
  cabecalhoIp: string;
  email: { transporte: "arquivo" | "memoria"; remetente: string };
  /** Pasta para dados de desenvolvimento, fora do repositório e do OneDrive. */
  dadosLocais: string;
  urlPainel: string;
  urlPlataforma: string;
};

export function pastaDadosLocaisPadrao(): string {
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Nexakeep");
  }
  return join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "nexakeep");
}

export function lerConfig(env: Record<string, string | undefined>): Config {
  const r = esquema.safeParse(env);
  if (!r.success) {
    const campos = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida (${campos}). Veja .env.example.`);
  }
  const e = r.data;
  let segredosAuth: Config["segredosAuth"];
  if (e.BETTER_AUTH_SECRETS?.trim()) {
    const versoes = new Set<number>();
    segredosAuth = e.BETTER_AUTH_SECRETS.split(",").map((item) => {
      const parte = /^(0|[1-9]\d*):([^,]+)$/.exec(item.trim());
      const version = parte ? Number(parte[1]) : -1;
      const value = parte?.[2]?.trim() ?? "";
      if (!Number.isSafeInteger(version) || version < 0 || versoes.has(version) || value.length < 32) {
        throw new Error("Configuração inválida (BETTER_AUTH_SECRETS: use versões únicas e segredos de 32+ caracteres).");
      }
      versoes.add(version);
      return { version, value };
    });
  }
  if (e.NODE_ENV === "production" && e.NEXAKEEP_PROTOCOLO !== "https") {
    throw new Error("Configuração inválida (NEXAKEEP_PROTOCOLO: produção exige https).");
  }
  const origem = (sub?: string) => `${e.NEXAKEEP_PROTOCOLO}://${sub ? `${sub}.` : ""}${e.NEXAKEEP_DOMINIO_BASE}`;
  return {
    ambiente: e.NODE_ENV,
    marca: e.NEXAKEEP_MARCA,
    dominioBase: e.NEXAKEEP_DOMINIO_BASE,
    protocolo: e.NEXAKEEP_PROTOCOLO,
    bancoUrl: e.DATABASE_URL,
    segredoAuth: e.BETTER_AUTH_SECRET,
    segredosAuth,
    cabecalhoIp: e.NEXAKEEP_CABECALHO_IP,
    email: { transporte: e.NEXAKEEP_EMAIL_TRANSPORTE, remetente: e.NEXAKEEP_EMAIL_REMETENTE },
    dadosLocais: e.NEXAKEEP_DADOS_LOCAIS || pastaDadosLocaisPadrao(),
    urlPainel: origem("app"),
    urlPlataforma: origem(),
  };
}

let atual: Config | undefined;

/** Configuração do processo, lida na primeira chamada (não no build). */
export function config(): Config {
  atual ??= lerConfig(process.env);
  return atual;
}

/** URL pública de uma loja. */
export function urlLoja(c: Config, slug: string): string {
  return `${c.protocolo}://${slug}.${c.dominioBase}`;
}
