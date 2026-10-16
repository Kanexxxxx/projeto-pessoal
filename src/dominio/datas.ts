/**
 * Datas no fuso da loja, sem depender do fuso da máquina.
 *
 * Uma data de agenda é texto "AAAA-MM-DD" (dia no fuso da loja) e um horário é
 * minutos desde a meia-noite desse dia. Só vira instante (Date, UTC) junto com
 * o fuso. Lição da base anterior: data vinda de fora só é aceita na forma
 * canônica — `formatar(interpretar(x)) === x` — senão "2026-02-31" virava 3 de
 * março e furava o bloqueio do dia (BASE-ANTERIOR.md §4, regra 6).
 */
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function dataCanonica(texto: string): string | null {
  const m = DATA.exec(texto);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(a, mes - 1, d));
  if (a < 2000 || a > 2100) return null;
  return t.toISOString().slice(0, 10) === texto ? texto : null;
}

/** "14:30" → 870. Aceita só HH:MM de 00:00 a 23:59. */
export function minutosDeHora(texto: string): number | null {
  const m = HORA.exec(texto);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function rotuloDeMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Soma dias a uma data "AAAA-MM-DD" (calendário puro, sem fuso). */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

const formatadores = new Map<string, Intl.DateTimeFormat>();

function formatador(fuso: string): Intl.DateTimeFormat {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatadores.set(fuso, f);
  }
  return f;
}

export function fusoValido(fuso: string): boolean {
  try {
    formatador(fuso);
    return true;
  } catch {
    return false;
  }
}

/** Dia e minuto locais de um instante, no fuso informado. */
export function partesNoFuso(instante: Date, fuso: string): { data: string; minutos: number } {
  const p: Record<string, string> = {};
  for (const parte of formatador(fuso).formatToParts(instante)) p[parte.type] = parte.value;
  return { data: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
}

export function hojeNoFuso(agora: Date, fuso: string): string {
  return partesNoFuso(agora, fuso).data;
}

function deslocamentoMin(instante: number, fuso: string): number {
  const { data, minutos } = partesNoFuso(new Date(instante), fuso);
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const comoUtc = Date.UTC(a, m - 1, d, 0, minutos);
  return Math.round((comoUtc - Math.floor(instante / 60_000) * 60_000) / 60_000);
}

/**
 * Instante de um horário local. Devolve null para horário que não existe no
 * fuso (o salto do início do horário de verão).
 */
export function instanteNoFuso(data: string, minutos: number, fuso: string): Date | null {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const ingenuo = Date.UTC(a, m - 1, d, 0, minutos);
  let t = ingenuo - deslocamentoMin(ingenuo, fuso) * 60_000;
  const ajuste = ingenuo - deslocamentoMin(t, fuso) * 60_000;
  if (ajuste !== t) t = ajuste;
  const conferido = partesNoFuso(new Date(t), fuso);
  const esperado = minutos === 1440 ? { data: somarDias(data, 1), minutos: 0 } : { data, minutos };
  return conferido.data === esperado.data && conferido.minutos === esperado.minutos ? new Date(t) : null;
}

const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
const NOMES_DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

export function nomeDoDia(dia: number, curto = false): string {
  return (curto ? NOMES_DIAS_CURTOS : NOMES_DIAS)[dia] ?? "";
}

/** "sexta, 16 out" */
export function dataPorExtenso(data: string, comDiaDaSemana = true): string {
  const [, m, d] = data.split("-").map(Number) as [number, number, number];
  const texto = `${d} ${MESES[m - 1]}`;
  return comDiaDaSemana ? `${nomeDoDia(diaDaSemana(data))}, ${texto}` : texto;
}

/** "16/10" */
export function dataCurta(data: string): string {
  const [, m, d] = data.split("-") as [string, string, string];
  return `${d}/${m}`;
}
