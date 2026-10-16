import "server-only";
import { cache } from "react";
import { textoSobre } from "@/dominio/contato";
import { contexto } from "@/servidor/acesso";
import { dadosDoSite } from "@/servidor/lojas/site";

/** Dados do site, buscados uma vez por requisição (layout e página usam os mesmos). */
export const siteDaLoja = cache(async (slug: string) => dadosDoSite(contexto().db, slug));

/** Variáveis de cor do modelo, com a cor da marca e um texto legível sobre ela. */
export function estiloDaMarca(cor: string, modelo: "classico" | "contraste"): React.CSSProperties {
  const base =
    modelo === "classico"
      ? { "--l-fundo": "#faf7f2", "--l-superficie": "#ffffff", "--l-texto": "#231f1a", "--l-suave": "#6b6259", "--l-borda": "#e7dfd4" }
      : { "--l-fundo": "#0e0e10", "--l-superficie": "#17171a", "--l-texto": "#f4f4f2", "--l-suave": "#a3a3a0", "--l-borda": "#2b2b30" };
  return { ...base, "--marca": cor, "--marca-texto": textoSobre(cor) } as React.CSSProperties;
}

export function iniciais(nome: string): string {
  const palavras = nome.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  return ((palavras[0]?.[0] ?? nome[0] ?? "") + (palavras[1]?.[0] ?? "")).toUpperCase();
}

export function linkMapa(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}
