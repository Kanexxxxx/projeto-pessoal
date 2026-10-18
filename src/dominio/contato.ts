/**
 * Telefone, dinheiro, cor e link de WhatsApp manual.
 *
 * Telefone é sempre guardado e comparado normalizado (E.164); sem telefone
 * válido, nada é inventado (BASE-ANTERIOR.md §4, regra 8).
 */

/** Celular ou fixo brasileiro → "+55DDNNNNNNNNN". Aceita com ou sem 55, espaços, traços e parênteses. */
export function normalizarTelefoneBR(texto: string): string | null {
  if (!/^[\d\s()+.-]{8,25}$/.test(texto.trim())) return null;
  let d = texto.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  else if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  if (!/^[1-9]\d/.test(d)) return null;
  const local = d.slice(2);
  const celular = local.length === 9 && local.startsWith("9");
  const fixo = local.length === 8 && /^[2-5]/.test(local);
  return celular || fixo ? `+55${d}` : null;
}

/** "+5520987654321" → "(20) 98765-4321". */
export function telefoneLegivel(e164: string): string {
  const d = e164.replace(/^\+55/, "");
  const ddd = d.slice(0, 2);
  const local = d.slice(2);
  const corte = local.length === 9 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, corte)}-${local.slice(corte)}`;
}

/** Final do telefone para logs e telas de lista: "•••• 4321". */
export function telefoneMascarado(e164: string): string {
  return `•••• ${e164.slice(-4)}`;
}

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(centavos: number | null): string {
  return centavos === null ? "Sob consulta" : reais.format(centavos / 100);
}

/** "45", "45,9", "45,90", "1.250,00" → centavos. Vazio → null (sob consulta). */
export function interpretarPreco(texto: string): number | null | "invalido" {
  const t = texto.trim().replace(/^R\$\s*/i, "");
  if (!t) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return "invalido";
  const [inteiro = "0", fracao = ""] = t.replace(/\./g, "").split(",");
  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  return centavos <= 10_000_000 ? centavos : "invalido";
}

export function corValida(cor: string): boolean {
  return /^#[0-9a-f]{6}$/.test(cor);
}

function luminancia(cor: string): number {
  const canal = (i: number) => {
    const v = parseInt(cor.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Texto legível sobre a cor da marca (preto ou branco, o que contrastar mais). */
export function textoSobre(cor: string): "#ffffff" | "#111111" {
  return contraste(cor, "#ffffff") >= contraste(cor, "#111111") ? "#ffffff" : "#111111";
}

/** Mistura duas cores "#rrggbb": `peso` é quanto de `cor` entra (0 a 1). Ex.: um tom claro da marca. */
export function misturar(cor: string, base: string, peso: number): string {
  const canal = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  const p = Math.min(1, Math.max(0, peso));
  return `#${[1, 3, 5]
    .map((i) => Math.round(canal(cor, i) * p + canal(base, i) * (1 - p)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Link wa.me com mensagem pronta (modo manual do plano básico: quem envia é a pessoa). */
export function linkWhatsApp(e164: string, texto: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}
