import { sql, type Kysely } from "kysely";
import type { BD } from "../bd/tipos";
import { comLoja } from "./escopo";
import type { Loja } from "./lojas";

export type EstadoImplantacao = {
  servicos: number;
  profissionais: number;
  profissionaisComHorario: number;
  conteudo: boolean;
  whatsapp: boolean;
  donas: number;
  convitesDona: number;
};

/** O que falta para a loja ficar pronta: base da lista de "primeiros passos". */
export async function estadoDaImplantacao(db: Kysely<BD>, loja: Loja): Promise<EstadoImplantacao> {
  const loja_ = await comLoja(db, loja.id, async (trx) => {
    const contar = (q: { executeTakeFirstOrThrow(): Promise<{ n: number }> }) => q.executeTakeFirstOrThrow().then((r) => r.n);
    const n = sql<number>`count(*)::int`.as("n");
    const [servicos, profissionais, comHorario, donas, config] = await Promise.all([
      contar(trx.selectFrom("servicos").select(n).where("ativo", "=", true)),
      contar(trx.selectFrom("profissionais").select(n).where("ativo", "=", true)),
      contar(
        trx
          .selectFrom("profissionais")
          .select(n)
          .where("ativo", "=", true)
          .where((eb) => eb.exists(eb.selectFrom("expedientes").select("id").whereRef("expedientes.profissional_id", "=", "profissionais.id"))),
      ),
      contar(trx.selectFrom("membros_loja").select(n).where("papel", "=", "dona").where("revogado_em", "is", null)),
      trx.selectFrom("config_loja").select(["chamada", "sobre", "whatsapp"]).executeTakeFirstOrThrow(),
    ]);
    return { servicos, profissionais, comHorario, donas, config };
  });
  const convites = await db
    .selectFrom("convites")
    .select(sql<number>`count(*)::int`.as("n"))
    .where("tenant_id", "=", loja.id)
    .where("papel", "=", "dona")
    .where("usado_em", "is", null)
    .where("revogado_em", "is", null)
    .where("expira_em", ">", sql<Date>`now()`)
    .executeTakeFirstOrThrow();
  return {
    servicos: loja_.servicos,
    profissionais: loja_.profissionais,
    profissionaisComHorario: loja_.comHorario,
    conteudo: Boolean(loja_.config.chamada || loja_.config.sobre),
    whatsapp: Boolean(loja_.config.whatsapp),
    donas: loja_.donas,
    convitesDona: convites.n,
  };
}
