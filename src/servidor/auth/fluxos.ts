import { APIError } from "better-auth/api";
import type { Kysely } from "kysely";
import { registrarAuditoria } from "../auditoria";
import type { BD } from "../bd/tipos";
import type { Config } from "../config";
import { LIMITES, consumirLimite, ipDaRequisicao, zerarLimite } from "../limites";
import { mascararEmail } from "../privacidade";
import { normalizarEmail } from "./convites";
import type { Auth } from "./instancia";
import { concluirMfa, consumirTotp, fatorReservaLegivel, identificarDesafio, sessaoEmitida } from "./mfa";
import { problemaNaSenha } from "./senha";

/**
 * Fluxos de acesso chamados pelas Server Actions do painel (e pelos testes).
 * Recebem os headers da requisição e devolvem os Set-Cookie produzidos: no
 * Next o plugin `nextCookies` já os aplica; fora dele, quem chama aplica.
 *
 * Respostas de falha são genéricas: e-mail inexistente, senha errada e conta
 * não verificada dão o mesmo "recusado" (sem enumeração de contas).
 */
export type ContextoAcesso = { auth: Auth; db: Kysely<BD>; config: Config };

const ehErroDaApi = (e: unknown): e is APIError => e instanceof APIError;

function setCookies(headers: Headers | null | undefined): string[] {
  return headers?.getSetCookie() ?? [];
}

function maisTarde(a: Date, b: Date): Date {
  return a > b ? a : b;
}

export type ResultadoEntrar =
  | { tipo: "entrou"; cookies: string[] }
  | { tipo: "segundo_fator"; cookies: string[] }
  | { tipo: "recusado" }
  | { tipo: "limite"; liberaEm: Date };

export async function entrar(
  c: ContextoAcesso,
  p: { email: string; senha: string; headers: Headers },
): Promise<ResultadoEntrar> {
  const ip = ipDaRequisicao(p.headers, c.config.cabecalhoIp);
  const email = normalizarEmail(p.email) ?? p.email.trim().toLowerCase().slice(0, 254);
  const porIp = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.entrarPorIp, ip);
  const porEmail = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.entrarPorEmail, email);
  if (!porIp.permitido || !porEmail.permitido) {
    await registrarAuditoria(c.db, { acao: "entrar.limite", alvo: mascararEmail(email), ip });
    return { tipo: "limite", liberaEm: maisTarde(porIp.liberaEm, porEmail.liberaEm) };
  }
  if (!normalizarEmail(p.email) || p.senha.length === 0 || p.senha.length > 256) return { tipo: "recusado" };

  try {
    const r = await c.auth.api.signInEmail({
      body: { email, password: p.senha, rememberMe: true },
      headers: p.headers,
      returnHeaders: true,
    });
    await zerarLimite(c.db, c.config.segredoAuth, LIMITES.entrarPorEmail, email);
    const cookies = setCookies(r.headers);
    if ("twoFactorRedirect" in r.response && r.response.twoFactorRedirect) return { tipo: "segundo_fator", cookies };
    const sessao = await sessaoEmitida(c, p.headers, cookies);
    if (!sessao) return { tipo: "recusado" };
    await registrarAuditoria(c.db, { acao: "sessao.criada", atorUsuarioId: sessao.user.id, ip, agente: p.headers.get("user-agent") });
    return { tipo: "entrou", cookies };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    await registrarAuditoria(c.db, { acao: "entrar.recusado", alvo: mascararEmail(email), ip });
    return { tipo: "recusado" };
  }
}

export type ResultadoSegundoFator =
  | { tipo: "entrou"; cookies: string[] }
  | { tipo: "recusado" }
  | { tipo: "expirado" }
  | { tipo: "limite"; liberaEm: Date };

export async function verificarSegundoFator(
  c: ContextoAcesso,
  p: { codigo: string; metodo: "totp" | "reserva"; headers: Headers },
): Promise<ResultadoSegundoFator> {
  const desafio = await identificarDesafio(c, p.headers);
  if (!desafio) return { tipo: "expirado" };
  const ip = ipDaRequisicao(p.headers, c.config.cabecalhoIp);
  const auditar = (acao: string) => registrarAuditoria(c.db, { acao, atorUsuarioId: desafio.usuarioId, ip, detalhes: { metodo: p.metodo } });
  const porDesafio = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.segundoFatorPorDesafio, desafio.identificador);
  const porIp = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.segundoFatorPorIp, ip);
  const porUsuario = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.segundoFatorPorUsuario, desafio.usuarioId);
  if (!porDesafio.permitido || !porIp.permitido || !porUsuario.permitido) {
    await auditar("segundo_fator.limite");
    return { tipo: "limite", liberaEm: maisTarde(maisTarde(porDesafio.liberaEm, porIp.liberaEm), porUsuario.liberaEm) };
  }

  const codigo = p.metodo === "totp" ? p.codigo.replace(/\s+/g, "") : p.codigo.trim();
  if ((p.metodo === "totp" && !/^\d{6}$/.test(codigo)) || (p.metodo === "reserva" && !/^[A-Za-z0-9-]{8,32}$/.test(codigo))) {
    await auditar("segundo_fator.recusado");
    return { tipo: "recusado" };
  }

  try {
    // Uma sessão antiga no navegador não pode fazer a biblioteca pular o desafio.
    if (await c.auth.api.getSession({ headers: p.headers })) return { tipo: "recusado" };
    const fatorId = p.metodo === "totp" ? await consumirTotp(c, desafio.usuarioId, codigo)
      : await fatorReservaLegivel(c, desafio.usuarioId);
    if (!fatorId) { await auditar("segundo_fator.recusado"); return { tipo: "recusado" }; }
    // Nunca "confiar neste dispositivo": o operador confirma o segundo fator sempre.
    const r =
      p.metodo === "totp"
        ? await c.auth.api.verifyTOTP({ body: { code: codigo, trustDevice: false }, headers: p.headers, returnHeaders: true })
        : await c.auth.api.verifyBackupCode({ body: { code: codigo, trustDevice: false }, headers: p.headers, returnHeaders: true });
    const cookies = setCookies(r.headers);
    const sessao = await sessaoEmitida(c, p.headers, cookies);
    if (!sessao || !(await concluirMfa(c, { usuarioId: desafio.usuarioId, fatorId, sessaoId: sessao.session.id, headers: p.headers }))) return { tipo: "recusado" };
    return { tipo: "entrou", cookies };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    await auditar("segundo_fator.recusado");
    return { tipo: "recusado" };
  }
}

export type ResultadoPedido = { tipo: "ok" } | { tipo: "limite"; liberaEm: Date };

export async function pedirRedefinicao(
  c: ContextoAcesso,
  p: { email: string; headers: Headers },
): Promise<ResultadoPedido> {
  const ip = ipDaRequisicao(p.headers, c.config.cabecalhoIp);
  const email = normalizarEmail(p.email);
  const porIp = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.recuperarPorIp, ip);
  const porEmail = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.recuperarPorEmail, email ?? p.email.trim().toLowerCase());
  if (!porIp.permitido || !porEmail.permitido) return { tipo: "limite", liberaEm: maisTarde(porIp.liberaEm, porEmail.liberaEm) };
  if (!email) return { tipo: "ok" };
  try {
    await c.auth.api.requestPasswordReset({
      body: { email, redirectTo: `${c.config.urlPainel}/redefinir` },
      headers: p.headers,
    });
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
  }
  await registrarAuditoria(c.db, { acao: "senha.redefinicao_pedida", alvo: mascararEmail(email), ip });
  // Mesma resposta exista ou não a conta.
  return { tipo: "ok" };
}

export type ResultadoRedefinir = { tipo: "ok" } | { tipo: "fraca"; mensagem: string } | { tipo: "invalido" };

export async function redefinirSenha(
  c: ContextoAcesso,
  p: { token: string; novaSenha: string; headers: Headers },
): Promise<ResultadoRedefinir> {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(p.token)) return { tipo: "invalido" };
  const interno = await c.auth.$context;
  const verificacao = await interno.internalAdapter.findVerificationValue(`reset-password:${p.token}`);
  if (!verificacao || verificacao.expiresAt <= new Date()) return { tipo: "invalido" };
  const usuario = await c.db.selectFrom("user").select(["name", "email"]).where("id", "=", verificacao.value).executeTakeFirst();
  if (!usuario) return { tipo: "invalido" };
  const problema = problemaNaSenha(p.novaSenha, { marca: c.config.marca, nome: usuario.name, email: usuario.email });
  if (problema) return { tipo: "fraca", mensagem: problema };
  try {
    await c.auth.api.resetPassword({ body: { token: p.token, newPassword: p.novaSenha }, headers: p.headers });
    return { tipo: "ok" };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    return { tipo: "invalido" };
  }
}

export async function sair(c: ContextoAcesso, p: { headers: Headers }): Promise<{ cookies: string[] }> {
  try {
    const r = await c.auth.api.signOut({ headers: p.headers, returnHeaders: true });
    return { cookies: setCookies(r.headers) };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    return { cookies: [] };
  }
}

export type ResultadoInicio2fa = { tipo: "ok"; totpURI: string; codigosReserva: string[] } | { tipo: "recusado" } | { tipo: "limite"; liberaEm: Date };

async function limitarConfiguracao(c: ContextoAcesso, usuarioId: string, headers: Headers) {
  const ip = ipDaRequisicao(headers, c.config.cabecalhoIp);
  const usuario = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.configurarSegundoFator, usuarioId);
  const rede = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.segundoFatorPorIp, ip);
  if (usuario.permitido && rede.permitido) return null;
  await registrarAuditoria(c.db, { acao: "segundo_fator.configuracao_limite", atorUsuarioId: usuarioId, ip });
  return { tipo: "limite" as const, liberaEm: maisTarde(usuario.liberaEm, rede.liberaEm) };
}

/** Primeira etapa do 2FA: confere a senha e gera o segredo TOTP e os códigos de reserva. */
export async function iniciarSegundoFator(
  c: ContextoAcesso,
  p: { senha: string; headers: Headers },
): Promise<ResultadoInicio2fa> {
  const sessao = await c.auth.api.getSession({ headers: p.headers });
  if (!sessao || sessao.user.twoFactorEnabled) return { tipo: "recusado" };
  const limite = await limitarConfiguracao(c, sessao.user.id, p.headers);
  if (limite) return limite;
  try {
    const r = await c.auth.api.enableTwoFactor({ body: { password: p.senha }, headers: p.headers });
    // Só TOTP (aplicativo autenticador); código por e-mail não é segundo fator para o operador.
    if (r.method !== "totp") return { tipo: "recusado" };
    return { tipo: "ok", totpURI: r.totpURI, codigosReserva: r.backupCodes };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    await registrarAuditoria(c.db, { acao: "segundo_fator.configuracao_recusada", atorUsuarioId: sessao.user.id, ip: ipDaRequisicao(p.headers, c.config.cabecalhoIp) });
    return { tipo: "recusado" };
  }
}

/** Segunda etapa: o primeiro código certo liga o 2FA da conta. */
export async function confirmarSegundoFator(
  c: ContextoAcesso,
  p: { usuarioId: string; codigo: string; headers: Headers },
): Promise<{ tipo: "ok"; cookies: string[] } | { tipo: "recusado" } | { tipo: "limite"; liberaEm: Date }> {
  const sessao = await c.auth.api.getSession({ headers: p.headers });
  if (!sessao || sessao.user.id !== p.usuarioId || sessao.user.twoFactorEnabled) return { tipo: "recusado" };
  const limite = await consumirLimite(c.db, c.config.segredoAuth, LIMITES.segundoFatorPorDesafio, `ativar:${p.usuarioId}`);
  if (!limite.permitido) return { tipo: "limite", liberaEm: limite.liberaEm };
  const codigo = p.codigo.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(codigo)) return { tipo: "recusado" };
  try {
    const fatorId = await consumirTotp(c, sessao.user.id, codigo);
    if (!fatorId) return { tipo: "recusado" };
    const r = await c.auth.api.verifyTOTP({ body: { code: codigo, trustDevice: false }, headers: p.headers, returnHeaders: true });
    const cookies = setCookies(r.headers);
    const nova = await sessaoEmitida(c, p.headers, cookies);
    if (!nova || !(await concluirMfa(c, { usuarioId: sessao.user.id, fatorId, sessaoId: nova.session.id, headers: p.headers, ativacao: true }))) return { tipo: "recusado" };
    return { tipo: "ok", cookies };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    return { tipo: "recusado" };
  }
}

/** A senha é conferida novamente pela biblioteca, mesmo com uma sessão MFA válida. */
export async function regenerarCodigosReserva(c: ContextoAcesso, p: { senha: string; codigo: string; headers: Headers }): Promise<
  { tipo: "ok"; codigosReserva: string[] } | { tipo: "recusado" } | { tipo: "limite"; liberaEm: Date }
> {
  const sessao = await c.auth.api.getSession({ headers: p.headers });
  if (!sessao?.user.twoFactorEnabled || !sessao.session.mfaVerificado) return { tipo: "recusado" };
  const limite = await limitarConfiguracao(c, sessao.user.id, p.headers);
  if (limite) return limite;
  try {
    await c.auth.api.verifyPassword({ headers: p.headers, body: { password: p.senha } });
    const codigo = p.codigo.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(codigo) || !(await consumirTotp(c, sessao.user.id, codigo))) {
      await registrarAuditoria(c.db, { acao: "segundo_fator.configuracao_recusada", atorUsuarioId: sessao.user.id, ip: ipDaRequisicao(p.headers, c.config.cabecalhoIp) });
      return { tipo: "recusado" };
    }
    const r = await c.auth.api.generateBackupCodes({ headers: p.headers, body: { password: p.senha } });
    await registrarAuditoria(c.db, { acao: "segundo_fator.reservas_regeneradas", atorUsuarioId: sessao.user.id, ip: ipDaRequisicao(p.headers, c.config.cabecalhoIp) });
    return { tipo: "ok", codigosReserva: r.backupCodes };
  } catch (e) {
    if (!ehErroDaApi(e)) throw e;
    await registrarAuditoria(c.db, { acao: "segundo_fator.configuracao_recusada", atorUsuarioId: sessao.user.id, ip: ipDaRequisicao(p.headers, c.config.cabecalhoIp) });
    return { tipo: "recusado" };
  }
}
