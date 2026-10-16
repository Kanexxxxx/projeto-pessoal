import { FormularioAcao } from "@/componentes/acoes";
import { AreaTexto, Campo, Selecao } from "@/componentes/formulario";
import { telefoneLegivel } from "@/dominio/contato";
import { contexto } from "@/servidor/acesso";
import { urlDaLoja } from "@/servidor/config";
import { lerConfig } from "@/servidor/lojas/catalogo";
import { comLoja } from "@/servidor/lojas/escopo";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { salvarSiteAcao } from "../../acoes";

export const dynamic = "force-dynamic";

const CORES = ["#7a4e2d", "#1f1b16", "#8c2f39", "#c2185b", "#6a1b9a", "#1565c0", "#00695c", "#2e7d32", "#b8860b"];

export default async function PaginaSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug, ["operador", "dona"]);
  const { loja } = acesso;
  const { db, config } = contexto();
  const cfg = await comLoja(db, loja.id, (trx) => lerConfig(trx));
  const url = urlDaLoja(config, loja.slug);

  return (
    <FormularioAcao acao={salvarSiteAcao} botao="Salvar site" className="grid gap-8 lg:grid-cols-2">
      <input type="hidden" name="loja" value={loja.slug} />
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Aparência</h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Modelo</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { valor: "classico", nome: "Clássico", desc: "Claro, com títulos em serifa. Acolhedor." },
              { valor: "contraste", nome: "Contraste", desc: "Escuro, letras fortes. Marcante." },
            ].map((m) => (
              <label key={m.valor} className="flex cursor-pointer flex-col gap-1 rounded-xl border border-(--borda) p-3 has-checked:border-(--destaque) has-checked:ring-1 has-checked:ring-(--destaque)">
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" name="modelo" value={m.valor} defaultChecked={cfg.modelo === m.valor} className="accent-(--destaque)" />
                  {m.nome}
                </span>
                <span className="text-sm text-(--suave)">{m.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Cor da marca</legend>
          <div className="flex flex-wrap items-center gap-2">
            {CORES.map((cor) => (
              <label key={cor} className="cursor-pointer">
                <input type="radio" name="cor" value={cor} defaultChecked={cfg.cor === cor} className="peer sr-only" />
                <span
                  className="block size-9 rounded-full border-2 border-transparent ring-offset-2 ring-offset-(--fundo) peer-checked:ring-2 peer-checked:ring-(--texto) peer-focus-visible:ring-2 peer-focus-visible:ring-(--destaque)"
                  style={{ background: cor }}
                />
                <span className="sr-only">{cor}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="cor" value={cfg.cor} defaultChecked={!CORES.includes(cfg.cor)} className="accent-(--destaque)" />
              Atual ({cfg.cor})
            </label>
          </div>
          <p className="text-sm text-(--suave)">O texto dos botões fica claro ou escuro automaticamente, para continuar legível.</p>
        </fieldset>

        <h2 className="mt-2 text-lg font-semibold">Conteúdo</h2>
        <Campo id="chamada" name="chamada" rotulo="Chamada principal" maxLength={120} defaultValue={cfg.chamada ?? ""} placeholder="Ex.: Corte e barba com hora marcada" />
        <AreaTexto id="sobre" name="sobre" rotulo="Sobre a loja" maxLength={1200} rows={5} defaultValue={cfg.sobre ?? ""} placeholder="Quem é, o que faz de diferente, há quanto tempo atende." />
        <Campo id="endereco" name="endereco" rotulo="Endereço" maxLength={200} defaultValue={cfg.endereco ?? ""} placeholder="Rua, número — bairro, cidade" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="whatsapp"
            name="whatsapp"
            rotulo="WhatsApp da loja"
            type="tel"
            inputMode="tel"
            defaultValue={cfg.whatsapp ? telefoneLegivel(cfg.whatsapp) : ""}
            placeholder="(DDD) 9 0000-0000"
            ajuda="Botão “Falar no WhatsApp” do site."
          />
          <Campo id="instagram" name="instagram" rotulo="Instagram" defaultValue={cfg.instagram ? `@${cfg.instagram}` : ""} placeholder="@sualoja" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Regras da agenda online</h2>
        <Selecao id="passo" name="passo" rotulo="Horários oferecidos a cada" defaultValue={String(cfg.passo_min)}>
          {[10, 15, 20, 30, 60].map((m) => (
            <option key={m} value={m}>
              {m === 60 ? "1 hora (só horas cheias)" : `${m} minutos`}
            </option>
          ))}
        </Selecao>
        <Campo id="intervalo" name="intervalo" rotulo="Intervalo entre clientes (min)" type="number" min={0} max={120} step={5} defaultValue={cfg.intervalo_min} ajuda="Tempo de limpeza ou preparo depois de cada atendimento." />
        <Selecao id="antecedencia" name="antecedencia" rotulo="Antecedência mínima" defaultValue={String(cfg.antecedencia_min)}>
          {[
            [0, "Nenhuma"],
            [30, "30 minutos"],
            [60, "1 hora"],
            [120, "2 horas"],
            [240, "4 horas"],
            [720, "12 horas"],
            [1440, "1 dia"],
            [2880, "2 dias"],
          ].map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </Selecao>
        <Campo id="horizonte" name="horizonte" rotulo="Agenda aberta para os próximos (dias)" type="number" min={1} max={180} defaultValue={cfg.horizonte_dias} />
        <div className="rounded-xl border border-(--borda) p-4 text-sm">
          <p className="font-medium">Ver como o cliente vê</p>
          <a href={url} target="_blank" rel="noreferrer" className="break-all text-(--destaque) underline underline-offset-4">
            {url.replace(/^https?:\/\//, "")} ↗
          </a>
        </div>
      </section>
    </FormularioAcao>
  );
}
