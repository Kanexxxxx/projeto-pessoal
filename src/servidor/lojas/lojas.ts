import type { Kysely, Selectable } from "kysely";
import { registrarAuditoria } from "../auditoria";
import { ehOperadorAtivo } from "../auth/operadores";
import type { BD, PapelNaLoja, Segmento, SituacaoLoja, TabelaLojas } from "../bd/tipos";
import { slugValido } from "../hosts";
import { comLoja, comUsuario, definirEscopo } from "./escopo";

export type Loja = Selectable<TabelaLojas>;
export type PapelDeAcesso = "operador" | PapelNaLoja;
export type Acesso = { loja: Loja; papel: PapelDeAcesso; usuarioId: string };

export const SEGMENTOS: Record<Segmento, string> = {
  barbearia: "Barbearia",
  salao: "Salão de beleza",
  estudio: "Estúdio (unhas, sobrancelha, estética)",
  outro: "Outro",
};

export async function lojaPorSlug(db: Kysely<BD>, slug: string): Promise<Loja | null> {
  if (!slugValido(slug)) return null;
  return (await db.selectFrom("lojas").selectAll().where("slug", "=", slug).executeTakeFirst()) ?? null;
}

/**
 * Quem pode mexer nesta loja, conferido no banco a cada chamada: operador
 * ativo, ou vínculo não revogado. Nome, e-mail ou campo de formulário não dão
 * acesso (ARQUITETURA.md §3).
 */
export async function acessoNaLoja(db: Kysely<BD>, usuarioId: string, slug: string): Promise<Acesso | null> {
  const loja = await lojaPorSlug(db, slug);
  if (!loja) return null;
  if (await ehOperadorAtivo(db, usuarioId)) return { loja, papel: "operador", usuarioId };
  const vinculo = await comLoja(db, loja.id, (trx) =>
    trx
      .selectFrom("membros_loja")
      .select("papel")
      .where("tenant_id", "=", loja.id)
      .where("usuario_id", "=", usuarioId)
      .where("revogado_em", "is", null)
      .executeTakeFirst(),
  );
  return vinculo ? { loja, papel: vinculo.papel, usuarioId } : null;
}

/** Lojas em que a pessoa tem vínculo ativo. */
export async function lojasDoUsuario(db: Kysely<BD>, usuarioId: string): Promise<(Loja & { papel: PapelNaLoja })[]> {
  const vinculos = await comUsuario(db, usuarioId, (trx) =>
    trx
      .selectFrom("membros_loja")
      .select(["tenant_id", "papel"])
      .where("usuario_id", "=", usuarioId)
      .where("revogado_em", "is", null)
      .execute(),
  );
  if (!vinculos.length) return [];
  const lojas = await db
    .selectFrom("lojas")
    .selectAll()
    .where(
      "id",
      "in",
      vinculos.map((v) => v.tenant_id),
    )
    .orderBy("nome")
    .execute();
  return lojas.map((l) => ({ ...l, papel: vinculos.find((v) => v.tenant_id === l.id)!.papel }));
}

export async function todasAsLojas(db: Kysely<BD>): Promise<Loja[]> {
  return db.selectFrom("lojas").selectAll().orderBy("criada_em", "desc").execute();
}

export const SITUACOES: Record<SituacaoLoja, string> = {
  implantacao: "Em implantação",
  ativa: "No ar",
  suspensa: "Suspensa",
  encerrada: "Encerrada",
};

/** Só o operador muda a situação da loja (implantação → no ar, suspensão por falta de pagamento…). */
export async function mudarSituacao(db: Kysely<BD>, acesso: Acesso, situacao: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (acesso.papel !== "operador") return { ok: false, erro: "Só o operador da plataforma muda a situação da loja." };
  if (!(situacao in SITUACOES)) return { ok: false, erro: "Situação inválida." };
  await db.transaction().execute(async (trx) => {
    await trx.updateTable("lojas").set({ situacao: situacao as SituacaoLoja }).where("id", "=", acesso.loja.id).execute();
    await registrarAuditoria(trx, {
      acao: "loja.situacao",
      atorUsuarioId: acesso.usuarioId,
      tenantId: acesso.loja.id,
      detalhes: { de: acesso.loja.situacao, para: situacao },
    });
  });
  return { ok: true };
}

/** Sugere um endereço a partir do nome: "Barbearia do Zé" → "barbearia-do-ze". */
export function sugerirSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export type ResultadoCriarLoja = { ok: true; loja: Loja } | { ok: false; erro: string };

export async function criarLoja(
  db: Kysely<BD>,
  p: { nome: string; slug: string; segmento: string; criadaPor: string | null },
): Promise<ResultadoCriarLoja> {
  const nome = p.nome.trim().replace(/\s+/g, " ");
  const slug = p.slug.trim().toLowerCase();
  if (nome.length < 2 || nome.length > 80) return { ok: false, erro: "Informe o nome da loja (2 a 80 caracteres)." };
  if (!slugValido(slug)) {
    return { ok: false, erro: "Endereço inválido: use letras minúsculas, números e hífen (sem acento), e não use nomes reservados como app ou www." };
  }
  if (!(p.segmento in SEGMENTOS)) return { ok: false, erro: "Escolha o tipo de negócio." };

  try {
    const loja = await db.transaction().execute(async (trx) => {
      const criada = await trx
        .insertInto("lojas")
        .values({ nome, slug, segmento: p.segmento as Segmento, criada_por: p.criadaPor })
        .returningAll()
        .executeTakeFirstOrThrow();
      await definirEscopo(trx, criada.id);
      await trx.insertInto("config_loja").values({ tenant_id: criada.id }).execute();
      await registrarAuditoria(trx, { acao: "loja.criada", atorUsuarioId: p.criadaPor, tenantId: criada.id, alvo: slug });
      return criada;
    });
    return { ok: true, loja };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { ok: false, erro: "Esse endereço já está em uso por outra loja." };
    throw e;
  }
}
