import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aceitarConvite, aceitarConviteComConta, criarConvite } from "../../src/servidor/auth/convites";
import { agendaDoDia, cancelarAgendamento, criarBloqueio, disponibilidade, horariosDaVitrine, livresNoHorario, remarcarAgendamento, reservar } from "../../src/servidor/lojas/agenda";
import { salvarExpediente, salvarProfissional, salvarServico, salvarSite } from "../../src/servidor/lojas/catalogo";
import { comLoja } from "../../src/servidor/lojas/escopo";
import { convidarParaLoja, revogarAcesso } from "../../src/servidor/lojas/equipe";
import { exportarLoja } from "../../src/servidor/lojas/exportar";
import { acessoNaLoja, criarLoja, lojasDoUsuario, type Acesso, type Loja } from "../../src/servidor/lojas/lojas";
import { dadosDoSite } from "../../src/servidor/lojas/site";
import { bancoDeTeste, contextoDeAcesso } from "../apoio/banco";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
let c: ReturnType<typeof contextoDeAcesso>;
const SENHA = "cafe com pao de queijo";
// Quarta, 04/03/2026, 09:00 em São Paulo. As reservas de teste são na quinta, 05/03.
const AGORA = new Date("2026-03-04T12:00:00Z");
const DIA = "2026-03-05";

beforeAll(async () => {
  banco = await bancoDeTeste();
  c = contextoDeAcesso(banco.pool, banco.db);
});
afterAll(async () => {
  await banco.encerrar();
});
beforeEach(() => {
  c.enviador.caixa.length = 0;
});

async function conta(papel: "operador" | "dona" | "funcionario", tenantId: string | null, nome = "Juliana") {
  const email = `${papel}-${randomUUID()}@nexakeep.test`;
  const { token } = await criarConvite(c.db, { email, papel, tenantId });
  const r = await aceitarConvite(c.auth, c.db, { token, nome, senha: SENHA, marca: c.config.marca });
  if (!r.ok) throw new Error("convite de teste falhou");
  return { id: r.usuarioId, email };
}

function form(campos: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const item of [v].flat()) f.append(k, item);
  return f;
}

let operador: { id: string; email: string };

/** Loja com um serviço de 60 min e dois profissionais trabalhando todos os dias, 09:00–18:00. */
async function lojaPronta(nome: string) {
  const slug = `t-${randomUUID().slice(0, 8)}`;
  const r = await criarLoja(c.db, { nome, slug, segmento: "barbearia", criadaPor: operador.id });
  if (!r.ok) throw new Error(r.erro);
  const loja = r.loja;
  const op: Acesso = { loja, papel: "operador", usuarioId: operador.id };
  for (const p of ["Ana", "Bruno"]) expect(await salvarProfissional(c.db, op, form({ nome: p }))).toEqual({ ok: true });
  const profs = await comLoja(c.db, loja.id, (trx) => trx.selectFrom("profissionais").select(["id", "nome"]).orderBy("ordem").execute());
  const dias: Record<string, string> = {};
  for (let d = 0; d < 7; d++) Object.assign(dias, { [`aberto-${d}`]: "on", [`de-${d}-1`]: "09:00", [`ate-${d}-1`]: "18:00" });
  for (const p of profs) expect(await salvarExpediente(c.db, op, form({ profissional: p.id, ...dias }))).toEqual({ ok: true });
  expect(await salvarServico(c.db, op, form({ nome: "Corte", duracao: "60", preco: "45", profissionais: profs.map((p) => p.id) }))).toEqual({ ok: true });
  const servico = await comLoja(c.db, loja.id, (trx) => trx.selectFrom("servicos").select("id").executeTakeFirstOrThrow());
  return { loja, op, servicoId: servico.id, profs: profs as { id: string; nome: string }[] };
}

const pedido = (loja: Loja, servicoId: string, extra: Partial<Parameters<typeof reservar>[1]> = {}) => ({
  loja,
  servicoId,
  profissionalId: null,
  data: DIA,
  hora: "10:00",
  nome: "Cliente Teste",
  telefone: "(20) 98765-4321",
  origem: "site" as const,
  agora: AGORA,
  ...extra,
});

let A: Awaited<ReturnType<typeof lojaPronta>>;
let B: Awaited<ReturnType<typeof lojaPronta>>;

beforeAll(async () => {
  operador = await conta("operador", null, "Operadora");
  A = await lojaPronta("Barbearia Alfa");
  B = await lojaPronta("Barbearia Beta");
});

describe("isolamento no banco (RLS)", () => {
  it("sem escopo, nenhuma linha de loja aparece e nada é gravado", async () => {
    expect(await c.db.selectFrom("servicos").selectAll().execute()).toEqual([]);
    expect(await c.db.selectFrom("profissionais").selectAll().execute()).toEqual([]);
    expect(await c.db.selectFrom("config_loja").selectAll().execute()).toEqual([]);
    await expect(
      c.db.insertInto("servicos").values({ tenant_id: A.loja.id, nome: "Intruso", duracao_min: 30, preco_centavos: null, descricao: null }).execute(),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("no escopo da loja A, nada da B aparece, e gravar ou mover linha para a B é recusado", async () => {
    const servicos = await comLoja(c.db, A.loja.id, (trx) => trx.selectFrom("servicos").select("tenant_id").execute());
    expect(servicos.length).toBeGreaterThan(0);
    expect(servicos.every((s) => s.tenant_id === A.loja.id)).toBe(true);
    await expect(
      comLoja(c.db, A.loja.id, (trx) =>
        trx.insertInto("servicos").values({ tenant_id: B.loja.id, nome: "Intruso", duracao_min: 30, preco_centavos: null, descricao: null }).execute(),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      comLoja(c.db, A.loja.id, (trx) => trx.updateTable("servicos").set({ tenant_id: B.loja.id }).where("id", "=", A.servicoId).execute()),
    ).rejects.toMatchObject({ code: "42501" });
    // Alterar uma linha da B no escopo da A não acha nada.
    const r = await comLoja(c.db, A.loja.id, (trx) => trx.updateTable("servicos").set({ nome: "Trocado" }).where("id", "=", B.servicoId).executeTakeFirst());
    expect(r.numUpdatedRows).toBe(0n);
  });

  it("uma reserva da loja A não pode apontar para profissional da B", async () => {
    await expect(
      comLoja(c.db, A.loja.id, async (trx) => {
        const cliente = await trx.insertInto("clientes").values({ tenant_id: A.loja.id, nome: "Cliente", telefone: "+5520911112222" }).returning("id").executeTakeFirstOrThrow();
        await trx
          .insertInto("agendamentos")
          .values({
            tenant_id: A.loja.id,
            servico_id: A.servicoId,
            profissional_id: B.profs[0]!.id,
            cliente_id: cliente.id,
            inicio: new Date("2026-03-05T13:00:00Z"),
            fim: new Date("2026-03-05T14:00:00Z"),
            ocupado_ate: new Date("2026-03-05T14:00:00Z"),
            origem: "painel",
            preco_centavos: null,
            observacao: null,
          })
          .execute();
      }),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("o escopo não sobra na conexão depois da transação", async () => {
    for (let i = 0; i < 8; i++) await comLoja(c.db, A.loja.id, (trx) => trx.selectFrom("servicos").select("id").execute());
    const valores = await Promise.all(
      Array.from({ length: 8 }, () => sql<{ v: string | null }>`select current_setting('app.tenant_id', true) as v`.execute(c.db)),
    );
    expect(valores.every((r) => !r.rows[0]?.v)).toBe(true);
  });
});

describe("acesso por vínculo", () => {
  it("convite de dona cria o vínculo só com a loja dela; mesmo nome não dá acesso a outra loja", async () => {
    const donaA = await conta("dona", A.loja.id, "Juliana");
    const juliana2 = await conta("dona", B.loja.id, "Juliana");
    expect((await acessoNaLoja(c.db, donaA.id, A.loja.slug))?.papel).toBe("dona");
    expect(await acessoNaLoja(c.db, donaA.id, B.loja.slug)).toBeNull();
    expect(await acessoNaLoja(c.db, juliana2.id, A.loja.slug)).toBeNull();
    expect((await lojasDoUsuario(c.db, donaA.id)).map((l) => l.id)).toEqual([A.loja.id]);
  });

  it("dona convida equipe, mas não outra dona; funcionário não convida ninguém", async () => {
    const dona = await conta("dona", A.loja.id);
    const acesso = (await acessoNaLoja(c.db, dona.id, A.loja.slug))!;
    expect(await convidarParaLoja(c, { acesso, email: `equipe-${randomUUID()}@nexakeep.test`, papel: "funcionario" })).toEqual({ ok: true });
    expect((await convidarParaLoja(c, { acesso, email: "outra@nexakeep.test", papel: "dona" })).ok).toBe(false);
    const func = await conta("funcionario", A.loja.id);
    const acessoFunc = (await acessoNaLoja(c.db, func.id, A.loja.slug))!;
    expect(acessoFunc.papel).toBe("funcionario");
    expect((await convidarParaLoja(c, { acesso: acessoFunc, email: "mais@nexakeep.test", papel: "funcionario" })).ok).toBe(false);
  });

  it("funcionário revogado perde o acesso na próxima conferência", async () => {
    const dona = await conta("dona", A.loja.id);
    const func = await conta("funcionario", A.loja.id);
    const acessoDona = (await acessoNaLoja(c.db, dona.id, A.loja.slug))!;
    expect(await acessoNaLoja(c.db, func.id, A.loja.slug)).not.toBeNull();
    expect(await revogarAcesso(c.db, { acesso: acessoDona, usuarioId: func.id })).toEqual({ ok: true });
    expect(await acessoNaLoja(c.db, func.id, A.loja.slug)).toBeNull();
    // A dona não remove outra dona nem a si mesma.
    const outraDona = await conta("dona", A.loja.id);
    expect((await revogarAcesso(c.db, { acesso: acessoDona, usuarioId: outraDona.id })).ok).toBe(false);
    expect((await revogarAcesso(c.db, { acesso: acessoDona, usuarioId: dona.id })).ok).toBe(false);
  });

  it("conta existente aceita convite de loja só se for do mesmo e-mail", async () => {
    const pessoa = await conta("dona", A.loja.id);
    const { token } = await criarConvite(c.db, { email: pessoa.email, papel: "funcionario", tenantId: B.loja.id });
    const outro = await conta("dona", A.loja.id);
    expect(await aceitarConviteComConta(c.db, { token, usuarioId: outro.id })).toEqual({ ok: false, motivo: "outro_email" });
    expect(await aceitarConviteComConta(c.db, { token, usuarioId: pessoa.id })).toEqual({ ok: true, tenantId: B.loja.id });
    expect((await acessoNaLoja(c.db, pessoa.id, B.loja.slug))?.papel).toBe("funcionario");
    expect(await aceitarConviteComConta(c.db, { token, usuarioId: pessoa.id })).toEqual({ ok: false, motivo: "invalido" });
  });

  it("funcionário não altera catálogo nem site; id de outra loja e tenant no formulário são ignorados", async () => {
    const func = await conta("funcionario", A.loja.id);
    const acessoFunc = (await acessoNaLoja(c.db, func.id, A.loja.slug))!;
    expect((await salvarServico(c.db, acessoFunc, form({ nome: "Barba", duracao: "30" }))).ok).toBe(false);
    expect((await salvarSite(c.db, acessoFunc, form({ modelo: "revista", cor: "#000000" }))).ok).toBe(false);

    // A dona da A tenta editar um serviço da B pelo id: não encontra.
    const r = await salvarServico(c.db, A.op, form({ id: B.servicoId, nome: "Sequestrado", duracao: "30", tenant_id: B.loja.id }));
    expect(r).toEqual({ ok: false, erro: "Serviço não encontrado." });
    const nomeB = await comLoja(c.db, B.loja.id, (trx) => trx.selectFrom("servicos").select("nome").where("id", "=", B.servicoId).executeTakeFirstOrThrow());
    expect(nomeB.nome).toBe("Corte");
    // Serviço vinculado a profissional da B: recusado.
    expect((await salvarServico(c.db, A.op, form({ nome: "Misto", duracao: "30", profissionais: [B.profs[0]!.id] }))).ok).toBe(false);
  });

  it("a exportação da loja A não contém nenhum dado da B", async () => {
    await reservar(c.db, pedido(B.loja, B.servicoId, { hora: "15:00", telefone: "(20) 97777-0000" }));
    const exportado = JSON.stringify(await exportarLoja(c.db, A.op));
    expect(exportado).toContain(A.loja.id);
    for (const id of [B.loja.id, B.servicoId, ...B.profs.map((p) => p.id)]) expect(exportado).not.toContain(id);
    expect(exportado).not.toContain("+5520977770000");
  });

  it("o site público mostra só dado público da loja", async () => {
    const site = await dadosDoSite(c.db, A.loja.slug);
    expect(site?.servicos.map((s) => s.nome)).toContain("Corte");
    expect(JSON.stringify(site)).not.toMatch(/\+55\d{10,11}/);
    expect(await dadosDoSite(c.db, "nao-existe")).toBeNull();
  });
});

describe("agenda", () => {
  it("duas pessoas disputando o mesmo horário com o mesmo profissional: só uma consegue", async () => {
    const L = await lojaPronta("Disputa");
    const alvo = { profissionalId: L.profs[0]!.id, hora: "11:00" };
    const resultados = await Promise.all(
      ["(20) 91111-0001", "(20) 91111-0002", "(20) 91111-0003", "(20) 91111-0004"].map((telefone) =>
        reservar(c.db, pedido(L.loja, L.servicoId, { ...alvo, telefone })),
      ),
    );
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.filter((r) => !r.ok && r.motivo === "indisponivel")).toHaveLength(3);
  });

  it("sem preferência, a segunda reserva do mesmo horário vai para o outro profissional; a terceira não cabe", async () => {
    const L = await lojaPronta("Sem preferencia");
    const r1 = await reservar(c.db, pedido(L.loja, L.servicoId, { telefone: "(20) 92222-0001" }));
    const r2 = await reservar(c.db, pedido(L.loja, L.servicoId, { telefone: "(20) 92222-0002" }));
    const r3 = await reservar(c.db, pedido(L.loja, L.servicoId, { telefone: "(20) 92222-0003" }));
    expect(r1.ok && r2.ok && r1.reserva.profissional !== r2.reserva.profissional).toBe(true);
    expect(r3).toMatchObject({ ok: false, motivo: "indisponivel" });
    const disp = await disponibilidade(c.db, L.loja, { servicoId: L.servicoId, profissionalId: null, data: DIA, agora: AGORA });
    expect(disp?.vagas.find((v) => v.rotulo === "10:00")?.livre).toBe(false);
    expect(disp?.vagas.find((v) => v.rotulo === "11:00")?.livre).toBe(true);
  });

  it("pelo site só vale horário da grade; pelo painel dá para encaixar, mas nunca por cima", async () => {
    const L = await lojaPronta("Encaixe");
    const ana = L.profs[0]!.id;
    expect(await reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, hora: "10:10" }))).toMatchObject({ ok: false });
    expect(await reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, hora: "08:00" }))).toMatchObject({ ok: false });
    // Antecedência: hoje às 09:30 não dá (são 09:00 e a loja pede 2 h).
    expect(await reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, data: "2026-03-04", hora: "10:00" }))).toMatchObject({ ok: false });
    const painel = { origem: "painel" as const, criadoPor: operador.id, profissionalId: ana };
    expect((await reservar(c.db, pedido(L.loja, L.servicoId, { ...painel, hora: "08:10" }))).ok).toBe(true);
    expect((await reservar(c.db, pedido(L.loja, L.servicoId, { ...painel, hora: "08:40", telefone: "(20) 93333-0001" }))).ok).toBe(false);
  });

  it("bloqueio e reserva simultâneos nunca coexistem", async () => {
    for (let rodada = 0; rodada < 3; rodada++) {
      const L = await lojaPronta(`Bloqueio ${rodada}`);
      const ana = L.profs[0]!.id;
      const [reserva, bloqueio] = await Promise.all([
        reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, hora: "14:00" })),
        criarBloqueio(c.db, L.op, { profissionalId: ana, data: DIA, de: "13:00", ate: "17:00", motivo: "Curso" }),
      ]);
      expect(reserva.ok !== bloqueio.ok).toBe(true);
    }
  });

  it("bloqueio da loja inteira tira o dia da grade de todos", async () => {
    const L = await lojaPronta("Feriado");
    expect(await criarBloqueio(c.db, L.op, { profissionalId: null, data: DIA, motivo: "Feriado" })).toEqual({ ok: true });
    const disp = await disponibilidade(c.db, L.loja, { servicoId: L.servicoId, profissionalId: null, data: DIA, agora: AGORA });
    expect(disp?.vagas.some((v) => v.livre)).toBe(false);
    expect(disp?.dias.find((d) => d.data === DIA)?.temVaga).toBe(false);
  });

  it("remarca sem passar por cima e cancela liberando o horário", async () => {
    const L = await lojaPronta("Remarcar");
    const ana = L.profs[0]!.id;
    const r1 = await reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, hora: "10:00", telefone: "(20) 94444-0001" }));
    const r2 = await reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, hora: "12:00", telefone: "(20) 94444-0002" }));
    if (!r1.ok || !r2.ok) throw new Error("reservas de teste");
    expect((await remarcarAgendamento(c.db, L.op, { id: r1.reserva.id, data: DIA, hora: "11:30" })).ok).toBe(false);
    expect(await remarcarAgendamento(c.db, L.op, { id: r1.reserva.id, data: DIA, hora: "13:00" })).toEqual({ ok: true });
    expect(await cancelarAgendamento(c.db, L.op, r2.reserva.id)).toEqual({ ok: true });
    expect((await cancelarAgendamento(c.db, L.op, r2.reserva.id)).ok).toBe(false);
    const dia = await agendaDoDia(c.db, L.loja, DIA);
    expect(dia.itens.map((i) => [i.hora, i.situacao])).toEqual([
      ["12:00", "cancelado"],
      ["13:00", "confirmado"],
    ]);
    expect((await reservar(c.db, pedido(L.loja, L.servicoId, { profissionalId: ana, hora: "12:00", telefone: "(20) 94444-0003" }))).ok).toBe(true);
  });

  it("a loja B não cancela nem remarca reserva da A", async () => {
    const r = await reservar(c.db, pedido(A.loja, A.servicoId, { hora: "16:00", telefone: "(20) 95555-0001" }));
    if (!r.ok) throw new Error("reserva de teste");
    expect((await cancelarAgendamento(c.db, B.op, r.reserva.id)).ok).toBe(false);
    expect((await remarcarAgendamento(c.db, B.op, { id: r.reserva.id, data: DIA, hora: "17:00" })).ok).toBe(false);
    const dia = await agendaDoDia(c.db, A.loja, DIA);
    expect(dia.itens.find((i) => i.id === r.reserva.id)?.situacao).toBe("confirmado");
  });

  it("loja suspensa não recebe reserva pelo site", async () => {
    const L = await lojaPronta("Suspensa");
    await c.db.updateTable("lojas").set({ situacao: "suspensa" }).where("id", "=", L.loja.id).execute();
    const loja = { ...L.loja, situacao: "suspensa" as const };
    expect(await reservar(c.db, pedido(loja, L.servicoId))).toMatchObject({ ok: false, motivo: "indisponivel" });
    // E a vitrine do site não oferece horário nenhum.
    const vitrine = await horariosDaVitrine(c.db, loja, { agora: AGORA });
    expect(vitrine.porServico.size).toBe(0);
  });

  it("vitrine: os horários mostrados no site são os mesmos que a reserva aceita", async () => {
    const L = await lojaPronta("Vitrine");
    const antes = await horariosDaVitrine(c.db, L.loja, { agora: AGORA });
    // Agora são 09:00 de quarta e a loja pede 2 h de antecedência: o primeiro horário é 11:00.
    expect(antes.porServico.get(L.servicoId)?.map((v) => `${v.data} ${v.hora}`)).toEqual(["2026-03-04 11:00", "2026-03-04 11:30", "2026-03-04 12:00"]);
    expect(antes.porProfissional.get(L.profs[0]!.id)).toMatchObject({ data: "2026-03-04", hora: "11:00", servicoId: L.servicoId });
    // A agenda por dia começa no mesmo horário e espalha até 4 horários pelo dia, do primeiro ao último.
    expect(antes.porDia[0]?.data).toBe("2026-03-04");
    const horasDoDia = antes.porDia[0]!.horas.map((h) => h.hora);
    expect(horasDoDia[0]).toBe("11:00");
    expect(horasDoDia.length).toBeLessThanOrEqual(4);
    expect([...horasDoDia].sort()).toEqual(horasDoDia);
    expect(antes.porDia[0]!.horas[0]!.servicoIds).toContain(L.servicoId);
    expect(antes.porDia.length).toBeLessThanOrEqual(3);
    expect(antes.porDia[0]!.livres).toBeGreaterThanOrEqual(antes.porDia[0]!.horas.length);
    // Reservado com os dois profissionais, o 11:00 (e o 11:30, que cruza) sai da vitrine.
    for (const telefone of ["(20) 96666-0001", "(20) 96666-0002"]) {
      expect((await reservar(c.db, pedido(L.loja, L.servicoId, { data: "2026-03-04", hora: "11:00", telefone }))).ok).toBe(true);
    }
    const depois = await horariosDaVitrine(c.db, L.loja, { agora: AGORA });
    expect(depois.porServico.get(L.servicoId)?.[0]).toMatchObject({ data: "2026-03-04", hora: "12:00" });
    // O primeiro horário da vitrine é aceito pela reserva.
    const primeiro = depois.porServico.get(L.servicoId)![0]!;
    expect((await reservar(c.db, pedido(L.loja, L.servicoId, { data: primeiro.data, hora: primeiro.hora, telefone: "(20) 96666-0003" }))).ok).toBe(true);
  });

  it("horário primeiro: só oferece serviço e profissional que cabem no horário, igual à reserva", async () => {
    const L = await lojaPronta("Horário primeiro");
    // 11:00 de quarta: os dois profissionais estão livres.
    const antes = await livresNoHorario(c.db, L.loja, { data: "2026-03-04", hora: "11:00", agora: AGORA });
    expect([...(antes.get(L.servicoId) ?? [])].sort()).toEqual(L.profs.map((p) => p.id).sort());
    // Ocupado um profissional às 11:00, ele sai da lista; o outro continua e a reserva com ele é aceita.
    const ocupado = L.profs[0]!.id;
    const livre = L.profs[1]!.id;
    expect((await reservar(c.db, { ...pedido(L.loja, L.servicoId, { data: "2026-03-04", hora: "11:00", telefone: "(20) 96666-0011" }), profissionalId: ocupado })).ok).toBe(true);
    const depois = await livresNoHorario(c.db, L.loja, { data: "2026-03-04", hora: "11:00", agora: AGORA });
    expect(depois.get(L.servicoId)).toEqual([livre]);
    expect((await reservar(c.db, { ...pedido(L.loja, L.servicoId, { data: "2026-03-04", hora: "11:00", telefone: "(20) 96666-0012" }), profissionalId: livre })).ok).toBe(true);
    // Com os dois ocupados, o serviço não cabe mais às 11:00; antes da antecedência mínima, também não.
    expect((await livresNoHorario(c.db, L.loja, { data: "2026-03-04", hora: "11:00", agora: AGORA })).has(L.servicoId)).toBe(false);
    expect((await livresNoHorario(c.db, L.loja, { data: "2026-03-04", hora: "09:30", agora: AGORA })).size).toBe(0);
  });
});
