import { sql, type Kysely } from "kysely";
import { registrarAuditoria } from "../auditoria";
import { criarConvite, normalizarEmail } from "../auth/convites";
import { urlComToken } from "../auth/instancia";
import type { BD, PapelNaLoja } from "../bd/tipos";
import type { Config } from "../config";
import type { Enviador } from "../email/enviador";
import { emailConvite } from "../email/modelos";
import { comLoja, UUID } from "./escopo";
import type { Acesso } from "./lojas";

export const NOMES_PAPEIS: Record<PapelNaLoja, string> = { dona: "Dona", funcionario: "Equipe" };

/** Plano básico (OFERTA.md §2): dona + até 2 pessoas da equipe. */
const MAXIMO_EQUIPE = 2;

/**
 * Quem pode convidar quem: o operador convida dona e equipe; a dona convida
 * equipe. Funcionário não convida ninguém e nunca ganha privilégio sozinho.
 */
export function podeConvidar(papelDeQuemConvida: Acesso["papel"], papelConvidado: PapelNaLoja): boolean {
  if (papelDeQuemConvida === "operador") return true;
  return papelDeQuemConvida === "dona" && papelConvidado === "funcionario";
}

export type ResultadoConvite = { ok: true } | { ok: false; erro: string };

export async function convidarParaLoja(
  c: { db: Kysely<BD>; config: Config; enviador: Enviador },
  p: { acesso: Acesso; email: string; papel: PapelNaLoja },
): Promise<ResultadoConvite> {
  if (!podeConvidar(p.acesso.papel, p.papel)) return { ok: false, erro: "Você não pode convidar para esse papel." };
  const email = normalizarEmail(p.email);
  if (!email) return { ok: false, erro: "Informe um e-mail válido." };
  const { loja } = p.acesso;

  const jaMembro = await comLoja(c.db, loja.id, (trx) =>
    trx
      .selectFrom("membros_loja")
      .innerJoin("user", "user.id", "membros_loja.usuario_id")
      .select("membros_loja.usuario_id")
      .where("user.email", "=", email)
      .where("membros_loja.revogado_em", "is", null)
      .executeTakeFirst(),
  );
  if (jaMembro) return { ok: false, erro: "Essa pessoa já tem acesso a esta loja." };

  if (p.papel === "funcionario") {
    const equipe = await comLoja(c.db, loja.id, (trx) =>
      trx
        .selectFrom("membros_loja")
        .select(sql<number>`count(*)::int`.as("n"))
        .where("papel", "=", "funcionario")
        .where("revogado_em", "is", null)
        .executeTakeFirstOrThrow(),
    );
    const pendentes = await c.db
      .selectFrom("convites")
      .select(sql<number>`count(*)::int`.as("n"))
      .where("tenant_id", "=", loja.id)
      .where("papel", "=", "funcionario")
      .where("email", "<>", email)
      .where("usado_em", "is", null)
      .where("revogado_em", "is", null)
      .where("expira_em", ">", sql<Date>`now()`)
      .executeTakeFirstOrThrow();
    if (equipe.n + pendentes.n >= MAXIMO_EQUIPE) {
      return { ok: false, erro: `O plano básico inclui até ${MAXIMO_EQUIPE} pessoas da equipe (contando convites pendentes).` };
    }
  }

  const { token, expiraEm } = await criarConvite(c.db, { email, papel: p.papel, tenantId: loja.id, criadoPor: p.acesso.usuarioId });
  await c.enviador.enviar(
    emailConvite({
      para: email,
      marca: c.config.marca,
      url: urlComToken(`${c.config.urlPainel}/convite`, token),
      expiraEm,
      papel: p.papel === "dona" ? `dona da loja ${loja.nome}` : `equipe da loja ${loja.nome}`,
    }),
  );
  return { ok: true };
}

export type MembroDaEquipe = { usuarioId: string; nome: string; email: string; papel: PapelNaLoja; desde: Date };
export type ConvitePendente = { id: string; email: string; papel: PapelNaLoja; expiraEm: Date };

export async function equipeDaLoja(db: Kysely<BD>, tenantId: string): Promise<{ membros: MembroDaEquipe[]; pendentes: ConvitePendente[] }> {
  const membros = await comLoja(db, tenantId, (trx) =>
    trx
      .selectFrom("membros_loja")
      .innerJoin("user", "user.id", "membros_loja.usuario_id")
      .select(["membros_loja.usuario_id as usuarioId", "user.name as nome", "user.email", "membros_loja.papel", "membros_loja.criado_em as desde"])
      .where("membros_loja.revogado_em", "is", null)
      .orderBy("membros_loja.papel")
      .orderBy("user.name")
      .execute(),
  );
  const pendentes = await db
    .selectFrom("convites")
    .select(["id", "email", "papel", "expira_em as expiraEm"])
    .where("tenant_id", "=", tenantId)
    .where("usado_em", "is", null)
    .where("revogado_em", "is", null)
    .where("expira_em", ">", sql<Date>`now()`)
    .orderBy("criado_em", "desc")
    .execute();
  return { membros, pendentes: pendentes as ConvitePendente[] };
}

/** A dona revoga a equipe; só o operador revoga uma dona. Ninguém revoga a si mesmo por aqui. */
export async function revogarAcesso(
  db: Kysely<BD>,
  p: { acesso: Acesso; usuarioId: string },
): Promise<ResultadoConvite> {
  if (p.usuarioId === p.acesso.usuarioId) return { ok: false, erro: "Você não pode remover o próprio acesso." };
  return comLoja(
    db,
    p.acesso.loja.id,
    async (trx) => {
      const alvo = await trx
        .selectFrom("membros_loja")
        .select("papel")
        .where("usuario_id", "=", p.usuarioId)
        .where("revogado_em", "is", null)
        .forUpdate()
        .executeTakeFirst();
      if (!alvo) return { ok: false, erro: "Acesso não encontrado." } as const;
      if (p.acesso.papel === "funcionario" || (p.acesso.papel === "dona" && alvo.papel === "dona")) {
        return { ok: false, erro: "Você não pode remover esse acesso." } as const;
      }
      await trx
        .updateTable("membros_loja")
        .set({ revogado_em: sql`now()` })
        .where("usuario_id", "=", p.usuarioId)
        .where("revogado_em", "is", null)
        .execute();
      await registrarAuditoria(trx, {
        acao: "loja.acesso_revogado",
        atorUsuarioId: p.acesso.usuarioId,
        tenantId: p.acesso.loja.id,
        alvo: p.usuarioId,
        detalhes: { papel: alvo.papel },
      });
      return { ok: true } as const;
    },
  );
}

export async function cancelarConvite(db: Kysely<BD>, p: { acesso: Acesso; conviteId: string }): Promise<void> {
  if (p.acesso.papel === "funcionario" || !UUID.test(p.conviteId)) return;
  await db
    .updateTable("convites")
    .set({ revogado_em: sql`now()` })
    .where("id", "=", p.conviteId)
    .where("tenant_id", "=", p.acesso.loja.id)
    .where("usado_em", "is", null)
    // A dona só cancela convites de equipe.
    .where("papel", "in", p.acesso.papel === "operador" ? ["dona", "funcionario"] : ["funcionario"])
    .execute();
}
