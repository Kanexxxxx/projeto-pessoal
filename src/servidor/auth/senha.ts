import { SENHA } from "./politicas";

/**
 * Regras de senha além do tamanho que a biblioteca já confere. Não exige
 * "símbolo e maiúscula" (isso empurra para senhas previsíveis); recusa o que
 * é trivial de adivinhar.
 */
const COMUNS = new Set([
  "1234567890", "12345678910", "0123456789", "9876543210", "1111111111", "1234512345",
  "senha12345", "senha123456", "minhasenha", "minhasenha1", "qwertyuiop", "asdfghjkla",
  "password12", "password123", "iloveyou12", "admin12345", "abcdefghij", "abc1234567",
  "nexakeep123", "nexakeep12", "brasil2026", "salao12345", "barbearia1",
]);

export function problemaNaSenha(senha: string, contexto: { email?: string; nome?: string; marca?: string } = {}): string | null {
  if (senha.length < SENHA.minimo) return `Use pelo menos ${SENHA.minimo} caracteres.`;
  if (senha.length > SENHA.maximo) return `Use no máximo ${SENHA.maximo} caracteres.`;
  const minuscula = senha.toLowerCase();
  if (/^(.)\1+$/.test(senha)) return "A senha não pode repetir um único caractere.";
  if (COMUNS.has(minuscula)) return "Essa senha é muito comum. Escolha outra.";
  const partes = [contexto.email?.split("@")[0], contexto.nome, contexto.marca]
    .filter((p): p is string => Boolean(p))
    .map((p) => p.toLowerCase().replace(/\s+/g, ""))
    .filter((p) => p.length >= 4);
  if (partes.some((p) => minuscula.replace(/\s+/g, "").includes(p))) {
    return "A senha não pode conter seu nome, seu e-mail ou o nome da plataforma.";
  }
  return null;
}
