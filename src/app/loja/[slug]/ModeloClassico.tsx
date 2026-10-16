import { formatarPreco, linkWhatsApp, telefoneLegivel } from "@/dominio/contato";
import { nomeDoDia } from "@/dominio/datas";
import { SEGMENTOS } from "@/servidor/lojas/lojas";
import type { DadosSite } from "@/servidor/lojas/site";
import { iniciais, linkMapa } from "./dados";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

/**
 * Modelo "Clássico": claro, títulos com serifa, serviços em lista com preço
 * alinhado — lembra o cardápio de um salão tradicional.
 */
export function ModeloClassico({ site, diaHoje, marca }: { site: DadosSite; diaHoje: number; marca: string }) {
  const { loja, config, servicos, profissionais, horario } = site;
  const zap = config.whatsapp ? linkWhatsApp(config.whatsapp, `Olá, ${loja.nome}! Vim pelo site.`) : null;
  const serif = "font-serif";

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-(--l-borda) bg-(--l-fundo)/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <a href="/" className={`${serif} text-lg font-semibold tracking-tight`}>
            {loja.nome}
          </a>
          <nav aria-label="Seções" className="hidden gap-6 text-sm text-(--l-suave) sm:flex">
            <a href="#servicos" className="hover:text-(--l-texto)">
              Serviços
            </a>
            <a href="#horarios" className="hover:text-(--l-texto)">
              Horários
            </a>
            <a href="#contato" className="hover:text-(--l-texto)">
              Contato
            </a>
          </nav>
          <a href="/agendar" className="rounded-full bg-(--marca) px-4 py-2 text-sm font-medium text-(--marca-texto) outline-none focus-visible:ring-2 focus-visible:ring-(--marca) focus-visible:ring-offset-2">
            Agendar
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 size-136 rounded-full opacity-[0.12]"
            style={{ background: "radial-gradient(circle, var(--marca) 0%, transparent 70%)" }}
          />
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-5">
              <p className="text-xs font-medium tracking-[0.2em] text-(--l-suave) uppercase">{SEGMENTOS[loja.segmento].split(" (")[0]}</p>
              <h1 className={`${serif} text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-6xl`}>{loja.nome}</h1>
              {config.chamada ? <p className="max-w-xl text-lg text-pretty text-(--l-suave)">{config.chamada}</p> : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <a href="/agendar" className="rounded-full bg-(--marca) px-6 py-3 font-medium text-(--marca-texto) outline-none focus-visible:ring-2 focus-visible:ring-(--marca) focus-visible:ring-offset-2">
                  Agendar horário
                </a>
                {zap ? (
                  <a href={zap} target="_blank" rel="noreferrer" className="rounded-full border border-(--l-borda) px-6 py-3 font-medium outline-none hover:border-(--marca) focus-visible:ring-2 focus-visible:ring-(--marca)">
                    Falar no WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
            <div
              aria-hidden
              className={`${serif} hidden size-56 items-center justify-center rounded-full border border-(--l-borda) text-7xl text-(--marca) md:flex`}
              style={{ background: "color-mix(in srgb, var(--marca) 8%, var(--l-superficie))" }}
            >
              {iniciais(loja.nome)}
            </div>
          </div>
        </section>

        <section id="servicos" className="scroll-mt-20 border-t border-(--l-borda) bg-(--l-superficie)">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className={`${serif} mb-8 text-center text-3xl font-semibold`}>Serviços</h2>
            {servicos.length === 0 ? <p className="text-center text-(--l-suave)">Em breve.</p> : null}
            <ul className="flex flex-col">
              {servicos.map((s) => (
                <li key={s.id}>
                  <a href={`/agendar?servico=${s.id}`} className="group flex flex-col gap-1 rounded-lg px-2 py-4 outline-none hover:bg-(--l-fundo) focus-visible:ring-2 focus-visible:ring-(--marca)">
                    <span className="flex items-baseline gap-3">
                      <span className="font-medium">{s.nome}</span>
                      <span aria-hidden className="flex-1 border-b border-dotted border-(--l-borda)" />
                      <span className="font-medium tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                    </span>
                    <span className="flex justify-between gap-3 text-sm text-(--l-suave)">
                      <span>
                        {s.descricao ? `${s.descricao} · ` : ""}
                        {s.duracaoMin} min
                      </span>
                      <span className="text-(--marca) opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Agendar →</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {profissionais.length || config.sobre ? (
          <section className="border-t border-(--l-borda)">
            <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2">
              {config.sobre ? (
                <div>
                  <h2 className={`${serif} mb-4 text-3xl font-semibold`}>Sobre</h2>
                  <p className="leading-relaxed whitespace-pre-line text-(--l-suave)">{config.sobre}</p>
                </div>
              ) : null}
              {profissionais.length ? (
                <div>
                  <h2 className={`${serif} mb-4 text-3xl font-semibold`}>Quem atende</h2>
                  <ul className="flex flex-wrap gap-4">
                    {profissionais.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex size-12 items-center justify-center rounded-full text-sm font-semibold text-(--marca)"
                          style={{ background: "color-mix(in srgb, var(--marca) 12%, var(--l-superficie))" }}
                        >
                          {iniciais(p.nome)}
                        </span>
                        <span className="font-medium">{p.nome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section id="horarios" className="scroll-mt-20 border-t border-(--l-borda) bg-(--l-superficie)">
          <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2">
            <div>
              <h2 className={`${serif} mb-6 text-3xl font-semibold`}>Horários</h2>
              <table className="w-full text-left">
                <caption className="sr-only">Horário de funcionamento</caption>
                <tbody>
                  {ORDEM_DIAS.map((d) => {
                    const faixas = horario.find((h) => h.dia === d)?.faixas ?? [];
                    const hoje = d === diaHoje;
                    return (
                      <tr key={d} className={`border-b border-(--l-borda) ${hoje ? "font-semibold" : ""}`}>
                        <th scope="row" className="py-2.5 pr-4 font-normal capitalize">
                          {nomeDoDia(d)}
                          {hoje ? <span className="ml-2 rounded-full bg-(--marca) px-2 py-0.5 text-xs text-(--marca-texto)">hoje</span> : null}
                        </th>
                        <td className={`py-2.5 text-right tabular-nums ${faixas.length ? "" : "text-(--l-suave)"}`}>{faixas.length ? faixas.join(" · ") : "Fechado"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div id="contato" className="scroll-mt-20">
              <h2 className={`${serif} mb-6 text-3xl font-semibold`}>Contato</h2>
              <dl className="flex flex-col gap-4">
                {config.endereco ? (
                  <div>
                    <dt className="text-sm text-(--l-suave)">Endereço</dt>
                    <dd>
                      <a href={linkMapa(config.endereco)} target="_blank" rel="noreferrer" className="underline decoration-(--l-borda) underline-offset-4 hover:decoration-(--marca)">
                        {config.endereco}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {config.whatsapp && zap ? (
                  <div>
                    <dt className="text-sm text-(--l-suave)">WhatsApp</dt>
                    <dd>
                      <a href={zap} target="_blank" rel="noreferrer" className="underline decoration-(--l-borda) underline-offset-4 hover:decoration-(--marca)">
                        {telefoneLegivel(config.whatsapp)}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {config.instagram ? (
                  <div>
                    <dt className="text-sm text-(--l-suave)">Instagram</dt>
                    <dd>
                      <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noreferrer" className="underline decoration-(--l-borda) underline-offset-4 hover:decoration-(--marca)">
                        @{config.instagram}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--l-borda) px-4 pt-8 pb-28 text-center text-sm text-(--l-suave) sm:pb-8">
        <p>
          {loja.nome} · Agenda online por {marca}
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-(--l-borda) bg-(--l-fundo)/95 p-3 backdrop-blur sm:hidden">
        <a href="/agendar" className="block rounded-full bg-(--marca) py-3 text-center font-medium text-(--marca-texto)">
          Agendar horário
        </a>
      </div>
    </>
  );
}
