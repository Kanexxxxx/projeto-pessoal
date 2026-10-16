import { describe, expect, it } from "vitest";
import { dataCanonica, diaDaSemana, instanteNoFuso, minutosDeHora, partesNoFuso, somarDias } from "./datas";
import { gradeCombinada, gradeDoDia, turnosDoDia, type RegrasAgenda } from "./horarios";

const SP = "America/Sao_Paulo";
const regras: RegrasAgenda = { fuso: SP, passoMin: 30, intervaloMin: 0, antecedenciaMin: 0, horizonteDias: 30 };
// Quinta, 15/10/2026, 08:00 em São Paulo (UTC−3).
const AGORA = new Date("2026-10-15T11:00:00Z");
const h = (iso: string) => new Date(iso);

describe("datas", () => {
  it("aceita só a forma canônica", () => {
    expect(dataCanonica("2026-10-16")).toBe("2026-10-16");
    expect(dataCanonica("2026-02-31")).toBeNull();
    expect(dataCanonica("2026-2-3")).toBeNull();
    expect(dataCanonica("2026-10-16T00:00")).toBeNull();
    expect(dataCanonica("1999-01-01")).toBeNull();
    expect(minutosDeHora("09:30")).toBe(570);
    expect(minutosDeHora("24:00")).toBeNull();
    expect(minutosDeHora("9:30")).toBeNull();
  });

  it("converte horário local em instante, nos dois sentidos", () => {
    expect(instanteNoFuso("2026-10-16", 9 * 60, SP)?.toISOString()).toBe("2026-10-16T12:00:00.000Z");
    expect(partesNoFuso(h("2026-10-16T02:30:00Z"), SP)).toEqual({ data: "2026-10-15", minutos: 23 * 60 + 30 });
    expect(instanteNoFuso("2026-10-16", 9 * 60, "Europe/Lisbon")?.toISOString()).toBe("2026-10-16T08:00:00.000Z");
  });

  it("recusa horário que não existe na mudança para o horário de verão", () => {
    // Lisboa adianta 01:00 → 02:00 em 29/03/2026.
    expect(instanteNoFuso("2026-03-29", 60 + 30, "Europe/Lisbon")).toBeNull();
    expect(instanteNoFuso("2026-03-29", 3 * 60, "Europe/Lisbon")?.toISOString()).toBe("2026-03-29T02:00:00.000Z");
  });

  it("soma dias e acha o dia da semana sem fuso", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(diaDaSemana("2026-10-16")).toBe(5);
  });
});

describe("grade do dia", () => {
  const base = { regras, turnos: [{ inicioMin: 9 * 60, fimMin: 12 * 60 }], duracaoMin: 60, reservas: [], bloqueios: [], agora: AGORA };

  it("oferece horários em múltiplos do passo e que terminam dentro do turno", () => {
    const g = gradeDoDia({ ...base, data: "2026-10-16" });
    expect(g.map((v) => v.rotulo)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(g.every((v) => v.livre)).toBe(true);
  });

  it("não começa no minuto quebrado em que o turno abre", () => {
    const g = gradeDoDia({ ...base, data: "2026-10-16", turnos: [{ inicioMin: 18 * 60 + 10, fimMin: 20 * 60 }] });
    expect(g.map((v) => v.rotulo)).toEqual(["18:30", "19:00"]);
  });

  it("marca ocupado o que cruza uma reserva, contando o intervalo de limpeza", () => {
    const reservas = [{ inicio: h("2026-10-16T13:00:00Z"), fim: h("2026-10-16T14:15:00Z") }]; // 10:00–11:15 local
    const sem = gradeDoDia({ ...base, data: "2026-10-16", reservas });
    expect(sem.filter((v) => v.livre).map((v) => v.rotulo)).toEqual(["09:00"]);
    const com = gradeDoDia({ ...base, data: "2026-10-16", reservas, regras: { ...regras, intervaloMin: 15 } });
    // 09:00 + 60 min + 15 de intervalo = 10:15 > 10:00: deixa de caber.
    expect(com.filter((v) => v.livre).map((v) => v.rotulo)).toEqual([]);
  });

  it("bloqueio não pode cruzar o serviço, mas pode receber o intervalo de limpeza", () => {
    const bloqueios = [{ inicio: h("2026-10-16T15:00:00Z"), fim: h("2026-10-16T16:00:00Z") }]; // 12:00–13:00 local
    const g = gradeDoDia({
      ...base,
      data: "2026-10-16",
      turnos: [{ inicioMin: 9 * 60, fimMin: 14 * 60 }],
      bloqueios,
      regras: { ...regras, intervaloMin: 10, passoMin: 60 },
    });
    expect(g.filter((v) => v.livre).map((v) => v.rotulo)).toEqual(["09:00", "10:00", "11:00", "13:00"]);
  });

  it("respeita antecedência mínima e horizonte", () => {
    const g = gradeDoDia({ ...base, data: "2026-10-15", regras: { ...regras, antecedenciaMin: 120 } });
    // Agora são 08:00; com 2 h de antecedência, o primeiro horário é 10:00.
    expect(g[0]?.rotulo).toBe("10:00");
    expect(gradeDoDia({ ...base, data: "2026-11-15" })).toEqual([]);
    expect(gradeDoDia({ ...base, data: "2026-11-14" }).length).toBeGreaterThan(0);
  });

  it("dá o mesmo resultado com o processo em outro fuso", () => {
    const original = process.env.TZ;
    process.env.TZ = "Asia/Tokyo";
    try {
      const g = gradeDoDia({ ...base, data: "2026-10-16" });
      expect(g[0]?.inicio.toISOString()).toBe("2026-10-16T12:00:00.000Z");
    } finally {
      process.env.TZ = original;
    }
  });

  it("combina profissionais: livre se algum estiver livre, na ordem de preferência", () => {
    const vaga = (rotulo: string, livre: boolean, hora: string) => ({ rotulo, livre, inicio: h(hora) });
    const c = gradeCombinada([
      { profissionalId: "a", vagas: [vaga("09:00", false, "2026-10-16T12:00:00Z"), vaga("10:00", true, "2026-10-16T13:00:00Z")] },
      { profissionalId: "b", vagas: [vaga("09:00", true, "2026-10-16T12:00:00Z"), vaga("10:00", true, "2026-10-16T13:00:00Z")] },
    ]);
    expect(c.map((v) => [v.rotulo, v.livre, v.profissionais])).toEqual([
      ["09:00", true, ["b"]],
      ["10:00", true, ["a", "b"]],
    ]);
  });

  it("escolhe os turnos do profissional no dia da semana certo", () => {
    const exp = [
      { profissionalId: "a", diaSemana: 5, inicioMin: 540, fimMin: 720 },
      { profissionalId: "a", diaSemana: 5, inicioMin: 840, fimMin: 1080 },
      { profissionalId: "a", diaSemana: 6, inicioMin: 540, fimMin: 720 },
      { profissionalId: "b", diaSemana: 5, inicioMin: 600, fimMin: 700 },
    ];
    expect(turnosDoDia(exp, "a", "2026-10-16")).toEqual([
      { inicioMin: 540, fimMin: 720 },
      { inicioMin: 840, fimMin: 1080 },
    ]);
  });
});
