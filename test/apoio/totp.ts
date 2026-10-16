import { createHmac } from "node:crypto";

/**
 * TOTP (RFC 6238) independente da biblioteca de autenticação: se os códigos
 * calculados aqui passam, qualquer aplicativo autenticador padrão também passa.
 */
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(texto: string): Buffer {
  const limpo = texto.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let valor = 0;
  const saida: number[] = [];
  for (const caractere of limpo) {
    const i = ALFABETO.indexOf(caractere);
    if (i < 0) throw new Error("base32 inválido");
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      saida.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(saida);
}

export function hotp(segredo: Buffer, contador: number, digitos = 6, algoritmo = "sha1"): string {
  const mensagem = Buffer.alloc(8);
  mensagem.writeBigUInt64BE(BigInt(contador));
  const mac = createHmac(algoritmo, segredo).update(mensagem).digest();
  const deslocamento = mac[mac.length - 1]! & 0x0f;
  const binario = (mac.readUInt32BE(deslocamento) & 0x7fffffff) % 10 ** digitos;
  return String(binario).padStart(digitos, "0");
}

export function totpDaUri(uri: string, quando = Date.now()): string {
  const url = new URL(uri);
  const segredo = url.searchParams.get("secret");
  if (!segredo) throw new Error("URI TOTP sem segredo");
  const periodo = Number(url.searchParams.get("period") ?? 30);
  const digitos = Number(url.searchParams.get("digits") ?? 6);
  return hotp(base32(segredo), Math.floor(quando / 1000 / periodo), digitos);
}
