/**
 * Classes comuns que leem os tokens do modelo (tipos.ts). Usadas pela parte
 * comum do site (agendamento, confirmação) e pelo painel, para títulos e foco
 * seguirem o modelo escolhido.
 */
export const TITULO = "font-(family-name:--f-titulo) font-(--titulo-peso) [text-transform:var(--titulo-caixa)] tracking-(--titulo-espaco)";

/**
 * Faixa de comprimento do nome da loja. Cada modelo transforma a faixa em
 * tamanho de letra, para o título não passar de duas linhas (DESIGN.md §0).
 */
export type FaixaDoNome = "curto" | "medio" | "longo" | "muitoLongo";

export function faixaDoNome(nome: string): FaixaDoNome {
  const n = nome.trim().length;
  if (n <= 12) return "curto";
  if (n <= 22) return "medio";
  if (n <= 36) return "longo";
  return "muitoLongo";
}

export const FOCO ="outline-none focus-visible:ring-2 focus-visible:ring-(--l-foco) focus-visible:ring-offset-2 focus-visible:ring-offset-(--l-fundo)";
