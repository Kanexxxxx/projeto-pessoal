import { FormularioAcao } from "@/componentes/acoes";
import { Selecao } from "@/componentes/formulario";
import { contexto } from "@/servidor/acesso";
import { urlDaLoja } from "@/servidor/config";
import { resumoDaSemana } from "@/servidor/lojas/agenda";
import { estadoDaImplantacao } from "@/servidor/lojas/implantacao";
import { SITUACOES } from "@/servidor/lojas/lojas";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { mudarSituacaoAcao } from "../acoes";

export const dynamic = "force-dynamic";

function Passo({ feito, titulo, detalhe, href, acao }: { feito: boolean; titulo: string; detalhe: string; href: string; acao: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${feito ? "border-(--destaque) bg-(--destaque) text-(--fundo)" : "border-(--borda)"}`}
      >
        {feito ? "✓" : ""}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-medium">
          {titulo}
          <span className="sr-only">{feito ? " (feito)" : " (pendente)"}</span>
        </p>
        <p className="text-sm text-(--suave)">{detalhe}</p>
      </div>
      <a href={href} className="shrink-0 text-sm underline underline-offset-4">
        {acao}
      </a>
    </li>
  );
}

export default async function ResumoDaLoja({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug);
  const { loja } = acesso;
  const { db, config } = contexto();
  const base = `/lojas/${loja.slug}`;
  const [movimento, estado] = await Promise.all([resumoDaSemana(db, loja), estadoDaImplantacao(db, loja)]);
  const gestao = acesso.papel !== "funcionario";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <a href={`${base}/agenda`} className="rounded-2xl border border-(--borda) p-5 outline-none hover:border-(--destaque) focus-visible:ring-2 focus-visible:ring-(--destaque)">
            <p className="text-sm text-(--suave)">Hoje</p>
            <p className="text-3xl font-semibold">{movimento.hoje}</p>
            <p className="text-sm text-(--suave)">agendamento{movimento.hoje === 1 ? "" : "s"}</p>
          </a>
          <a href={`${base}/agenda`} className="rounded-2xl border border-(--borda) p-5 outline-none hover:border-(--destaque) focus-visible:ring-2 focus-visible:ring-(--destaque)">
            <p className="text-sm text-(--suave)">Próximos 7 dias</p>
            <p className="text-3xl font-semibold">{movimento.semana}</p>
            <p className="text-sm text-(--suave)">agendamento{movimento.semana === 1 ? "" : "s"}</p>
          </a>
        </div>

        {gestao ? (
          <div className="rounded-2xl border border-(--borda) p-5">
            <h2 className="text-lg font-semibold">Primeiros passos</h2>
            <ol className="divide-y divide-(--borda)">
              <Passo
                feito={estado.servicos > 0}
                titulo="Serviços e preços"
                detalhe={estado.servicos ? `${estado.servicos} serviço(s) no site.` : "Cadastre o que a loja oferece, com duração e preço."}
                href={`${base}/servicos`}
                acao={estado.servicos ? "Editar" : "Cadastrar"}
              />
              <Passo
                feito={estado.profissionais > 0 && estado.profissionaisComHorario === estado.profissionais}
                titulo="Profissionais e horários"
                detalhe={
                  estado.profissionais
                    ? `${estado.profissionaisComHorario} de ${estado.profissionais} profissional(is) com horário de trabalho.`
                    : "Quem atende e em que dias e horários."
                }
                href={`${base}/profissionais`}
                acao="Abrir"
              />
              <Passo
                feito={estado.conteudo && estado.whatsapp}
                titulo="Conteúdo do site"
                detalhe="Chamada, apresentação, endereço, WhatsApp e cor da marca."
                href={`${base}/site`}
                acao="Editar"
              />
              <Passo
                feito={estado.donas > 0}
                titulo="Acesso da dona"
                detalhe={estado.donas ? "A dona já tem acesso ao painel." : estado.convitesDona ? "Convite enviado, aguardando aceite." : "Convide a dona da loja por e-mail."}
                href={`${base}/acessos`}
                acao={estado.donas ? "Ver" : "Convidar"}
              />
              <Passo
                feito={loja.situacao === "ativa"}
                titulo="Colocar no ar"
                detalhe={loja.situacao === "ativa" ? "O site está no ar." : "Em implantação o site já funciona, com aviso de “em preparação”."}
                href={urlDaLoja(config, loja.slug)}
                acao="Ver site ↗"
              />
            </ol>
          </div>
        ) : null}
      </section>

      <aside className="flex flex-col gap-6">
        <div className="rounded-2xl border border-(--borda) p-5 text-sm">
          <h2 className="mb-2 font-semibold">Endereço do site</h2>
          <a href={urlDaLoja(config, loja.slug)} className="break-all text-(--destaque) underline underline-offset-4" target="_blank" rel="noreferrer">
            {urlDaLoja(config, loja.slug).replace(/^https?:\/\//, "")}
          </a>
          <p className="mt-2 text-(--suave)">É o link para a loja divulgar no Instagram e no WhatsApp.</p>
        </div>

        {acesso.papel === "operador" ? (
          <div className="rounded-2xl border border-(--borda) p-5">
            <h2 className="mb-3 font-semibold">Situação (operador)</h2>
            <FormularioAcao acao={mudarSituacaoAcao} botao="Atualizar">
              <input type="hidden" name="loja" value={loja.slug} />
              <Selecao id="situacao" name="situacao" rotulo="Situação da loja" defaultValue={loja.situacao}>
                {Object.entries(SITUACOES).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </Selecao>
            </FormularioAcao>
          </div>
        ) : null}

        {gestao ? (
          <div className="rounded-2xl border border-(--borda) p-5 text-sm">
            <h2 className="mb-2 font-semibold">Seus dados</h2>
            <p className="mb-3 text-(--suave)">Cópia completa da loja (serviços, horários, clientes e agendamentos) em JSON.</p>
            <a href={`${base}/exportar`} className="underline underline-offset-4">
              Baixar dados da loja
            </a>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
