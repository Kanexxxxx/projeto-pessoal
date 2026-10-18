import { notFound } from "next/navigation";
import { formatarPreco } from "@/dominio/contato";
import { dataCanonica, dataPorExtenso, diaDaSemana, minutosDeHora, nomeDoDia } from "@/dominio/datas";
import { duracaoLegivel } from "@/dominio/funcionamento";
import { contexto } from "@/servidor/acesso";
import { disponibilidade, livresNoHorario, lojaAceitaReservas } from "@/servidor/lojas/agenda";
import { UUID } from "@/servidor/lojas/escopo";
import { Casca } from "../Casca";
import { siteDaLoja } from "../dados";
import { MODELOS } from "../modelos";
import { FOCO, TITULO } from "../modelos/estilo";
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


/** Uma escolha já feita: o que foi escolhido e como trocar. `destaque` mostra o valor na letra de título do modelo. */
function Escolhido({ rotulo, valor, alterar, destaque }: { rotulo: string; valor: string; alterar: string; destaque?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {/* Um ponto na cor da loja, com a forma do modelo (quadrado no Letreiro, redondo na Paleta). */}
      <span aria-hidden className="size-2.5 shrink-0 self-start rounded-(--raio) bg-(--marca) mt-2" />
      <p className="min-w-0 flex-1">
        <span className="block text-sm text-(--l-suave)">{rotulo}</span>
        {destaque ? <span className={`${TITULO} block text-[1.75rem] leading-tight tabular-nums`}>{destaque}</span> : null}
        <span className="block font-medium first-letter:uppercase">{valor}</span>
      </p>
      <a href={alterar} className={`shrink-0 py-2 text-sm underline underline-offset-4 ${FOCO}`}>
        Alterar<span className="sr-only"> {rotulo.toLowerCase()}</span>
      </a>
    </div>
  );
}

function Etapa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 pt-8" aria-label={titulo}>
      {/* 28 px: a menor medida em que as fontes de título dos modelos (a Didone da Revista) ficam legíveis. */}
      <h2 className={`${TITULO} text-[1.75rem] leading-tight`}>{titulo}</h2>
      {children}
    </section>
  );
}

const OPCAO = `flex min-h-14 items-center justify-between gap-3 rounded-(--raio-bloco) bg-(--l-superficie) px-4 py-3.5 ring-1 ring-transparent transition-[box-shadow,transform] duration-200 hover:ring-(--l-texto) active:scale-[0.99] ${FOCO}`;

export default async function PaginaAgendar({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Busca> }) {
  const site = await siteDaLoja((await params).slug);
  if (!site) notFound();
  const { loja, servicos, profissionais, config } = site;
  const busca = await searchParams;

  const servico = servicos.find((s) => s.id === busca.servico) ?? null;
  const doServico = servico ? profissionais.filter((p) => servico.profissionais.includes(p.id)) : [];
  // Um só profissional faz o serviço: a escolha de profissional some.
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

  // Horário escolhido antes do serviço (agenda do site: "ter, 20/10 às 09:00" → qual serviço?). Ele segue
  // junto nas escolhas de serviço e de profissional até a etapa "Quando".
  const dataPedida = busca.data ? dataCanonica(busca.data) : null;
  const horaPedida = dataPedida && busca.hora && minutosDeHora(busca.hora) !== null ? busca.hora : undefined;
  const pedido = horaPedida ? { data: dataPedida!, hora: horaPedida } : {};
  // O link trazia um horário que não está livre (saiu da agenda, ou não serve para este serviço): avisar em vez de sumir calado.
  const horaSumiu = Boolean(servico && prof && horaPedida && !vaga);
  // Com horário pedido, só se oferece serviço e pessoa que cabem nele (o resto vai para "outro horário").
  const cabem = horaPedida && (!servico || !prof) ? await livresNoHorario(contexto().db, loja, { data: dataPedida!, hora: horaPedida }) : null;
  const quandoPedido = horaPedida ? `às ${horaPedida}` : "";
  const aceita = lojaAceitaReservas(loja);
  const nomeProfissional = profissional?.nome ?? (prof === "qualquer" ? "Sem preferência" : undefined);

  return (
    <Casca modelo={MODELOS[config.modelo]} cor={config.cor} situacao={loja.situacao}>
      <main id="conteudo" className="mx-auto flex max-w-xl flex-col px-4 pt-6 pb-20">
        <a href="/" className={`inline-flex min-h-11 items-center self-start text-sm text-(--l-suave) underline-offset-4 hover:underline ${FOCO}`}>
          ← {loja.nome}
        </a>
        <h1 className={`${TITULO} mt-6 text-4xl leading-none sm:text-5xl`}>Agendar horário</h1>
        {!aceita ? <p className="mt-6 text-(--l-suave)">Esta loja não está recebendo agendamentos pelo site.</p> : null}

        {aceita ? (
          <div className="mt-6 flex flex-col">
            {!servico && horaPedida ? <Escolhido rotulo="Horário" destaque={horaPedida} valor={dataPorExtenso(dataPedida!)} alterar={link({})} /> : null}
            {servico ? (
              <Escolhido rotulo="Serviço" valor={`${servico.nome} · ${duracaoLegivel(servico.duracaoMin)} · ${formatarPreco(servico.precoCentavos)}`} alterar={link(pedido)} />
            ) : (
              <Etapa titulo="Qual serviço?">
                {servicos.length ? (
                  <>
                    {cabem && !servicos.some((s) => cabem.has(s.id)) ? (
                      <p role="status" className="rounded-(--raio-bloco) bg-(--l-superficie) px-4 py-3 font-medium">
                        O horário {quandoPedido} de {dataPorExtenso(dataPedida!)} acabou de sair da agenda. Escolha o serviço para ver outros horários.
                      </p>
                    ) : null}
                    <ul className="flex flex-col gap-2">
                      {servicos
                        .filter((s) => !cabem || cabem.has(s.id))
                        .map((s) => (
                          <li key={s.id}>
                            <a href={link({ servico: s.id, ...pedido })} className={OPCAO}>
                              <span>
                                <span className="block font-medium">{s.nome}</span>
                                <span className="block text-sm text-(--l-suave)">{duracaoLegivel(s.duracaoMin)}</span>
                              </span>
                              <span className="font-medium tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                            </a>
                          </li>
                        ))}
                    </ul>
                    {cabem && servicos.some((s) => !cabem.has(s.id)) ? (
                      <div className="mt-2 flex flex-col gap-2">
                        {servicos.some((s) => cabem.has(s.id)) ? <p className="text-sm text-(--l-suave)">Estes não cabem {quandoPedido}; escolha e veja outros horários:</p> : null}
                        <ul className="flex flex-col gap-2">
                          {servicos
                            .filter((s) => !cabem.has(s.id))
                            .map((s) => (
                              <li key={s.id}>
                                <a href={link({ servico: s.id })} className={OPCAO}>
                                  <span>
                                    <span className="block font-medium">{s.nome}</span>
                                    <span className="block text-sm text-(--l-suave)">{duracaoLegivel(s.duracaoMin)} · outro horário</span>
                                  </span>
                                  <span className="font-medium tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-(--l-suave)">A loja ainda não cadastrou serviços.</p>
                )}
              </Etapa>
            )}

            {servico && !unico ? (
              nomeProfissional ? (
                <Escolhido rotulo="Com quem" valor={nomeProfissional} alterar={link({ servico: servico.id, ...pedido })} />
              ) : (
                <Etapa titulo="Com quem?">
                  <ul className="flex flex-col gap-2">
                    {(() => {
                      // Com horário pedido: quem está livre nele leva o horário junto; quem não está vai para "outro horário".
                      const livresAgora = cabem ? (cabem.get(servico.id) ?? []) : null;
                      const comHorario = (id: string) => !livresAgora || livresAgora.includes(id);
                      return (
                        <>
                          <li>
                            <a href={link({ servico: servico.id, prof: "qualquer", ...(livresAgora && !livresAgora.length ? {} : pedido) })} className={OPCAO}>
                              <span className="font-medium">Sem preferência</span>
                              <span className="text-sm text-(--l-suave)">{livresAgora && !livresAgora.length ? `sem vaga ${quandoPedido}` : "mais horários"}</span>
                            </a>
                          </li>
                          {doServico.map((p) => (
                            <li key={p.id}>
                              <a href={link({ servico: servico.id, prof: p.id, ...(comHorario(p.id) ? pedido : {}) })} className={OPCAO}>
                                <span className="font-medium">{p.nome}</span>
                                {comHorario(p.id) ? null : <span className="text-sm text-(--l-suave)">sem vaga {quandoPedido} · outro horário</span>}
                              </a>
                            </li>
                          ))}
                        </>
                      );
                    })()}
                  </ul>
                </Etapa>
              )
            ) : null}

            {servico && prof ? (
              vaga && data ? (
                <Escolhido rotulo="Quando" destaque={vaga.rotulo} valor={dataPorExtenso(data)} alterar={link({ servico: servico.id, prof: busca.prof, data })} />
              ) : (
                <Etapa titulo="Quando?">
                  {horaSumiu ? (
                    <p role="status" className="rounded-(--raio-bloco) bg-(--l-superficie) px-4 py-3 font-medium">
                      O horário das {horaPedida} de {dataPorExtenso(dataPedida!)} não está livre para {servico!.nome.toLowerCase()}. Escolha outro abaixo.
                    </p>
                  ) : null}
                  {!disp || !primeiroDiaLivre ? (
                    <p className="text-(--l-suave)">Não há horários livres nos próximos dias. Fale com a loja pelo WhatsApp.</p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="-mx-4 overflow-x-auto px-4 pb-1">
                        <ul className="flex min-w-max gap-2">
                          {disp.dias.map((d) => {
                            const escolhido = d.data === data;
                            const conteudo = (
                              <>
                                {/* O nome acessível começa pelo texto visível ("seg 20"), para quem usa voz. */}
                                <span className="text-xs">{nomeDoDia(diaDaSemana(d.data), true)}</span>{" "}
                                <span className="text-lg font-semibold tabular-nums">{d.data.slice(8)}</span>
                                <span className="sr-only">, {dataPorExtenso(d.data)}</span>
                              </>
                            );
                            return (
                              <li key={d.data}>
                                {d.temVaga ? (
                                  <a
                                    href={link({ servico: servico.id, prof: busca.prof, data: d.data })}
                                    aria-current={escolhido ? "date" : undefined}
                                    className={`flex w-14 flex-col items-center rounded-(--raio) py-2 ${FOCO} ${
                                      escolhido ? "bg-(--marca) text-(--marca-texto)" : "bg-(--l-superficie) hover:ring-1 hover:ring-(--l-texto)"
                                    }`}
                                  >
                                    {conteudo}
                                  </a>
                                ) : (
                                  <span className="flex w-14 flex-col items-center py-2 text-(--l-suave) opacity-60">
                                    {conteudo}
                                    <span className="sr-only">, sem horários</span>
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      {data ? (
                        <div className="flex flex-col gap-3">
                          <p className="font-medium first-letter:uppercase">{dataPorExtenso(data)}</p>
                          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                            {vagas.map((v) => (
                              <li key={v.rotulo}>
                                {v.livre ? (
                                  <a
                                    href={link({ servico: servico.id, prof: busca.prof, data, hora: v.rotulo })}
                                    className={`flex min-h-12 items-center justify-center rounded-(--raio) bg-(--l-superficie) font-medium tabular-nums hover:bg-(--marca) hover:text-(--marca-texto) ${FOCO}`}
                                  >
                                    {v.rotulo}
                                  </a>
                                ) : (
                                  <span className="flex min-h-12 items-center justify-center text-(--l-suave) tabular-nums line-through opacity-60">
                                    {v.rotulo}
                                    <span className="sr-only"> ocupado</span>
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}
                </Etapa>
              )
            ) : null}

            {servico && prof && vaga && data ? (
              <Etapa titulo="Seus dados">
                <FormularioReserva
                  servicoId={servico.id}
                  profissionalId={profissional?.id ?? ""}
                  data={data}
                  hora={vaga.rotulo}
                  lojaNome={loja.nome}
                  whatsappLoja={config.whatsapp}
                  voltar={link({ servico: servico.id, prof: busca.prof, data })}
                />
              </Etapa>
            ) : null}
          </div>
        ) : null}
      </main>
    </Casca>
  );
}
