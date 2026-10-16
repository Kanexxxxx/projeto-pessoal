import { describe, expect, it } from "vitest";
import { contraste, formatarPreco, interpretarPreco, linkWhatsApp, normalizarTelefoneBR, telefoneLegivel, textoSobre } from "./contato";

// Telefones com DDD 20, não atribuído pela Anatel (dados fictícios).
describe("telefone", () => {
  it("normaliza celular e fixo em vários formatos", () => {
    for (const t of ["(20) 98765-4321", "20 98765 4321", "20987654321", "+55 20 98765-4321", "5520987654321", "020987654321"]) {
      expect(normalizarTelefoneBR(t)).toBe("+5520987654321");
    }
    expect(normalizarTelefoneBR("(20) 3456-7890")).toBe("+552034567890");
  });

  it("recusa o que não é telefone brasileiro, sem inventar dígitos", () => {
    for (const t of ["", "98765-4321", "(20) 8765-4321x", "(20) 18765-4321", "(20) 6876-5432", "(01) 98765-4321", "abc", "+1 202 555 0100"]) {
      expect(normalizarTelefoneBR(t)).toBeNull();
    }
  });

  it("mostra em formato legível", () => {
    expect(telefoneLegivel("+5520987654321")).toBe("(20) 98765-4321");
    expect(telefoneLegivel("+552034567890")).toBe("(20) 3456-7890");
  });
});

describe("preço", () => {
  it("interpreta reais em centavos e formata de volta", () => {
    expect(interpretarPreco("45")).toBe(4500);
    expect(interpretarPreco("45,9")).toBe(4590);
    expect(interpretarPreco("R$ 1.250,00")).toBe(125000);
    expect(interpretarPreco("")).toBeNull();
    expect(interpretarPreco("45.5")).toBe("invalido");
    expect(interpretarPreco("-3")).toBe("invalido");
    expect(formatarPreco(4590).replace(/\s/g, " ")).toBe("R$ 45,90");
    expect(formatarPreco(null)).toBe("Sob consulta");
  });
});

describe("cor da marca", () => {
  it("escolhe texto legível sobre a cor (contraste WCAG ≥ 4,5 nos casos comuns)", () => {
    for (const cor of ["#7a4e2d", "#111111", "#c2185b", "#1565c0"]) {
      expect(textoSobre(cor)).toBe("#ffffff");
      expect(contraste(cor, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
    // Azul médio e amarelo: branco não passa de 4,5:1, então o texto fica escuro.
    for (const cor of ["#1e88e5", "#f5d76e"]) {
      expect(textoSobre(cor)).toBe("#111111");
      expect(contraste(cor, "#111111")).toBeGreaterThanOrEqual(4.5);
    }
  });
});

it("monta link wa.me com o texto codificado", () => {
  expect(linkWhatsApp("+5520987654321", "Olá! Corte às 14:00")).toBe("https://wa.me/5520987654321?text=Ol%C3%A1!%20Corte%20%C3%A0s%2014%3A00");
});
