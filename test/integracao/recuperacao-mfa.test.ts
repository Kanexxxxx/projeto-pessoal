import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aceitarConvite, criarConvite } from "../../src/servidor/auth/convites";
import { confirmarSegundoFator, entrar, iniciarSegundoFator, verificarSegundoFator } from "../../src/servidor/auth/fluxos";
import {
  ambienteDeRecuperacaoLocal,
  CONFIRMACAO_RECUPERACAO_MFA,
  recuperarMfaOperador,
} from "../../src/servidor/auth/recuperacao";
import { bancoDeTeste, contextoDeAcesso } from "../apoio/banco";
import { Navegador } from "../apoio/navegador";
import { totpDaUri } from "../apoio/totp";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
let c: ReturnType<typeof contextoDeAcesso>;
const SENHA = "cafe com pao de queijo";
const CONFIRMACAO = { chamado: "REC-123", confirmacao: CONFIRMACAO_RECUPERACAO_MFA };
const IP = { "x-real-ip": "203.0.113.77" };

beforeAll(async () => {
  banco = await bancoDeTeste();
  c = contextoDeAcesso(banco.pool, banco.db);
});
afterAll(async () => { await banco.encerrar(); });
beforeEach(async () => { await banco.db.deleteFrom("limites_taxa").execute(); });

async function operador(email: string) {
  const convite = await criarConvite(banco.db, { email, papel: "operador" });
  const aceite = await aceitarConvite(c.auth, banco.db, {
    token: convite.token, nome: "Operador de Teste", senha: SENHA, marca: c.config.marca,
  });
  if (!aceite.ok) throw new Error("Falha ao preparar operador fictício.");
  return aceite.usuarioId;
}

async function login(email: string, esperado: "entrou" | "segundo_fator") {
  const nav = new Navegador(IP);
  const resposta = await entrar(c, { email, senha: SENHA, headers: nav.headers() });
  expect(resposta.tipo).toBe(esperado);
  if (resposta.tipo !== esperado) throw new Error("Login de teste inesperado.");
  nav.aplicar(resposta.cookies);
  return nav;
}

async function ativarMfa(nav: Navegador, usuarioId: string) {
  const inicio = await iniciarSegundoFator(c, { senha: SENHA, headers: nav.headers() });
  if (inicio.tipo !== "ok") throw new Error("Falha ao preparar MFA fictício.");
  const confirmado = await confirmarSegundoFator(c, { usuarioId, codigo: totpDaUri(inicio.totpURI), headers: nav.headers() });
  expect(confirmado.tipo).toBe("ok");
  if (confirmado.tipo !== "ok") throw new Error("Falha ao confirmar MFA fictício.");
  nav.aplicar(confirmado.cookies);
  return inicio;
}

async function contar(tabela: "twoFactor" | "verification" | "session" | "mfa_passos_consumidos", usuarioId: string) {
  const coluna = tabela === "verification" ? "value" : tabela === "mfa_passos_consumidos" ? "usuario_id" : "userId";
  const r = await sql<{ total: string }>`
    select count(*) as total from ${sql.table(tabela)} where ${sql.ref(coluna)} = ${usuarioId}
  `.execute(banco.db);
  return Number(r.rows[0]!.total);
}

describe("recuperação administrativa de MFA", () => {
  it.each([
    ["development", "postgres://127.0.0.1/local", true],
    ["test", "postgresql://localhost/local", true],
    ["development", "postgres://[::1]/local", true],
    ["production", "postgres://127.0.0.1/local", false],
    ["development", "postgres://banco.example.test/local", false],
    ["development", "postgres://localhost/local?host=banco.example.test", false],
    ["development", "postgres://localhost.example.test/local", false],
    ["development", "https://localhost/local", false],
  ])("restringe ambiente %s e destino %s", (ambiente, bancoUrl, esperado) => {
    expect(ambienteDeRecuperacaoLocal({ ambiente, bancoUrl })).toBe(esperado);
  });

  it("exige confirmação e referência curta antes de alterar qualquer acesso", async () => {
    const email = "rec-validacao@nexakeep.test";
    const usuarioId = await operador(email);
    const nav = await login(email, "entrou");
    const antes = await contar("session", usuarioId);
    expect(await recuperarMfaOperador(banco.db, { ...CONFIRMACAO, email, confirmacao: "" })).toEqual({ tipo: "confirmacao_ausente" });
    for (const chamado of ["", "texto livre com dado pessoal", "REC-1\nREC-2", "REC-1234567890123", email]) {
      expect(await recuperarMfaOperador(banco.db, { ...CONFIRMACAO, email, chamado })).toEqual({ tipo: "dados_invalidos" });
    }
    expect(await contar("session", usuarioId)).toBe(antes);
    expect((await c.auth.api.getSession({ headers: nav.headers() }))?.user.id).toBe(usuarioId);
  });

  it("recusa conta ausente, não operador e operador revogado sem registrar e-mail", async () => {
    const comum = "rec-comum@nexakeep.test";
    const comumId = await operador(comum);
    await banco.db.deleteFrom("operadores").where("usuario_id", "=", comumId).execute();
    const revogado = "rec-inativo@nexakeep.test";
    const revogadoId = await operador(revogado);
    await banco.db.updateTable("operadores").set({ revogado_em: new Date() }).where("usuario_id", "=", revogadoId).execute();
    for (const email of ["rec-ausente@nexakeep.test", comum, revogado]) {
      expect(await recuperarMfaOperador(banco.db, { ...CONFIRMACAO, email })).toEqual({ tipo: "operador_indisponivel" });
    }
    const eventos = await banco.db.selectFrom("auditoria").selectAll().where("acao", "=", "segundo_fator.recuperacao_recusada").execute();
    expect(eventos).toHaveLength(3);
    expect(eventos.every(e => e.alvo === null && e.ator_usuario_id === null)).toBe(true);
    expect(JSON.stringify(eventos)).not.toContain("@nexakeep.test");
  });

  it("revoga sessões, fatores, consumos e desafios; exige senha e novo MFA sem afetar outro operador", async () => {
    const email = "rec-total@nexakeep.test";
    const usuarioId = await operador(email);
    const primeiro = await login(email, "entrou");
    const antigo = await ativarMfa(primeiro, usuarioId);
    const segundo = await login(email, "segundo_fator");
    const reserva = await verificarSegundoFator(c, { codigo: antigo.codigosReserva[0]!, metodo: "reserva", headers: segundo.headers() });
    expect(reserva.tipo).toBe("entrou");
    if (reserva.tipo !== "entrou") return;
    segundo.aplicar(reserva.cookies);
    const desafioAntigo = await login(email, "segundo_fator");
    const outroDesafioAntigo = await login(email, "segundo_fator");
    const interno = await c.auth.$context;
    await interno.internalAdapter.createVerificationValue({
      identifier: `trust-device-${randomUUID()}`, value: usuarioId, expiresAt: new Date(Date.now() + 60_000),
    });
    await c.auth.api.requestPasswordReset({ body: { email, redirectTo: `${c.config.urlPainel}/redefinir` }, headers: new Headers(IP) });
    expect(await contar("mfa_passos_consumidos", usuarioId)).toBeGreaterThan(0);

    const outroEmail = "rec-preservado@nexakeep.test";
    const outroId = await operador(outroEmail);
    const outroNav = await login(outroEmail, "entrou");
    await interno.internalAdapter.createVerificationValue({
      identifier: `2fa-${randomUUID()}`, value: outroId, expiresAt: new Date(Date.now() + 60_000),
    });

    const resultado = await recuperarMfaOperador(banco.db, { ...CONFIRMACAO, email: ` ${email.toUpperCase()} ` });
    expect(resultado.tipo).toBe("ok");
    if (resultado.tipo !== "ok") return;
    expect(resultado.sessoesRevogadas).toBe(2);
    expect(resultado.verificacoesRevogadas).toBeGreaterThanOrEqual(4);
    for (const tabela of ["twoFactor", "verification", "session", "mfa_passos_consumidos"] as const) {
      expect(await contar(tabela, usuarioId)).toBe(0);
    }
    const usuario = await banco.db.selectFrom("user").select("twoFactorEnabled").where("id", "=", usuarioId).executeTakeFirstOrThrow();
    expect(usuario.twoFactorEnabled).toBe(false);
    expect(await c.auth.api.getSession({ headers: primeiro.headers() })).toBeNull();
    expect(await c.auth.api.getSession({ headers: segundo.headers() })).toBeNull();
    expect((await verificarSegundoFator(c, { codigo: antigo.codigosReserva[1]!, metodo: "reserva", headers: desafioAntigo.headers() })).tipo).not.toBe("entrou");
    expect((await c.auth.api.getSession({ headers: outroNav.headers() }))?.user.id).toBe(outroId);
    expect(await contar("verification", outroId)).toBe(1);

    const evento = await banco.db.selectFrom("auditoria").selectAll().where("acao", "=", "segundo_fator.recuperado").where("alvo", "=", usuarioId).executeTakeFirstOrThrow();
    expect(evento.ator_usuario_id).toBeNull();
    expect(evento.detalhes).toEqual({
      chamado: CONFIRMACAO.chamado, origem: "terminal_local", sessoes_revogadas: 2,
      verificacoes_revogadas: resultado.verificacoesRevogadas, fatores_removidos: 1,
    });
    const auditoria = JSON.stringify(evento);
    for (const privado of [email, SENHA, antigo.totpURI, ...antigo.codigosReserva]) expect(auditoria).not.toContain(privado);

    const novoLogin = await login(email, "entrou");
    const sessaoSemMfa = await c.auth.api.getSession({ headers: novoLogin.headers() });
    expect(sessaoSemMfa?.user.twoFactorEnabled).toBe(false);
    expect(sessaoSemMfa?.session.mfaVerificado).toBe(false);
    const novo = await ativarMfa(novoLogin, usuarioId);
    // Mesmo conhecendo um código do novo fator, um desafio anterior não autentica.
    expect((await verificarSegundoFator(c, { codigo: novo.codigosReserva[0]!, metodo: "reserva", headers: outroDesafioAntigo.headers() })).tipo).not.toBe("entrou");
    const desafioNovo = await login(email, "segundo_fator");
    expect((await verificarSegundoFator(c, { codigo: antigo.codigosReserva[2]!, metodo: "reserva", headers: desafioNovo.headers() })).tipo).not.toBe("entrou");
    expect((await verificarSegundoFator(c, { codigo: novo.codigosReserva[0]!, metodo: "reserva", headers: desafioNovo.headers() })).tipo).toBe("entrou");
  });

  it("desfaz todas as revogações se não conseguir gravar a auditoria", async () => {
    const email = "rec-atomica@nexakeep.test";
    const usuarioId = await operador(email);
    const nav = await login(email, "entrou");
    const mfa = await ativarMfa(nav, usuarioId);
    const desafio = await login(email, "segundo_fator");
    const antes = await Promise.all((["twoFactor", "verification", "session", "mfa_passos_consumidos"] as const).map(t => contar(t, usuarioId)));
    const admin = await banco.conectar("postgres");
    try {
      await admin.query(`create function rejeitar_auditoria_recuperacao() returns trigger language plpgsql as $$
        begin
          if new.acao = 'segundo_fator.recuperado' then raise exception 'falha controlada de auditoria'; end if;
          return new;
        end $$;
        create trigger rejeitar_auditoria_recuperacao before insert on auditoria
        for each row execute function rejeitar_auditoria_recuperacao()`);
      await expect(recuperarMfaOperador(banco.db, { ...CONFIRMACAO, email })).rejects.toThrow("falha controlada de auditoria");
    } finally {
      await admin.query("drop trigger if exists rejeitar_auditoria_recuperacao on auditoria; drop function if exists rejeitar_auditoria_recuperacao()");
      await admin.end();
    }
    const depois = await Promise.all((["twoFactor", "verification", "session", "mfa_passos_consumidos"] as const).map(t => contar(t, usuarioId)));
    expect(depois).toEqual(antes);
    expect((await c.auth.api.getSession({ headers: nav.headers() }))?.user.twoFactorEnabled).toBe(true);
    expect((await verificarSegundoFator(c, { codigo: mfa.codigosReserva[0]!, metodo: "reserva", headers: desafio.headers() })).tipo).toBe("entrou");
  });
});
