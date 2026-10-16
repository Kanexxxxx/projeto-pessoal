import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aceitarConvite, criarConvite } from "../../src/servidor/auth/convites";
import {
  confirmarSegundoFator,
  entrar,
  iniciarSegundoFator,
  regenerarCodigosReserva,
  verificarSegundoFator,
} from "../../src/servidor/auth/fluxos";
import { bancoDeTeste, contextoDeAcesso } from "../apoio/banco";
import { Navegador } from "../apoio/navegador";
import { totpDaUri } from "../apoio/totp";

type Contexto = ReturnType<typeof contextoDeAcesso>;

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
const SENHA = "cafe com pao de queijo";
const IP = { "x-real-ip": "203.0.113.60" };
const ANTIGO = randomBytes(32).toString("base64url");
const NOVO = randomBytes(32).toString("base64url");

beforeAll(async () => { banco = await bancoDeTeste(); });
afterAll(async () => { await banco.encerrar(); });
beforeEach(async () => { await banco.db.deleteFrom("limites_taxa").execute(); });

/** Conta com 2FA ativo, criada com o contexto informado; devolve a sessão já com MFA. */
async function contaComMfa(c: Contexto) {
  const email = `pessoa-${randomUUID()}@nexakeep.test`;
  const { token } = await criarConvite(c.db, { email, papel: "operador" });
  const conta = await aceitarConvite(c.auth, c.db, { token, nome: "Juliana", senha: SENHA, marca: c.config.marca });
  if (!conta.ok) throw new Error("Falha no convite de teste");
  const nav = new Navegador(IP);
  const login = await entrar(c, { email, senha: SENHA, headers: nav.headers() });
  if (login.tipo !== "entrou") throw new Error(login.tipo);
  nav.aplicar(login.cookies);
  const inicio = await iniciarSegundoFator(c, { senha: SENHA, headers: nav.headers() });
  if (inicio.tipo !== "ok") throw new Error(inicio.tipo);
  const codigoAtivacao = totpDaUri(inicio.totpURI, Date.now() - 30_000);
  const ativou = await confirmarSegundoFator(c, { usuarioId: conta.usuarioId, codigo: codigoAtivacao, headers: nav.headers() });
  if (ativou.tipo !== "ok") throw new Error(ativou.tipo);
  nav.aplicar(ativou.cookies);
  return { email, usuarioId: conta.usuarioId, nav, totpURI: inicio.totpURI, reservas: inicio.codigosReserva, codigoAtivacao };
}

async function desafiar(c: Contexto, email: string) {
  const nav = new Navegador(IP);
  const r = await entrar(c, { email, senha: SENHA, headers: nav.headers() });
  if (r.tipo !== "segundo_fator") throw new Error(r.tipo);
  return nav.aplicar(r.cookies);
}

describe("rotação de BETTER_AUTH_SECRET", () => {
  it("o 2FA cifrado com a chave anterior continua valendo depois da rotação, e só enquanto a chave anterior estiver configurada", async () => {
    const antes = contextoDeAcesso(banco.pool, banco.db, { BETTER_AUTH_SECRET: ANTIGO });
    const p = await contaComMfa(antes);

    // Sem a chave anterior, o segredo TOTP gravado não pode ser lido: login recusado.
    const semChaveAntiga = contextoDeAcesso(banco.pool, banco.db, { BETTER_AUTH_SECRET: NOVO });
    const codigo = totpDaUri(p.totpURI);
    const nav1 = await desafiar(semChaveAntiga, p.email);
    expect((await verificarSegundoFator(semChaveAntiga, { codigo, metodo: "totp", headers: nav1.headers() })).tipo).toBe("recusado");

    // Rotação como no .env.example: a chave anterior fica em BETTER_AUTH_SECRET, a nova em BETTER_AUTH_SECRETS.
    const depois = contextoDeAcesso(banco.pool, banco.db, { BETTER_AUTH_SECRET: ANTIGO, BETTER_AUTH_SECRETS: `1:${NOVO}` });
    const nav2 = await desafiar(depois, p.email);
    const totp = await verificarSegundoFator(depois, { codigo, metodo: "totp", headers: nav2.headers() });
    expect(totp.tipo).toBe("entrou");

    // Os códigos de reserva cifrados com a chave anterior também continuam legíveis.
    const nav3 = await desafiar(depois, p.email);
    expect((await verificarSegundoFator(depois, { codigo: p.reservas[0]!, metodo: "reserva", headers: nav3.headers() })).tipo).toBe("entrou");

    // Cookies assinados com a chave anterior deixam de valer: troca de chave atual exige novo login.
    expect(await depois.auth.api.getSession({ headers: p.nav.headers() })).toBeNull();
  });

  it("dados cifrados após a rotação usam a versão nova e não são lidos por quem só tem a chave anterior", async () => {
    const depois = contextoDeAcesso(banco.pool, banco.db, { BETTER_AUTH_SECRET: ANTIGO, BETTER_AUTH_SECRETS: `2:${NOVO}` });
    const p = await contaComMfa(depois);
    const fator = await banco.db.selectFrom("twoFactor").select(["secret"]).where("userId", "=", p.usuarioId).executeTakeFirstOrThrow();
    expect(fator.secret.startsWith("$ba$2$")).toBe(true);

    const soAntiga = contextoDeAcesso(banco.pool, banco.db, { BETTER_AUTH_SECRET: ANTIGO });
    const nav = await desafiar(soAntiga, p.email);
    expect((await verificarSegundoFator(soAntiga, { codigo: totpDaUri(p.totpURI), metodo: "totp", headers: nav.headers() })).tipo).toBe("recusado");
  });
});

describe("regeneração dos códigos de reserva", () => {
  let c: Contexto;
  beforeAll(() => { c = contextoDeAcesso(banco.pool, banco.db); });

  it("com senha e código novo, troca as reservas: as antigas param de valer e as novas valem uma vez", async () => {
    const p = await contaComMfa(c);
    const r = await regenerarCodigosReserva(c, { senha: SENHA, codigo: totpDaUri(p.totpURI), headers: p.nav.headers() });
    if (r.tipo !== "ok") throw new Error(r.tipo);
    expect(r.codigosReserva).toHaveLength(p.reservas.length);
    expect(r.codigosReserva.some((novo) => p.reservas.includes(novo))).toBe(false);

    const nav1 = await desafiar(c, p.email);
    expect((await verificarSegundoFator(c, { codigo: p.reservas[1]!, metodo: "reserva", headers: nav1.headers() })).tipo).toBe("recusado");
    const nav2 = await desafiar(c, p.email);
    expect((await verificarSegundoFator(c, { codigo: r.codigosReserva[0]!, metodo: "reserva", headers: nav2.headers() })).tipo).toBe("entrou");

    const acoes = await c.db.selectFrom("auditoria").select("acao").where("ator_usuario_id", "=", p.usuarioId).execute();
    expect(acoes.map((a) => a.acao)).toContain("segundo_fator.reservas_regeneradas");
  });

  it("recusa senha errada, código TOTP já usado e pedido sem sessão, sem trocar as reservas", async () => {
    const p = await contaComMfa(c);
    const reservasAntes = async () =>
      (await c.db.selectFrom("twoFactor").select("backupCodes").where("userId", "=", p.usuarioId).executeTakeFirstOrThrow()).backupCodes;
    const original = await reservasAntes();

    const codigo = totpDaUri(p.totpURI);
    expect((await regenerarCodigosReserva(c, { senha: "senha incorreta de teste", codigo, headers: p.nav.headers() })).tipo).toBe("recusado");
    expect((await regenerarCodigosReserva(c, { senha: SENHA, codigo: p.codigoAtivacao, headers: p.nav.headers() })).tipo).toBe("recusado");
    expect((await regenerarCodigosReserva(c, { senha: SENHA, codigo, headers: new Navegador(IP).headers() })).tipo).toBe("recusado");
    expect(await reservasAntes()).toBe(original);

    // A reserva original continua valendo.
    const nav = await desafiar(c, p.email);
    expect((await verificarSegundoFator(c, { codigo: p.reservas[0]!, metodo: "reserva", headers: nav.headers() })).tipo).toBe("entrou");
  });
});
