import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contexto } from "@/servidor/acesso";
import { horariosDaVitrine } from "@/servidor/lojas/agenda";
import { Casca } from "./Casca";
import { siteDaLoja } from "./dados";
import { MODELOS, modeloPorId } from "./modelos";
import { montarVitrine } from "./vitrine";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ modelo?: string }> };

/** `?modelo=…` mostra a loja com outro modelo (prévia para a dona escolher); nunca é indexada. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return (await searchParams).modelo ? { robots: { index: false, follow: false } } : {};
}

export default async function PaginaLoja({ params, searchParams }: Props) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  const publicado = MODELOS[site.config.modelo];
  const pedido = modeloPorId((await searchParams).modelo);
  const modelo = pedido ?? publicado;
  const agora = new Date();
  const { db, config } = contexto();
  const horarios = await horariosDaVitrine(db, site.loja, { agora });
  const vitrine = montarVitrine(site, horarios, agora, config.marca);
  const Inicio = modelo.Inicio;
  return (
    <Casca modelo={modelo} cor={site.config.cor} situacao={site.loja.situacao} previa={pedido && pedido !== publicado ? { publicado: publicado.nome } : null}>
      <Inicio v={vitrine} />
    </Casca>
  );
}
