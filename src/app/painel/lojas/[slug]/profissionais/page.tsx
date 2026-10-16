import { BotaoAcao, FormularioAcao } from "@/componentes/acoes";
import { Campo } from "@/componentes/formulario";
import { nomeDoDia, rotuloDeMinutos } from "@/dominio/datas";
import type { Expediente } from "@/dominio/horarios";
import { contexto } from "@/servidor/acesso";
import { lerExpedientes, lerProfissionais } from "@/servidor/lojas/catalogo";
import { comLoja } from "@/servidor/lojas/escopo";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { alternarProfissionalAcao, salvarExpedienteAcao, salvarProfissionalAcao } from "../../acoes";

export const dynamic = "force-dynamic";

// Semana começando na segunda, como a dona lê a agenda.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function hora(min: number | undefined): string {
  if (min === undefined) return "";
  return min === 1440 ? "24:00" : rotuloDeMinutos(min);
}

function EditorDeHorario({ slug, profissionalId, expedientes }: { slug: string; profissionalId: string; expedientes: Expediente[] }) {
  return (
    <FormularioAcao acao={salvarExpedienteAcao} botao="Salvar horários">
      <input type="hidden" name="loja" value={slug} />
      <input type="hidden" name="profissional" value={profissionalId} />
      <p className="text-sm text-(--suave)">Marque os dias de trabalho. O segundo turno é opcional (ex.: manhã e tarde, com almoço no meio).</p>
      <div className="flex flex-col divide-y divide-(--borda)">
        {ORDEM_DIAS.map((dia) => {
          const turnos = expedientes.filter((e) => e.diaSemana === dia);
          const id = `${profissionalId}-${dia}`;
          return (
            <fieldset key={dia} className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 gap-y-2 py-2.5 sm:grid-cols-[7rem_1fr_1fr]">
              <legend className="sr-only">{nomeDoDia(dia)}</legend>
              <label className="flex items-center gap-2 text-sm font-medium capitalize">
                <input type="checkbox" name={`aberto-${dia}`} defaultChecked={turnos.length > 0} className="size-4 accent-(--destaque)" />
                {nomeDoDia(dia)}
              </label>
              {[1, 2].map((t) => (
                <div key={t} className={`flex items-center gap-1.5 text-sm ${t === 2 ? "col-start-2 sm:col-start-auto" : ""}`}>
                  <input
                    type="time"
                    name={`de-${dia}-${t}`}
                    aria-label={`${nomeDoDia(dia)}, turno ${t}, início`}
                    defaultValue={hora(turnos[t - 1]?.inicioMin)}
                    step={600}
                    className="w-full rounded-md border border-(--borda) bg-transparent px-2 py-1.5"
                    id={`${id}-de-${t}`}
                  />
                  <span aria-hidden>–</span>
                  <input
                    type="time"
                    name={`ate-${dia}-${t}`}
                    aria-label={`${nomeDoDia(dia)}, turno ${t}, fim`}
                    defaultValue={hora(turnos[t - 1]?.fimMin)}
                    step={600}
                    className="w-full rounded-md border border-(--borda) bg-transparent px-2 py-1.5"
                    id={`${id}-ate-${t}`}
                  />
                </div>
              ))}
            </fieldset>
          );
        })}
      </div>
    </FormularioAcao>
  );
}

export default async function PaginaProfissionais({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug, ["operador", "dona"]);
  const { profissionais, expedientes } = await comLoja(contexto().db, acesso.loja.id, async (trx) => ({
    profissionais: await lerProfissionais(trx),
    expedientes: await lerExpedientes(trx),
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Profissionais</h2>
        {profissionais.length === 0 ? <p className="text-(--suave)">Cadastre quem atende. Depois, defina os dias e horários de cada um.</p> : null}
        {profissionais.map((p, i) => {
          const doProfissional = expedientes.filter((e) => e.profissionalId === p.id);
          return (
            <details key={p.id} open={i === 0 && doProfissional.length === 0} className={`rounded-2xl border border-(--borda) p-4 ${p.ativo ? "" : "opacity-60"}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{p.nome}</span>
                  {p.ativo ? null : <span className="ml-2 text-xs text-(--suave)">(inativo)</span>}
                  <span className="block text-sm text-(--suave)">
                    {doProfissional.length
                      ? ORDEM_DIAS.filter((d) => doProfissional.some((e) => e.diaSemana === d))
                          .map((d) => nomeDoDia(d, true))
                          .join(", ")
                      : "Sem horário definido — não aparece no site"}
                  </span>
                </span>
                <span className="text-sm text-(--destaque) underline underline-offset-4">Horários</span>
              </summary>
              <div className="mt-4 flex flex-col gap-6 border-t border-(--borda) pt-4">
                <EditorDeHorario slug={acesso.loja.slug} profissionalId={p.id} expedientes={doProfissional} />
                <div className="flex flex-wrap items-end gap-4 border-t border-(--borda) pt-4">
                  <FormularioAcao acao={salvarProfissionalAcao} botao="Renomear" className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="loja" value={acesso.loja.slug} />
                    <input type="hidden" name="id" value={p.id} />
                    <Campo id={`nome-${p.id}`} name="nome" rotulo="Nome" defaultValue={p.nome} maxLength={60} required />
                  </FormularioAcao>
                  <BotaoAcao
                    acao={alternarProfissionalAcao}
                    campos={{ loja: acesso.loja.slug, id: p.id }}
                    rotulo={p.ativo ? "Desativar" : "Reativar"}
                    perigo={p.ativo}
                    confirmar={p.ativo ? `Desativar ${p.nome}? Ele(a) sai do site; os agendamentos já feitos continuam na agenda.` : undefined}
                  />
                </div>
              </div>
            </details>
          );
        })}
      </section>
      <aside className="h-fit rounded-2xl border border-(--borda) p-5">
        <h2 className="mb-4 text-lg font-semibold">Novo profissional</h2>
        <FormularioAcao acao={salvarProfissionalAcao} botao="Incluir" limpar>
          <input type="hidden" name="loja" value={acesso.loja.slug} />
          <Campo id="nome-novo" name="nome" rotulo="Nome" maxLength={60} required placeholder="Como aparece no site" />
          <p className="text-sm text-(--suave)">O plano básico inclui até 3 profissionais ativos. Quem entra faz todos os serviços; ajuste em Serviços.</p>
        </FormularioAcao>
      </aside>
    </div>
  );
}
