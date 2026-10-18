import { describe, expect, it } from "vitest";
import { contraste } from "@/dominio/contato";
import { amostras, DESVIO_MAXIMO, paraOklch } from "./amostras";

// As 10 cores que a dona pode escolher no painel (aba Site).
const CORES = ["#b3202a", "#7a4e2d", "#1f1b16", "#8c2f39", "#c2185b", "#6a1b9a", "#1565c0", "#00695c", "#2e7d32", "#b8860b"];

describe("cartela de amostras", () => {
  it("gera cores válidas, distintas e com texto legível para qualquer cor da loja", () => {
    for (const cor of CORES) {
      const lista = amostras(cor, 12);
      expect(lista).toHaveLength(12);
      for (const a of lista) {
        expect(a.fundo).toMatch(/^#[0-9a-f]{6}$/);
        expect(contraste(a.fundo, a.texto)).toBeGreaterThanOrEqual(4.5);
      }
      expect(new Set(lista.map((a) => a.fundo)).size).toBe(12);
    }
  });

  it("fica na família da cor da loja (matiz a no máximo 45°) e varia em luz e intensidade", () => {
    for (const cor of CORES.filter((c) => paraOklch(c).c >= 0.03)) {
      const base = paraOklch(cor).h;
      const lista = amostras(cor, 12).map((a) => paraOklch(a.fundo));
      for (const a of lista) {
        const desvio = Math.abs(((a.h - base + 540) % 360) - 180);
        expect(desvio).toBeLessThanOrEqual(DESVIO_MAXIMO);
      }
      // Tons de verdade diferentes: claros e escuros na mesma cartela.
      const luzes = lista.map((a) => a.l);
      expect(Math.max(...luzes) - Math.min(...luzes)).toBeGreaterThan(0.2);
    }
  });

  it("a primeira amostra é a cor da loja (ou bem perto); preto e cinza viram cor de verdade", () => {
    const distancia = (a: string, b: string) => Math.hypot(...[1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)));
    for (const cor of ["#1565c0", "#c2185b", "#00695c"]) expect(distancia(amostras(cor, 1)[0]!.fundo, cor)).toBeLessThan(60);
    for (const a of amostras("#1f1b16", 3)) {
      const c = [1, 3, 5].map((i) => parseInt(a.fundo.slice(i, i + 2), 16));
      expect(Math.max(...c) - Math.min(...c)).toBeGreaterThan(40); // não é cinza
    }
  });
});
