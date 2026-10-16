import { redirect } from "next/navigation";
import { contexto } from "@/servidor/acesso";
import { ehOperadorAtivo } from "@/servidor/auth/operadores";
import { urlDaLoja } from "@/servidor/config";
import { lojasDoUsuario, SEGMENTOS, SITUACOES, todasAsLojas, type Loja } from "@/servidor/lojas/lojas";
import { exigirSessao } from "@/servidor/sessao";
import { BarraConta } from "./BarraConta";

export const dynamic = "force-dynamic";

function CartaoLoja({ loja, papel }: { loja: Loja; papel?: string }) {
  const { config } = contexto();
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-(--borda) p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{loja.nome}</h2>
          <p className="text-sm text-(--suave)">
            {SEGMENTOS[loja.segmento]}
            {papel ? ` · ${papel}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-(--borda) px-2.5 py-0.5 text-xs">{SITUACOES[loja.situacao]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a href={`/lojas/${loja.slug}`} className="font-medium text-(--destaque) underline underline-offset-4">
          Abrir painel da loja
        </a>
        <a href={urlDaLoja(config, loja.slug)} className="underline underline-offset-4" target="_blank" rel="noreferrer">
          Ver site ↗
        </a>
      </div>
    </li>
  );
}

export default async function PaginaPainel() {
  const sessao = await exigirSessao();
  const { db } = contexto();
  const operador = await ehOperadorAtivo(db, sessao.user.id);
  if (operador && !sessao.user.twoFactorEnabled) redirect("/seguranca");

  const lojas = operador ? await todasAsLojas(db) : await lojasDoUsuario(db, sessao.user.id);
  if (!operador && lojas.length === 1) redirect(`/lojas/${lojas[0]!.slug}`);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {sessao.user.name.split(" ")[0]}</h1>
          <p className="text-(--suave)">{operador ? "Operador da plataforma — todas as lojas." : "Suas lojas."}</p>
        </div>
        <BarraConta nome={sessao.user.name} />
      </div>

      {operador ? (
        <div>
          <a
            href="/lojas/nova"
            className="inline-block rounded-lg bg-(--destaque) px-4 py-2.5 font-medium text-(--fundo) outline-none focus-visible:ring-2 focus-visible:ring-(--destaque) focus-visible:ring-offset-2"
          >
            + Nova loja
          </a>
        </div>
      ) : null}

      {lojas.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {lojas.map((l) => (
            <CartaoLoja key={l.id} loja={l} papel={"papel" in l ? (l.papel === "dona" ? "Dona" : "Equipe") : undefined} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-(--borda) p-6 text-(--suave)">
          {operador ? "Nenhuma loja ainda. Crie a primeira para montar o site e a agenda." : "Você ainda não tem acesso a nenhuma loja. Peça um convite à dona da loja."}
        </p>
      )}
    </main>
  );
}
