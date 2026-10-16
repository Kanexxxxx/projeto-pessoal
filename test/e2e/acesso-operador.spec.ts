import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { criarConvite } from "../../src/servidor/auth/convites";
import { urlComToken } from "../../src/servidor/auth/instancia";
import { criarBd, criarPool } from "../../src/servidor/bd/conexao";
import { base32, hotp } from "../apoio/totp";
import { BANCO, DADOS, PORTA, carregarAmbienteLocal } from "./ambiente";

/**
 * Ciclo completo do operador num navegador de verdade (Edge do sistema):
 * convite → senha → 2FA obrigatório → sair → entrar com código →
 * recuperar senha pelo link do e-mail → entrar com a senha nova.
 */
const EMAIL = "operador.e2e@nexakeep.test";
const SENHA = "pao de queijo com cafe";
const NOVA_SENHA = "outra frase para o teste 9";

const ambiente = carregarAmbienteLocal();

async function convidar(): Promise<string> {
  const db = criarBd(criarPool(ambiente.url("nexakeep_app", ambiente.senhas.app, BANCO), "e2e", 1));
  try {
    const { token } = await criarConvite(db, { email: EMAIL, papel: "operador" });
    return urlComToken(`http://app.localhost:${PORTA}/convite`, token);
  } finally {
    await db.destroy();
  }
}

async function ultimoEmail(finalidade: string): Promise<{ texto: string; para: string }> {
  const pasta = join(DADOS, "emails");
  const arquivos = (await readdir(pasta)).filter((a) => a.includes(finalidade)).sort();
  const ultimo = arquivos.at(-1);
  if (!ultimo) throw new Error(`nenhum e-mail de ${finalidade}`);
  return JSON.parse(await readFile(join(pasta, ultimo), "utf8"));
}

/** Código do autenticador; espera virar a janela de 30 s para nunca repetir um código. */
async function codigoNovo(segredo: string, ultimoUsado?: number): Promise<{ codigo: string; janela: number }> {
  let janela = Math.floor(Date.now() / 30_000);
  if (ultimoUsado !== undefined && janela <= ultimoUsado) {
    await new Promise((r) => setTimeout(r, (ultimoUsado + 1) * 30_000 - Date.now() + 500));
    janela = Math.floor(Date.now() / 30_000);
  }
  return { codigo: hotp(base32(segredo.replace(/\s+/g, "")), janela), janela };
}

/** Nosso aviso de erro (o Next também tem um role="alert": o anunciador de rotas). */
const erroDoFormulario = (page: Page) => page.locator("p[role=alert]");

async function entrar(page: Page, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(EMAIL);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("operador: convite, 2FA obrigatório, login com código e recuperação de senha", async ({ page, context }) => {
  // 1. Convite: o token vem no fragmento e some da barra de endereço.
  await page.goto(await convidar());
  await expect(page.getByText(EMAIL)).toBeVisible();
  // O token sai da barra assim que a página hidrata (pode demorar na 1ª compilação).
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");

  await page.getByLabel("Seu nome").fill("Operadora Teste");
  await page.getByLabel("Crie uma senha").fill(SENHA);
  await page.getByLabel("Repita a senha").fill(SENHA);
  await page.getByRole("button", { name: "Criar acesso" }).click();

  // 2. Operador cai direto na configuração do 2FA, e o painel o obriga a voltar lá.
  await expect(page).toHaveURL(/\/seguranca$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/seguranca$/);

  await page.getByLabel("Senha atual").fill(SENHA);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("img", { name: /QR para cadastrar/ })).toBeVisible();
  const segredo = (await page.locator("code").textContent()) ?? "";
  expect(segredo.replace(/\s+/g, "")).toMatch(/^[A-Z2-7]{16,}$/);

  await page.getByLabel(/Digite o código/).fill("000000");
  await page.getByRole("button", { name: /Ativar verificação/ }).click();
  await expect(erroDoFormulario(page)).toContainText("Código incorreto");

  const ativacao = await codigoNovo(segredo);
  await page.getByLabel(/Digite o código/).fill(ativacao.codigo);
  await page.getByRole("button", { name: /Ativar verificação/ }).click();
  await expect(page.getByRole("heading", { name: "Olá, Operadora" })).toBeVisible();

  // Cookie de sessão: HttpOnly, SameSite=Lax e preso ao host do painel.
  const sessao = (await context.cookies()).find((c) => c.name.endsWith("session_token"));
  expect(sessao).toMatchObject({ httpOnly: true, sameSite: "Lax", domain: "app.localhost" });
  expect((await context.cookies(`http://loja-a.localhost:${PORTA}`)).some((c) => c.name.endsWith("session_token"))).toBe(false);

  // 3. Sair e entrar de novo: a senha sozinha não basta.
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);

  await entrar(page, SENHA);
  await expect(page).toHaveURL(/\/entrar\/verificar$/);
  const login = await codigoNovo(segredo, ativacao.janela);
  await page.getByLabel("Código do aplicativo autenticador").fill(login.codigo);
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Operadora" })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();

  // 4. Recuperação: resposta genérica, link de uso único e senha nova valendo.
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("E-mail da conta").fill(EMAIL);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");

  const email = await ultimoEmail("redefinicao_senha");
  expect(email.para).toBe(EMAIL);
  const link = /http:\/\/app\.localhost:\d+\/redefinir#token=\S+/.exec(email.texto)?.[0];
  expect(link).toBeTruthy();
  await page.goto(link!);
  // O token sai da barra assim que a página hidrata (pode demorar na 1ª compilação).
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
  await page.getByLabel("Nova senha", { exact: true }).fill(NOVA_SENHA);
  await page.getByLabel("Repita a nova senha").fill(NOVA_SENHA);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha alterada. Entre com a nova senha.")).toBeVisible();

  // O mesmo link não funciona duas vezes.
  await page.goto(link!);
  await page.getByLabel("Nova senha", { exact: true }).fill("mais uma frase longa 77");
  await page.getByLabel("Repita a nova senha").fill("mais uma frase longa 77");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(erroDoFormulario(page)).toContainText("inválido ou expirou");

  // A senha antiga deixou de valer; a nova entra (com o código, claro).
  await entrar(page, SENHA);
  await expect(erroDoFormulario(page)).toContainText("E-mail ou senha incorretos.");
  await entrar(page, NOVA_SENHA);
  await expect(page).toHaveURL(/\/entrar\/verificar$/);
  const ultimo = await codigoNovo(segredo, login.janela);
  await page.getByLabel("Código do aplicativo autenticador").fill(ultimo.codigo);
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Operadora" })).toBeVisible();

  const avisoSeguranca = await ultimoEmail("aviso_seguranca");
  expect(avisoSeguranca.texto).toContain("foi alterada");
});
