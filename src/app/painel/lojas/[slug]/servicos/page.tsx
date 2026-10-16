import { BotaoAcao, FormularioAcao } from "@/componentes/acoes";
import { AreaTexto, Campo } from "@/componentes/formulario";
import { formatarPreco } from "@/dominio/contato";
import { contexto } from "@/servidor/acesso";
import { lerProfissionais, lerServicos, type Profissional, type Servico } from "@/servidor/lojas/catalogo";
import { comLoja } from "@/servidor/lojas/escopo";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { alternarServicoAcao, salvarServicoAcao } from "../../acoes";

export const dynamic = "force-dynamic";

function precoParaCampo(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function CamposServico({ slug, servico, profissionais }: { slug: string; servico?: Servico; profissionais: Profissional[] }) {
  const sufixo = servico?.id ?? "novo";
  return (
    <>
      <input type="hidden" name="loja" value={slug} />
      {servico ? <input type="hidden" name="id" value={servico.id} /> : null}
      <Campo id={`nome-${sufixo}`} name="nome" rotulo="Nome" required maxLength={80} defaultValue={servico?.nome} placeholder="Ex.: Corte masculino" />
      <div className="grid grid-cols-2 gap-4">
        <Campo
          id={`duracao-${sufixo}`}
          name="duracao"
          rotulo="Duração (min)"
          type="number"
          inputMode="numeric"
          min={5}
          max={600}
          step={5}
          required
          defaultValue={servico?.duracaoMin ?? 30}
        />
        <Campo
          id={`preco-${sufixo}`}
          name="preco"
          rotulo="Preço (R$)"
          inputMode="decimal"
          placeholder="Sob consulta"
          defaultValue={precoParaCampo(servico?.precoCentavos ?? null)}
        />
      </div>
      <AreaTexto id={`descricao-${sufixo}`} name="descricao" rotulo="Descrição (opcional)" maxLength={300} defaultValue={servico?.descricao ?? ""} />
      {profissionais.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Quem faz</legend>
          {profissionais.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="profissionais"
                value={p.id}
                defaultChecked={servico ? servico.profissionais.includes(p.id) : p.ativo}
                className="size-4 accent-(--destaque)"
              />
              {p.nome}
              {p.ativo ? "" : " (inativo)"}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm text-(--suave)">Cadastre os profissionais para dizer quem faz cada serviço.</p>
      )}
    </>
  );
}

export default async function PaginaServicos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug, ["operador", "dona"]);
  const { servicos, profissionais } = await comLoja(contexto().db, acesso.loja.id, async (trx) => ({
    servicos: await lerServicos(trx),
    profissionais: await lerProfissionais(trx),
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Serviços</h2>
        {servicos.length === 0 ? <p className="text-(--suave)">Nenhum serviço ainda. Comece pelo formulário ao lado.</p> : null}
        <ul className="flex flex-col gap-3">
          {servicos.map((s) => (
            <li key={s.id} className={`rounded-2xl border border-(--borda) p-4 ${s.ativo ? "" : "opacity-60"}`}>
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium">{s.nome}</span>
                    {s.ativo ? null : <span className="ml-2 text-xs text-(--suave)">(fora do site)</span>}
                    <span className="block text-sm text-(--suave)">
                      {s.duracaoMin} min · {s.profissionais.length} profissional(is)
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatarPreco(s.precoCentavos)}</span>
                    <span className="text-sm text-(--destaque) underline underline-offset-4">Editar</span>
                  </span>
                </summary>
                <div className="mt-4 flex flex-col gap-4 border-t border-(--borda) pt-4">
                  <FormularioAcao acao={salvarServicoAcao} botao="Salvar alterações">
                    <CamposServico slug={acesso.loja.slug} servico={s} profissionais={profissionais} />
                  </FormularioAcao>
                  <BotaoAcao
                    acao={alternarServicoAcao}
                    campos={{ loja: acesso.loja.slug, id: s.id }}
                    rotulo={s.ativo ? "Tirar do site" : "Voltar para o site"}
                    perigo={s.ativo}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <aside className="h-fit rounded-2xl border border-(--borda) p-5">
        <h2 className="mb-4 text-lg font-semibold">Novo serviço</h2>
        <FormularioAcao acao={salvarServicoAcao} botao="Incluir serviço" limpar>
          <CamposServico slug={acesso.loja.slug} profissionais={profissionais} />
        </FormularioAcao>
      </aside>
    </div>
  );
}
