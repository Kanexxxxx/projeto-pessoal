import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { contexto } from "./acesso";
import { ehOperadorAtivo } from "./auth/operadores";

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

/** Operador ativo e com segundo fator ligado; quem não é operador não descobre que a página existe. */
export async function exigirOperador() {
  const sessao = await exigirSessao();
  if (!(await ehOperadorAtivo(contexto().db, sessao.user.id))) notFound();
  if (!sessao.user.twoFactorEnabled) redirect("/seguranca");
  return sessao;
}
