import { notFound } from "next/navigation";
import { siteDaLoja } from "./dados";
import { desenharIcone } from "./desenharIcone";

/** Ícone da aba: as iniciais da loja sobre a cor da marca. */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icone({ params }: { params: Promise<{ slug: string }> }) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  return desenharIcone(site.loja.nome, site.config.cor, size.width);
}
