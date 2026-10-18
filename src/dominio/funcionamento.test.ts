import { describe, expect, it } from "vitest";
import { diaCurto, diaRelativo, duracaoLegivel, iniciais, situacaoAgora } from "./funcionamento";

const SP = "America/Sao_Paulo";
// Seg a sex 09:00–12:00 e 13:30–19:00; sábado 08:00–14:00; domingo fechado.
const semana = [
  ...[1, 2, 3, 4, 5].map((dia) => ({ dia, intervalos: [{ inicioMin: 540, fimMin: 720 }, { inicioMin: 810, fimMin: 1140 }] })),
  { dia: 6, intervalos: [{ inicioMin: 480, fimMin: 840 }] },
  { dia: 0, intervalos: [] },
];
// Quinta, 15/10/2026, às horas de São Paulo (UTC−3).
const em = (hhmm: string, data = "2026-10-15") => new Date(`${data}T${hhmm}:00-03:00`);

describe("situação agora", () => {
  it("aberto: diz até que horas", () => {
    expect(situacaoAgora(semana, em("10:15"), SP)).toEqual({ aberto: true, texto: "Aberto agora · fecha às 12:00" });
  });
  it("no almoço: abre de novo no mesmo dia", () => {
    expect(situacaoAgora(semana, em("12:30"), SP)).toEqual({ aberto: false, texto: "Fechado agora · abre às 13:30" });
  });
  it("depois do expediente: abre amanhã; no sábado à tarde, só na segunda", () => {
    expect(situacaoAgora(semana, em("19:00"), SP).texto).toBe("Fechado agora · abre amanhã às 09:00");
    expect(situacaoAgora(semana, em("15:00", "2026-10-17"), SP).texto).toBe("Fechado agora · abre segunda às 09:00");
  });
  it("sem nenhum horário cadastrado", () => {
    expect(situacaoAgora([], em("10:00"), SP)).toEqual({ aberto: false, texto: "Horário a confirmar" });
  });
  it("turno até meia-noite", () => {
    const tarde = [{ dia: 4, intervalos: [{ inicioMin: 1080, fimMin: 1440 }] }];
    expect(situacaoAgora(tarde, em("23:00"), SP).texto).toBe("Aberto agora · fecha à meia-noite");
  });
});

it("dia relativo, duração e iniciais", () => {
  expect(diaRelativo("2026-10-15", "2026-10-15")).toBe("Hoje");
  expect(diaRelativo("2026-10-16", "2026-10-15")).toBe("Amanhã");
  expect(diaRelativo("2026-10-17", "2026-10-15")).toBe("Sáb, 17/10");
  expect([30, 60, 70, 150].map(duracaoLegivel)).toEqual(["30 min", "1h", "1h10", "2h30"]);
  expect(iniciais("Barbearia Navalha de Ouro")).toBe("BN");
  expect(iniciais("Ana")).toBe("A");
  // Emoji: nunca meio caractere (o emoji solto é ignorado; sozinho, vale inteiro).
  expect(iniciais("💅 Studio Unhas")).toBe("SU");
  expect(iniciais("💅")).toBe("💅");
  expect(diaCurto("2026-10-17", "2026-10-15")).toBe("Sáb 17");
  expect(diaCurto("2026-10-16", "2026-10-15")).toBe("Amanhã");
});
