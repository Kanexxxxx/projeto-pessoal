import { diaDaSemana, hojeNoFuso, instanteNoFuso, rotuloDeMinutos, somarDias } from "./datas";

/**
 * Motor de horários: função pura, com fuso, profissional e regras da loja como
 * parâmetros (BASE-ANTERIOR.md §3, "adaptar").
 *
 * A conta de choque é a MESMA do banco (`agendamentos_sem_choque`): uma reserva
 * ocupa [início, fim do serviço + intervalo). Se as duas contas divergissem, o
 * site ofereceria um horário que o banco recusa. Bloqueio só não pode cruzar o
 * serviço em si; o intervalo de limpeza pode cair dentro de um bloqueio.
 *
 * Lição herdada: a grade começa em múltiplos do passo (09:00, 09:30…), não no
 * minuto em que o turno abre — oferecer 18:10, 18:40 é "horário quebrado".
 */
export type Turno = { inicioMin: number; fimMin: number };
export type Intervalo = { inicio: Date; fim: Date };
export type Vaga = { inicio: Date; rotulo: string; livre: boolean };

export type RegrasAgenda = {
  fuso: string;
  passoMin: number;
  intervaloMin: number;
  antecedenciaMin: number;
  horizonteDias: number;
};

export function seSobrepoem(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/** Último dia que o site aceita, contando a partir de hoje no fuso da loja. */
export function ultimoDiaAceito(agora: Date, regras: RegrasAgenda): string {
  return somarDias(hojeNoFuso(agora, regras.fuso), regras.horizonteDias);
}

export function gradeDoDia(p: {
  data: string;
  regras: RegrasAgenda;
  turnos: Turno[];
  duracaoMin: number;
  reservas: Intervalo[];
  bloqueios: Intervalo[];
  agora: Date;
}): Vaga[] {
  const { data, regras } = p;
  if (data > ultimoDiaAceito(p.agora, regras)) return [];
  const limite = p.agora.getTime() + regras.antecedenciaMin * 60_000;
  const vagas = new Map<number, Vaga>();

  for (const turno of p.turnos) {
    const primeira = Math.ceil(turno.inicioMin / regras.passoMin) * regras.passoMin;
    for (let m = primeira; m + p.duracaoMin <= turno.fimMin; m += regras.passoMin) {
      const inicio = instanteNoFuso(data, m, regras.fuso);
      if (!inicio || inicio.getTime() < limite) continue;
      const fimServico = new Date(inicio.getTime() + p.duracaoMin * 60_000);
      const ocupa = { inicio, fim: new Date(fimServico.getTime() + regras.intervaloMin * 60_000) };
      const livre =
        !p.reservas.some((r) => seSobrepoem(ocupa, r)) &&
        !p.bloqueios.some((b) => seSobrepoem({ inicio, fim: fimServico }, b));
      vagas.set(inicio.getTime(), { inicio, rotulo: rotuloDeMinutos(m), livre });
    }
  }
  return [...vagas.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

export type Expediente = { profissionalId: string; diaSemana: number; inicioMin: number; fimMin: number };

/** Turnos de um profissional no dia da semana da data. */
export function turnosDoDia(expedientes: Expediente[], profissionalId: string, data: string): Turno[] {
  const dia = diaDaSemana(data);
  return expedientes
    .filter((e) => e.profissionalId === profissionalId && e.diaSemana === dia)
    .map((e) => ({ inicioMin: e.inicioMin, fimMin: e.fimMin }));
}

/**
 * Grade de vários profissionais juntos ("sem preferência"): o horário está
 * livre se pelo menos um deles estiver livre. Devolve também quem atende cada
 * horário, na ordem de preferência recebida.
 */
export function gradeCombinada(
  grades: { profissionalId: string; vagas: Vaga[] }[],
): (Vaga & { profissionais: string[] })[] {
  const porInicio = new Map<number, Vaga & { profissionais: string[] }>();
  for (const { profissionalId, vagas } of grades) {
    for (const v of vagas) {
      const atual = porInicio.get(v.inicio.getTime()) ?? { ...v, livre: false, profissionais: [] };
      if (v.livre) {
        atual.livre = true;
        atual.profissionais.push(profissionalId);
      }
      porInicio.set(v.inicio.getTime(), atual);
    }
  }
  return [...porInicio.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
