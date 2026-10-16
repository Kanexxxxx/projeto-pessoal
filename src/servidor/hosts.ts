/**
 * Decide para qual área da plataforma vai uma requisição, a partir do Host.
 *
 * O Host vem do cliente e não autentica ninguém (ARQUITETURA.md §1). Aqui só
 * se escolhe a árvore de rotas; a loja é conferida no banco pela página e a
 * sessão, pelo servidor.
 *
 *   nexakeep.site, www.nexakeep.site   → plataforma (apresentação)
 *   app.nexakeep.site                  → painel (login, lojas, CRM do operador)
 *   <slug>.nexakeep.site               → site público da loja
 */
export type Destino =
  | { tipo: "plataforma" }
  | { tipo: "painel" }
  | { tipo: "loja"; slug: string }
  | { tipo: "desconhecido" };

/** Subdomínios que nunca podem virar loja. */
export const SUBDOMINIOS_RESERVADOS: ReadonlySet<string> = new Set([
  "app", "www", "api", "admin", "painel", "auth", "login", "conta", "contas", "sso", "oauth",
  "status", "monitor", "metricas", "backup", "webhook", "webhooks", "whatsapp", "wa",
  "mail", "email", "webmail", "smtp", "imap", "pop", "mx", "autodiscover", "ns1", "ns2",
  "ftp", "cdn", "static", "assets", "img", "midia",
  "suporte", "ajuda", "help", "docs", "blog", "cobranca", "pagamento", "pix",
  "dev", "teste", "test", "staging", "homologacao", "demo", "localhost", "nexakeep",
]);

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Slug de loja: minúsculas, dígitos e hífen, 1 a 40 caracteres, sem reservados. */
export function slugValido(slug: string): boolean {
  return (
    SLUG.test(slug) &&
    !slug.includes("--") && // inclui o prefixo IDN "xn--"
    !SUBDOMINIOS_RESERVADOS.has(slug)
  );
}

/**
 * Host original da requisição.
 *
 * Prefere `x-forwarded-host` porque o Next o preenche com o Host original
 * (base-server) e o repassa na busca interna que faz ao redirecionar uma
 * Server Action — nessa busca o `fetch` do Node troca o Host pelo endereço do
 * próprio servidor, e o painel virava a página da plataforma.
 *
 * Na VPS o proxy reverso precisa SOBRESCREVER este cabeçalho com o Host real
 * (o Caddy faz por padrão; no nginx: `proxy_set_header X-Forwarded-Host $host`).
 * Mesmo forjado, ele só escolhe a árvore de rotas: sessão e loja continuam
 * conferidas no servidor.
 */
export function hostDaRequisicao(headers: Headers): string | null {
  const encaminhado = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return encaminhado || headers.get("host");
}

function normalizarHost(host: string): string {
  let h = host.trim().toLowerCase();
  if (h.endsWith(".")) h = h.slice(0, -1);
  return h.replace(/:(80|443)$/, "");
}

export function resolverHost(host: string | null | undefined, dominioBase: string): Destino {
  if (!host) return { tipo: "desconhecido" };
  const h = normalizarHost(host);
  const base = normalizarHost(dominioBase);
  if (!base) return { tipo: "desconhecido" };

  if (h === base || h === `www.${base}`) return { tipo: "plataforma" };
  if (h === `app.${base}`) return { tipo: "painel" };
  if (!h.endsWith(`.${base}`)) return { tipo: "desconhecido" };

  const rotulo = h.slice(0, -(base.length + 1));
  if (rotulo.includes(".") || !slugValido(rotulo)) return { tipo: "desconhecido" };
  return { tipo: "loja", slug: rotulo };
}

/**
 * Caminho interno do App Router para o destino. Toda rota recebe o prefixo da
 * sua área, então `/painel/...` pedido no host de uma loja vira
 * `/loja/<slug>/painel/...` e cai em 404: uma área nunca alcança a outra.
 * Só o painel atende `/api/*` (autenticação e webhooks).
 */
export function caminhoInterno(destino: Destino, caminho: string): string | null {
  const resto = caminho === "/" ? "" : caminho;
  switch (destino.tipo) {
    case "plataforma":
      return `/plataforma${resto}`;
    case "painel":
      return caminho.startsWith("/api/") ? caminho : `/painel${resto}`;
    case "loja":
      return `/loja/${destino.slug}${resto}`;
    case "desconhecido":
      return null;
  }
}
