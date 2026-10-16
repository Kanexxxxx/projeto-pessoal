import { createHash, randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { registrarAuditoria } from "../auditoria";
import type { BD, Papel } from "../bd/tipos";
import { definirEscopo } from "../lojas/escopo";
import type { Auth } from "./instancia";
import { VALIDADE_CONVITE_HORAS } from "./politicas";
import { problemaNaSenha } from "./senha";

/**
 * Convites são a única porta de entrada de uma conta: o cadastro público da
 * biblioteca está desligado. O token (32 bytes aleatórios) só existe no link
 * do e-mail; o banco guarda o SHA-256 dele. Receber o convite no e-mail prova
 * a posse do endereço, por isso a conta já nasce com e-mail verificado.
 */
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

export function normalizarEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  return EMAIL.test(e) && e.length <= 254 ? e : null;
}

export function hashDoToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export async function criarConvite(
  db: Kysely<BD>,
  p: { email: string; papel: Papel; tenantId?: string | null; criadoPor?: string | null },
): Promise<{ id: string; token: string; expiraEm: Date }> {
  const email = normalizarEmail(p.email);
  if (!email) throw new Error("E-mail do convite inválido.");
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + VALIDADE_CONVITE_HORAS * 60 * 60 * 1000);

  return db.transaction().execute(async (trx) => {
    // Um convite novo invalida os pendentes do mesmo e-mail para o mesmo papel e loja.
    let anteriores = trx
      .updateTable("convites")
      .set({ revogado_em: sql`now()` })
      .where("email", "=", email)
      .where("papel", "=", p.papel)
      .where("usado_em", "is", null)
      .where("revogado_em", "is", null);
    anteriores = p.tenantId ? anteriores.where("tenant_id", "=", p.tenantId) : anteriores.where("tenant_id", "is", null);
    await anteriores.execute();

    const { id } = await trx
      .insertInto("convites")
      .values({
        email,
        papel: p.papel,
        tenant_id: p.tenantId ?? null,
        token_hash: hashDoToken(token),
        criado_por: p.criadoPor ?? null,
        expira_em: expiraEm,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await registrarAuditoria(trx, {
      acao: "convite.criado",
      atorUsuarioId: p.criadoPor ?? null,
      tenantId: p.tenantId ?? null,
      alvo: id,
      detalhes: { papel: p.papel },
    });
    return { id, token, expiraEm };
  });
}

/** Dados de um convite ainda válido, para mostrar na página antes de aceitar. */
export async function consultarConvite(
  db: Kysely<BD>,
  token: string,
): Promise<{ email: string; papel: Papel; tenant_id: string | null } | null> {
  const convite = await db
    .selectFrom("convites")
    .select(["email", "papel", "tenant_id"])
    .where("token_hash", "=", hashDoToken(token))
    .where("usado_em", "is", null)
    .where("revogado_em", "is", null)
    .where("expira_em", ">", sql<Date>`now()`)
    .executeTakeFirst();
  return convite ?? null;
}

export type ResultadoAceite =
  | { ok: true; usuarioId: string; papel: Papel }
  | { ok: false; motivo: "invalido" | "conta_existente" }
  | { ok: false; motivo: "dados"; mensagem: string };

export async function aceitarConvite(
  auth: Auth,
  db: Kysely<BD>,
  p: { token: string; nome: string; senha: string; marca: string },
): Promise<ResultadoAceite> {
  const nome = p.nome.trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80) return { ok: false, motivo: "dados", mensagem: "Informe seu nome (2 a 80 caracteres)." };

  return db.transaction().execute(async (trx) => {
    // FOR UPDATE: dois cliques simultâneos no mesmo link esperam um pelo outro,
    // e o segundo já encontra o convite usado.
    const convite = await trx
      .selectFrom("convites")
      .selectAll()
      .where("token_hash", "=", hashDoToken(p.token))
      .where("usado_em", "is", null)
      .where("revogado_em", "is", null)
      .where("expira_em", ">", sql<Date>`now()`)
      .forUpdate()
      .executeTakeFirst();
    if (!convite) return { ok: false, motivo: "invalido" } as const;

    const problema = problemaNaSenha(p.senha, { email: convite.email, nome, marca: p.marca });
    if (problema) return { ok: false, motivo: "dados", mensagem: problema } as const;

    const existente = await trx.selectFrom("user").select("id").where("email", "=", convite.email).executeTakeFirst();
    if (existente) return { ok: false, motivo: "conta_existente" } as const;

    const ctx = await auth.$context;
    const usuario = await ctx.internalAdapter.createUser(
      { email: convite.email, name: nome, emailVerified: true },
      { method: "convite" },
    );
    try {
      await ctx.internalAdapter.linkAccount({
        userId: usuario.id,
        providerId: "credential",
        accountId: usuario.id,
        password: await ctx.password.hash(p.senha),
      });
      // Segunda trava, que não depende de tempo: só marca se ainda estiver livre.
      const marcado = await trx
        .updateTable("convites")
        .set({ usado_em: sql`now()`, usado_por: usuario.id })
        .where("id", "=", convite.id)
        .where("usado_em", "is", null)
        .executeTakeFirst();
      if (marcado.numUpdatedRows !== 1n) throw new Error("convite usado por outra requisição");
      if (convite.papel === "operador") {
        await trx.insertInto("operadores").values({ usuario_id: usuario.id }).execute();
      } else {
        await vincularNaLoja(trx, convite.tenant_id!, usuario.id, convite.papel);
      }
      await registrarAuditoria(trx, {
        acao: "convite.aceito",
        atorUsuarioId: usuario.id,
        tenantId: convite.tenant_id,
        alvo: convite.id,
        detalhes: { papel: convite.papel },
      });
    } catch (erro) {
      // A conta foi criada fora desta transação: desfaz para o convite continuar utilizável.
      await ctx.internalAdapter.deleteUser(usuario.id);
      throw erro;
    }
    return { ok: true, usuarioId: usuario.id, papel: convite.papel } as const;
  });
}

async function vincularNaLoja(trx: Kysely<BD>, tenantId: string, usuarioId: string, papel: "dona" | "funcionario") {
  await definirEscopo(trx, tenantId);
  await trx
    .insertInto("membros_loja")
    .values({ tenant_id: tenantId, usuario_id: usuarioId, papel })
    .onConflict((oc) => oc.columns(["tenant_id", "usuario_id"]).doUpdateSet({ papel, revogado_em: null }))
    .execute();
}

/**
 * Convite de loja para quem JÁ tem conta: a pessoa entra com a conta do mesmo
 * e-mail do convite e confirma. Ter o link e a senha da conta prova as duas
 * coisas; convite de operador não é aceito por este caminho.
 */
export async function aceitarConviteComConta(
  db: Kysely<BD>,
  p: { token: string; usuarioId: string },
): Promise<{ ok: true; tenantId: string } | { ok: false; motivo: "invalido" | "outro_email" }> {
  return db.transaction().execute(async (trx) => {
    const convite = await trx
      .selectFrom("convites")
      .selectAll()
      .where("token_hash", "=", hashDoToken(p.token))
      .where("usado_em", "is", null)
      .where("revogado_em", "is", null)
      .where("expira_em", ">", sql<Date>`now()`)
      .forUpdate()
      .executeTakeFirst();
    if (!convite || convite.papel === "operador" || !convite.tenant_id) return { ok: false, motivo: "invalido" } as const;
    const usuario = await trx.selectFrom("user").select("email").where("id", "=", p.usuarioId).executeTakeFirst();
    if (!usuario || usuario.email !== convite.email) return { ok: false, motivo: "outro_email" } as const;

    const marcado = await trx
      .updateTable("convites")
      .set({ usado_em: sql`now()`, usado_por: p.usuarioId })
      .where("id", "=", convite.id)
      .where("usado_em", "is", null)
      .executeTakeFirst();
    if (marcado.numUpdatedRows !== 1n) return { ok: false, motivo: "invalido" } as const;
    await vincularNaLoja(trx, convite.tenant_id, p.usuarioId, convite.papel);
    await registrarAuditoria(trx, {
      acao: "convite.aceito",
      atorUsuarioId: p.usuarioId,
      tenantId: convite.tenant_id,
      alvo: convite.id,
      detalhes: { papel: convite.papel, contaExistente: true },
    });
    return { ok: true, tenantId: convite.tenant_id } as const;
  });
}
