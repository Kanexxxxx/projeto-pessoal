import type { CSSProperties, ReactNode } from "react";
import type { ModeloSite, Segmento } from "@/servidor/bd/tipos";

/**
 * Contrato entre a plataforma e os modelos de site (DESIGN.md).
 *
 * A plataforma monta a `Vitrine` (dados reais da loja, já formatados e com os
 * horários livres calculados pela mesma conta da reserva). O modelo só decide
 * a forma: nenhuma regra de negócio, consulta ao banco ou cálculo de agenda
 * dentro de um modelo.
 */

/** Um horário livre de verdade, com o link que já abre a reserva nele. */
export type VagaVitrine = {
  data: string; // "2026-10-17"
  dia: string; // "Hoje", "Amanhã", "Sáb, 18/10"
  diaCurto: string; // "Hoje", "Amanhã", "Sáb 18"
  hora: string; // "14:30"
  href: string; // /agendar?servico=…&prof=…&data=…&hora=…
};

export type ServicoVitrine = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao: string; // "40 min", "1h10"
  duracaoMin: number;
  preco: string; // "R$ 45,00" ou "Sob consulta"
  temPreco: boolean;
  href: string; // /agendar?servico=…
  proximas: VagaVitrine[]; // até 3, pode ser vazio
};

export type PessoaVitrine = {
  id: string;
  nome: string;
  iniciais: string;
  servicos: string[]; // nomes dos serviços que faz
  proxima: (VagaVitrine & { servico: string }) | null;
};

/** Um dia da agenda: horários espalhados pelo dia e os serviços livres em cada um. */
export type DiaAgendaVitrine = {
  data: string;
  dia: string; // "Hoje", "Amanhã", "Sáb, 18/10"
  livres: number; // quantos horários livres o dia tem (de qualquer serviço)
  horas: {
    hora: string;
    href: string; // /agendar?data=…&hora=… — o horário primeiro; o serviço é escolhido em seguida
    todos: boolean; // todos os serviços estão livres neste horário
    servicos: { nome: string; href: string }[];
  }[];
};

export type DiaVitrine = {
  dia: number; // 0 = domingo
  nome: string; // "segunda"
  curto: string; // "seg"
  hoje: boolean;
  aberto: boolean;
  texto: string; // "09:00–12:00 · 13:30–19:00" ou "Fechado"
  intervalos: { inicioMin: number; fimMin: number }[];
};

export type Vitrine = {
  loja: { nome: string; slug: string; segmento: Segmento; segmentoNome: string; iniciais: string };
  chamada: string | null;
  sobre: string | null;
  endereco: string | null;
  cor: string; // cor da marca escolhida pela dona, "#rrggbb"
  contato: {
    whatsapp: { texto: string; href: string } | null;
    instagram: { texto: string; href: string } | null;
    mapa: string | null;
  };
  servicos: ServicoVitrine[];
  equipe: PessoaVitrine[];
  semana: DiaVitrine[]; // de segunda a domingo
  agora: { aberto: boolean; texto: string };
  /** Os próximos dias com vaga (até 3), com até 4 horários espalhados em cada um. */
  agenda: DiaAgendaVitrine[];
  /** O primeiro horário livre de qualquer serviço (a "próxima vaga" da loja). */
  proxima: (VagaVitrine & { servico: string; servicoId: string }) | null;
  agendarHref: string;
  marca: string; // nome da plataforma, para o rodapé
  mes: string; // "outubro de 2026"
};

/**
 * Tokens que o modelo define e que a parte comum (aviso de implantação,
 * agendamento, confirmação) usa. Todas as cores de texto precisam de
 * contraste ≥ 4,5:1 sobre `--l-fundo` e `--l-superficie`.
 */
export type TokensModelo = {
  "--l-fundo": string;
  "--l-superficie": string;
  "--l-texto": string;
  "--l-suave": string;
  "--marca": string;
  "--marca-texto": string;
  "--l-foco": string;
  "--raio": string; // botões, campos, horários
  "--raio-bloco": string; // blocos maiores
  "--f-titulo": string; // família dos títulos
  "--f-texto": string; // família do texto
  "--titulo-peso": string;
  "--titulo-caixa": "none" | "uppercase";
  "--titulo-espaco": string; // letter-spacing
};

export type Modelo = {
  id: ModeloSite;
  nome: string;
  /** Uma frase para a dona escolher no painel. */
  descricao: string;
  /** Para que tipo de loja ele foi pensado. */
  sugerido: string;
  /** Classes com as variáveis das fontes (next/font). */
  fontes: string;
  tokens: (cor: string, corTexto: "#ffffff" | "#111111") => TokensModelo;
  Inicio: (p: { v: Vitrine }) => ReactNode;
};

export function estiloDosTokens(t: TokensModelo): CSSProperties {
  return t as unknown as CSSProperties;
}
