import { Fragment, type CSSProperties } from "react";
import { faixaDoNome, FOCO, type FaixaDoNome } from "../estilo";
import type { Vitrine } from "../tipos";
import css from "./revista.module.css";

/**
 * Revista (DESIGN.md §2): o salão vira a edição do mês de uma revista de moda.
 * A ordem é a de uma revista: capa na cor da loja, a agenda como página 2 (o
 * horário é o assunto principal), o índice, a carta da casa e o expediente
 * (quem assina, horário e endereço). A Didone (Bodoni Moda) só a partir de
 * 28 px; a Hanken Grotesk no resto.
 */

const DIDONE = "font-(family-name:--f-titulo)";
const CONTEUDO = "mx-auto w-full max-w-[1320px] px-5 md:px-12";
const TITULO_SECAO = `${DIDONE} text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.95] font-normal tracking-[-0.02em]`;
const SUBLINHADO = `underline decoration-(--marca) decoration-2 underline-offset-[6px]`;

const TAMANHO_DO_TITULO: Record<FaixaDoNome, string> = {
  curto: "text-[clamp(4rem,11vw,10.5rem)]",
  medio: "text-[clamp(2.9rem,7.6vw,7.25rem)]",
  longo: "text-[clamp(2.1rem,5.4vw,5.25rem)]",
  // Nome muito longo: sem caixa alta (ver Capa), que na Didone é larga demais; nunca abaixo de 28 px.
  muitoLongo: "text-[clamp(1.75rem,4.6vw,4rem)]",
};

const ordem = (n: number) => ({ "--ordem": n }) as CSSProperties;

function Capa({ v }: { v: Vitrine }) {
  const faixa = faixaDoNome(v.loja.nome);
  // Chamadas de capa: só texto, como numa revista; com nome muito longo, duas e menores.
  const chamadas = v.servicos.slice(0, faixa === "muitoLongo" ? 2 : 3);
  // Na agenda: os três primeiros horários da agenda (já espalhados pelo dia), com o primeiro serviço livre em cada um.
  const destaque = v.agenda.flatMap((d) => d.horas.map((h) => ({ ...h, dia: d.dia }))).slice(0, 3);
  const nav = `inline-flex min-h-11 items-center text-[15px] font-medium underline-offset-4 hover:underline ${FOCO}`;
  return (
    <section className="flex flex-col bg-(--marca) text-(--marca-texto) md:min-h-[min(100svh,52rem)]" aria-label="Capa">
      <div className={`${CONTEUDO} flex items-center justify-between gap-6 pt-5`}>
        <p className="min-h-11 py-3 text-[15px] font-medium">
          Edição de {v.mes} · {v.loja.segmentoNome}
        </p>
        <nav aria-label="Seções" className="hidden items-center gap-7 md:flex">
          <a href="#agenda" className={nav}>
            Agenda
          </a>
          <a href="#nesta-edicao" className={nav}>
            Nesta edição
          </a>
          <a href="#expediente" className={nav}>
            Expediente
          </a>
        </nav>
      </div>

      <div className={`${CONTEUDO} flex flex-1 flex-col justify-center pt-10 pb-12 md:py-16 lg:justify-end lg:pb-14`}>
        <h1 className={`${DIDONE} ${TAMANHO_DO_TITULO[faixa]} leading-[0.92] font-medium tracking-[-0.025em] text-balance ${faixa === "muitoLongo" ? "" : "uppercase"}`}>
          {/* Cada palavra sobe sozinha; o espaço fica FORA da caixa animada (dentro, ele some). */}
          {v.loja.nome.split(" ").map((palavra, i) => (
            <Fragment key={i}>
              {i > 0 ? " " : null}
              <span className={css.palavra} style={ordem(i)}>
                {palavra}
              </span>
            </Fragment>
          ))}
        </h1>
        {v.chamada ? (
          <p className={`${css.chamada} mt-6 max-w-[34rem] text-lg text-pretty md:text-xl`} style={ordem(0)}>
            {v.chamada}
          </p>
        ) : null}
      </div>

      <div className={`${CONTEUDO} grid grid-cols-1 gap-10 pb-10 md:pb-14 lg:grid-cols-12 lg:items-end`}>
        {chamadas.length ? (
          <ul className={`flex flex-col gap-2 lg:col-span-6 ${faixa === "muitoLongo" ? "max-md:hidden" : ""}`}>
            {chamadas.map((s, i) => (
              <li key={s.id} className={`${css.chamada} flex flex-wrap items-baseline gap-x-3`} style={ordem(i + 1)}>
                <span className={`${DIDONE} ${faixa === "muitoLongo" ? "text-[1.75rem]" : "text-[clamp(1.75rem,2.8vw,2.5rem)]"} leading-[1.1] italic`}>{s.nome}</span>
                <span className="text-[17px] font-semibold tabular-nums">{s.preco}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={`${css.chamada} lg:col-span-6`} style={ordem(4)}>
          {destaque.length ? (
            <>
              <p className="text-[17px] font-semibold">Na agenda desta edição{destaque.every((d) => d.todos) ? ", para qualquer serviço" : ""}</p>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {destaque.map((d) => (
                  <li key={d.href} className="min-w-0">
                    <a href={d.href} className={`flex min-h-16 flex-col justify-center bg-(--l-fundo) px-5 py-3 text-(--l-texto) transition-transform active:scale-[0.98] ${FOCO}`}>
                      <span className="text-[18px] font-semibold tabular-nums">
                        {d.dia}, {d.hora}
                      </span>
                      {destaque.every((x) => x.todos) ? null : (
                        <span className="truncate text-[15px] text-(--l-suave)">{d.todos ? "qualquer serviço" : `${d.servicos.length} de ${v.servicos.length} serviços`}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <a href={v.contato.whatsapp?.href ?? v.agendarHref} className={`inline-flex min-h-14 items-center bg-(--l-fundo) px-8 text-[17px] font-semibold text-(--l-texto) ${FOCO}`}>
              {v.contato.whatsapp ? "Agenda cheia: falar com a casa" : "Ver a agenda"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Página 2: os próximos dias com vaga. Cada horário é um link que abre a reserva já naquele dia e hora;
 * o serviço é escolhido em seguida. Quando todos os serviços estão livres em todos os horários
 * mostrados, isso é dito uma vez só, no alto.
 */
function Agenda({ v }: { v: Vitrine }) {
  const dias = v.agenda;
  const tudoLivre = dias.length > 0 && dias.every((d) => d.horas.every((h) => h.todos));
  return (
    <section id="agenda" className={`${CONTEUDO} scroll-mt-8`} aria-labelledby="titulo-agenda">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
        <h2 id="titulo-agenda" className={`${TITULO_SECAO} lg:col-span-5`}>
          Agenda
        </h2>
        <p className="mt-5 max-w-[30rem] text-[18px] text-pretty text-(--l-suave) lg:col-span-6 lg:col-start-7 lg:mt-3">
          {tudoLivre
            ? "Os próximos dias com horário livre, de manhã à noite, para qualquer serviço da casa. Toque num horário e escolha o serviço."
            : "Os próximos dias com horário livre, de manhã à noite. Toque num horário e escolha o serviço."}
        </p>
      </div>
      {dias.length ? (
        <div className={`mt-12 grid gap-x-10 gap-y-12 ${dias.length >= 3 ? "md:grid-cols-3" : dias.length === 2 ? "md:grid-cols-2" : ""}`}>
          {dias.map((d) => (
            <div key={d.data}>
              <h3 className={`${DIDONE} text-[2.25rem] leading-none italic`}>{d.dia}</h3>
              <p className="mt-2 text-[16px] text-(--l-suave)">
                {d.livres} {d.livres === 1 ? "horário livre" : "horários livres"}
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
                {d.horas.map((h) => (
                  <li key={h.hora} className="min-w-0">
                    <a href={h.href} className={`group flex min-h-12 flex-col justify-center ${FOCO}`}>
                      <span className="text-[22px] font-semibold tabular-nums underline decoration-(--l-suave) decoration-2 underline-offset-[6px] group-hover:decoration-(--marca)">
                        {h.hora}
                        <span className="sr-only">, {d.dia.toLowerCase()}</span>
                      </span>
                      {tudoLivre || h.todos ? null : (
                        <span className="text-[15px] text-(--l-suave)">
                          {h.servicos.length} de {v.servicos.length} serviços
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-start gap-5">
          <p className="text-[20px]">Agenda cheia nos próximos dias.</p>
          {v.contato.whatsapp ? (
            <a href={v.contato.whatsapp.href} className={`inline-flex min-h-14 items-center bg-(--l-texto) px-8 font-semibold text-(--l-fundo) ${FOCO}`}>
              Falar com a casa no WhatsApp
            </a>
          ) : null}
        </div>
      )}
      <a href={v.agendarHref} className={`mt-10 inline-flex min-h-11 items-center text-[17px] font-semibold ${SUBLINHADO} ${FOCO}`}>
        Outros dias e horários
      </a>
    </section>
  );
}

/** Página 3: o índice. Cada serviço com preço, duração e quem faz. */
function NestaEdicao({ v }: { v: Vitrine }) {
  const primeira = v.proxima ? `${v.proxima.data} ${v.proxima.hora}` : null;
  return (
    <section id="nesta-edicao" className={`${CONTEUDO} scroll-mt-8 lg:grid lg:grid-cols-12 lg:gap-x-8`} aria-labelledby="titulo-edicao">
      <div className="lg:col-span-4">
        <h2 id="titulo-edicao" className={TITULO_SECAO}>
          Nesta edição
        </h2>
        <p className="mt-5 max-w-[22rem] text-[17px] text-(--l-suave)">Os serviços da casa, com preço, duração e quem faz.</p>
      </div>
      {v.servicos.length === 0 ? <p className="mt-12 text-[20px] lg:col-span-7 lg:col-start-6 lg:mt-2">A casa ainda está montando a lista de serviços. Fale com ela pelo WhatsApp.</p> : null}
      <ul className="mt-12 empty:hidden lg:col-span-7 lg:col-start-6 lg:mt-2">
        {v.servicos.map((s) => {
          const quem = v.equipe.filter((p) => p.servicos.includes(s.nome)).map((p) => p.nome);
          const vaga = s.proximas[0];
          // O próximo horário só aparece quando é diferente do primeiro da casa (senão repete em todas as linhas).
          const outroHorario = vaga && `${vaga.data} ${vaga.hora}` !== primeira ? `livre ${vaga.dia.toLowerCase()}, ${vaga.hora}` : null;
          return (
            <li key={s.id}>
              <a href={s.href} className={`${css.linha} -mx-4 grid grid-cols-[1fr_auto] gap-x-6 px-4 py-5 transition-colors hover:bg-(--l-superficie) ${FOCO}`}>
                <span className="text-[20px] leading-snug font-semibold">{s.nome}</span>
                <span className={`${css.preco} ${DIDONE} text-[1.75rem] leading-none tabular-nums`}>{s.preco}</span>
                <span className="col-span-2 mt-1 text-[16px] text-(--l-suave)">
                  {[s.duracao, quem.length && quem.length < v.equipe.length ? `com ${quem.join(" e ")}` : null, s.descricao, outroHorario].filter(Boolean).join(" · ")}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Carta({ v }: { v: Vitrine }) {
  if (!v.sobre) return null;
  const [primeira, ...resto] = v.sobre.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  return (
    <section className={`${CONTEUDO} lg:grid lg:grid-cols-12 lg:gap-x-8`} aria-labelledby="titulo-carta">
      <h2 id="titulo-carta" className={`${TITULO_SECAO} lg:col-span-4`}>
        Carta da casa
      </h2>
      <div className="mt-10 max-w-[38rem] lg:col-span-7 lg:col-start-6 lg:mt-2">
        <p className={`${DIDONE} text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.15]`}>{primeira}</p>
        {resto.length ? <p className="mt-6 text-[18px] leading-[1.6]">{resto.join(" ")}</p> : null}
        <p className="mt-6 text-[17px] font-semibold">— {v.loja.nome}</p>
      </div>
    </section>
  );
}

/** O expediente da revista: quem assina a edição, o horário da casa e onde fica. */
function Expediente({ v }: { v: Vitrine }) {
  const { whatsapp, instagram, mapa } = v.contato;
  const faixa = faixaDoNome(v.loja.nome);
  const link = `inline-flex min-h-11 items-center text-[17px] font-semibold ${SUBLINHADO} ${FOCO}`;
  const temContato = Boolean(v.endereco || whatsapp || instagram);
  const subtitulo = "text-[17px] font-semibold";
  const todosFazemTudo = v.equipe.length > 1 && v.equipe.every((p) => p.servicos.length === v.servicos.length);
  // Todos com o mesmo próximo horário: repetir "ter, 20/10, 09:00" três vezes não informa nada.
  const mesmoHorario = v.equipe.length > 1 && v.equipe.every((p) => p.proxima && p.proxima.data === v.equipe[0]!.proxima?.data && p.proxima.hora === v.equipe[0]!.proxima?.hora);
  return (
    <footer id="expediente" className="scroll-mt-8 bg-(--l-superficie) pt-20 pb-28 md:pt-28 md:pb-14" aria-labelledby="titulo-expediente">
      <div className={CONTEUDO}>
        <h2 id="titulo-expediente" className={TITULO_SECAO}>
          Expediente
        </h2>
        <div className="mt-12 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-12">
          {v.equipe.length ? (
            <div className="lg:col-span-5">
              <h3 className={subtitulo}>Quem assina</h3>
              {todosFazemTudo || mesmoHorario ? (
                <p className="mt-1 text-[16px] text-(--l-suave)">
                  {[todosFazemTudo ? "Toda a equipe faz todos os serviços da casa" : null, mesmoHorario ? `próxima vaga de cada pessoa: ${v.equipe[0]!.proxima!.dia.toLowerCase()} às ${v.equipe[0]!.proxima!.hora}` : null]
                    .filter(Boolean)
                    .join("; ")}
                  .
                </p>
              ) : null}
              <ul className="mt-5 flex flex-col gap-6">
                {v.equipe.map((p) => (
                  <li key={p.id}>
                    <p className={`${DIDONE} text-[2rem] leading-none italic`}>{p.nome}</p>
                    {todosFazemTudo ? null : <p className="mt-2 text-[16px] text-(--l-suave)">{p.servicos.length === v.servicos.length ? "Todos os serviços da casa" : p.servicos.join(", ")}</p>}
                    {p.proxima ? (
                      <a href={p.proxima.href} className={`mt-1 ${link}`}>
                        {mesmoHorario ? (
                          <>
                            Reservar com {p.nome}
                            <span className="sr-only">
                              , {p.proxima.dia.toLowerCase()} às {p.proxima.hora}
                            </span>
                          </>
                        ) : (
                          <>
                            Na agenda: {p.proxima.dia.toLowerCase()}, {p.proxima.hora}
                            <span className="sr-only"> com {p.nome}</span>
                          </>
                        )}
                      </a>
                    ) : (
                      <p className="mt-2 text-[16px]">Agenda cheia nos próximos dias</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={v.equipe.length ? "lg:col-span-4" : "lg:col-span-6"}>
            <h3 className={subtitulo}>Horário da casa</h3>
            <p className="mt-2 text-[16px] text-(--l-suave)">{v.agora.texto}</p>
            <dl className="mt-5 grid grid-cols-[6.5rem_1fr] gap-x-5 gap-y-2.5 text-[17px]">
              {v.semana.map((d) => (
                <div key={d.dia} className="contents">
                  <dt className={`first-letter:uppercase ${d.hoje ? "font-semibold" : ""}`}>
                    {d.nome}
                    {d.hoje ? <span className="sr-only"> (hoje)</span> : null}
                  </dt>
                  <dd className={`tabular-nums ${d.hoje ? "font-semibold" : d.aberto ? "" : "text-(--l-suave)"}`}>{d.texto}</dd>
                </div>
              ))}
            </dl>
          </div>
          {temContato ? (
            <div className={`flex flex-col gap-1 ${v.equipe.length ? "md:col-span-2 lg:col-span-3" : "lg:col-span-6"}`}>
              <h3 className={subtitulo}>Onde fica</h3>
              {v.endereco ? <p className="mt-2 mb-2 text-[19px] leading-snug">{v.endereco}</p> : null}
              {mapa ? (
                <a href={mapa} target="_blank" rel="noreferrer" className={link}>
                  Abrir no mapa
                </a>
              ) : null}
              {whatsapp ? (
                <a href={whatsapp.href} target="_blank" rel="noreferrer" className={link}>
                  WhatsApp {whatsapp.texto}
                </a>
              ) : null}
              {instagram ? (
                <a href={instagram.href} target="_blank" rel="noreferrer" className={link}>
                  {instagram.texto}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-20 flex flex-col gap-3 md:mt-28 lg:flex-row lg:items-baseline lg:justify-between lg:gap-10">
          <p className={`${DIDONE} ${faixa === "muitoLongo" ? "text-[1.75rem]" : `text-[clamp(2rem,4vw,3rem)] ${faixa === "curto" ? "uppercase" : ""}`} leading-[1.05] text-balance`}>
            {v.loja.nome}
          </p>
          <p className="shrink-0 text-[15px] text-(--l-suave)">
            Edição de {v.mes} · agenda online por {v.marca}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function InicioRevista({ v }: { v: Vitrine }) {
  return (
    <>
      <main id="conteudo" className="flex flex-col gap-28 pb-28 md:gap-44 md:pb-44">
        <Capa v={v} />
        <div className="-mt-8 md:-mt-20">
          <Agenda v={v} />
        </div>
        <NestaEdicao v={v} />
        <Carta v={v} />
      </main>
      <Expediente v={v} />
      {/* Celular: a reserva fica sempre à mão depois da capa (a barra entra quando a capa sai da tela). */}
      <div className={`${css.barraFixa} fixed inset-x-0 bottom-0 z-20 md:hidden`}>
        <a href={v.proxima?.href ?? v.agendarHref} className={`flex min-h-16 items-center justify-center bg-(--l-texto) px-5 pb-[env(safe-area-inset-bottom)] text-[17px] font-semibold text-(--l-fundo) ${FOCO}`}>
          {v.proxima ? `Reservar ${v.proxima.dia.toLowerCase()} às ${v.proxima.hora}` : "Reservar horário"}
        </a>
      </div>
    </>
  );
}
