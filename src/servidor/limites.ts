import { createHmac } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { BD } from "./bd/tipos";

/**
 * Limite de tentativas no banco (lição da base anterior: contador em memória
 * zera a cada processo e não conversa entre instâncias).
 *
 * Conta a tentativa ANTES de executá-la, numa única instrução atômica: dez
 * requisições simultâneas não passam todas pela mesma brecha. Quando o login
 * dá certo, o contador do e-mail é zerado.
 */
export type RegraLimite = { escopo: string; janelaSegundos: number; maximo: number };

export const LIMITES = {
  entrarPorEmail: { escopo: "entrar:email", janelaSegundos: 15 * 60, maximo: 5 },
  entrarPorIp: { escopo: "entrar:ip", janelaSegundos: 15 * 60, maximo: 30 },
  recuperarPorEmail: { escopo: "recuperar:email", janelaSegundos: 60 * 60, maximo: 3 },
  recuperarPorIp: { escopo: "recuperar:ip", janelaSegundos: 60 * 60, maximo: 10 },
  segundoFatorPorDesafio: { escopo: "2fa:desafio", janelaSegundos: 10 * 60, maximo: 5 },
  segundoFatorPorIp: { escopo: "2fa:ip", janelaSegundos: 10 * 60, maximo: 20 },
  segundoFatorPorUsuario: { escopo: "2fa:usuario", janelaSegundos: 10 * 60, maximo: 10 },
  configurarSegundoFator: { escopo: "2fa:configurar", janelaSegundos: 15 * 60, maximo: 5 },
  convitePorIp: { escopo: "convite:ip", janelaSegundos: 60 * 60, maximo: 20 },
  // Site público da loja: contra robô enchendo a agenda.
  reservaPorIp: { escopo: "reserva:ip", janelaSegundos: 60 * 60, maximo: 10 },
  reservaPorTelefone: { escopo: "reserva:telefone", janelaSegundos: 24 * 60 * 60, maximo: 4 },
} satisfies Record<string, RegraLimite>;

export type ResultadoLimite = { permitido: boolean; liberaEm: Date };

function chaveDoLimite(segredo: string, regra: RegraLimite, identificador: string): string {
  return createHmac("sha256", segredo).update(`${regra.escopo}\u0000${identificador}`).digest("hex");
}

export async function consumirLimite(
  db: Kysely<BD>,
  segredo: string,
  regra: RegraLimite,
  identificador: string,
): Promise<ResultadoLimite> {
  const chave = chaveDoLimite(segredo, regra, identificador);
  const { rows } = await sql<{ contagem: number; janela_inicio: Date }>`
    insert into limites_taxa as l (chave, contagem, janela_inicio)
    values (${chave}, 1, now())
    on conflict (chave) do update set
      contagem = case when l.janela_inicio <= now() - make_interval(secs => ${regra.janelaSegundos}) then 1 else l.contagem + 1 end,
      janela_inicio = case when l.janela_inicio <= now() - make_interval(secs => ${regra.janelaSegundos}) then now() else l.janela_inicio end
    returning contagem, janela_inicio`.execute(db);
  const linha = rows[0];
  if (!linha) throw new Error("limite de tentativas sem resposta do banco");
  return {
    permitido: linha.contagem <= regra.maximo,
    liberaEm: new Date(new Date(linha.janela_inicio).getTime() + regra.janelaSegundos * 1000),
  };
}

export async function zerarLimite(db: Kysely<BD>, segredo: string, regra: RegraLimite, identificador: string): Promise<void> {
  await db.deleteFrom("limites_taxa").where("chave", "=", chaveDoLimite(segredo, regra, identificador)).execute();
}

/** Remove janelas vencidas há mais de um dia (rodar periodicamente no worker). */
export async function limparLimitesAntigos(db: Kysely<BD>): Promise<number> {
  const r = await db.deleteFrom("limites_taxa").where("janela_inicio", "<", sql<Date>`now() - interval '1 day'`).executeTakeFirst();
  return Number(r.numDeletedRows);
}

const IP = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{2,39})$/i;

/**
 * IP do cliente para limites e auditoria. Só o cabeçalho que o proxy da VPS
 * sobrescreve é aceito (padrão X-Real-IP); sem ele, todos caem no mesmo balde.
 */
export function ipDaRequisicao(headers: Headers, cabecalho = "x-real-ip"): string {
  const valor = headers.get(cabecalho)?.trim() ?? "";
  return IP.test(valor) ? valor.toLowerCase() : "desconhecido";
}
