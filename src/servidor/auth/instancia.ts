import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import type pg from "pg";
import { registrarAuditoria } from "../auditoria";
import { criarBd } from "../bd/conexao";
import type { Config } from "../config";
import type { Enviador } from "../email/enviador";
import { emailRedefinicaoSenha, emailSenhaAlterada } from "../email/modelos";
import { SENHA, SESSAO, VALIDADE_DESAFIO_2FA_SEGUNDOS, VALIDADE_REDEFINICAO_MINUTOS } from "./politicas";

/**
 * Identidade por biblioteca consolidada (ARQUITETURA.md §2 e PLANO.md §8):
 * nada de sessão, hash de senha ou token de recuperação escrito à mão.
 *
 * As rotas HTTP da biblioteca NÃO são montadas. O painel chama esta API pelo
 * servidor (Server Actions), o que tira do ar cadastro público, troca de
 * e-mail e qualquer endpoint que não usamos. Como o limite de tentativas da
 * biblioteca só vale para essas rotas HTTP, os limites ficam em
 * servidor/limites.ts, no banco.
 */
/** Link de uso único com o token no fragmento, lido pela página no navegador. */
export function urlComToken(base: string, token: string): string {
  return `${base}#token=${encodeURIComponent(token)}`;
}

export type DependenciasAuth = {
  pool: pg.Pool;
  config: Config;
  enviador: Enviador;
};

export function criarAuth({ pool, config, enviador }: DependenciasAuth) {
  const db = criarBd(pool);
  return betterAuth({
    appName: config.marca,
    baseURL: config.urlPainel,
    secret: config.segredoAuth,
    secrets: config.segredosAuth,
    database: pool,
    trustedOrigins: [config.urlPainel],
    emailAndPassword: {
      enabled: true,
      // Contas nascem só por convite (servidor/auth/convites.ts).
      disableSignUp: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: SENHA.minimo,
      maxPasswordLength: SENHA.maximo,
      resetPasswordTokenExpiresIn: VALIDADE_REDEFINICAO_MINUTOS * 60,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, token }) {
        // O link aponta para a nossa página, não para a rota HTTP da biblioteca.
        // O token vai no fragmento (#): o navegador não o envia ao servidor, então
        // ele não aparece em log de acesso do proxy nem do Next.
        const url = urlComToken(`${config.urlPainel}/redefinir`, token);
        await enviador.enviar(
          emailRedefinicaoSenha({ para: user.email, marca: config.marca, url, validadeMinutos: VALIDADE_REDEFINICAO_MINUTOS }),
        );
      },
      // Chamado depois que as sessões foram revogadas.
      async onPasswordReset({ user }) {
        await registrarAuditoria(db, { acao: "senha.redefinida", atorUsuarioId: user.id });
        await enviador.enviar(emailSenhaAlterada({ para: user.email, marca: config.marca, quando: new Date() }));
      },
    },
    session: {
      expiresIn: SESSAO.duracaoSegundos,
      updateAge: SESSAO.renovarAposSegundos,
      freshAge: SESSAO.recenteSegundos,
      // Sem cache em cookie: revogar uma sessão vale na próxima requisição.
      cookieCache: { enabled: false },
      additionalFields: { mfaVerificado: { type: "boolean", defaultValue: false, input: false } },
    },
    rateLimit: { enabled: false },
    // Tokens de redefinição e códigos ficam só como hash: quem lê o banco ou um
    // backup não consegue redefinir a senha de ninguém.
    verification: { storeIdentifier: "hashed" },
    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    account: { accountLinking: { enabled: false } },
    advanced: {
      cookiePrefix: "nexakeep",
      useSecureCookies: config.protocolo === "https",
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true, path: "/" },
      // Atrás do proxy da VPS só o X-Real-IP é confiável (o proxy sobrescreve).
      ipAddress: { ipAddressHeaders: [config.cabecalhoIp] },
    },
    plugins: [
      twoFactor({
        issuer: config.marca,
        skipVerificationOnEnable: false,
        totpOptions: { digits: 6, period: 30 },
        backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" },
        twoFactorCookieMaxAge: VALIDADE_DESAFIO_2FA_SEGUNDOS,
      }),
      // Aplica os cookies das chamadas feitas dentro de Server Actions.
      // Fora de uma requisição do Next (scripts, testes) ele não faz nada.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
