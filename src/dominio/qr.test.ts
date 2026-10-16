import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { gerarMatriz, qrParaSvg, type NivelCorrecao } from "./qr";

/**
 * O codificador próprio conferido contra uma implementação independente (o
 * pacote `qrcode`, usado só nos testes). Não comparamos com a nossa própria
 * expectativa — isso não provaria nada.
 *
 * Os textos são neutros e sintéticos. Capacidade em bytes no nível H, versões
 * 1..15 (ISO/IEC 18004): o texto enche a versão no nível mais exigente.
 */
const CAPACIDADE_H = [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220];
const NIVEIS: NivelCorrecao[] = ["L", "M", "Q", "H"];

function texto(bytes: number): string {
  const base = "Nexakeep agenda teste 0123456789 ";
  return base.repeat(Math.ceil(bytes / base.length)).slice(0, bytes);
}

function referencia(t: string, versao: number, nivel: NivelCorrecao, mascara: number): boolean[][] {
  const qr = QRCode.create([{ data: new TextEncoder().encode(t), mode: "byte" }], {
    version: versao,
    errorCorrectionLevel: nivel,
    maskPattern: mascara as QRCode.QRCodeMaskPattern,
  });
  const { size, data } = qr.modules;
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => data[y * size + x] === 1));
}

describe("QR igual ao gerador de referência", () => {
  it("versões 1 a 15, quatro níveis, todas as máscaras", () => {
    const divergentes: string[] = [];
    let casos = 0;
    for (let versao = 1; versao <= 15; versao++) {
      for (const [i, nivel] of NIVEIS.entries()) {
        const mascara = (versao + i) % 8;
        const t = texto(CAPACIDADE_H[versao - 1]!);
        casos++;
        const nosso = gerarMatriz(t, { versao, nivel, mascara });
        if (JSON.stringify(nosso) !== JSON.stringify(referencia(t, versao, nivel, mascara))) {
          divergentes.push(`v${versao}${nivel}m${mascara}`);
        }
      }
    }
    expect(casos).toBe(60);
    expect(divergentes).toEqual([]);
  });

  it("as oito máscaras nas versões em que a norma muda de comportamento (1, 7 e 8)", () => {
    for (const versao of [1, 7, 8]) {
      for (let mascara = 0; mascara < 8; mascara++) {
        const t = texto(CAPACIDADE_H[versao - 1]!);
        expect(gerarMatriz(t, { versao, nivel: "M", mascara }), `v${versao}m${mascara}`).toEqual(referencia(t, versao, "M", mascara));
      }
    }
  });

  it("texto com acentos é codificado em UTF-8", () => {
    const t = "Confirmação às 14h — Salão Fictício";
    expect(new TextEncoder().encode(t).length).toBeGreaterThan(t.length);
    expect(gerarMatriz(t, { versao: 4, nivel: "M", mascara: 2 })).toEqual(referencia(t, 4, "M", 2));
  });

  it("recusa texto que não cabe na versão pedida", () => {
    expect(() => gerarMatriz(texto(100), { versao: 1, nivel: "H" })).toThrow(/não cabem/);
  });
});

describe("qrParaSvg", () => {
  it("gera um SVG com borda de silêncio", () => {
    const svg = qrParaSvg("otpauth://totp/Nexakeep:op@nexakeep.test?secret=JBSWY3DPEHPK3PXP");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
  });

  it("só aceita cores #rrggbb (a cor pode vir do tema de uma loja)", () => {
    expect(() => qrParaSvg("x", { escuro: '#000"/><script>alert(1)</script><x a="' })).toThrow(/cor inválida/);
    expect(() => qrParaSvg("x", { claro: "red" })).toThrow(/cor inválida/);
    expect(qrParaSvg("x", { escuro: "#7A4E2D", claro: "#FAF8F5" })).toContain('fill="#7A4E2D"');
  });
});
