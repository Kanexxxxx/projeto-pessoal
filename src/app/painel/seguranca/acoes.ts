"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mensagemDeLimite } from "@/componentes/formulario";
import { qrParaSvg } from "@/dominio/qr";
import { contexto } from "@/servidor/acesso";
import { confirmarSegundoFator, iniciarSegundoFator, regenerarCodigosReserva } from "@/servidor/auth/fluxos";
import { exigirSessao } from "@/servidor/sessao";

export type EstadoSegundoFator =
  | { etapa: "senha"; erro?: string }
  | { etapa: "codigo"; qr: string; segredo: string; codigosReserva: string[]; erro?: string };

function agrupar(segredo: string): string {
  return segredo.replace(/(.{4})/g, "$1 ").trim();
}

export async function avancarSegundoFatorAcao(anterior: EstadoSegundoFator, form: FormData): Promise<EstadoSegundoFator> {
  const sessao = await exigirSessao();
  const c = contexto();
  const h = await headers();

  if (anterior.etapa === "senha") {
    const r = await iniciarSegundoFator(c, { senha: String(form.get("senha") ?? ""), headers: h });
    if (r.tipo === "limite") return { etapa: "senha", erro: mensagemDeLimite(r.liberaEm) };
    if (r.tipo !== "ok") return { etapa: "senha", erro: "Senha incorreta." };
    const segredo = new URL(r.totpURI).searchParams.get("secret") ?? "";
    const svg = qrParaSvg(r.totpURI, { nivel: "M" });
    return {
      etapa: "codigo",
      qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      segredo: agrupar(segredo),
      codigosReserva: r.codigosReserva,
    };
  }

  const r = await confirmarSegundoFator(c, { usuarioId: sessao.user.id, codigo: String(form.get("codigo") ?? ""), headers: h });
  if (r.tipo === "ok") redirect("/");
  if (r.tipo === "limite") return { ...anterior, erro: mensagemDeLimite(r.liberaEm) };
  return { ...anterior, erro: "Código incorreto. Confira se o relógio do celular está certo e tente o código atual." };
}

export type EstadoReservas = { erro?: string; codigos?: string[] };

export async function regenerarReservasAcao(_anterior: EstadoReservas, form: FormData): Promise<EstadoReservas> {
  await exigirSessao();
  const r = await regenerarCodigosReserva(contexto(), { senha: String(form.get("senha") ?? ""), codigo: String(form.get("codigo") ?? ""), headers: await headers() });
  if (r.tipo === "ok") return { codigos: r.codigosReserva };
  if (r.tipo === "limite") return { erro: mensagemDeLimite(r.liberaEm) };
  return { erro: "Não foi possível gerar os códigos. Confira a senha e use um código novo do autenticador." };
}
