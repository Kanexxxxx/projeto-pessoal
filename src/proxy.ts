import { NextResponse, type NextRequest } from "next/server";
import { caminhoInterno, hostDaRequisicao, resolverHost } from "@/servidor/hosts";

/**
 * Encaminha cada host para a árvore de rotas da sua área (ver servidor/hosts.ts).
 *
 * Não é fronteira de segurança: só reescreve o caminho. Sessão, papel e loja
 * são conferidos no servidor, em cada página e em cada ação.
 */
export function proxy(request: NextRequest) {
  const destino = resolverHost(hostDaRequisicao(request.headers), process.env.NEXAKEEP_DOMINIO_BASE ?? "");
  const caminho = caminhoInterno(destino, request.nextUrl.pathname);
  if (caminho === null) {
    return new NextResponse("Endereço não encontrado.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const url = request.nextUrl.clone();
  url.pathname = caminho;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
