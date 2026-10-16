import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { contexto } from "./acesso";
import { ehOperadorAtivo } from "./auth/operadores";
import { acessoNaLoja, type Acesso, type PapelDeAcesso } from "./lojas/lojas";

/**
 * Guardas de sessão para páginas e ações do painel. O proxy não protege nada
 * (ver proxy.ts): cada página e cada Server Action chama uma destas.
 *
 * Os caminhos de redirecionamento são os públicos ("/entrar"), não os internos
 * ("/painel/entrar"), porque o proxy prefixa toda requisição.
 */
export async function sessaoAtual() {
  const { auth } = contexto();
  // Em componente de servidor não dá para regravar cookie; a renovação da
  // sessão acontece nas ações.
  const sessao = await auth.api.getSession({ headers: await headers(), query: { disableRefresh: true } });
  if (sessao?.user.twoFactorEnabled && !sessao.session.mfaVerificado) return null;
  return sessao;
}

export async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  return sessao;
}

/**
 * Acesso a uma loja no painel: sessão válida + vínculo ativo (ou operador),
 * conferidos no banco a cada página. Sem acesso, a loja "não existe" (404),
 * para ninguém descobrir lojas pelo endereço.
 */
export async function exigirAcessoLoja(slug: string, papeis?: PapelDeAcesso[]) {
  const sessao = await exigirSessao();
  const acesso = await acessoNaLoja(contexto().db, sessao.user.id, slug);
  if (!acesso || (papeis && !papeis.includes(acesso.papel))) notFound();
  if (acesso.papel === "operador" && !sessao.user.twoFactorEnabled) redirect("/seguranca");
  return { sessao, acesso };
}

/** Mesma conferência para Server Actions: devolve null em vez de redirecionar. */
export async function acessoParaAcao(slug: unknown, papeis?: PapelDeAcesso[]): Promise<Acesso | null> {
  if (typeof slug !== "string") return null;
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  const acesso = await acessoNaLoja(contexto().db, sessao.user.id, slug);
  if (!acesso || (papeis && !papeis.includes(acesso.papel))) return null;
  if (acesso.papel === "operador" && !sessao.user.twoFactorEnabled) return null;
  return acesso;
}

/** Operador ativo e com segundo fator ligado; quem não é operador não descobre que a página existe. */
export async function exigirOperador() {
  const sessao = await exigirSessao();
  if (!(await ehOperadorAtivo(contexto().db, sessao.user.id))) notFound();
  if (!sessao.user.twoFactorEnabled) redirect("/seguranca");
  return sessao;
}
