/** Prazos e tamanhos do acesso, num lugar só (ARQUITETURA.md §2). */
export const SESSAO = {
  duracaoSegundos: 14 * 24 * 60 * 60,
  renovarAposSegundos: 24 * 60 * 60,
  /** Ações sensíveis exigem login feito há no máximo isto. */
  recenteSegundos: 10 * 60,
};

export const SENHA = { minimo: 10, maximo: 128 };

export const VALIDADE_REDEFINICAO_MINUTOS = 30;
export const VALIDADE_CONVITE_HORAS = 72;
export const VALIDADE_DESAFIO_2FA_SEGUNDOS = 10 * 60;
