"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { contexto } from "@/servidor/acesso";
import { aceitarConvite, aceitarConviteComConta, consultarConvite } from "@/servidor/auth/convites";
import { entrar } from "@/servidor/auth/fluxos";
import { LIMITES, consumirLimite, ipDaRequisicao } from "@/servidor/limites";
import { sessaoAtual } from "@/servidor/sessao";

const PAPEL: Record<string, string> = { operador: "operador da plataforma", dona: "dona da loja", funcionario: "equipe da loja" };

/** comConta: há sessão aberta com o mesmo e-mail do convite (aceita sem criar outra conta). */
export type DadosConvite = { email: string; papel: string; loja: string | null; comConta: boolean } | null;

export async function consultarConviteAcao(token: string): Promise<DadosConvite> {
  const c = contexto();
  const limite = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.convitePorIp, ipDaRequisicao(await headers()));
  if (!limite.permitido || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) return null;
  const convite = await consultarConvite(c.db, token);
  if (!convite) return null;
  const loja = convite.tenant_id
    ? ((await c.db.selectFrom("lojas").select("nome").where("id", "=", convite.tenant_id).executeTakeFirst())?.nome ?? null)
    : null;
  const sessao = await sessaoAtual();
  return {
    email: convite.email,
    papel: PAPEL[convite.papel] ?? convite.papel,
    loja,
    comConta: Boolean(loja && sessao && sessao.user.email === convite.email),
  };
}

export type EstadoAceite = { erro?: string };

export async function aceitarConviteAcao(_anterior: EstadoAceite, form: FormData): Promise<EstadoAceite> {
  const c = contexto();
  const h = await headers();
  const limite = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.convitePorIp, ipDaRequisicao(h));
  if (!limite.permitido) return { erro: "Muitas tentativas. Tente de novo mais tarde." };

  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "As duas senhas não são iguais." };
  const token = String(form.get("token") ?? "");
  const r = await aceitarConvite(c.auth, c.db, { token, nome: String(form.get("nome") ?? ""), senha, marca: c.config.marca });
  if (!r.ok) {
    if (r.motivo === "dados") return { erro: r.mensagem };
    if (r.motivo === "conta_existente") {
      return { erro: "Já existe uma conta com este e-mail. Entre no painel com ela e abra este link de novo para aceitar." };
    }
    return { erro: "Este convite é inválido, já foi usado ou expirou. Peça um novo." };
  }

  const usuario = await c.db.selectFrom("user").select("email").where("id", "=", r.usuarioId).executeTakeFirstOrThrow();
  const login = await entrar(c, { email: usuario.email, senha, headers: h });
  if (login.tipo !== "entrou") redirect("/entrar");
  redirect(r.papel === "operador" ? "/seguranca" : "/");
}

/** Convite de loja aceito por quem já está logado com a conta do mesmo e-mail. */
export async function aceitarComContaAcao(_anterior: EstadoAceite, form: FormData): Promise<EstadoAceite> {
  const c = contexto();
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: "Entre no painel primeiro." };
  const r = await aceitarConviteComConta(c.db, { token: String(form.get("token") ?? ""), usuarioId: sessao.user.id });
  if (!r.ok) {
    return { erro: r.motivo === "outro_email" ? "Este convite é para outro e-mail. Saia e entre com a conta certa." : "Este convite é inválido, já foi usado ou expirou." };
  }
  const loja = await c.db.selectFrom("lojas").select("slug").where("id", "=", r.tenantId).executeTakeFirstOrThrow();
  redirect(`/lojas/${loja.slug}`);
}
