import { formatarPreco, linkWhatsApp, telefoneLegivel } from "@/dominio/contato";
import { nomeDoDia } from "@/dominio/datas";
import { SEGMENTOS } from "@/servidor/lojas/lojas";
import type { DadosSite } from "@/servidor/lojas/site";
import { linkMapa } from "./dados";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

/**
 * Modelo "Contraste": fundo escuro, tipografia pesada em caixa alta e a cor da
 * marca como acento — pensado para barbearia e estúdio com identidade forte.
 */
export function ModeloContraste({ site, diaHoje, marca }: { site: DadosSite; diaHoje: number; marca: string }) {
  const { loja, config, servicos, profissionais, horario } = site;
  const zap = config.whatsapp ? linkWhatsApp(config.whatsapp, `Olá, ${loja.nome}! Vim pelo site.`) : null;
  const abertoHoje = horario.find((h) => h.dia === diaHoje)?.faixas ?? [];

  return (
    <>
      <main>
        <section className="relative flex min-h-[88svh] flex-col justify-end overflow-hidden px-4 pt-24 pb-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--marca) 35%, transparent) 0%, transparent 55%), repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,0.025) 22px 23px)",
            }}
          />
          <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.3em] text-(--l-suave) uppercase">
              <span aria-hidden className="h-px w-10 bg-(--marca)" />
              {SEGMENTOS[loja.segmento].split(" (")[0]}
            </p>
            <h1 className="text-5xl leading-[0.95] font-black tracking-tight text-balance uppercase sm:text-7xl md:text-8xl">{loja.nome}</h1>
            {config.chamada ? <p className="max-w-xl text-lg text-pretty text-(--l-suave)">{config.chamada}</p> : null}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href="/agendar" className="bg-(--marca) px-7 py-4 text-sm font-bold tracking-widest text-(--marca-texto) uppercase outline-none focus-visible:ring-2 focus-visible:ring-(--marca) focus-visible:ring-offset-2 focus-visible:ring-offset-(--l-fundo)">
                Agendar horário
              </a>
              {zap ? (
                <a href={zap} target="_blank" rel="noreferrer" className="border border-(--l-borda) px-7 py-4 text-sm font-bold tracking-widest uppercase outline-none hover:border-(--marca) focus-visible:ring-2 focus-visible:ring-(--marca)">
                  WhatsApp
                </a>
              ) : null}
            </div>
            <p className="text-sm text-(--l-suave)">
              {abertoHoje.length ? (
                <>
                  <span className="mr-2 inline-block size-2 rounded-full bg-(--marca)" aria-hidden />
                  Hoje: {abertoHoje.join(" · ")}
                </>
              ) : (
                "Fechado hoje"
              )}
            </p>
          </div>
        </section>

        <section id="servicos" className="scroll-mt-4 border-t border-(--l-borda) px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-sm font-semibold tracking-[0.3em] text-(--l-suave) uppercase">Serviços</h2>
            {servicos.length === 0 ? <p className="text-(--l-suave)">Em breve.</p> : null}
            <ul className="grid gap-px overflow-hidden border border-(--l-borda) bg-(--l-borda) sm:grid-cols-2">
              {servicos.map((s) => (
                <li key={s.id} className="bg-(--l-fundo)">
                  <a href={`/agendar?servico=${s.id}`} className="group flex h-full flex-col justify-between gap-6 p-6 outline-none hover:bg-(--l-superficie) focus-visible:ring-2 focus-visible:ring-(--marca) focus-visible:ring-inset">
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold uppercase">{s.nome}</span>
                      {s.descricao ? <span className="text-sm text-(--l-suave)">{s.descricao}</span> : null}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-3xl font-black tabular-nums">{formatarPreco(s.precoCentavos)}</span>
                      <span className="text-sm text-(--l-suave)">
                        {s.duracaoMin} min <span className="ml-2 text-(--marca) transition-transform group-hover:translate-x-1 inline-block">→</span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-(--l-borda) px-4 py-16">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
            <div className="md:col-span-2">
              {config.sobre ? (
                <>
                  <h2 className="mb-4 text-sm font-semibold tracking-[0.3em] text-(--l-suave) uppercase">Sobre</h2>
                  <p className="text-lg leading-relaxed whitespace-pre-line">{config.sobre}</p>
                </>
              ) : null}
              {profissionais.length ? (
                <div className="mt-10">
                  <h2 className="mb-4 text-sm font-semibold tracking-[0.3em] text-(--l-suave) uppercase">Equipe</h2>
                  <ul className="flex flex-wrap gap-2">
                    {profissionais.map((p) => (
                      <li key={p.id} className="border border-(--l-borda) px-4 py-2 font-semibold uppercase">
                        {p.nome}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div id="horarios">
              <h2 className="mb-4 text-sm font-semibold tracking-[0.3em] text-(--l-suave) uppercase">Horários</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {ORDEM_DIAS.map((d) => {
                  const faixas = horario.find((h) => h.dia === d)?.faixas ?? [];
                  return (
                    <li key={d} className={`flex justify-between gap-4 ${d === diaHoje ? "font-bold text-(--marca)" : ""}`}>
                      <span className="capitalize">{nomeDoDia(d, true)}</span>
                      <span className={`tabular-nums ${faixas.length ? "" : "text-(--l-suave)"}`}>{faixas.length ? faixas.join(" · ") : "Fechado"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        <section id="contato" className="border-t border-(--l-borda) px-4 py-16">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2 text-lg">
              {config.endereco ? (
                <a href={linkMapa(config.endereco)} target="_blank" rel="noreferrer" className="underline decoration-(--marca) underline-offset-4">
                  {config.endereco}
                </a>
              ) : null}
              {config.whatsapp && zap ? (
                <a href={zap} target="_blank" rel="noreferrer" className="tabular-nums">
                  {telefoneLegivel(config.whatsapp)}
                </a>
              ) : null}
              {config.instagram ? (
                <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noreferrer">
                  @{config.instagram}
                </a>
              ) : null}
            </div>
            <a href="/agendar" className="self-start bg-(--marca) px-7 py-4 text-sm font-bold tracking-widest text-(--marca-texto) uppercase sm:self-auto">
              Agendar horário
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--l-borda) px-4 pt-8 pb-28 text-center text-xs tracking-widest text-(--l-suave) uppercase sm:pb-8">
        {loja.nome} · Agenda online por {marca}
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-(--l-borda) bg-(--l-fundo)/95 p-3 backdrop-blur sm:hidden">
        <a href="/agendar" className="block bg-(--marca) py-3.5 text-center text-sm font-bold tracking-widest text-(--marca-texto) uppercase">
          Agendar horário
        </a>
      </div>
    </>
  );
}
