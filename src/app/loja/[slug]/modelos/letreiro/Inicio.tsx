import type { CSSProperties } from "react";
import { faixaDoNome, FOCO, type FaixaDoNome } from "../estilo";
import type { DiaVitrine, Vitrine } from "../tipos";
import css from "./letreiro.module.css";

/**
 * Letreiro (DESIGN.md §1): a página é a parede da barbearia. Na vitrine, o
 * próximo horário livre é o letreiro; na parede, o quadro de preços com a
 * placa ABERTO/FECHADO e o horário pintado; na porta, a placa do endereço.
 * O poste listrado gira com a rolagem enquanto a loja está aberta.
 */

const LETREIRO = "font-(family-name:--f-titulo) uppercase tracking-[-0.01em]";
const CONTEUDO = "mx-auto w-full max-w-[1360px] px-5 md:px-12";

// Tamanho e largura do nome por faixa de comprimento: no máximo 2 linhas.
const TAMANHO_DO_NOME: Record<FaixaDoNome, string> = {
  curto: "text-[clamp(4rem,13vw,11rem)] max-w-[12ch] leading-[0.86]",
  medio: "text-[clamp(3.25rem,9.5vw,8.5rem)] max-w-[16ch] leading-[0.88]",
  longo: "text-[clamp(2.5rem,7vw,6.75rem)] max-w-[22ch] leading-[0.92]",
  muitoLongo: "text-[clamp(1.6rem,4.4vw,4rem)] max-w-[32ch] leading-[0.92]",
};

// Cores do quadro (marinho pintado). Ficam aqui, como variáveis, e não soltas nas classes.
const QUADRO = {
  "--quadro": "var(--l-texto)",
  "--quadro-linha": "#1A2B4C",
  "--quadro-texto": "#F3F4F1",
  "--quadro-suave": "#C9D0DD",
  "--quadro-realce": "#22365E",
} as CSSProperties;

/** "R$ 45,00" → "R$ 45" (o quadro mostra só reais quando não há centavos). */
function precoDoQuadro(preco: string): string {
  return preco.replace(/,00$/, "");
}

/** Junta dias seguidos com o mesmo horário: "seg a sex · 09:00–19:00". */
function semanaPintada(semana: DiaVitrine[]): { dias: string; texto: string; hoje: boolean }[] {
  const grupos: { de: DiaVitrine; ate: DiaVitrine; texto: string; hoje: boolean }[] = [];
  for (const d of semana) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.texto === d.texto) {
      ultimo.ate = d;
      ultimo.hoje ||= d.hoje;
    } else grupos.push({ de: d, ate: d, texto: d.texto, hoje: d.hoje });
  }
  return grupos.map((g) => ({ dias: g.de === g.ate ? g.de.curto : `${g.de.curto} a ${g.ate.curto}`, texto: g.texto, hoje: g.hoje }));
}

function Poste({ direcao, gira, className = "" }: { direcao: "vertical" | "horizontal"; gira: boolean; className?: string }) {
  return <div aria-hidden className={`${css.poste} ${css[direcao]} ${gira ? css.gira : ""} ${className}`} />;
}

function Capa({ v }: { v: Vitrine }) {
  const p = v.proxima;
  // Os outros horários livres do mesmo serviço, logo ao lado do principal.
  const outras = p ? (v.servicos.find((s) => s.id === p.servicoId)?.proximas.filter((o) => o.href !== p.href).slice(0, 2) ?? []) : [];
  return (
    <section className="relative" aria-label="Próximo horário">
      <Poste direcao="vertical" gira={v.agora.aberto} className="absolute inset-y-0 left-0 hidden w-5 md:block lg:w-8" />
      <div className={`${CONTEUDO} pt-10 pb-16 md:pt-14 md:pb-24 md:pl-20 lg:pl-24`}>
        <p className={`${css.sobe} flex items-center gap-2.5 text-[16px] font-medium`} style={{ "--ordem": 0 } as CSSProperties}>
          <span aria-hidden className={`size-2.5 ${v.agora.aberto ? "bg-(--marca)" : "bg-(--l-suave)"}`} />
          {v.agora.texto}
        </p>
        <h1 className={`${LETREIRO} ${css.sobe} ${TAMANHO_DO_NOME[faixaDoNome(v.loja.nome)]} mt-5 pt-[0.06em] font-extrabold text-balance`} style={{ "--ordem": 1 } as CSSProperties}>
          {v.loja.nome}
        </h1>
        {v.chamada ? (
          <p className={`${css.sobe} mt-6 max-w-[34rem] text-lg text-pretty text-(--l-suave) md:text-xl`} style={{ "--ordem": 2 } as CSSProperties}>
            {v.chamada}
          </p>
        ) : null}

        <div className="mt-12 grid gap-6 md:mt-16 lg:grid-cols-12 lg:items-end lg:gap-8">
          {p ? (
            <>
              <div className={`${css.sobe} lg:col-span-7`} style={{ "--ordem": 3 } as CSSProperties}>
                <p className="text-[17px] font-medium">Próxima cadeira livre</p>
                <p className={`${LETREIRO} mt-3 font-black tabular-nums`}>
                  <span className="block text-[clamp(2.25rem,5vw,4.5rem)] leading-none">{p.dia}</span>
                  <span className="mt-1 block text-[clamp(5.5rem,17vw,14rem)] leading-[0.82]">{p.hora}</span>
                </p>
              </div>
              <div className={`${css.sobe} flex flex-col gap-4 lg:col-span-5 lg:pb-3`} style={{ "--ordem": 4 } as CSSProperties}>
                <p className="text-lg">
                  para <strong className="font-semibold">{p.servico}</strong>
                </p>
                <div className="flex flex-col gap-x-6 gap-y-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {/* No celular, a barra fixa embaixo é o botão de reservar; aqui ele só aparece do tablet para cima. */}
                  <a
                    href={p.href}
                    className={`hidden min-h-14 items-center justify-center bg-(--marca) px-7 text-[17px] font-semibold text-(--marca-texto) transition-transform duration-150 active:scale-[0.98] md:inline-flex ${FOCO}`}
                  >
                    Reservar {p.hora}
                  </a>
                  <a href={v.agendarHref} className={`inline-flex min-h-12 items-center text-[17px] font-semibold underline decoration-2 underline-offset-[6px] ${FOCO}`}>
                    Ver todos os horários
                  </a>
                </div>
                {outras.length ? (
                  <p className="flex flex-wrap items-center gap-x-1 text-[16px] text-(--l-suave)">
                    Também livre:
                    {outras.map((o) => (
                      <a key={o.href} href={o.href} className={`inline-flex min-h-11 items-center px-1.5 font-semibold text-(--l-texto) tabular-nums underline underline-offset-4 ${FOCO}`}>
                        {o.dia === p.dia ? o.hora : `${o.dia.toLowerCase()} ${o.hora}`}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-5 lg:col-span-12">
              <p className={`${LETREIRO} text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] font-black`}>Agenda cheia nos próximos dias</p>
              {v.contato.whatsapp ? (
                <a href={v.contato.whatsapp.href} className={`inline-flex min-h-14 items-center justify-center self-start bg-(--marca) px-7 text-[17px] font-semibold text-(--marca-texto) ${FOCO}`}>
                  Chamar no WhatsApp
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** O quadro da parede: preços, a placa ABERTO/FECHADO e o horário da semana pintado embaixo. */
function Quadro({ v }: { v: Vitrine }) {
  const primeira = v.proxima ? `${v.proxima.data} ${v.proxima.hora}` : null;
  const hoje = v.semana.find((d) => d.hoje);
  return (
    <section id="servicos" className={`${CONTEUDO} scroll-mt-6`} aria-labelledby="titulo-servicos">
      <div className="bg-(--quadro) text-(--quadro-texto)" style={QUADRO}>
        <div className="flex flex-col gap-6 px-5 pt-8 pb-6 md:flex-row md:items-end md:justify-between md:px-10 md:pt-12">
          <div>
            <h2 id="titulo-servicos" className={`${LETREIRO} text-[clamp(3rem,6.4vw,6rem)] leading-[0.88] font-extrabold`}>
              Tabela de preços
            </h2>
            <p className="mt-4 max-w-[26rem] text-[17px] text-(--quadro-suave)">Escolha um serviço para ver o dia e a hora.</p>
          </div>
          {/* A placa da porta: acesa (cor da loja) quando está aberto. */}
          <p className={`flex flex-col items-start gap-1 self-start px-5 py-3 md:items-end md:self-auto ${v.agora.aberto ? "bg-(--marca) text-(--marca-texto)" : "ring-2 ring-(--quadro-suave)"}`}>
            <span className={`${LETREIRO} text-[2.25rem] leading-none font-black`}>{v.agora.aberto ? "Aberto" : "Fechado"}</span>
            <span className="text-[15px] font-medium">{hoje?.aberto ? `Hoje ${hoje.texto}` : "Hoje fechado"}</span>
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12">
          {v.servicos.length === 0 ? (
            <p className="px-5 py-8 text-lg md:px-10 lg:col-span-8">A loja ainda está cadastrando os serviços. Fale com ela pelo WhatsApp para agendar.</p>
          ) : (
            <ul className="lg:col-span-8">
              {v.servicos.map((s) => {
                const vaga = s.proximas[0];
                // O próximo horário só aparece quando é diferente do primeiro da loja (senão repete em todas as linhas).
                const outro = vaga && `${vaga.data} ${vaga.hora}` !== primeira ? `livre ${vaga.dia.toLowerCase()} ${vaga.hora}` : !vaga ? "sem vaga nos próximos dias" : null;
                return (
                  <li key={s.id} className="odd:bg-(--quadro-linha)">
                    <a href={s.href} className={`${css.linha} grid grid-cols-[1fr_auto] items-baseline gap-x-5 px-5 py-6 transition-colors hover:bg-(--quadro-realce) md:px-10 md:py-7 ${FOCO}`}>
                      <span className={`${LETREIRO} text-[clamp(1.75rem,3vw,2.75rem)] leading-[0.95] font-bold`}>{s.nome}</span>
                      <span className={`${LETREIRO} flex items-baseline gap-3 text-[clamp(1.75rem,3vw,2.75rem)] leading-none font-bold tabular-nums`}>
                        {precoDoQuadro(s.preco)}
                        <span aria-hidden className={`${css.seta} inline-block text-[0.7em]`}>
                          →
                        </span>
                      </span>
                      <span className="col-span-2 mt-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[15px] text-(--quadro-suave)">
                        <span>
                          {s.duracao}
                          {s.descricao ? ` · ${s.descricao}` : ""}
                        </span>
                        {outro ? <span className="font-medium text-(--quadro-texto)">{outro}</span> : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-5 pt-8 pb-10 md:px-10 lg:col-span-4 lg:pt-6">
            <div className="lg:sticky lg:top-6">
            <h3 className={`${LETREIRO} text-[2rem] leading-none font-extrabold`}>Horário</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {semanaPintada(v.semana).map((g) => (
                <li key={g.dias} className={`grid grid-cols-[7.5rem_1fr] items-baseline gap-x-3 ${g.texto === "Fechado" ? "text-(--quadro-suave)" : ""}`}>
                  <span className={`${LETREIRO} text-[1.5rem] leading-none font-bold`}>
                    {g.dias}
                    {g.hoje ? <span className="sr-only"> (inclui hoje)</span> : null}
                  </span>
                  {/* Cada turno inteiro numa linha: "13:30–19:00" nunca quebra no meio. */}
                  <span className={`flex flex-wrap gap-x-3 text-[16px] tabular-nums ${g.hoje ? "font-semibold" : ""}`}>
                    {g.texto.split(" · ").map((turno) => (
                      <span key={turno} className="whitespace-nowrap">
                        {turno}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cadeiras({ v }: { v: Vitrine }) {
  if (!v.equipe.length) return null;
  const todasFazemTudo = v.equipe.length > 1 && v.equipe.every((p) => p.servicos.length === v.servicos.length);
  // Todas com a mesma próxima vaga: dizer uma vez só, e cada cadeira vira "Reservar com …".
  const primeira = v.equipe[0]?.proxima;
  const mesmaVaga = v.equipe.length > 1 && v.equipe.every((p) => p.proxima && p.proxima.data === primeira?.data && p.proxima.hora === primeira?.hora);
  const resumo = [todasFazemTudo ? "Todas as cadeiras fazem todos os serviços da tabela" : null, mesmaVaga ? `todas livres ${primeira!.dia.toLowerCase()} às ${primeira!.hora}` : null].filter(Boolean);
  return (
    <section id="cadeiras" className={`${CONTEUDO} scroll-mt-6`} aria-labelledby="titulo-equipe">
      <h2 id="titulo-equipe" className={`${LETREIRO} text-[clamp(3rem,6.4vw,6rem)] leading-[0.88] font-extrabold`}>
        Cadeiras
      </h2>
      {resumo.length ? <p className="mt-4 text-[17px] text-(--l-suave)">{resumo.join(", ")}.</p> : null}
      <ul className="mt-10 grid gap-x-12 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {v.equipe.map((p) => (
          <li key={p.id} className="flex flex-col gap-3">
            <h3 className={`${LETREIRO} text-[clamp(2.5rem,4.6vw,4.25rem)] leading-[0.9] font-extrabold`}>{p.nome}</h3>
            {todasFazemTudo ? null : <p className="text-[16px] text-(--l-suave)">{p.servicos.length === v.servicos.length ? "Todos os serviços da tabela" : p.servicos.join(" · ")}</p>}
            {p.proxima ? (
              <a href={p.proxima.href} className={`inline-flex min-h-11 items-center gap-2 self-start text-[17px] font-semibold underline decoration-2 underline-offset-[6px] ${FOCO}`}>
                {mesmaVaga ? (
                  <>
                    Reservar com {p.nome}
                    <span className="sr-only">
                      , {p.proxima.dia.toLowerCase()} às {p.proxima.hora}
                    </span>
                  </>
                ) : (
                  <>
                    Cadeira livre {p.proxima.dia.toLowerCase()} às {p.proxima.hora}
                    <span className="sr-only"> com {p.nome}</span>
                  </>
                )}
                <span aria-hidden>→</span>
              </a>
            ) : (
              <p className="text-[16px]">Sem vaga nos próximos dias</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A placa da porta: endereço e contatos, no rodapé. */
function Placa({ v }: { v: Vitrine }) {
  const { whatsapp, instagram, mapa } = v.contato;
  if (!v.endereco && !whatsapp && !instagram) return null;
  const link = `inline-flex min-h-12 items-center gap-2 text-xl font-semibold underline decoration-2 underline-offset-[6px] ${FOCO}`;
  return (
    <section id="endereco" className={`${CONTEUDO} scroll-mt-6`} aria-labelledby="titulo-endereco">
      <div className="bg-(--l-superficie) p-6 ring-4 ring-(--l-texto) ring-inset md:p-12">
        <h2 id="titulo-endereco" className="sr-only">
          Endereço e contato
        </h2>
        {v.endereco ? <p className={`${LETREIRO} max-w-[22ch] pt-[0.06em] text-[clamp(2.25rem,5.2vw,4.75rem)] leading-[0.92] font-extrabold text-balance`}>{v.endereco}</p> : null}
        <div className="mt-8 flex flex-col gap-x-10 gap-y-1 sm:flex-row sm:flex-wrap">
          {mapa ? (
            <a href={mapa} target="_blank" rel="noreferrer" className={link}>
              Abrir no mapa <span aria-hidden>↗</span>
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
      </div>
    </section>
  );
}

export function InicioLetreiro({ v }: { v: Vitrine }) {
  const nav = `inline-flex min-h-11 items-center text-[15px] font-medium hover:underline hover:underline-offset-4 ${FOCO}`;
  const faixa = faixaDoNome(v.loja.nome);
  // Rodapé: o nome ocupa a largura toda, com tamanho pelo comprimento e um piso legível.
  // Nome longo ou muito longo pode ir a duas linhas.
  const tamanhoRodape = faixa === "muitoLongo" || faixa === "longo" ? "clamp(2rem, 7vw, 6rem)" : `clamp(2rem, ${(88 / Math.max(v.loja.nome.length * 0.5, 4)).toFixed(2)}vw, 13rem)`;
  const temPlaca = Boolean(v.endereco || v.contato.whatsapp || v.contato.instagram);
  return (
    <>
      <header className={`${CONTEUDO} flex min-h-18 items-center justify-between gap-6 md:min-h-22`}>
        <a href="/" aria-label={`${v.loja.nome}, início`} className={`${LETREIRO} flex min-h-11 items-center leading-none font-extrabold ${FOCO}`}>
          {/* O monograma, como a placa pequena da porta; o nome inteiro é o título logo abaixo. */}
          <span aria-hidden className="flex size-11 items-center justify-center bg-(--l-texto) pt-[0.06em] text-[1.375rem] text-(--l-fundo)">
            {v.loja.iniciais}
          </span>
        </a>
        <nav aria-label="Seções" className="hidden items-center gap-8 md:flex">
          <a href="#servicos" className={nav}>
            Preços e horário
          </a>
          {v.equipe.length ? (
            <a href="#cadeiras" className={nav}>
              Cadeiras
            </a>
          ) : null}
          {temPlaca ? (
            <a href="#endereco" className={nav}>
              Endereço
            </a>
          ) : null}
        </nav>
        <a href={v.agendarHref} className={`inline-flex h-11 shrink-0 items-center px-5 text-[15px] font-semibold ring-2 ring-(--l-texto) ring-inset active:scale-[0.98] ${FOCO}`}>
          Agendar
        </a>
      </header>
      <Poste direcao="horizontal" gira={v.agora.aberto} className="relative h-3.5 md:hidden" />

      <main id="conteudo" className="flex flex-col gap-24 pb-24 md:gap-36 md:pb-32">
        <Capa v={v} />
        <Quadro v={v} />
        <Cadeiras v={v} />
        <Placa v={v} />
      </main>

      <footer className="pb-20 md:pb-0">
        <p
          aria-hidden
          className={`${CONTEUDO} ${LETREIRO} overflow-x-clip pt-[0.08em] leading-[0.9] font-black ${faixa === "muitoLongo" || faixa === "longo" ? "text-balance" : "whitespace-nowrap"}`}
          style={{ fontSize: tamanhoRodape }}
        >
          {v.loja.nome}
        </p>
        <p className={`${CONTEUDO} py-6 text-[14px] text-(--l-suave)`}>Agenda online por {v.marca}</p>
        <Poste direcao="horizontal" gira={false} className="relative h-3" />
      </footer>

      <div className={`${css.barraFixa} fixed inset-x-0 bottom-0 z-20 bg-(--marca) pb-[env(safe-area-inset-bottom)] md:hidden`}>
        <a href={v.proxima?.href ?? v.agendarHref} className={`flex min-h-16 items-center justify-center px-5 text-[17px] font-semibold text-(--marca-texto) ${FOCO}`}>
          {v.proxima ? `Reservar ${v.proxima.dia.toLowerCase()} às ${v.proxima.hora}` : "Agendar horário"}
        </a>
      </div>
    </>
  );
}
