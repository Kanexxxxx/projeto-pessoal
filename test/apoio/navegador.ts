/**
 * Pote de cookies mínimo para simular um navegador nos testes: aplica os
 * Set-Cookie recebidos e monta o cabeçalho Cookie das próximas requisições.
 */
export type CookieRecebido = {
  nome: string;
  valor: string;
  atributos: Record<string, string | true>;
};

export function lerSetCookie(linha: string): CookieRecebido {
  const [par = "", ...resto] = linha.split(";");
  const i = par.indexOf("=");
  const atributos: Record<string, string | true> = {};
  for (const a of resto) {
    const [k = "", ...v] = a.trim().split("=");
    if (k) atributos[k.toLowerCase()] = v.length ? v.join("=") : true;
  }
  return { nome: par.slice(0, i).trim(), valor: par.slice(i + 1).trim(), atributos };
}

export class Navegador {
  readonly cookies = new Map<string, string>();
  readonly recebidos: CookieRecebido[] = [];

  constructor(private readonly base: Record<string, string> = {}) {}

  aplicar(setCookies: string[]): this {
    for (const linha of setCookies) {
      const c = lerSetCookie(linha);
      this.recebidos.push(c);
      const expira = c.atributos.expires;
      const vencido = c.atributos["max-age"] === "0" || (typeof expira === "string" && new Date(expira).getTime() < Date.now());
      if (vencido || c.valor === "") this.cookies.delete(c.nome);
      else this.cookies.set(c.nome, c.valor);
    }
    return this;
  }

  headers(extra: Record<string, string> = {}): Headers {
    const h = new Headers({ ...this.base, ...extra });
    if (this.cookies.size) h.set("cookie", [...this.cookies].map(([n, v]) => `${n}=${v}`).join("; "));
    return h;
  }
}
