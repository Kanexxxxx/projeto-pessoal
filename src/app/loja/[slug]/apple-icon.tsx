import { notFound } from "next/navigation";
import { siteDaLoja } from "./dados";
import { desenharIcone } from "./desenharIcone";

/** Ícone da tela inicial do celular (quando o cliente salva o site como atalho). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function IconeApple({ params }: { params: Promise<{ slug: string }> }) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  return desenharIcone(site.loja.nome, site.config.cor, size.width);
}
