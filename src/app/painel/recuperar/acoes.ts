"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mensagemDeLimite } from "@/componentes/formulario";
import { contexto } from "@/servidor/acesso";
import { pedirRedefinicao, redefinirSenha } from "@/servidor/auth/fluxos";

export type EstadoPedido = { erro?: string; enviado?: boolean };

export async function pedirAcao(_anterior: EstadoPedido, form: FormData): Promise<EstadoPedido> {
  const r = await pedirRedefinicao(contexto(), { email: String(form.get("email") ?? ""), headers: await headers() });
  if (r.tipo === "limite") return { erro: mensagemDeLimite(r.liberaEm) };
  return { enviado: true };
}

export type EstadoRedefinir = { erro?: string };

export async function redefinirAcao(_anterior: EstadoRedefinir, form: FormData): Promise<EstadoRedefinir> {
  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "As duas senhas não são iguais." };
  const r = await redefinirSenha(contexto(), { token: String(form.get("token") ?? ""), novaSenha: senha, headers: await headers() });
  if (r.tipo === "ok") redirect("/entrar?redefinida=1");
  if (r.tipo === "fraca") return { erro: r.mensagem };
  return { erro: "Este link é inválido ou expirou. Peça uma nova redefinição." };
}
