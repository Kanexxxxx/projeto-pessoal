import { describe, expect, it } from "vitest";
import { problemaNaSenha } from "./senha";

describe("problemaNaSenha", () => {
  it("aceita frase longa e comum o suficiente para lembrar", () => {
    expect(problemaNaSenha("cafe com pao de queijo")).toBeNull();
  });

  it("recusa curta, repetida e muito comum", () => {
    expect(problemaNaSenha("curta")).toMatch(/10 caracteres/);
    expect(problemaNaSenha("aaaaaaaaaaaa")).toMatch(/repetir/);
    expect(problemaNaSenha("Senha12345")).toMatch(/comum/);
  });

  it("recusa senha que contém o e-mail, o nome ou a marca", () => {
    expect(problemaNaSenha("juliana-2026!", { email: "juliana@loja-a.test" })).toMatch(/nome/);
    expect(problemaNaSenha("x Ana Paula x9", { nome: "Ana Paula" })).toMatch(/nome/);
    expect(problemaNaSenha("minha-nexakeep-9", { marca: "Nexakeep" })).toMatch(/plataforma/);
  });
});
