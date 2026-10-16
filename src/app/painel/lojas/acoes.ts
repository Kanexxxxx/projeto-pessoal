"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAcao } from "@/componentes/acoes";
import { contexto } from "@/servidor/acesso";
import { ehOperadorAtivo } from "@/servidor/auth/operadores";
import type { PapelNaLoja } from "@/servidor/bd/tipos";
import {
  cancelarAgendamento,
  criarBloqueio,
  marcarAgendamento,
  remarcarAgendamento,
  removerBloqueio,
  reservar,
} from "@/servidor/lojas/agenda";
import { alternarProfissional, alternarServico, salvarExpediente, salvarProfissional, salvarServico, salvarSite } from "@/servidor/lojas/catalogo";
import { cancelarConvite, convidarParaLoja, revogarAcesso } from "@/servidor/lojas/equipe";
import { criarLoja, mudarSituacao, type Acesso, type PapelDeAcesso } from "@/servidor/lojas/lojas";
import { acessoParaAcao, sessaoAtual } from "@/servidor/sessao";

/**
 * Ações do painel da loja. Toda ação confere de novo, no banco, a sessão e o
 * vínculo com a loja do campo "loja" (o slug). O tenant usado vem desse
 * vínculo — tenant_id, papel ou dono enviados no formulário são ignorados.
 */
const SEM_ACESSO: EstadoAcao = { erro: "Você não tem acesso a esta loja ou a sessão expirou. Entre de novo." };
const GESTAO: PapelDeAcesso[] = ["operador", "dona"];

type Feito = { ok: true } | { ok: false; erro: string };

async function executar(
  form: FormData,
  papeis: PapelDeAcesso[] | undefined,
  fazer: (acesso: Acesso) => Promise<Feito>,
  mensagem = "Salvo.",
): Promise<EstadoAcao> {
  const acesso = await acessoParaAcao(form.get("loja"), papeis);
  if (!acesso) return SEM_ACESSO;
  const r = await fazer(acesso);
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: mensagem };
}

const db = () => contexto().db;
const campo = (form: FormData, nome: string) => String(form.get(nome) ?? "");

export async function criarLojaAcao(_e: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !sessao.user.twoFactorEnabled || !(await ehOperadorAtivo(db(), sessao.user.id))) return SEM_ACESSO;
  const r = await criarLoja(db(), { nome: campo(form, "nome"), slug: campo(form, "slug"), segmento: campo(form, "segmento"), criadaPor: sessao.user.id });
  if (!r.ok) return { erro: r.erro };
  redirect(`/lojas/${r.loja.slug}`);
}

export async function mudarSituacaoAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, ["operador"], (a) => mudarSituacao(db(), a, campo(form, "situacao")), "Situação atualizada.");
}

export async function salvarServicoAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => salvarServico(db(), a, form), form.get("id") ? "Serviço atualizado." : "Serviço incluído.");
}

export async function alternarServicoAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => alternarServico(db(), a, campo(form, "id")));
}

export async function salvarProfissionalAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => salvarProfissional(db(), a, form), form.get("id") ? "Nome atualizado." : "Profissional incluído.");
}

export async function alternarProfissionalAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => alternarProfissional(db(), a, campo(form, "id")));
}

export async function salvarExpedienteAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => salvarExpediente(db(), a, form), "Horários salvos.");
}

export async function salvarSiteAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => salvarSite(db(), a, form), "Site atualizado.");
}

export async function convidarAcao(_e: EstadoAcao, form: FormData) {
  const papel = (campo(form, "papel") === "dona" ? "dona" : "funcionario") as PapelNaLoja;
  return executar(
    form,
    GESTAO,
    (a) => convidarParaLoja(contexto(), { acesso: a, email: campo(form, "email"), papel }),
    "Convite enviado. Em desenvolvimento, o e-mail fica na pasta de e-mails locais.",
  );
}

export async function revogarAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => revogarAcesso(db(), { acesso: a, usuarioId: campo(form, "usuario") }), "Acesso removido.");
}

export async function cancelarConviteAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, async (a) => {
    await cancelarConvite(db(), { acesso: a, conviteId: campo(form, "convite") });
    return { ok: true };
  });
}

export async function novoAgendamentoAcao(_e: EstadoAcao, form: FormData) {
  return executar(
    form,
    undefined,
    async (a) => {
      const r = await reservar(db(), {
        loja: a.loja,
        servicoId: campo(form, "servico"),
        profissionalId: campo(form, "profissional") || null,
        data: campo(form, "data"),
        hora: campo(form, "hora"),
        nome: campo(form, "nome"),
        telefone: campo(form, "telefone"),
        observacao: campo(form, "observacao"),
        origem: "painel",
        criadoPor: a.usuarioId,
      });
      return r.ok ? { ok: true } : { ok: false, erro: r.erro };
    },
    "Agendamento criado.",
  );
}

export async function cancelarAgendamentoAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, undefined, (a) => cancelarAgendamento(db(), a, campo(form, "id")), "Cancelado.");
}

export async function marcarAgendamentoAcao(_e: EstadoAcao, form: FormData) {
  const situacao = campo(form, "situacao") === "faltou" ? "faltou" : "concluido";
  return executar(form, undefined, (a) => marcarAgendamento(db(), a, campo(form, "id"), situacao));
}

export async function remarcarAcao(_e: EstadoAcao, form: FormData) {
  return executar(
    form,
    undefined,
    (a) =>
      remarcarAgendamento(db(), a, {
        id: campo(form, "id"),
        data: campo(form, "data"),
        hora: campo(form, "hora"),
        profissionalId: campo(form, "profissional") || null,
      }),
    "Remarcado.",
  );
}

export async function criarBloqueioAcao(_e: EstadoAcao, form: FormData) {
  const diaInteiro = form.get("dia_inteiro") === "on";
  return executar(
    form,
    GESTAO,
    (a) =>
      criarBloqueio(db(), a, {
        profissionalId: campo(form, "profissional") || null,
        data: campo(form, "data"),
        ateData: campo(form, "ate_data") || undefined,
        de: diaInteiro ? undefined : campo(form, "de"),
        ate: diaInteiro ? undefined : campo(form, "ate"),
        motivo: campo(form, "motivo"),
      }),
    "Bloqueio criado.",
  );
}

export async function removerBloqueioAcao(_e: EstadoAcao, form: FormData) {
  return executar(form, GESTAO, (a) => removerBloqueio(db(), a, campo(form, "id")), "Bloqueio removido.");
}
