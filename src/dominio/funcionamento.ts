import { dataCurta, diaDaSemana, hojeNoFuso, nomeDoDia, partesNoFuso, rotuloDeMinutos, somarDias } from "./datas";

/**
 * Funcionamento da loja para a vitrine: "aberto agora", próximos dias e
 * durações escritas como gente escreve. Funções puras, com fuso explícito.
 */
export type Intervalo = { inicioMin: number; fimMin: number };
export type DiaDeFuncionamento = { dia: number; intervalos: Intervalo[] };

export type Situacao = { aberto: boolean; texto: string };

function hora(min: number): string {
  return min >= 1440 ? "meia-noite" : rotuloDeMinutos(min);
}

/** "Aberto agora · fecha às 19:00", "Fechado · abre amanhã às 09:00"… */
export function situacaoAgora(semana: DiaDeFuncionamento[], agora: Date, fuso: string): Situacao {
  if (!semana.some((d) => d.intervalos.length)) return { aberto: false, texto: "Horário a confirmar" };
  const hoje = hojeNoFuso(agora, fuso);
  const minutos = partesNoFuso(agora, fuso).minutos;
  const intervalosDe = (data: string) => semana.find((d) => d.dia === diaDaSemana(data))?.intervalos ?? [];

  const atual = intervalosDe(hoje).find((i) => i.inicioMin <= minutos && minutos < i.fimMin);
  if (atual) return { aberto: true, texto: `Aberto agora · fecha ${atual.fimMin >= 1440 ? "à" : "às"} ${hora(atual.fimMin)}` };

  const maisTarde = intervalosDe(hoje).find((i) => i.inicioMin > minutos);
  if (maisTarde) return { aberto: false, texto: `Fechado agora · abre às ${hora(maisTarde.inicioMin)}` };
  for (let salto = 1; salto <= 7; salto++) {
    const data = somarDias(hoje, salto);
    const primeiro = intervalosDe(data)[0];
    if (primeiro) {
      const quando = salto === 1 ? "amanhã" : nomeDoDia(diaDaSemana(data));
      return { aberto: false, texto: `Fechado agora · abre ${quando} às ${hora(primeiro.inicioMin)}` };
    }
  }
  return { aberto: false, texto: "Horário a confirmar" };
}

/** "Hoje", "Amanhã" ou "Sáb, 18/10". */
export function diaRelativo(data: string, hoje: string): string {
  if (data === hoje) return "Hoje";
  if (data === somarDias(hoje, 1)) return "Amanhã";
  const nome = nomeDoDia(diaDaSemana(data), true);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}, ${dataCurta(data)}`;
}

/** 40 → "40 min"; 60 → "1h"; 70 → "1h10"; 150 → "2h30". */
export function duracaoLegivel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "Hoje", "Amanhã" ou "Sáb 18" (para botões de horário). */
export function diaCurto(data: string, hoje: string): string {
  if (data === hoje) return "Hoje";
  if (data === somarDias(hoje, 1)) return "Amanhã";
  const nome = nomeDoDia(diaDaSemana(data), true);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${Number(data.slice(8))}`;
}

/** Iniciais para retratos tipográficos: "Barbearia do Zé" → "BZ"; "Ana" → "A". */
export function iniciais(nome: string): string {
  // Por caractere, não por unidade UTF-16: um emoji no começo não vira meio símbolo.
  const primeiro = (texto: string | undefined) => (texto ? (Array.from(texto)[0] ?? "") : "");
  const palavras = nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  return (primeiro(palavras[0] ?? nome) + primeiro(palavras[1])).toUpperCase();
}
