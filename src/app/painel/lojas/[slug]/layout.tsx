import { contexto } from "@/servidor/acesso";
import { urlDaLoja } from "@/servidor/config";
import { SITUACOES } from "@/servidor/lojas/lojas";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { BarraConta } from "../../BarraConta";
import { Abas } from "./Abas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug };
}

export default async function LayoutLoja({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { sessao, acesso } = await exigirAcessoLoja(slug);
  const { loja } = acesso;
  const gestao = acesso.papel !== "funcionario";
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-(--suave)">
            <a href="/" className="underline-offset-4 hover:underline">
              Lojas
            </a>{" "}
            /
          </p>
          <h1 className="text-2xl font-semibold">{loja.nome}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-(--suave)">
            <span className="rounded-full border border-(--borda) px-2.5 py-0.5 text-xs text-(--texto)">{SITUACOES[loja.situacao]}</span>
            <a href={urlDaLoja(contexto().config, loja.slug)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Ver site ↗
            </a>
          </p>
        </div>
        <BarraConta nome={sessao.user.name} />
      </div>
      <Abas slug={loja.slug} gestao={gestao} />
      {children}
    </div>
  );
}
