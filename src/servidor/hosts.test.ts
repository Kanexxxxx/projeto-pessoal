import { describe, expect, it } from "vitest";
import { caminhoInterno, hostDaRequisicao, resolverHost, slugValido } from "./hosts";

describe("hostDaRequisicao", () => {
  it("prefere o host encaminhado (redirecionamento interno das Server Actions)", () => {
    expect(hostDaRequisicao(new Headers({ host: "localhost:3000", "x-forwarded-host": "app.localhost:3000" }))).toBe("app.localhost:3000");
  });

  it("usa o primeiro valor quando há vários proxies e cai para o Host", () => {
    expect(hostDaRequisicao(new Headers({ "x-forwarded-host": " loja-a.nexakeep.site , interno:3000" }))).toBe("loja-a.nexakeep.site");
    expect(hostDaRequisicao(new Headers({ host: "app.nexakeep.site" }))).toBe("app.nexakeep.site");
    expect(hostDaRequisicao(new Headers({ host: "app.nexakeep.site", "x-forwarded-host": "" }))).toBe("app.nexakeep.site");
    expect(hostDaRequisicao(new Headers())).toBeNull();
  });
});

const BASE = "nexakeep.site";

describe("resolverHost", () => {
  it("reconhece a plataforma, o painel e as lojas", () => {
    expect(resolverHost("nexakeep.site", BASE)).toEqual({ tipo: "plataforma" });
    expect(resolverHost("www.nexakeep.site", BASE)).toEqual({ tipo: "plataforma" });
    expect(resolverHost("app.nexakeep.site", BASE)).toEqual({ tipo: "painel" });
    expect(resolverHost("salao-da-ana.nexakeep.site", BASE)).toEqual({ tipo: "loja", slug: "salao-da-ana" });
  });

  it("normaliza caixa, ponto final e porta padrão", () => {
    expect(resolverHost("LOJA-A.NexaKeep.Site.", BASE)).toEqual({ tipo: "loja", slug: "loja-a" });
    expect(resolverHost("app.nexakeep.site:443", BASE)).toEqual({ tipo: "painel" });
  });

  it("recusa hosts que só parecem da plataforma", () => {
    for (const host of [
      "evilnexakeep.site", // sem o ponto antes da base
      "nexakeep.site.evil.com",
      "loja-a.nexakeep.site.evil.com",
      "x.loja-a.nexakeep.site", // dois níveis
      "evil.com",
      "",
      "  ",
    ]) {
      expect(resolverHost(host, BASE), host).toEqual({ tipo: "desconhecido" });
    }
    expect(resolverHost(null, BASE)).toEqual({ tipo: "desconhecido" });
  });

  it("não deixa subdomínio reservado, IDN ou formato inválido virar loja", () => {
    for (const rotulo of ["api", "admin", "www2-", "-loja", "loja_a", "xn--80ak6aa92e", "a--b", "a".repeat(41)]) {
      expect(resolverHost(`${rotulo}.${BASE}`, BASE), rotulo).toEqual({ tipo: "desconhecido" });
    }
  });

  it("no desenvolvimento, a porta faz parte da base", () => {
    expect(resolverHost("localhost:3000", "localhost:3000")).toEqual({ tipo: "plataforma" });
    expect(resolverHost("app.localhost:3000", "localhost:3000")).toEqual({ tipo: "painel" });
    expect(resolverHost("loja-a.localhost:3000", "localhost:3000")).toEqual({ tipo: "loja", slug: "loja-a" });
    expect(resolverHost("loja-a.localhost:3001", "localhost:3000")).toEqual({ tipo: "desconhecido" });
  });
});

describe("caminhoInterno", () => {
  it("prefixa cada área e impede uma área de alcançar a outra", () => {
    expect(caminhoInterno({ tipo: "plataforma" }, "/")).toBe("/plataforma");
    expect(caminhoInterno({ tipo: "painel" }, "/entrar")).toBe("/painel/entrar");
    expect(caminhoInterno({ tipo: "loja", slug: "loja-a" }, "/agendar")).toBe("/loja/loja-a/agendar");
    expect(caminhoInterno({ tipo: "loja", slug: "loja-a" }, "/painel/x")).toBe("/loja/loja-a/painel/x");
    expect(caminhoInterno({ tipo: "plataforma" }, "/loja/loja-b")).toBe("/plataforma/loja/loja-b");
  });

  it("só o painel atende /api", () => {
    expect(caminhoInterno({ tipo: "painel" }, "/api/auth/get-session")).toBe("/api/auth/get-session");
    expect(caminhoInterno({ tipo: "loja", slug: "loja-a" }, "/api/auth/get-session")).toBe("/loja/loja-a/api/auth/get-session");
    expect(caminhoInterno({ tipo: "plataforma" }, "/api/auth/x")).toBe("/plataforma/api/auth/x");
    expect(caminhoInterno({ tipo: "desconhecido" }, "/")).toBeNull();
  });
});

describe("slugValido", () => {
  it("aceita slugs simples e recusa reservados", () => {
    expect(slugValido("barbearia-do-ze")).toBe(true);
    expect(slugValido("a")).toBe(true);
    expect(slugValido("app")).toBe(false);
    expect(slugValido("Loja")).toBe(false);
  });
});
