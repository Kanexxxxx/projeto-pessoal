"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mensagemDeLimite } from "@/componentes/formulario";
import { contexto } from "@/servidor/acesso";
import { entrar, verificarSegundoFator } from "@/servidor/auth/fluxos";

export type EstadoForm = { erro?: string };

export async function entrarAcao(_anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = await entrar(contexto(), {
    email: String(form.get("email") ?? ""),
    senha: String(form.get("senha") ?? ""),
    headers: await headers(),
  });
  if (r.tipo === "entrou") redirect("/");
  if (r.tipo === "segundo_fator") redirect("/entrar/verificar");
  if (r.tipo === "limite") return { erro: mensagemDeLimite(r.liberaEm) };
  return { erro: "E-mail ou senha incorretos." };
}

export async function verificarAcao(_anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const metodo = form.get("metodo") === "reserva" ? "reserva" : "totp";
  const r = await verificarSegundoFator(contexto(), {
    codigo: String(form.get("codigo") ?? ""),
    metodo,
    headers: await headers(),
  });
  if (r.tipo === "entrou") redirect("/");
  if (r.tipo === "expirado") redirect("/entrar?expirou=1");
  if (r.tipo === "limite") return { erro: mensagemDeLimite(r.liberaEm) };
  return {
    erro: metodo === "totp" ? "Código incorreto. Confira o aplicativo autenticador." : "Código de reserva inválido ou já usado.",
  };
}
