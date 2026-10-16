import { describe, expect, it } from "vitest";
import { mascararEmail, mascararTelefone } from "./privacidade";

describe("mascaramento", () => {
  it("e-mail mostra só a inicial e o domínio", () => {
    expect(mascararEmail("dona@loja-a.test")).toBe("d***@loja-a.test");
    expect(mascararEmail("sem-arroba")).toBe("***");
  });

  it("telefone mostra só os 4 últimos dígitos", () => {
    expect(mascararTelefone("+55 (20) 99999-0001")).toBe("***0001");
    expect(mascararTelefone("12")).toBe("***");
  });
});
