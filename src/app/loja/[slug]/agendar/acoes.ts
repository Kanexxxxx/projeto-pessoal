"use server";

import { headers } from "next/headers";
import { contexto } from "@/servidor/acesso";
import { normalizarTelefoneBR } from "@/dominio/contato";
import { hostDaRequisicao, resolverHost } from "@/servidor/hosts";
import { LIMITES, consumirLimite, ipDaRequisicao } from "@/servidor/limites";
import { reservar, type Reserva } from "@/servidor/lojas/agenda";
import { lojaPorSlug } from "@/servidor/lojas/lojas";

export type EstadoReserva = { erro?: string; indisponivel?: boolean; reserva?: Reserva & { nome: string } };

/**
 * Reserva pelo site público. A loja vem do subdomínio da requisição (não de
 * campo do formulário), e o horário é conferido de novo na grade da loja,
 * dentro da trava da agenda.
 */
export async function reservarAcao(_anterior: EstadoReserva, form: FormData): Promise<EstadoReserva> {
  const c = contexto();
  const h = await headers();
  const destino = resolverHost(hostDaRequisicao(h), c.config.dominioBase);
  if (destino.tipo !== "loja") return { erro: "Loja não encontrada." };
  const loja = await lojaPorSlug(c.db, destino.slug);
  if (!loja) return { erro: "Loja não encontrada." };

  // Campo invisível: pessoa não preenche; robô costuma preencher.
  if (String(form.get("site") ?? "")) return { erro: "Não foi possível concluir. Tente de novo." };

  // Sem IP (sem o proxy da VPS, como no desenvolvimento local) todos cairiam no
  // mesmo balde "desconhecido" e uma pessoa bloquearia as outras; nesse caso
  // vale só o limite por telefone.
  const ip = ipDaRequisicao(h, c.config.cabecalhoIp);
  if (ip !== "desconhecido") {
    const porIp = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.reservaPorIp, ip);
    if (!porIp.permitido) return { erro: "Muitas reservas seguidas deste aparelho. Tente mais tarde ou fale com a loja pelo WhatsApp." };
  }
  const telefone = normalizarTelefoneBR(String(form.get("telefone") ?? ""));
  if (telefone) {
    const porTelefone = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.reservaPorTelefone, `${loja.id}:${telefone}`);
    if (!porTelefone.permitido) return { erro: "Este WhatsApp já fez várias reservas hoje. Fale com a loja para marcar mais horários." };
  }

  const nome = String(form.get("nome") ?? "");
  const r = await reservar(c.db, {
    loja,
    servicoId: String(form.get("servico") ?? ""),
    profissionalId: String(form.get("profissional") ?? "") || null,
    data: String(form.get("data") ?? ""),
    hora: String(form.get("hora") ?? ""),
    nome,
    telefone: String(form.get("telefone") ?? ""),
    observacao: String(form.get("observacao") ?? ""),
    origem: "site",
  });
  if (!r.ok) return { erro: r.erro, indisponivel: r.motivo === "indisponivel" };
  return { reserva: { ...r.reserva, nome: nome.trim().split(/\s+/)[0] ?? "" } };
}
