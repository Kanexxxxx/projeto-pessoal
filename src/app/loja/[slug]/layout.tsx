import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteDaLoja } from "./dados";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await siteDaLoja((await params).slug);
  if (!site) return {};
  return {
    title: { absolute: site.loja.nome },
    description: site.config.chamada ?? `Agende seu horário na ${site.loja.nome}.`,
    // Loja em implantação ainda não deve aparecer em buscadores.
    robots: site.loja.situacao === "ativa" ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LayoutSiteDaLoja({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  if (site.loja.situacao === "suspensa" || site.loja.situacao === "encerrada") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-2xl font-semibold">{site.loja.nome}</h1>
        <p className="text-(--suave)">Esta página está indisponível no momento.</p>
      </main>
    );
  }
  return children;
}
