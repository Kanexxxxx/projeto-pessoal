import "server-only";
import { cache } from "react";
import { contexto } from "@/servidor/acesso";
import { dadosDoSite } from "@/servidor/lojas/site";

/** Dados do site, buscados uma vez por requisição (layout e página usam os mesmos). */
export const siteDaLoja = cache(async (slug: string) => dadosDoSite(contexto().db, slug));
