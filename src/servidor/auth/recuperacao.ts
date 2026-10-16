import { sql, type Kysely } from "kysely";
import { registrarAuditoria } from "../auditoria";
import type { BD } from "../bd/tipos";
import { normalizarEmail } from "./convites";

export const CONFIRMACAO_RECUPERACAO_MFA = "RECUPERAR-MFA";

/** Referência opaca do registro administrativo; nunca recebe descrição livre. */
export function chamadoDeRecuperacaoValido(chamado: string): boolean {
  return /^[A-Z]{2,8}-[0-9]{1,12}$/.test(chamado);
}

/** Este procedimento da T05 só está autorizado para desenvolvimento local. */
export function ambienteDeRecuperacaoLocal(p: { ambiente: string; bancoUrl: string }): boolean {
  if (p.ambiente !== "development" && p.ambiente !== "test") return false;
  try {
    const url = new URL(p.bancoUrl);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      // node-postgres aceita parâmetros como host: não permitir sobrepor o destino.
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export type ResultadoRecuperacaoMfa =
  | { tipo: "ok"; sessoesRevogadas: number; verificacoesRevogadas: number }
  | { tipo: "dados_invalidos" | "confirmacao_ausente" | "operador_indisponivel" };

/**
 * Procedimento administrativo usado exclusivamente pelo comando local.
 * NÃO transformar em Server Action/Route Handler: a autorização vem do acesso
 * administrativo ao host e ao banco, após checagem de identidade fora do painel.
 * Parar a aplicação antes de executar, para drenar operações de login em voo.
 * A senha não é lida nem alterada; o próximo acesso exige senha e novo MFA.
 */
export async function recuperarMfaOperador(
  db: Kysely<BD>,
  p: { email: string; chamado: string; confirmacao: string },
): Promise<ResultadoRecuperacaoMfa> {
  if (p.confirmacao !== CONFIRMACAO_RECUPERACAO_MFA) return { tipo: "confirmacao_ausente" };
  const email = normalizarEmail(p.email);
  if (!email || !chamadoDeRecuperacaoValido(p.chamado)) return { tipo: "dados_invalidos" };

  return db.transaction().execute(async (trx) => {
    const operador = await trx
      .selectFrom("user")
      .innerJoin("operadores", "operadores.usuario_id", "user.id")
      .select("user.id")
      .where("user.email", "=", email)
      .where("operadores.revogado_em", "is", null)
      .forUpdate()
      .executeTakeFirst();

    if (!operador) {
      await registrarAuditoria(trx, {
        acao: "segundo_fator.recuperacao_recusada",
        detalhes: { chamado: p.chamado, origem: "terminal_local", motivo: "operador_indisponivel" },
      });
      return { tipo: "operador_indisponivel" };
    }

    // Better Auth 1.7.10: desafios 2fa, confiança de dispositivo e redefinições
    // guardam user.id em value. identifier é SHA-256/base64url, portanto não se
    // deve procurar pelo prefixo 2fa nem calcular hash sobre o hash armazenado.
    // Contadores 2fa-attempts sem vínculo de usuário ficam inertes: sem o desafio
    // autorizador, não criam sessão, e expiram no mesmo prazo curto do desafio.
    const verificacoes = await sql`
      delete from "verification" where "value" = ${operador.id}
    `.execute(trx);
    const sessoes = await trx.deleteFrom("session").where("userId", "=", operador.id).executeTakeFirst();
    // A migração 0004 liga mfa_passos_consumidos a twoFactor com ON DELETE CASCADE.
    // A mesma linha contém segredo e todos os códigos de reserva criptografados.
    const fatores = await sql`delete from "twoFactor" where "userId" = ${operador.id}`.execute(trx);
    await trx
      .updateTable("user")
      .set({ twoFactorEnabled: false, updatedAt: sql`now()` })
      .where("id", "=", operador.id)
      .execute();

    const sessoesRevogadas = Number(sessoes.numDeletedRows);
    const verificacoesRevogadas = Number(verificacoes.numAffectedRows ?? 0n);
    // Ator nulo é intencional: não atribuir a ação ao operador recuperado.
    // O responsável e a evidência de identidade pertencem ao chamado restrito.
    await registrarAuditoria(trx, {
      acao: "segundo_fator.recuperado",
      alvo: operador.id,
      detalhes: {
        chamado: p.chamado,
        origem: "terminal_local",
        sessoes_revogadas: sessoesRevogadas,
        verificacoes_revogadas: verificacoesRevogadas,
        fatores_removidos: Number(fatores.numAffectedRows ?? 0n),
      },
    });
    return { tipo: "ok", sessoesRevogadas, verificacoesRevogadas };
  });
}
