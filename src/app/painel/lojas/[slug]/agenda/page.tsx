import { BotaoAcao, FormularioAcao } from "@/componentes/acoes";
import { AreaTexto, Campo, Selecao } from "@/componentes/formulario";
import { formatarPreco, linkWhatsApp, telefoneLegivel } from "@/dominio/contato";
import { dataCanonica, dataCurta, dataPorExtenso, hojeNoFuso, somarDias } from "@/dominio/datas";
import { contexto } from "@/servidor/acesso";
import { agendaDoDia, type ItemDaAgenda } from "@/servidor/lojas/agenda";
import { lerProfissionais, lerServicos, type Profissional } from "@/servidor/lojas/catalogo";
import { comLoja } from "@/servidor/lojas/escopo";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { cancelarAgendamentoAcao, marcarAgendamentoAcao, novoAgendamentoAcao, remarcarAcao } from "../../acoes";

export const dynamic = "force-dynamic";

const SITUACAO: Record<ItemDaAgenda["situacao"], { rotulo: string; classe: string }> = {
  confirmado: { rotulo: "Confirmado", classe: "border-(--destaque) text-(--destaque)" },
  concluido: { rotulo: "Atendido", classe: "border-(--borda) text-(--suave)" },
  faltou: { rotulo: "Faltou", classe: "border-(--erro) text-(--erro)" },
  cancelado: { rotulo: "Cancelado", classe: "border-(--borda) text-(--suave) line-through" },
};

function Item({ item, slug, nomeLoja, data, profissionais, agora }: { item: ItemDaAgenda; slug: string; nomeLoja: string; data: string; profissionais: Profissional[]; agora: Date }) {
  const s = SITUACAO[item.situacao];
  const mensagem = `Olá, ${item.cliente.split(" ")[0]}! Aqui é da ${nomeLoja}, sobre o seu horário de ${item.servico} em ${dataCurta(data)} às ${item.hora}.`;
  const ativo = item.situacao === "confirmado";
  return (
    <li className={`rounded-2xl border border-(--borda) p-4 ${ativo ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <p className="w-14 text-xl font-semibold tabular-nums">{item.hora}</p>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-medium">{item.cliente}</p>
          <p className="text-sm text-(--suave)">
            {item.servico} · {item.profissional} · {formatarPreco(item.precoCentavos)}
          </p>
          <p className="text-sm">
            <a href={linkWhatsApp(item.telefone, mensagem)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {telefoneLegivel(item.telefone)} · WhatsApp ↗
            </a>
          </p>
          {item.observacao ? <p className="text-sm text-(--suave)">“{item.observacao}”</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs ${s.classe}`}>{s.rotulo}</span>
          <span className="text-xs text-(--suave)">{item.origem === "site" ? "pelo site" : "pelo painel"}</span>
        </div>
      </div>
      {ativo ? (
        <div className="mt-3 flex flex-wrap items-start gap-2 border-t border-(--borda) pt-3">
          {item.inicio <= agora ? (
            <>
              <BotaoAcao acao={marcarAgendamentoAcao} campos={{ loja: slug, id: item.id, situacao: "concluido" }} rotulo="Atendido" />
              <BotaoAcao acao={marcarAgendamentoAcao} campos={{ loja: slug, id: item.id, situacao: "faltou" }} rotulo="Faltou" />
            </>
          ) : null}
          <details className="group">
            <summary className="cursor-pointer list-none rounded-md border border-(--borda) px-2.5 py-1 text-sm">Remarcar</summary>
            <div className="mt-3 w-full min-w-64">
              <FormularioAcao acao={remarcarAcao} botao="Confirmar nova data" className="flex flex-col gap-3">
                <input type="hidden" name="loja" value={slug} />
                <input type="hidden" name="id" value={item.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Campo id={`data-${item.id}`} name="data" type="date" rotulo="Data" defaultValue={data} required />
                  <Campo id={`hora-${item.id}`} name="hora" type="time" rotulo="Hora" defaultValue={item.hora} step={300} required />
                </div>
                <Selecao id={`prof-${item.id}`} name="profissional" rotulo="Profissional" defaultValue={item.profissionalId}>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Selecao>
              </FormularioAcao>
            </div>
          </details>
          <BotaoAcao
            acao={cancelarAgendamentoAcao}
            campos={{ loja: slug, id: item.id }}
            rotulo="Cancelar"
            perigo
            confirmar={`Cancelar o horário de ${item.cliente} às ${item.hora}? Avise a pessoa pelo WhatsApp.`}
          />
        </div>
      ) : null}
    </li>
  );
}

export default async function PaginaAgenda({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ data?: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug);
  const { loja } = acesso;
  const { db } = contexto();
  const agora = new Date();
  const hoje = hojeNoFuso(agora, loja.fuso);
  const pedida = (await searchParams).data;
  const data = (pedida && dataCanonica(pedida)) || hoje;

  const [{ itens, bloqueios }, { servicos, profissionais }] = await Promise.all([
    agendaDoDia(db, loja, data),
    comLoja(db, loja.id, async (trx) => ({ servicos: await lerServicos(trx, true), profissionais: await lerProfissionais(trx, true) })),
  ]);
  const nomeProf = (id: string | null) => (id ? (profissionais.find((p) => p.id === id)?.nome ?? "Profissional") : "Loja inteira");
  const base = `/lojas/${loja.slug}/agenda`;
  const ativos = itens.filter((i) => i.situacao !== "cancelado").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <a href={`${base}?data=${somarDias(data, -1)}`} className="rounded-md border border-(--borda) px-3 py-1.5 text-sm" aria-label="Dia anterior">
            ←
          </a>
          <h2 className="min-w-44 text-center text-lg font-semibold first-letter:uppercase">{data === hoje ? `Hoje, ${dataPorExtenso(data, false)}` : dataPorExtenso(data)}</h2>
          <a href={`${base}?data=${somarDias(data, 1)}`} className="rounded-md border border-(--borda) px-3 py-1.5 text-sm" aria-label="Próximo dia">
            →
          </a>
          {data !== hoje ? (
            <a href={base} className="text-sm underline underline-offset-4">
              Hoje
            </a>
          ) : null}
          <form action={base} className="ml-auto flex items-center gap-2">
            <label htmlFor="ir-data" className="sr-only">
              Ir para a data
            </label>
            <input id="ir-data" type="date" name="data" defaultValue={data} className="rounded-md border border-(--borda) bg-transparent px-2 py-1.5 text-sm" />
            <button type="submit" className="rounded-md border border-(--borda) px-3 py-1.5 text-sm">
              Ir
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-(--suave)">
            {ativos === 0 ? "Nenhum agendamento neste dia." : `${ativos} agendamento${ativos > 1 ? "s" : ""}.`}
          </p>
          <a href="#novo" className="rounded-md border border-(--borda) px-3 py-1.5 text-sm lg:hidden">
            + Novo agendamento
          </a>
        </div>

        {bloqueios.length ? (
          <ul className="flex flex-col gap-2">
            {bloqueios.map((b) => (
              <li key={b.id} className="rounded-xl border border-dashed border-(--borda) px-4 py-2 text-sm text-(--suave)">
                Bloqueado {b.de === "00:00" && b.ate === "24:00" ? "o dia todo" : `das ${b.de} às ${b.ate}`} · {nomeProf(b.profissionalId)}
                {b.motivo ? ` · ${b.motivo}` : ""}
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="flex flex-col gap-3">
          {itens.map((i) => (
            <Item key={i.id} item={i} slug={loja.slug} nomeLoja={loja.nome} data={data} profissionais={profissionais} agora={agora} />
          ))}
        </ul>
      </section>

      <aside id="novo" className="h-fit scroll-mt-4 rounded-2xl border border-(--borda) p-5">
        <h2 className="mb-1 text-lg font-semibold">Novo agendamento</h2>
        <p className="mb-4 text-sm text-(--suave)">Pelo painel dá para encaixar fora da grade do site, mas nunca por cima de outro horário ou de um bloqueio.</p>
        {servicos.length && profissionais.length ? (
          <FormularioAcao acao={novoAgendamentoAcao} botao="Agendar" limpar>
            <input type="hidden" name="loja" value={loja.slug} />
            <Selecao id="servico" name="servico" rotulo="Serviço" required>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.duracaoMin} min)
                </option>
              ))}
            </Selecao>
            <Selecao id="profissional" name="profissional" rotulo="Profissional" defaultValue="">
              <option value="">Primeiro livre</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Selecao>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="data" name="data" type="date" rotulo="Data" defaultValue={data} required />
              <Campo id="hora" name="hora" type="time" rotulo="Hora" step={300} required />
            </div>
            <Campo id="nome" name="nome" rotulo="Nome do cliente" required maxLength={80} autoComplete="off" />
            <Campo id="telefone" name="telefone" rotulo="WhatsApp" type="tel" inputMode="tel" required placeholder="(DDD) 9 0000-0000" autoComplete="off" />
            <AreaTexto id="observacao" name="observacao" rotulo="Observação (opcional)" maxLength={300} />
          </FormularioAcao>
        ) : (
          <p className="text-sm text-(--suave)">Cadastre serviços e profissionais antes de agendar.</p>
        )}
      </aside>
    </div>
  );
}
