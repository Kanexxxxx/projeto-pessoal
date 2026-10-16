import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { criarConvite, aceitarConvite } from "../../src/servidor/auth/convites";
import { confirmarSegundoFator, entrar, iniciarSegundoFator, pedirRedefinicao, redefinirSenha, verificarSegundoFator } from "../../src/servidor/auth/fluxos";
import { bancoDeTeste, contextoDeAcesso } from "../apoio/banco";
import { Navegador } from "../apoio/navegador";
import { totpDaUri } from "../apoio/totp";

let banco: Awaited<ReturnType<typeof bancoDeTeste>>;
let c: ReturnType<typeof contextoDeAcesso>;
const SENHA = "cafe com pao de queijo";
const IP = { "x-real-ip": "203.0.113.50" };

beforeAll(async () => { banco = await bancoDeTeste(); c = contextoDeAcesso(banco.pool, banco.db); });
afterAll(async () => { await banco.encerrar(); });
beforeEach(async () => { await banco.db.deleteFrom("limites_taxa").execute(); c.enviador.caixa.length = 0; });

async function preparar() {
  const email = `pessoa-${randomUUID()}@nexakeep.test`;
  const { token } = await criarConvite(c.db, { email, papel: "operador" });
  const conta = await aceitarConvite(c.auth, c.db, { token, nome: "Juliana", senha: SENHA, marca: c.config.marca });
  if (!conta.ok) throw new Error("Falha no convite de teste");
  const nav = new Navegador(IP);
  const login = await entrar(c, { email, senha: SENHA, headers: nav.headers() });
  if (login.tipo !== "entrou") throw new Error(login.tipo);
  nav.aplicar(login.cookies);
  return { email, usuarioId: conta.usuarioId, nav };
}

async function ativar(p: Awaited<ReturnType<typeof preparar>>) {
  const inicio = await iniciarSegundoFator(c, { senha: SENHA, headers: p.nav.headers() });
  if (inicio.tipo !== "ok") throw new Error(inicio.tipo);
  const codigo = totpDaUri(inicio.totpURI, Date.now() - 30_000);
  const resultado = await confirmarSegundoFator(c, { usuarioId: p.usuarioId, codigo, headers: p.nav.headers() });
  if (resultado.tipo !== "ok") throw new Error(resultado.tipo);
  p.nav.aplicar(resultado.cookies);
  return { ...inicio, codigo };
}

async function desafiar(email: string) {
  const nav = new Navegador(IP);
  const r = await entrar(c, { email, senha: SENHA, headers: nav.headers() });
  if (r.tipo !== "segundo_fator") throw new Error(r.tipo);
  return nav.aplicar(r.cookies);
}

describe("regressões de segurança MFA", () => {
  it("revoga todas as sessões anteriores quando o segundo fator é confirmado", async () => {
    const p = await preparar();
    const anterior = new Navegador(IP);
    const login = await entrar(c, { email: p.email, senha: SENHA, headers: anterior.headers() });
    if (login.tipo !== "entrou") throw new Error(login.tipo);
    anterior.aplicar(login.cookies);
    await ativar(p);
    expect(await c.auth.api.getSession({ headers: anterior.headers() })).toBeNull();
    expect((await c.auth.api.getSession({ headers: p.nav.headers() }))?.user.twoFactorEnabled).toBe(true);
  });

  it("recusa o código TOTP já usado na ativação", async () => {
    const p = await preparar();
    const { codigo } = await ativar(p);
    const nav = await desafiar(p.email);
    expect((await verificarSegundoFator(c, { codigo, metodo: "totp", headers: nav.headers() })).tipo).toBe("recusado");
    expect(await c.auth.api.getSession({ headers: nav.headers() })).toBeNull();
  });

  it("aceita o mesmo TOTP em apenas um de dois logins concorrentes", async () => {
    const p = await preparar();
    const { totpURI } = await ativar(p);
    const a = await desafiar(p.email);
    const b = await desafiar(p.email);
    const codigo = totpDaUri(totpURI);
    const resultados = await Promise.all([a, b].map(nav => verificarSegundoFator(c, { codigo, metodo: "totp", headers: nav.headers() })));
    expect(resultados.filter(r => r.tipo === "entrou")).toHaveLength(1);
    expect(resultados.filter(r => r.tipo === "recusado")).toHaveLength(1);
  });

  it("limita a conferência de senha durante a configuração do segundo fator", async () => {
    const p = await preparar();
    for (let n = 0; n < 5; n++) expect((await iniciarSegundoFator(c, { senha: "senha incorreta de teste", headers: p.nav.headers() })).tipo).toBe("recusado");
    expect((await iniciarSegundoFator(c, { senha: SENHA, headers: p.nav.headers() })).tipo).toBe("limite");
  });

  it("audita sessão somente depois de concluir MFA e identifica recusas e limites", async () => {
    const p = await preparar();
    await ativar(p);
    const eventos = () => c.db.selectFrom("auditoria").selectAll().where("ator_usuario_id", "=", p.usuarioId).execute();
    const antes = (await eventos()).filter(e => e.acao === "sessao.criada").length;
    const nav = await desafiar(p.email);
    expect((await eventos()).filter(e => e.acao === "sessao.criada")).toHaveLength(antes);
    for (let n = 0; n < 6; n++) await verificarSegundoFator(c, { codigo: "invalido", metodo: "totp", headers: nav.headers() });
    expect((await eventos()).map(e => e.acao)).toEqual(expect.arrayContaining(["segundo_fator.recusado", "segundo_fator.limite"]));
  });

  it("redefinição mantém a regra que impede nome pessoal na senha e preserva token recusado", async () => {
    const p = await preparar();
    await pedirRedefinicao(c, { email: p.email, headers: p.nav.headers() });
    const token = /#token=([A-Za-z0-9_-]+)/.exec(c.enviador.caixa[0]!.texto)![1]!;
    expect((await redefinirSenha(c, { token, novaSenha: "juliana-2026!", headers: p.nav.headers() })).tipo).toBe("fraca");
    expect((await redefinirSenha(c, { token, novaSenha: "outro cafe com queijo", headers: p.nav.headers() })).tipo).toBe("ok");
  });
});
