import { createOTP } from "@better-auth/utils/otp";
import { constantTimeEqual, makeSignature, symmetricDecrypt } from "better-auth/crypto";
import { registrarAuditoria } from "../auditoria";
import { ipDaRequisicao } from "../limites";
import type { ContextoAcesso } from "./fluxos";

/** Consulta a identidade de um desafio assinado, sem consumir o desafio da biblioteca. */
export async function identificarDesafio(c: ContextoAcesso, headers: Headers) {
  const interno = await c.auth.$context;
  const nome = interno.createAuthCookie("two_factor").name;
  const par = (headers.get("cookie") ?? "").split(";").map(p => p.trim()).find(p => p.startsWith(`${nome}=`));
  if (!par) return null;
  let valor: string;
  try { valor = decodeURIComponent(par.slice(nome.length + 1)); } catch { return null; }
  const ponto = valor.lastIndexOf(".");
  if (ponto < 1) return null;
  const identificador = valor.slice(0, ponto);
  if (!constantTimeEqual(valor.slice(ponto + 1), await makeSignature(identificador, interno.secret))) return null;
  const desafio = await interno.internalAdapter.findVerificationValue(identificador);
  if (!desafio || desafio.expiresAt <= new Date()) return null;
  return { usuarioId: desafio.value, identificador };
}

/** Usa o mesmo gerador/janela da biblioteca; o banco arbitra o consumo concorrente. */
export async function consumirTotp(c: ContextoAcesso, usuarioId: string, codigo: string) {
  const fator = await c.db.selectFrom("twoFactor").select(["id", "secret"]).where("userId", "=", usuarioId).executeTakeFirst();
  if (!fator) return null;
  const interno = await c.auth.$context;
  let segredo: string;
  // Falha de autenticação da cifra/versão ausente recusa o acesso; erros de DB acima propagam.
  try { segredo = await symmetricDecrypt({ key: interno.secretConfig, data: fator.secret }); } catch { return null; }
  const otp = createOTP(segredo, { digits: 6, period: 30 });
  const atual = Math.floor(Date.now() / 30_000);
  const passos: number[] = [];
  for (const passo of [atual - 1, atual, atual + 1]) {
    if (constantTimeEqual(codigo, await otp.hotp(passo))) passos.push(passo);
  }
  if (!passos.length) return null;
  const aceito = await c.db.transaction().execute(async trx => {
    // Bloqueia também a remoção administrativa do fator até o consumo terminar.
    const existe = await trx.selectFrom("twoFactor").select("id").where("id", "=", fator.id).forUpdate().executeTakeFirst();
    if (!existe) return false;
    const usados = await trx.selectFrom("mfa_passos_consumidos").select("passo")
      .where("usuario_id", "=", usuarioId).where("fator_id", "=", fator.id).where("passo", "in", passos).execute();
    if (usados.length) return false;
    await trx.insertInto("mfa_passos_consumidos").values(passos.map(passo => ({ usuario_id: usuarioId, fator_id: fator.id, passo }))).execute();
    // Passos antigos nunca voltam à janela aceita; não guardar histórico sem necessidade.
    await trx.deleteFrom("mfa_passos_consumidos").where("usuario_id", "=", usuarioId).where("passo", "<", atual - 2).execute();
    return true;
  });
  return aceito ? fator.id : null;
}

export async function fatorReservaLegivel(c: ContextoAcesso, usuarioId: string) {
  const fator = await c.db.selectFrom("twoFactor").select(["id", "backupCodes"]).where("userId", "=", usuarioId).executeTakeFirst();
  if (!fator) return null;
  const interno = await c.auth.$context;
  try { await symmetricDecrypt({ key: interno.secretConfig, data: fator.backupCodes }); } catch { return null; }
  return fator.id;
}

/** Lê o cookie emitido pela biblioteca, incluindo a substituição feita na ativação. */
export async function sessaoEmitida(c: ContextoAcesso, headers: Headers, cookies: string[]) {
  const novos = new Headers(headers);
  const pares = new Map((headers.get("cookie") ?? "").split(";").filter(Boolean).map(par => {
    const i = par.indexOf("=");
    return [par.slice(0, i).trim(), par.slice(i + 1)] as const;
  }));
  for (const linha of cookies) {
    const par = linha.split(";")[0]!;
    const i = par.indexOf("=");
    pares.set(par.slice(0, i), par.slice(i + 1));
  }
  novos.set("cookie", [...pares].map(([n, v]) => `${n}=${v}`).join("; "));
  return c.auth.api.getSession({ headers: novos, query: { disableRefresh: true } });
}

/** Confirma o fator ainda presente e marca somente a sessão produzida nessa verificação. */
export async function concluirMfa(c: ContextoAcesso, p: {
  usuarioId: string; fatorId: string; sessaoId: string; headers: Headers; ativacao?: boolean;
}) {
  return c.db.transaction().execute(async trx => {
    const usuario = await trx.selectFrom("user").select("twoFactorEnabled").where("id", "=", p.usuarioId).forUpdate().executeTakeFirst();
    const fator = await trx.selectFrom("twoFactor").select("id").where("id", "=", p.fatorId).where("userId", "=", p.usuarioId).where("verified", "=", true).executeTakeFirst();
    if (!usuario?.twoFactorEnabled || !fator) {
      await trx.deleteFrom("session").where("id", "=", p.sessaoId).execute();
      return false;
    }
    const sessao = await trx.updateTable("session").set({ mfaVerificado: true }).where("id", "=", p.sessaoId)
      .where("userId", "=", p.usuarioId).returning("id").executeTakeFirst();
    if (!sessao) return false;
    if (p.ativacao) await trx.deleteFrom("session").where("userId", "=", p.usuarioId).where("id", "!=", p.sessaoId).execute();
    await registrarAuditoria(trx, { acao: "sessao.criada", atorUsuarioId: p.usuarioId,
      ip: ipDaRequisicao(p.headers, c.config.cabecalhoIp), agente: p.headers.get("user-agent") });
    if (p.ativacao) await registrarAuditoria(trx, { acao: "segundo_fator.ativado", atorUsuarioId: p.usuarioId,
      ip: ipDaRequisicao(p.headers, c.config.cabecalhoIp) });
    return true;
  });
}
