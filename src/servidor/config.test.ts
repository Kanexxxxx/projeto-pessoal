import { describe, expect, it } from "vitest";
import { lerConfig } from "./config";

const valido = {
  NODE_ENV: "development",
  NEXAKEEP_DOMINIO_BASE: "localhost:3000",
  NEXAKEEP_PROTOCOLO: "http",
  DATABASE_URL: "postgres://nexakeep_app@127.0.0.1:54329/nexakeep",
  BETTER_AUTH_SECRET: "x".repeat(40),
};

describe("lerConfig", () => {
  it("monta as origens do painel e da plataforma a partir do domínio base", () => {
    const c = lerConfig(valido);
    expect(c.urlPainel).toBe("http://app.localhost:3000");
    expect(c.urlPlataforma).toBe("http://localhost:3000");
    expect(c.marca).toBe("Nexakeep");
  });

  it("recusa segredo curto e cita só o nome da variável", () => {
    const segredo = "curto-demais"; // publicacao:ficticio
    let mensagem = "";
    try {
      lerConfig({ ...valido, BETTER_AUTH_SECRET: segredo });
    } catch (e) {
      mensagem = (e as Error).message;
    }
    expect(mensagem).toContain("BETTER_AUTH_SECRET");
    expect(mensagem).not.toContain(segredo);
  });

  it("produção exige https", () => {
    expect(() => lerConfig({ ...valido, NODE_ENV: "production" })).toThrow(/https/);
    expect(lerConfig({ ...valido, NODE_ENV: "production", NEXAKEEP_PROTOCOLO: "https" }).urlPainel).toBe(
      "https://app.localhost:3000",
    );
  });

  it("recusa domínio com caminho ou esquema", () => {
    expect(() => lerConfig({ ...valido, NEXAKEEP_DOMINIO_BASE: "https://nexakeep.site" })).toThrow(/NEXAKEEP_DOMINIO_BASE/);
    expect(() => lerConfig({ ...valido, NEXAKEEP_DOMINIO_BASE: "nexakeep.site/x" })).toThrow(/NEXAKEEP_DOMINIO_BASE/);
  });
});
