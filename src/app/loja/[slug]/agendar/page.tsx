import { notFound } from "next/navigation";
import { formatarPreco } from "@/dominio/contato";
import { dataCanonica, dataPorExtenso, diaDaSemana, minutosDeHora, nomeDoDia } from "@/dominio/datas";
import { contexto } from "@/servidor/acesso";
import { disponibilidade, lojaAceitaReservas } from "@/servidor/lojas/agenda";
import { UUID } from "@/servidor/lojas/escopo";
import { siteDaLoja } from "../dados";
import { FormularioReserva } from "./FormularioReserva";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agendar" };

type Busca = { servico?: string; prof?: string; data?: string; hora?: string };

function link(b: Busca): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(b)) if (v) p.set(k, v);
  const q = p.toString();
  return q ? `/agendar?${q}` : "/agendar";
}

function Passo({ numero, titulo, resumo, alterar, children }: { numero: number; titulo: string; resumo?: string; alterar?: string; children?: React.ReactNode }) {
  const feito = Boolean(resumo);
  return (
    <section className="border-b border-(--l-borda) py-5" aria-labelledby={`passo-${numero}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${feito ? "bg-(--marca) text-(--marca-texto)" : "border border-(--l-borda)"}`}
        >
          {feito ? "✓" : numero}
        </span>
        <h2 id={`passo-${numero}`} className="flex-1 font-semibold">
          {titulo}
          {resumo ? <span className="block text-sm font-normal text-(--l-suave)">{resumo}</span> : null}
        </h2>
        {alterar ? (
          <a href={alterar} className="text-sm underline underline-offset-4">
            Alterar
          </a>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

const OPCAO =
  "flex items-center justify-between gap-3 rounded-xl border border-(--l-borda) bg-(--l-superficie) px-4 py-3.5 outline-none hover:border-(--marca) focus-visible:ring-2 focus-visible:ring-(--marca)";

export default async function PaginaAgendar({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Busca> }) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  const { loja, servicos, profissionais } = site;
  const busca = await searchParams;

  const servico = servicos.find((s) => s.id === busca.servico) ?? null;
  const doServico = servico ? profissionais.filter((p) => servico.profissionais.includes(p.id)) : [];
  // Um só profissional faz o serviço: o passo de escolha some.
  const unico = doServico.length === 1 ? doServico[0]! : null;
  const profBusca = busca.prof === "qualquer" ? "qualquer" : doServico.find((p) => p.id === busca.prof)?.id;
  const prof = unico ? unico.id : profBusca;
  const profissional = prof && prof !== "qualquer" ? (doServico.find((p) => p.id === prof) ?? null) : null;

  const disp =
    servico && prof && UUID.test(servico.id)
      ? await disponibilidade(contexto().db, loja, { servicoId: servico.id, profissionalId: profissional?.id ?? null, data: busca.data ? dataCanonica(busca.data) : null })
      : null;
  const primeiroDiaLivre = disp?.dias.find((d) => d.temVaga)?.data ?? null;
  const data = disp?.data ?? null;
  const vagas = disp?.vagas ?? [];
  const vaga = busca.hora && minutosDeHora(busca.hora) !== null ? vagas.find((v) => v.rotulo === busca.hora && v.livre) : undefined;

  const aceita = lojaAceitaReservas(loja);
  const nomeProfissional = profissional?.nome ?? (prof === "qualquer" ? "Sem preferência" : undefined);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-16">
      <header className="flex items-center justify-between gap-3 py-5">
        <a href="/" className="text-sm text-(--l-suave) underline-offset-4 hover:underline">
          ← {loja.nome}
        </a>
      </header>
      <h1 className="text-3xl font-semibold tracking-tight">Agendar horário</h1>
      {!aceita ? <p className="mt-4 text-(--l-suave)">Esta loja não está recebendo agendamentos pelo site.</p> : null}

      {aceita ? (
        <div className="mt-4 flex flex-col">
          <Passo numero={1} titulo="Serviço" resumo={servico ? `${servico.nome} · ${servico.duracaoMin} min · ${formatarPreco(servico.precoCentavos)}` : undefined} alterar={servico ? link({}) : undefined}>
            {servico ? null : servicos.length ? (
              <ul className="flex flex-col gap-2">
                {servicos.map((s) => (
                  <li key={s.id}>
                    <a href={link({ servico: s.id })} className={OPCAO}>
                      <span>
                        <span className="font-medium">{s.nome}</span>
                        <span className="block text-sm text-(--l-suave)">{s.duracaoMin} min</span>
                      </span>
                      <span className="font-medium tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-(--l-suave)">A loja ainda não cadastrou serviços.</p>
            )}
          </Passo>

          {servico && !unico ? (
            <Passo numero={2} titulo="Profissional" resumo={nomeProfissional} alterar={prof ? link({ servico: servico.id }) : undefined}>
              {prof ? null : (
                <ul className="flex flex-col gap-2">
                  <li>
                    <a href={link({ servico: servico.id, prof: "qualquer" })} className={OPCAO}>
                      <span className="font-medium">Sem preferência</span>
                      <span className="text-sm text-(--l-suave)">mais horários</span>
                    </a>
                  </li>
                  {doServico.map((p) => (
                    <li key={p.id}>
                      <a href={link({ servico: servico.id, prof: p.id })} className={OPCAO}>
                        <span className="font-medium">{p.nome}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Passo>
          ) : null}

          {servico && prof ? (
            <Passo
              numero={unico ? 2 : 3}
              titulo="Dia e horário"
              resumo={vaga && data ? `${dataPorExtenso(data)} às ${vaga.rotulo}` : undefined}
              alterar={vaga ? link({ servico: servico.id, prof: busca.prof, data: data ?? undefined }) : undefined}
            >
              {vaga ? null : !disp || !primeiroDiaLivre ? (
                <p className="text-(--l-suave)">Não há horários livres nos próximos dias. Fale com a loja pelo WhatsApp.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="-mx-4 overflow-x-auto px-4 pb-1">
                    <ul className="flex min-w-max gap-2">
                      {disp.dias.map((d) => {
                        const escolhido = d.data === data;
                        const [, , dia] = d.data.split("-");
                        const conteudo = (
                          <>
                            <span className="text-xs uppercase">{nomeDoDia(diaDaSemana(d.data), true)}</span>
                            <span className="text-lg font-semibold tabular-nums">{dia}</span>
                          </>
                        );
                        return (
                          <li key={d.data}>
                            {d.temVaga ? (
                              <a
                                href={link({ servico: servico.id, prof: busca.prof, data: d.data })}
                                aria-current={escolhido ? "date" : undefined}
                                aria-label={dataPorExtenso(d.data)}
                                className={`flex w-14 flex-col items-center rounded-xl border py-2 outline-none focus-visible:ring-2 focus-visible:ring-(--marca) ${
                                  escolhido ? "border-(--marca) bg-(--marca) text-(--marca-texto)" : "border-(--l-borda) bg-(--l-superficie) hover:border-(--marca)"
                                }`}
                              >
                                {conteudo}
                              </a>
                            ) : (
                              <span aria-label={`${dataPorExtenso(d.data)}, sem horários`} className="flex w-14 flex-col items-center rounded-xl border border-transparent py-2 text-(--l-suave) opacity-50">
                                {conteudo}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {data ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-medium first-letter:uppercase">{dataPorExtenso(data)}</p>
                      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {vagas.map((v) => (
                          <li key={v.rotulo}>
                            {v.livre ? (
                              <a
                                href={link({ servico: servico.id, prof: busca.prof, data, hora: v.rotulo })}
                                className="block rounded-lg border border-(--l-borda) bg-(--l-superficie) py-2.5 text-center font-medium tabular-nums outline-none hover:border-(--marca) focus-visible:ring-2 focus-visible:ring-(--marca)"
                              >
                                {v.rotulo}
                              </a>
                            ) : (
                              <span className="block rounded-lg py-2.5 text-center text-(--l-suave) tabular-nums line-through opacity-50" aria-label={`${v.rotulo}, ocupado`}>
                                {v.rotulo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </Passo>
          ) : null}

          {servico && prof && vaga && data ? (
            <Passo numero={unico ? 3 : 4} titulo="Seus dados">
              <FormularioReserva
                servicoId={servico.id}
                profissionalId={profissional?.id ?? ""}
                data={data}
                hora={vaga.rotulo}
                lojaNome={loja.nome}
                whatsappLoja={site.config.whatsapp}
                voltar={link({ servico: servico.id, prof: busca.prof, data })}
              />
            </Passo>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
