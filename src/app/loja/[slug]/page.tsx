import { notFound } from "next/navigation";
import { diaDaSemana, hojeNoFuso } from "@/dominio/datas";
import { contexto } from "@/servidor/acesso";
import { siteDaLoja } from "./dados";
import { ModeloClassico } from "./ModeloClassico";
import { ModeloContraste } from "./ModeloContraste";

export const dynamic = "force-dynamic";

export default async function PaginaLoja({ params }: { params: Promise<{ slug: string }> }) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  const diaHoje = diaDaSemana(hojeNoFuso(new Date(), site.loja.fuso));
  const { marca } = contexto().config;
  return site.config.modelo === "contraste" ? (
    <ModeloContraste site={site} diaHoje={diaHoje} marca={marca} />
  ) : (
    <ModeloClassico site={site} diaHoje={diaHoje} marca={marca} />
  );
}
