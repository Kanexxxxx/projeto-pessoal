import type { CSSProperties } from "react";
import { faixaDoNome, FOCO, type FaixaDoNome } from "../estilo";
import type { ServicoVitrine, Vitrine } from "../tipos";
import { amostras, type Amostra } from "./amostras";
import css from "./paleta.module.css";

/**
 * Paleta (DESIGN.md §3): a cartela é a capa. Cada serviço é uma tampa de
 * esmalte; escolher a tampa abre o leque daquele serviço com os horários
 * livres. Sem JavaScript: as tampas são botões de opção e o painel aparece
 * por CSS (`:has`). A equipe e a semana também são tampas. Uma família só
 * (Bricolage Grotesque), tudo redondo.
 */

const CONTEUDO = "mx-auto w-full max-w-[1240px] px-5 md:px-10";
const TITULO = "font-(family-name:--f-titulo) font-extrabold tracking-[-0.025em] [font-stretch:90%]";
const TITULO_SECAO = `${TITULO} text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[0.98]`;
const REDONDO = `rounded-(--raio) ${FOCO}`;

const TAMANHO_DO_NOME: Record<FaixaDoNome, string> = {
  curto: "text-[clamp(3.5rem,9vw,8rem)]",
  medio: "text-[clamp(3rem,7.4vw,6.5rem)]",
  longo: "text-[clamp(2.4rem,6vw,4.75rem)]",
  muitoLongo: "text-[clamp(1.6rem,5.6vw,3rem)]",
};

/** Tamanho do nome do serviço na amostra da frente, pelo comprimento. */
function tamanhoNaAmostra(nome: string): string {
  if (nome.length <= 18) return "text-[clamp(2.25rem,3.4vw,3rem)]";
  if (nome.length <= 34) return "text-[clamp(1.75rem,2.6vw,2.25rem)]";
  return "text-[clamp(1.5rem,2vw,1.75rem)]";
}

const ordem = (n: number) => ({ "--ordem": n }) as CSSProperties;

function juntar(nomes: string[]): string {
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : (nomes[0] ?? "");
}

/** Um horário livre como tampa redonda: a hora em cima, o dia embaixo. */
function Bolinha({ hora, dia, href, cor }: { hora: string; dia: string; href: string; cor: Amostra }) {
  return (
    <a
      href={href}
      className={`${css.bolinha} flex size-[5.25rem] shrink-0 flex-col items-center justify-center rounded-full text-center ring-2 ring-(--l-texto) ${FOCO}`}
      style={{ "--cor": cor.fundo, "--cor-texto": cor.texto } as CSSProperties}
    >
      <span className="text-[19px] leading-none font-bold tabular-nums">{hora}</span>
      <span className="mt-1 text-[14px] leading-none font-medium">{dia}</span>
    </a>
  );
}

/** Painel do serviço escolhido: o leque com a amostra na frente e os horários livres logo abaixo. */
function Painel({ s, cor, atras, quem }: { s: ServicoVitrine; cor: Amostra; atras: Amostra[]; quem: string | null }) {
  const detalhe = [s.descricao, quem].filter(Boolean).join(" · ");
  return (
    <div className={`${css.painel} pt-6 md:pt-0`}>
      {/* A margem embaixo e à direita é o espaço que as amostras de trás ocupam ao girar. */}
      <div className={`${css.leque} relative mr-[22%] mb-8 max-w-[27rem] md:mr-[18%] lg:mb-12`}>
        {atras.map((c, i) => (
          <span key={i} aria-hidden className={`${css.atras} absolute inset-0 rounded-(--raio-bloco)`} style={{ background: c.fundo, "--n": i + 1 } as CSSProperties} />
        ))}
        <a
          href={s.href}
          className={`${css.frente} relative flex min-h-[12rem] flex-col justify-between gap-6 rounded-(--raio-bloco) p-6 outline-none focus-visible:ring-4 focus-visible:ring-(--anel) focus-visible:ring-inset md:min-h-[14rem] md:p-8`}
          style={{ background: cor.fundo, color: cor.texto, "--anel": cor.texto } as CSSProperties}
        >
          <span className="flex flex-col gap-3">
            <span className={`${TITULO} ${tamanhoNaAmostra(s.nome)} leading-[1.02] text-balance`}>{s.nome}</span>
            {detalhe ? <span className="max-w-[24rem] text-[16px] leading-snug text-pretty">{detalhe}</span> : null}
          </span>
          <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[17px] font-semibold">
            <span className="tabular-nums">
              {s.preco} · {s.duracao}
            </span>
            <span className="font-medium underline underline-offset-4">Escolher dia e hora</span>
          </span>
        </a>
      </div>
      {s.proximas.length ? (
        <div>
          <p className="text-[17px] font-semibold">Horários livres</p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {s.proximas.map((p) => (
              <li key={p.href}>
                <Bolinha hora={p.hora} dia={p.diaCurto} href={p.href} cor={cor} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[17px] font-medium">Sem horário livre nos próximos dias.</p>
      )}
    </div>
  );
}

/**
 * A cartela: uma tampa por serviço (botão de opção) e, logo depois de cada uma, o painel dela.
 * No celular as tampas são fichas que quebram linha e o painel vem depois de todas (não empurra a
 * lista ao trocar); a partir do tablet, lista à esquerda e painel à direita.
 */
function Cartela({ v, cores }: { v: Vitrine; cores: Amostra[] }) {
  if (!v.servicos.length) return <p className="text-lg">O estúdio ainda está montando a cartela de serviços. Fale com ele pelo WhatsApp.</p>;
  const n = v.servicos.length;
  return (
    <fieldset className={`${css.cartela} min-w-0`}>
      <legend>
        <h2 id="titulo-servicos" className={`${TITULO} text-[clamp(1.75rem,2.6vw,2.25rem)] leading-none`}>
          Escolha o serviço
        </h2>
      </legend>
      <div className={`${css.grade} mt-6`} style={{ "--linhas": n } as CSSProperties}>
        {v.servicos.map((s, i) => {
          const quem = v.equipe.filter((p) => p.servicos.includes(s.nome)).map((p) => p.nome);
          return (
            <div key={s.id} className="contents">
              <label
                className={`${css.tampa} flex min-h-12 cursor-pointer items-center gap-2.5 rounded-(--raio-bloco) py-1.5 pr-4 pl-1.5 md:min-h-14 md:gap-4 md:py-2 md:pr-5 md:pl-2`}
              >
                <input type="radio" name="cartela" value={s.id} defaultChecked={i === 0} className="sr-only" />
                <span aria-hidden className={`${css.cor} size-9 shrink-0 rounded-full md:size-10`} style={{ background: cores[i]!.fundo }} />
                <span className="min-w-0 flex-1 text-[16px] leading-tight font-semibold hyphens-auto md:text-[17px]">{s.nome}</span>
                <span className="hidden shrink-0 text-[16px] text-(--l-suave) tabular-nums md:inline">{s.preco}</span>
              </label>
              <Painel
                s={s}
                cor={cores[i]!}
                atras={[cores[(i + 1) % n]!, cores[(i + 2) % n]!].slice(0, Math.min(2, n - 1))}
                quem={quem.length && quem.length < v.equipe.length ? `com ${juntar(quem)}` : null}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function Capa({ v, cores }: { v: Vitrine; cores: Amostra[] }) {
  return (
    <section id="servicos" className={`${CONTEUDO} scroll-mt-6 pt-6 md:pt-12`} aria-labelledby="titulo-loja">
      <div className="grid gap-x-14 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 id="titulo-loja" className={`${TITULO} ${css.entra} ${TAMANHO_DO_NOME[faixaDoNome(v.loja.nome)]} leading-[0.94] text-balance lg:col-span-7`} style={ordem(0)}>
          {v.loja.nome}
        </h1>
        <div className={`${css.entra} flex flex-col items-start gap-6 lg:col-span-5 lg:pb-2`} style={ordem(1)}>
          {v.chamada ? <p className="max-w-[30rem] text-xl text-pretty text-(--l-suave)">{v.chamada}</p> : null}
          <p className="flex items-center gap-2.5 text-[17px] font-medium">
            <span aria-hidden className={`size-3 shrink-0 rounded-full ${v.agora.aberto ? "bg-(--marca)" : "bg-(--l-suave)"}`} />
            {v.agora.texto}
          </p>
          {v.proxima ? (
            <a href={v.proxima.href} className={`inline-flex min-h-14 items-center bg-(--marca) px-8 text-[17px] font-semibold text-(--marca-texto) active:scale-[0.98] ${REDONDO}`}>
              Reservar {v.proxima.dia.toLowerCase()} às {v.proxima.hora}
            </a>
          ) : v.contato.whatsapp ? (
            <a href={v.contato.whatsapp.href} className={`inline-flex min-h-14 items-center bg-(--marca) px-8 text-[17px] font-semibold text-(--marca-texto) ${REDONDO}`}>
              Chamar no WhatsApp
            </a>
          ) : null}
        </div>
      </div>
      <div className={`${css.entra} mt-12 md:mt-16`} style={ordem(2)}>
        <Cartela v={v} cores={cores} />
      </div>
    </section>
  );
}

/** A equipe e a semana como tampas: cada pessoa numa tampa de cor; cada dia aberto, uma tampa cheia. */
function QuemAtendeEQuando({ v, cores }: { v: Vitrine; cores: Amostra[] }) {
  const comEquipe = v.equipe.length > 0;
  return (
    <section id="quem-atende" className={`${CONTEUDO} scroll-mt-6`} aria-labelledby="titulo-quem">
      <div className="rounded-(--raio-bloco) bg-(--l-superficie) p-6 md:p-12">
        <h2 id="titulo-quem" className={TITULO_SECAO}>
          {comEquipe ? "Quem atende e quando" : "Quando abre"}
        </h2>
        {comEquipe ? (
          <ul className="mt-9 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {v.equipe.map((p, i) => {
              const cor = cores.at(-1 - i) ?? cores[0]!;
              return (
                <li key={p.id} className="flex items-start gap-4">
                  <span aria-hidden className={`${TITULO} flex size-18 shrink-0 items-center justify-center rounded-full text-[1.625rem]`} style={{ background: cor.fundo, color: cor.texto }}>
                    {p.iniciais}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                    <span className="text-[21px] leading-tight font-semibold">{p.nome}</span>
                    <span className="text-[16px] text-(--l-suave)">{p.servicos.length === v.servicos.length ? "Atende todos os serviços" : p.servicos.join(", ")}</span>
                    {p.proxima ? (
                      <a href={p.proxima.href} className={`inline-flex min-h-11 items-center self-start text-[17px] font-semibold underline underline-offset-4 ${FOCO}`}>
                        Livre {p.proxima.diaCurto.toLowerCase()}, {p.proxima.hora}
                        <span className="sr-only"> com {p.nome}</span>
                      </a>
                    ) : (
                      <span className="text-[16px]">Agenda cheia nos próximos dias</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className={comEquipe ? "mt-12" : "mt-8"}>
          <p className="flex items-center gap-2.5 text-[17px] font-semibold">
            <span aria-hidden className={`size-3 shrink-0 rounded-full ${v.agora.aberto ? "bg-(--marca)" : "bg-(--l-suave)"}`} />
            {v.agora.texto}
          </p>
          {/* A semana em tampas: dia aberto = tampa cheia na cor da cartela; fechado = só o contorno. */}
          <ul aria-label="Horário da semana" className="mt-6 grid grid-cols-4 gap-x-3 gap-y-6 sm:grid-cols-7">
            {v.semana.map((d, i) => {
              const cor = cores[i % cores.length]!;
              return (
                <li key={d.dia} className="flex flex-col items-center gap-2 text-center">
                  <span
                    aria-hidden
                    className={`${TITULO} flex size-14 items-center justify-center rounded-full text-[1.0625rem] md:size-16 ${d.hoje ? "outline-2 outline-offset-3 outline-(--l-texto)" : ""} ${
                      d.aberto ? "" : "text-(--l-suave) ring-2 ring-(--l-suave)/50 ring-inset"
                    }`}
                    style={d.aberto ? { background: cor.fundo, color: cor.texto } : undefined}
                  >
                    {d.curto}
                  </span>
                  <span className={`flex flex-col text-[14px] leading-snug tabular-nums ${d.aberto ? "" : "text-(--l-suave)"} ${d.hoje ? "font-bold" : ""}`}>
                    <span className="sr-only">
                      {d.nome}
                      {d.hoje ? " (hoje)" : ""}:{" "}
                    </span>
                    {/* Cada turno em duas linhas de propósito ("09:00" / "às 18:00"): a coluna do dia é estreita. */}
                    {d.aberto
                      ? d.texto.split(" · ").map((turno) => {
                          const [inicio, fim] = turno.split("–");
                          return (
                            <span key={turno} className="flex flex-col">
                              <span>{inicio}</span>
                              <span className="whitespace-nowrap">às {fim}</span>
                            </span>
                          );
                        })
                      : "Fechado"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function OndeFica({ v }: { v: Vitrine }) {
  const { whatsapp, instagram, mapa } = v.contato;
  if (!v.endereco && !whatsapp && !instagram) return null;
  const botao = `inline-flex min-h-12 items-center px-6 text-[17px] font-semibold ring-2 ring-(--l-texto) hover:bg-(--l-texto) hover:text-(--l-superficie) ${REDONDO}`;
  return (
    <section id="onde-fica" className={`${CONTEUDO} scroll-mt-6`} aria-labelledby="titulo-onde">
      <h2 id="titulo-onde" className={TITULO_SECAO}>
        Onde fica
      </h2>
      {v.endereco ? <p className="mt-6 max-w-[34rem] text-[clamp(1.375rem,2vw,1.75rem)] leading-snug text-pretty">{v.endereco}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        {mapa ? (
          <a href={mapa} target="_blank" rel="noreferrer" className={botao}>
            Como chegar
          </a>
        ) : null}
        {whatsapp ? (
          <a href={whatsapp.href} target="_blank" rel="noreferrer" className={botao}>
            WhatsApp {whatsapp.texto}
          </a>
        ) : null}
        {instagram ? (
          <a href={instagram.href} target="_blank" rel="noreferrer" className={botao}>
            {instagram.texto}
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** A marca do modelo: três tampas da cartela sobrepostas. */
function Tampinhas({ cores, tamanho = "size-7" }: { cores: Amostra[]; tamanho?: string }) {
  return (
    <span aria-hidden className="flex -space-x-2.5">
      {cores.map((c, i) => (
        <span key={i} className={`${tamanho} rounded-full ring-2 ring-(--l-fundo)`} style={{ background: c.fundo }} />
      ))}
    </span>
  );
}

export function InicioPaleta({ v }: { v: Vitrine }) {
  const cores = amostras(v.cor, Math.max(v.servicos.length, v.equipe.length, 7, 1));
  const nav = `inline-flex min-h-11 items-center px-1 text-[16px] font-medium hover:underline hover:underline-offset-4 ${FOCO}`;
  const temContato = Boolean(v.endereco || v.contato.whatsapp || v.contato.instagram);
  return (
    <>
      <header className={`${CONTEUDO} flex min-h-20 items-center justify-between gap-6`}>
        {/* A marca é a cartela (três tampas); o nome inteiro é o título logo abaixo. */}
        <a href="/" aria-label={`${v.loja.nome}, início`} className={`flex min-h-11 items-center px-1 ${REDONDO}`}>
          <Tampinhas cores={cores.slice(0, 3)} tamanho="size-8" />
        </a>
        <nav aria-label="Seções" className="hidden items-center gap-6 md:flex">
          <a href="#servicos" className={nav}>
            Serviços
          </a>
          <a href="#quem-atende" className={nav}>
            {v.equipe.length ? "Quem atende" : "Horários"}
          </a>
          {temContato ? (
            <a href="#onde-fica" className={nav}>
              Onde fica
            </a>
          ) : null}
        </nav>
        <a href={v.agendarHref} className={`inline-flex h-11 shrink-0 items-center px-5 text-[16px] font-semibold ring-2 ring-(--l-texto) ${REDONDO}`}>
          Agendar
        </a>
      </header>
      <main id="conteudo" className="flex flex-col gap-24 pb-24 md:gap-32">
        <Capa v={v} cores={cores} />
        <QuemAtendeEQuando v={v} cores={cores} />
        <OndeFica v={v} />
      </main>
      <footer className={`${CONTEUDO} flex flex-col items-start gap-4 pb-10 sm:flex-row sm:items-center sm:justify-between`}>
        <Tampinhas cores={cores.slice(0, 6)} />
        <p className="text-[15px] text-(--l-suave)">
          {v.loja.nome} · agenda online por {v.marca}
        </p>
      </footer>
    </>
  );
}
