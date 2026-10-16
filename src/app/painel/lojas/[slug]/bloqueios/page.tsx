import { BotaoAcao, FormularioAcao } from "@/componentes/acoes";
import { Campo, Selecao } from "@/componentes/formulario";
import { dataPorExtenso, hojeNoFuso, partesNoFuso, rotuloDeMinutos } from "@/dominio/datas";
import { contexto } from "@/servidor/acesso";
import { proximosBloqueios } from "@/servidor/lojas/agenda";
import { lerProfissionais } from "@/servidor/lojas/catalogo";
import { comLoja } from "@/servidor/lojas/escopo";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { criarBloqueioAcao, removerBloqueioAcao } from "../../acoes";

export const dynamic = "force-dynamic";

export default async function PaginaBloqueios({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug, ["operador", "dona"]);
  const { loja } = acesso;
  const { db } = contexto();
  const [bloqueios, profissionais] = await Promise.all([
    proximosBloqueios(db, loja),
    comLoja(db, loja.id, (trx) => lerProfissionais(trx, true)),
  ]);
  const quando = (d: Date) => {
    const p = partesNoFuso(d, loja.fuso);
    return { data: p.data, hora: rotuloDeMinutos(p.minutos) };
  };
  const hoje = hojeNoFuso(new Date(), loja.fuso);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Próximos bloqueios</h2>
        <p className="text-sm text-(--suave)">Folgas, feriados, cursos e compromissos. O site não oferece horário em período bloqueado.</p>
        {bloqueios.length === 0 ? <p className="text-(--suave)">Nenhum bloqueio programado.</p> : null}
        <ul className="flex flex-col gap-3">
          {bloqueios.map((b) => {
            const de = quando(b.inicio);
            const ate = quando(b.fim);
            const diaInteiro = de.hora === "00:00" && ate.hora === "00:00";
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--borda) p-4">
                <div>
                  <p className="font-medium first-letter:uppercase">
                    {diaInteiro
                      ? de.data === ate.data || (b.fim.getTime() - b.inicio.getTime()) / 3_600_000 <= 25
                        ? dataPorExtenso(de.data)
                        : `${dataPorExtenso(de.data)} até o fim de ${dataPorExtenso(ate.data)}`
                      : `${dataPorExtenso(de.data)}, ${de.hora}–${de.data === ate.data ? ate.hora : `${dataPorExtenso(ate.data)} ${ate.hora}`}`}
                  </p>
                  <p className="text-sm text-(--suave)">
                    {b.profissional ?? "Loja inteira"}
                    {b.motivo ? ` · ${b.motivo}` : ""}
                  </p>
                </div>
                <BotaoAcao acao={removerBloqueioAcao} campos={{ loja: loja.slug, id: b.id }} rotulo="Remover" confirmar="Remover este bloqueio? O horário volta a aparecer no site." />
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="h-fit rounded-2xl border border-(--borda) p-5">
        <h2 className="mb-4 text-lg font-semibold">Novo bloqueio</h2>
        <FormularioAcao acao={criarBloqueioAcao} botao="Bloquear" limpar>
          <input type="hidden" name="loja" value={loja.slug} />
          <Selecao id="profissional" name="profissional" rotulo="Quem" defaultValue="">
            <option value="">Loja inteira</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Selecao>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="data" name="data" type="date" rotulo="De (data)" defaultValue={hoje} min={hoje} required />
            <Campo id="ate_data" name="ate_data" type="date" rotulo="Até (data)" min={hoje} ajuda="Vazio = mesmo dia" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="dia_inteiro" defaultChecked className="size-4 accent-(--destaque)" />
            Dia inteiro
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="de" name="de" type="time" rotulo="Das" step={600} ajuda="Se não for o dia inteiro" />
            <Campo id="ate" name="ate" type="time" rotulo="Às" step={600} />
          </div>
          <Campo id="motivo" name="motivo" rotulo="Motivo (opcional)" maxLength={120} placeholder="Ex.: Feriado, curso" />
        </FormularioAcao>
      </aside>
    </div>
  );
}
