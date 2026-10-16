"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { contexto } from "@/servidor/acesso";
import { aceitarConvite, consultarConvite } from "@/servidor/auth/convites";
import { entrar } from "@/servidor/auth/fluxos";
import { LIMITES, consumirLimite, ipDaRequisicao } from "@/servidor/limites";

const PAPEL: Record<string, string> = { operador: "operador da plataforma", dona: "dona da loja", funcionario: "equipe da loja" };

export type DadosConvite = { email: string; papel: string } | null;

export async function consultarConviteAcao(token: string): Promise<DadosConvite> {
  const c = contexto();
  const limite = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.convitePorIp, ipDaRequisicao(await headers()));
  if (!limite.permitido || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) return null;
  const convite = await consultarConvite(c.db, token);
  return convite ? { email: convite.email, papel: PAPEL[convite.papel] ?? convite.papel } : null;
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
    if (r.motivo === "conta_existente") return { erro: "Já existe uma conta com este e-mail. Entre com ela ou recupere a senha." };
    return { erro: "Este convite é inválido, já foi usado ou expirou. Peça um novo." };
  }

  const usuario = await c.db.selectFrom("user").select("email").where("id", "=", r.usuarioId).executeTakeFirstOrThrow();
  const login = await entrar(c, { email: usuario.email, senha, headers: h });
  if (login.tipo !== "entrou") redirect("/entrar");
  redirect(r.papel === "operador" ? "/seguranca" : "/");
}
