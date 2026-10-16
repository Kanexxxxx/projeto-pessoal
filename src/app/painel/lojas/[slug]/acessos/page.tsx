import { BotaoAcao, FormularioAcao } from "@/componentes/acoes";
import { Campo, Selecao } from "@/componentes/formulario";
import { contexto } from "@/servidor/acesso";
import { equipeDaLoja, NOMES_PAPEIS } from "@/servidor/lojas/equipe";
import { exigirAcessoLoja } from "@/servidor/sessao";
import { cancelarConviteAcao, convidarAcao, revogarAcao } from "../../acoes";

export const dynamic = "force-dynamic";

const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function PaginaAcessos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { acesso } = await exigirAcessoLoja(slug, ["operador", "dona"]);
  const { loja } = acesso;
  const { membros, pendentes } = await equipeDaLoja(contexto().db, loja.id);
  const operador = acesso.papel === "operador";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Quem acessa o painel</h2>
          <p className="text-sm text-(--suave)">A dona configura tudo. A equipe vê e altera só a agenda. O plano básico inclui a dona e até 2 pessoas da equipe.</p>
          {membros.length === 0 ? <p className="text-(--suave)">Ninguém ainda.</p> : null}
          <ul className="flex flex-col gap-3">
            {membros.map((m) => (
              <li key={m.usuarioId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--borda) p-4">
                <div>
                  <p className="font-medium">
                    {m.nome} <span className="ml-1 rounded-full border border-(--borda) px-2 py-0.5 text-xs font-normal">{NOMES_PAPEIS[m.papel]}</span>
                  </p>
                  <p className="text-sm text-(--suave)">
                    {m.email} · desde {data.format(m.desde)}
                  </p>
                </div>
                {m.usuarioId !== acesso.usuarioId && (operador || m.papel === "funcionario") ? (
                  <BotaoAcao acao={revogarAcao} campos={{ loja: loja.slug, usuario: m.usuarioId }} rotulo="Remover acesso" perigo confirmar={`Remover o acesso de ${m.nome}? A pessoa sai do painel desta loja na hora.`} />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        {pendentes.length ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Convites pendentes</h2>
            <ul className="flex flex-col gap-3">
              {pendentes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-(--borda) p-4">
                  <div>
                    <p className="font-medium">{c.email}</p>
                    <p className="text-sm text-(--suave)">
                      {NOMES_PAPEIS[c.papel]} · vale até {data.format(c.expiraEm)}
                    </p>
                  </div>
                  {operador || c.papel === "funcionario" ? <BotaoAcao acao={cancelarConviteAcao} campos={{ loja: loja.slug, convite: c.id }} rotulo="Cancelar convite" /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <aside className="h-fit rounded-2xl border border-(--borda) p-5">
        <h2 className="mb-4 text-lg font-semibold">Convidar</h2>
        <FormularioAcao acao={convidarAcao} botao="Enviar convite" limpar>
          <input type="hidden" name="loja" value={loja.slug} />
          <Campo id="email" name="email" type="email" rotulo="E-mail" required inputMode="email" autoComplete="off" />
          <Selecao id="papel" name="papel" rotulo="Papel" defaultValue={operador && !membros.some((m) => m.papel === "dona") ? "dona" : "funcionario"}>
            {operador ? <option value="dona">Dona (configura tudo)</option> : null}
            <option value="funcionario">Equipe (só agenda)</option>
          </Selecao>
          <p className="text-sm text-(--suave)">A pessoa recebe um link de uso único, válido por 72 horas, para criar a senha.</p>
        </FormularioAcao>
      </aside>
    </div>
  );
}
