import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aceitarConvite, consultarConvite, criarConvite } from "../../src/servidor/auth/convites";
import {
  confirmarSegundoFator,
  entrar,
  iniciarSegundoFator,
  pedirRedefinicao,
  redefinirSenha,
  sair,
  verificarSegundoFator,
} from "../../src/servidor/auth/fluxos";
import { ehOperadorAtivo } from "../../src/servidor/auth/operadores";
import { LIMITES } from "../../src/servidor/limites";
import { bancoDeTeste, contextoDeAcesso } from "../apoio/banco";
import { Navegador } from "../apoio/navegador";
import { totpDaUri } from "../apoio/totp";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
let c: ReturnType<typeof contextoDeAcesso>;

const SENHA = "cafe com pao de queijo";
const IP = { "x-real-ip": "203.0.113.10" };

beforeAll(async () => {
  banco = await bancoDeTeste();
  c = contextoDeAcesso(banco.pool, banco.db);
});
afterAll(async () => {
  await banco.encerrar();
});
beforeEach(async () => {
  c.enviador.caixa.length = 0;
  await banco.db.deleteFrom("limites_taxa").execute();
});

async function novoOperador(email: string) {
  const { token } = await criarConvite(banco.db, { email, papel: "operador" });
  const r = await aceitarConvite(c.auth, banco.db, { token, nome: "Operador Teste", senha: SENHA, marca: c.config.marca });
  if (!r.ok) throw new Error(`convite não aceito: ${r.motivo}`);
  return r.usuarioId;
}

async function sessaoDe(nav: Navegador) {
  return c.auth.api.getSession({ headers: nav.headers() });
}

function tokenDoLink(texto: string): string {
  const m = /#token=([A-Za-z0-9%_-]+)/.exec(texto);
  if (!m?.[1]) throw new Error("e-mail sem link com token");
  return decodeURIComponent(m[1]);
}

describe("convites", () => {
  it("criam a conta com e-mail verificado e o vínculo de operador", async () => {
    const usuarioId = await novoOperador("op1@nexakeep.test");
    const u = await banco.db.selectFrom("user").selectAll().where("id", "=", usuarioId).executeTakeFirstOrThrow();
    expect(u.emailVerified).toBe(true);
    expect(await ehOperadorAtivo(banco.db, usuarioId)).toBe(true);
  });

  it("são de uso único, expiram e não guardam o token", async () => {
    const { id, token } = await criarConvite(banco.db, { email: "op2@nexakeep.test", papel: "operador" });
    const linha = await banco.db.selectFrom("convites").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
    expect(linha.token_hash.toString("hex")).not.toContain(Buffer.from(token).toString("hex"));
    expect(JSON.stringify(linha)).not.toContain(token);

    expect(await consultarConvite(banco.db, token)).toEqual({ email: "op2@nexakeep.test", papel: "operador", tenant_id: null });
    expect((await aceitarConvite(c.auth, banco.db, { token, nome: "Op Dois", senha: SENHA, marca: "Nexakeep" })).ok).toBe(true);
    expect(await aceitarConvite(c.auth, banco.db, { token, nome: "Op Dois", senha: SENHA, marca: "Nexakeep" })).toEqual({ ok: false, motivo: "invalido" });

    const expirado = await criarConvite(banco.db, { email: "op3@nexakeep.test", papel: "operador" });
    await banco.db
      .updateTable("convites")
      .set({ criado_em: sql`now() - interval '4 days'`, expira_em: sql`now() - interval '1 day'` })
      .where("id", "=", expirado.id)
      .execute();
    expect(await aceitarConvite(c.auth, banco.db, { token: expirado.token, nome: "Op Três", senha: SENHA, marca: "Nexakeep" })).toEqual({
      ok: false,
      motivo: "invalido",
    });
    // publicacao:ficticio
    const tokenInexistente = ["token", "que", "nunca", "existiu", "0000000000"].join("-");
    expect(await aceitarConvite(c.auth, banco.db, { token: tokenInexistente, nome: "X Y", senha: SENHA, marca: "N" })).toEqual({
      ok: false,
      motivo: "invalido",
    });
  });

  it("recusam senha fraca sem gastar o convite, e um convite novo invalida o anterior", async () => {
    const primeiro = await criarConvite(banco.db, { email: "op4@nexakeep.test", papel: "operador" });
    const fraca = await aceitarConvite(c.auth, banco.db, { token: primeiro.token, nome: "Op Quatro", senha: "1234567890", marca: "Nexakeep" });
    expect(fraca).toMatchObject({ ok: false, motivo: "dados" });
    expect(await consultarConvite(banco.db, primeiro.token)).not.toBeNull();

    const segundo = await criarConvite(banco.db, { email: "op4@nexakeep.test", papel: "operador" });
    expect(await consultarConvite(banco.db, primeiro.token)).toBeNull();
    expect((await aceitarConvite(c.auth, banco.db, { token: segundo.token, nome: "Op Quatro", senha: SENHA, marca: "Nexakeep" })).ok).toBe(true);
  });

  it("a biblioteca não cria conta sem convite (cadastro desligado)", async () => {
    await expect(
      c.auth.api.signUpEmail({ body: { email: "intruso@nexakeep.test", password: SENHA, name: "Intruso" } }),
    ).rejects.toThrow();
    const conta = await banco.db.selectFrom("user").select("id").where("email", "=", "intruso@nexakeep.test").executeTakeFirst();
    expect(conta).toBeUndefined();
  });

  it("dois aceites simultâneos do mesmo link criam uma conta só", async () => {
    const { token } = await criarConvite(banco.db, { email: "op5@nexakeep.test", papel: "operador" });
    const tentativa = () => aceitarConvite(c.auth, banco.db, { token, nome: "Op Cinco", senha: SENHA, marca: "Nexakeep" });
    const resultados = await Promise.all([tentativa(), tentativa()]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    const contas = await banco.db.selectFrom("user").select("id").where("email", "=", "op5@nexakeep.test").execute();
    expect(contas).toHaveLength(1);
  });
});

describe("entrar", () => {
  it("cria sessão com cookie restrito ao host, HttpOnly e SameSite=Lax", async () => {
    await novoOperador("login1@nexakeep.test");
    const nav = new Navegador(IP);
    const r = await entrar(c, { email: "LOGIN1@nexakeep.test ", senha: SENHA, headers: nav.headers() });
    expect(r.tipo).toBe("entrou");
    if (r.tipo !== "entrou") return;
    nav.aplicar(r.cookies);
    const sessao = nav.recebidos.find((k) => k.nome.endsWith("session_token"));
    expect(sessao?.nome.startsWith("nexakeep.")).toBe(true);
    expect(sessao?.atributos.httponly).toBe(true);
    expect(String(sessao?.atributos.samesite).toLowerCase()).toBe("lax");
    expect(sessao?.atributos.path).toBe("/");
    expect(sessao?.atributos.domain).toBeUndefined();
    expect((await sessaoDe(nav))?.user.email).toBe("login1@nexakeep.test");
  });

  it("dá a mesma resposta para senha errada e para e-mail inexistente", async () => {
    await novoOperador("login2@nexakeep.test");
    const errada = await entrar(c, { email: "login2@nexakeep.test", senha: "senha errada demais", headers: new Navegador(IP).headers() });
    const inexistente = await entrar(c, { email: "ninguem@nexakeep.test", senha: SENHA, headers: new Navegador(IP).headers() });
    expect(errada).toEqual({ tipo: "recusado" });
    expect(inexistente).toEqual({ tipo: "recusado" });
    const eventos = await banco.db.selectFrom("auditoria").select(["acao", "alvo"]).where("acao", "=", "entrar.recusado").execute();
    expect(eventos.map((e) => e.alvo)).toEqual(expect.arrayContaining(["l***@nexakeep.test", "n***@nexakeep.test"]));
    expect(JSON.stringify(eventos)).not.toContain("login2@");
  });

  it(`bloqueia o e-mail após ${LIMITES.entrarPorEmail.maximo} tentativas, mesmo com a senha certa`, async () => {
    await novoOperador("login3@nexakeep.test");
    for (let i = 0; i < LIMITES.entrarPorEmail.maximo; i++) {
      expect((await entrar(c, { email: "login3@nexakeep.test", senha: "errada errada errada", headers: new Navegador(IP).headers() })).tipo).toBe("recusado");
    }
    const bloqueado = await entrar(c, { email: "login3@nexakeep.test", senha: SENHA, headers: new Navegador(IP).headers() });
    expect(bloqueado.tipo).toBe("limite");
  });

  it("tentativas simultâneas não furam o limite", async () => {
    await novoOperador("login4@nexakeep.test");
    const tentativas = Array.from({ length: 12 }, () =>
      entrar(c, { email: "login4@nexakeep.test", senha: "errada errada errada", headers: new Navegador(IP).headers() }),
    );
    const tipos = (await Promise.all(tentativas)).map((r) => r.tipo);
    expect(tipos.filter((t) => t === "recusado")).toHaveLength(LIMITES.entrarPorEmail.maximo);
    expect(tipos.filter((t) => t === "limite")).toHaveLength(12 - LIMITES.entrarPorEmail.maximo);
  });

  it("sair encerra a sessão no banco, e revogar vale na hora", async () => {
    await novoOperador("login5@nexakeep.test");
    const nav = new Navegador(IP);
    const r = await entrar(c, { email: "login5@nexakeep.test", senha: SENHA, headers: nav.headers() });
    if (r.tipo !== "entrou") throw new Error(r.tipo);
    nav.aplicar(r.cookies);
    const copia = new Navegador(IP);
    for (const [n, v] of nav.cookies) copia.cookies.set(n, v);

    nav.aplicar((await sair(c, { headers: nav.headers() })).cookies);
    expect(await sessaoDe(nav)).toBeNull();
    // Um cookie copiado antes de sair também deixou de valer.
    expect(await sessaoDe(copia)).toBeNull();

    const outra = new Navegador(IP);
    const r2 = await entrar(c, { email: "login5@nexakeep.test", senha: SENHA, headers: outra.headers() });
    if (r2.tipo !== "entrou") throw new Error(r2.tipo);
    outra.aplicar(r2.cookies);
    const { userId } = (await sessaoDe(outra))!.session;
    await banco.db.deleteFrom("session").where("userId", "=", userId).execute();
    expect(await sessaoDe(outra)).toBeNull();
  });
});

describe("recuperação de senha", () => {
  it("envia link de uso único, guarda só o hash, troca a senha e derruba as sessões", async () => {
    await novoOperador("rec1@nexakeep.test");
    const nav = new Navegador(IP);
    const login = await entrar(c, { email: "rec1@nexakeep.test", senha: SENHA, headers: nav.headers() });
    if (login.tipo !== "entrou") throw new Error(login.tipo);
    nav.aplicar(login.cookies);

    expect(await pedirRedefinicao(c, { email: "rec1@nexakeep.test", headers: new Navegador(IP).headers() })).toEqual({ tipo: "ok" });
    expect(c.enviador.caixa).toHaveLength(1);
    const email = c.enviador.caixa[0]!;
    expect(email.finalidade).toBe("redefinicao_senha");
    const token = tokenDoLink(email.texto);
    expect(email.texto).toContain("http://app.localhost:3000/redefinir#token=");

    const verificacoes = await sql<{ identifier: string; value: string }>`select identifier, value from "verification"`.execute(banco.db);
    expect(JSON.stringify(verificacoes.rows)).not.toContain(token);

    expect(await redefinirSenha(c, { token, novaSenha: "1234567890", headers: new Navegador(IP).headers() })).toMatchObject({ tipo: "fraca" });
    expect(await redefinirSenha(c, { token, novaSenha: "outra frase bem longa 7", headers: new Navegador(IP).headers() })).toEqual({ tipo: "ok" });
    expect(await redefinirSenha(c, { token, novaSenha: "mais uma frase longa 8", headers: new Navegador(IP).headers() })).toEqual({ tipo: "invalido" });

    expect(await sessaoDe(nav)).toBeNull();
    expect(c.enviador.caixa.map((e) => e.finalidade)).toContain("aviso_seguranca");
    expect((await entrar(c, { email: "rec1@nexakeep.test", senha: SENHA, headers: new Navegador(IP).headers() })).tipo).toBe("recusado");
    expect((await entrar(c, { email: "rec1@nexakeep.test", senha: "outra frase bem longa 7", headers: new Navegador(IP).headers() })).tipo).toBe("entrou");
  });

  it("responde igual para e-mail inexistente e não envia nada", async () => {
    expect(await pedirRedefinicao(c, { email: "nao-existe@nexakeep.test", headers: new Navegador(IP).headers() })).toEqual({ tipo: "ok" });
    expect(c.enviador.caixa).toHaveLength(0);
  });

  it("limita pedidos por e-mail", async () => {
    await novoOperador("rec2@nexakeep.test");
    for (let i = 0; i < LIMITES.recuperarPorEmail.maximo; i++) {
      expect((await pedirRedefinicao(c, { email: "rec2@nexakeep.test", headers: new Navegador(IP).headers() })).tipo).toBe("ok");
    }
    expect((await pedirRedefinicao(c, { email: "rec2@nexakeep.test", headers: new Navegador(IP).headers() })).tipo).toBe("limite");
    expect(c.enviador.caixa).toHaveLength(LIMITES.recuperarPorEmail.maximo);
  });
});

describe("segundo fator (MFA do operador)", () => {
  it("ativa com senha e código, exige o código no login e aceita reserva uma vez só", async () => {
    await novoOperador("mfa1@nexakeep.test");
    const nav = new Navegador(IP);
    const login = await entrar(c, { email: "mfa1@nexakeep.test", senha: SENHA, headers: nav.headers() });
    if (login.tipo !== "entrou") throw new Error(login.tipo);
    nav.aplicar(login.cookies);
    const usuarioId = (await sessaoDe(nav))!.user.id;

    expect(await iniciarSegundoFator(c, { senha: "senha errada demais", headers: nav.headers() })).toEqual({ tipo: "recusado" });
    const inicio = await iniciarSegundoFator(c, { senha: SENHA, headers: nav.headers() });
    if (inicio.tipo !== "ok") throw new Error(inicio.tipo);
    expect(inicio.totpURI).toMatch(/^otpauth:\/\/totp\//);
    expect(inicio.codigosReserva).toHaveLength(10);

    const segredoNaUri = new URL(inicio.totpURI).searchParams.get("secret")!;
    const linha2fa = await sql<{ secret: string }>`select secret from "twoFactor" where "userId" = ${usuarioId}`.execute(banco.db);
    expect(linha2fa.rows[0]?.secret).not.toContain(segredoNaUri);

    expect((await confirmarSegundoFator(c, { usuarioId, codigo: "000000", headers: nav.headers() })).tipo).toBe("recusado");
    const confirmado = await confirmarSegundoFator(c, { usuarioId, codigo: totpDaUri(inicio.totpURI, Date.now() - 30_000), headers: nav.headers() });
    expect(confirmado.tipo).toBe("ok");
    const u = await banco.db.selectFrom("user").select("twoFactorEnabled").where("id", "=", usuarioId).executeTakeFirstOrThrow();
    expect(u.twoFactorEnabled).toBe(true);

    // Novo login: a senha sozinha não cria sessão.
    const nav2 = new Navegador(IP);
    const passo1 = await entrar(c, { email: "mfa1@nexakeep.test", senha: SENHA, headers: nav2.headers() });
    expect(passo1.tipo).toBe("segundo_fator");
    if (passo1.tipo !== "segundo_fator") return;
    nav2.aplicar(passo1.cookies);
    expect(await sessaoDe(nav2)).toBeNull();

    expect((await verificarSegundoFator(c, { codigo: "123456", metodo: "totp", headers: nav2.headers() })).tipo).toBe("recusado");
    const passo2 = await verificarSegundoFator(c, { codigo: totpDaUri(inicio.totpURI), metodo: "totp", headers: nav2.headers() });
    expect(passo2.tipo).toBe("entrou");
    if (passo2.tipo !== "entrou") return;
    nav2.aplicar(passo2.cookies);
    expect((await sessaoDe(nav2))?.user.id).toBe(usuarioId);
    expect(nav2.recebidos.some((k) => k.nome.includes("trust_device"))).toBe(false);

    // Código de reserva: vale uma vez.
    const reserva = inicio.codigosReserva[0]!;
    const nav3 = new Navegador(IP);
    const p1 = await entrar(c, { email: "mfa1@nexakeep.test", senha: SENHA, headers: nav3.headers() });
    if (p1.tipo !== "segundo_fator") throw new Error(p1.tipo);
    nav3.aplicar(p1.cookies);
    expect((await verificarSegundoFator(c, { codigo: reserva, metodo: "reserva", headers: nav3.headers() })).tipo).toBe("entrou");

    const nav4 = new Navegador(IP);
    const p2 = await entrar(c, { email: "mfa1@nexakeep.test", senha: SENHA, headers: nav4.headers() });
    if (p2.tipo !== "segundo_fator") throw new Error(p2.tipo);
    nav4.aplicar(p2.cookies);
    expect((await verificarSegundoFator(c, { codigo: reserva, metodo: "reserva", headers: nav4.headers() })).tipo).toBe("recusado");
  });

  it("sem o cookie do desafio não há o que verificar, e o desafio tem limite de tentativas", async () => {
    expect((await verificarSegundoFator(c, { codigo: "123456", metodo: "totp", headers: new Navegador(IP).headers() })).tipo).toBe("expirado");

    await novoOperador("mfa2@nexakeep.test");
    const nav = new Navegador(IP);
    const login = await entrar(c, { email: "mfa2@nexakeep.test", senha: SENHA, headers: nav.headers() });
    if (login.tipo !== "entrou") throw new Error(login.tipo);
    nav.aplicar(login.cookies);
    const usuarioId = (await sessaoDe(nav))!.user.id;
    const inicio = await iniciarSegundoFator(c, { senha: SENHA, headers: nav.headers() });
    if (inicio.tipo !== "ok") throw new Error(inicio.tipo);
    await confirmarSegundoFator(c, { usuarioId, codigo: totpDaUri(inicio.totpURI), headers: nav.headers() });

    const tentativa = new Navegador(IP);
    const p1 = await entrar(c, { email: "mfa2@nexakeep.test", senha: SENHA, headers: tentativa.headers() });
    if (p1.tipo !== "segundo_fator") throw new Error(p1.tipo);
    tentativa.aplicar(p1.cookies);
    const resultados = [];
    for (let i = 0; i < LIMITES.segundoFatorPorDesafio.maximo + 1; i++) {
      resultados.push((await verificarSegundoFator(c, { codigo: "999999", metodo: "totp", headers: tentativa.headers() })).tipo);
    }
    expect(resultados.at(-1)).toBe("limite");
    // Nem o código certo passa depois do limite.
    expect((await verificarSegundoFator(c, { codigo: totpDaUri(inicio.totpURI), metodo: "totp", headers: tentativa.headers() })).tipo).toBe("limite");
  });

  it("operador revogado deixa de ser operador", async () => {
    const usuarioId = await novoOperador("revogado@nexakeep.test");
    await banco.db.updateTable("operadores").set({ revogado_em: sql`now()` }).where("usuario_id", "=", usuarioId).execute();
    expect(await ehOperadorAtivo(banco.db, usuarioId)).toBe(false);
  });
});
