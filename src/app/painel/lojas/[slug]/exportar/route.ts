import { contexto } from "@/servidor/acesso";
import { acessoNaLoja } from "@/servidor/lojas/lojas";
import { exportarLoja } from "@/servidor/lojas/exportar";

export const dynamic = "force-dynamic";

/** Download da exportação da loja. Mesma conferência das páginas: sessão com MFA (se ligado) e vínculo. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { auth, db } = contexto();
  const sessao = await auth.api.getSession({ headers: request.headers, query: { disableRefresh: true } });
  const naoEncontrado = () => new Response("Não encontrado.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!sessao || (sessao.user.twoFactorEnabled && !sessao.session.mfaVerificado)) return naoEncontrado();
  const acesso = await acessoNaLoja(db, sessao.user.id, slug);
  if (!acesso || (acesso.papel === "operador" && !sessao.user.twoFactorEnabled)) return naoEncontrado();
  const dados = await exportarLoja(db, acesso);
  if (!dados) return naoEncontrado();
  const data = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${acesso.loja.slug}-${data}.json"`,
      "cache-control": "no-store",
    },
  });
}
