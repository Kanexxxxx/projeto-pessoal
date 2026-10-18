import { contraste, textoSobre } from "@/dominio/contato";

/**
 * Cartela de amostras (DESIGN.md §3.2): uma cor por serviço, derivada da cor
 * da loja. Trabalha em OKLCH (luminosidade percebida, croma e matiz) para
 * girar o matiz sem mudar o "peso" da cor, e garante texto legível em cada
 * amostra (≥ 4,5:1).
 */
export type Amostra = { fundo: string; texto: "#ffffff" | "#111111" };

type Oklch = { l: number; c: number; h: number };

const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gama = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function paraOklch(hex: string): Oklch {
  const [r, g, b] = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

/** OKLCH → sRGB linear (pode sair da faixa 0–1 se a cor não existe em sRGB). */
function paraRgb({ l: L, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Converte para hex, reduzindo o croma até a cor caber em sRGB. */
function paraHex(cor: Oklch): string {
  let c = cor.c;
  let rgb = paraRgb({ ...cor, c });
  while (rgb.some((v) => v < -0.0005 || v > 1.0005) && c > 0) {
    c = Math.max(0, c - 0.005);
    rgb = paraRgb({ ...cor, c });
  }
  return `#${rgb.map((v) => Math.round(gama(Math.min(1, Math.max(0, v))) * 255).toString(16).padStart(2, "0")).join("")}`;
}

// Coleção dentro da família da cor da loja (como os tons de uma marca de
// esmalte): o matiz gira no máximo 40°, e a variedade vem da luz e do croma.
const GIROS = [0, 22, -18, 36, -30, 10, -10, 28, -24, 40, -38, 16, -14, 32, -34, 4];
const LUZES = [0, 0.12, -0.08, 0.2, -0.13, 0.06, 0.16, -0.04, 0.09, -0.11, 0.23, 0.02, -0.15, 0.13, -0.02, 0.18];
const CROMAS = [1, 0.7, 1.1, 0.55, 0.9, 1.2, 0.65, 1, 0.8, 1.15, 0.5, 0.95, 1.05, 0.6, 0.85, 0.75];

/** Desvio de matiz máximo da cartela em relação à cor da loja (graus). */
export const DESVIO_MAXIMO = 45;

export function amostras(cor: string, quantidade: number): Amostra[] {
  const base = paraOklch(cor);
  // Cor quase sem croma (preto, cinza): a cartela parte de um matiz quente.
  const matiz = base.c < 0.03 ? 25 : base.h;
  const croma = Math.min(Math.max(base.c, 0.1), 0.16);
  const luz = Math.min(Math.max(base.l, 0.5), 0.66);
  const resultado: Amostra[] = [];
  for (let i = 0; i < quantidade; i++) {
    const giro = GIROS[i % GIROS.length]! + (Math.floor(i / GIROS.length) % 2 ? 3 : 0);
    const c = croma * CROMAS[i % CROMAS.length]!;
    let l = Math.min(0.88, Math.max(0.4, luz + LUZES[i % LUZES.length]!));
    let fundo = paraHex({ l, c, h: (matiz + giro + 360) % 360 });
    let texto = textoSobre(fundo);
    // Ajusta a luz até o texto passar de 4,5:1 (clareia sob texto escuro, escurece sob branco).
    for (let passo = 0; passo < 30 && contraste(fundo, texto) < 4.5; passo++) {
      l += texto === "#111111" ? 0.015 : -0.015;
      fundo = paraHex({ l, c, h: (matiz + giro + 360) % 360 });
      texto = textoSobre(fundo);
    }
    resultado.push({ fundo, texto });
  }
  return resultado;
}
