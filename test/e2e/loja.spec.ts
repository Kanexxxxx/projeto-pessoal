import { expect, test } from "@playwright/test";
import { criarConvite } from "../../src/servidor/auth/convites";
import { urlComToken } from "../../src/servidor/auth/instancia";
import { criarBd, criarPool } from "../../src/servidor/bd/conexao";
import { hojeNoFuso, somarDias } from "../../src/dominio/datas";
import { salvarExpediente, salvarProfissional, salvarServico, salvarSite } from "../../src/servidor/lojas/catalogo";
import { comLoja } from "../../src/servidor/lojas/escopo";
import { criarLoja, type Acesso } from "../../src/servidor/lojas/lojas";
import { BANCO, PORTA, carregarAmbienteLocal } from "./ambiente";

/**
 * Loja de ponta a ponta, no Edge do sistema: a dona aceita o convite e cai no
 * painel da loja; o cliente agenda pelo site público (subdomínio); a reserva
 * aparece na agenda da dona, que cancela; a dona não enxerga outra loja.
 */
const ambiente = carregarAmbienteLocal();
const EMAIL_DONA = "dona.e2e@nexakeep.test";
const SENHA = "frase longa da dona da loja";

function form(campos: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const item of [v].flat()) f.append(k, item);
  return f;
}

async function prepararLojas(): Promise<{ convite: string; amanha: string }> {
  const db = criarBd(criarPool(ambiente.url("nexakeep_app", ambiente.senhas.app, BANCO), "e2e-loja", 1));
  try {
    const criar = async (nome: string, slug: string) => {
      const r = await criarLoja(db, { nome, slug, segmento: "barbearia", criadaPor: null });
      if (!r.ok) throw new Error(r.erro);
      return r.loja;
    };
    const loja = await criar("Barbearia Teste E2E", "barbearia-e2e");
    await criar("Outra Loja E2E", "outra-e2e");
    const acesso: Acesso = { loja, papel: "operador", usuarioId: "e2e" };
    const conferir = (r: { ok: boolean }) => expect(r.ok).toBe(true);
    conferir(await salvarSite(db, acesso, form({ modelo: "letreiro", cor: "#b8860b", chamada: "Chamada de teste", whatsapp: "(20) 98765-4321", passo: "30", intervalo: "0", antecedencia: "0", horizonte: "14" })));
    conferir(await salvarProfissional(db, acesso, form({ nome: "Rafael" })));
    const prof = await comLoja(db, loja.id, (trx) => trx.selectFrom("profissionais").select("id").executeTakeFirstOrThrow());
    const semana: Record<string, string> = {};
    for (let d = 0; d < 7; d++) Object.assign(semana, { [`aberto-${d}`]: "on", [`de-${d}-1`]: "08:00", [`ate-${d}-1`]: "20:00" });
    conferir(await salvarExpediente(db, acesso, form({ profissional: prof.id, ...semana })));
    conferir(await salvarServico(db, acesso, form({ nome: "Corte", duracao: "30", preco: "45", profissionais: [prof.id] })));
    const { token } = await criarConvite(db, { email: EMAIL_DONA, papel: "dona", tenantId: loja.id });
    return { convite: urlComToken(`http://app.localhost:${PORTA}/convite`, token), amanha: somarDias(hojeNoFuso(new Date(), loja.fuso), 1) };
  } finally {
    await db.destroy();
  }
}

test("dona configura e atende; cliente agenda pelo site; lojas isoladas", async ({ page, browser }) => {
  const { convite, amanha } = await prepararLojas();

  // 1. A dona aceita o convite e cai direto no painel da loja dela.
  await page.goto(convite);
  await expect(page.getByText("Barbearia Teste E2E")).toBeVisible();
  await page.getByLabel("Seu nome").fill("Dona Teste");
  await page.getByLabel("Crie uma senha").fill(SENHA);
  await page.getByLabel("Repita a senha").fill(SENHA);
  await page.getByRole("button", { name: "Criar acesso" }).click();
  await expect(page).toHaveURL(/\/lojas\/barbearia-e2e$/);
  await expect(page.getByRole("heading", { name: "Primeiros passos" })).toBeVisible();

  // 2. Agendamento pelo painel (encaixe), amanhã às 10:00.
  await page.getByRole("navigation", { name: "Seções da loja" }).getByRole("link", { name: "Agenda" }).click();
  await expect(page.getByRole("heading", { name: /^Hoje,/ })).toBeVisible();
  await page.goto(`/lojas/barbearia-e2e/agenda?data=${amanha}`);
  await page.getByLabel("Hora").fill("10:00");
  await page.getByLabel("Nome do cliente").fill("Cliente do Painel");
  await page.getByLabel("WhatsApp").fill("(20) 91111-2222");
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page.getByText("Cliente do Painel")).toBeVisible();

  // 3. O cliente agenda pelo site público, num navegador sem sessão nenhuma.
  const cliente = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const site = await cliente.newPage();
  await site.goto(`http://barbearia-e2e.localhost:${PORTA}/`);
  await expect(site.getByRole("heading", { name: "Barbearia Teste E2E" })).toBeVisible();
  await site.getByRole("link", { name: /^Corte/ }).click();
  // Só um profissional faz o serviço: vai direto para dia e horário.
  await site.waitForURL(/servico=/);
  await expect(site.getByRole("heading", { name: "Quando?" })).toBeVisible();
  await site.goto(`http://barbearia-e2e.localhost:${PORTA}/agendar?${new URLSearchParams({ servico: new URL(site.url()).searchParams.get("servico")!, data: amanha })}`);
  // 10:00 já está ocupado pelo agendamento do painel.
  await expect(site.getByText(/^10:00\s*ocupado$/)).toBeVisible();
  await site.getByRole("link", { name: "11:00" }).click();
  await site.getByLabel("Seu nome").fill("Cliente do Site");
  await site.getByLabel("Seu WhatsApp").fill("(20) 93333-4444");
  await site.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(site.getByText("Horário reservado, Cliente!")).toBeVisible();
  await expect(site.getByRole("link", { name: "Avisar a loja no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5520987654321\?text=/);
  // A sessão da dona não existe no subdomínio da loja.
  expect((await cliente.cookies(`http://app.localhost:${PORTA}`)).length).toBe(0);
  await cliente.close();

  // 4. A reserva do site aparece na agenda da dona, que cancela.
  await page.goto(`/lojas/barbearia-e2e/agenda?data=${amanha}`);
  const itemSite = page.getByRole("listitem").filter({ hasText: "Cliente do Site" });
  await expect(itemSite).toContainText("pelo site");
  page.once("dialog", (d) => d.accept());
  await itemSite.getByRole("button", { name: "Cancelar" }).click();
  await expect(itemSite).toContainText("Cancelado");

  // 5. Isolamento: a outra loja "não existe" para esta dona, nem a exportação dela.
  const outra = await page.goto("/lojas/outra-e2e");
  expect(outra?.status()).toBe(404);
  // Pelo navegador (o Node não resolve *.localhost), com o cookie da dona.
  const baixar = (caminho: string) =>
    page.evaluate(async (url) => {
      const r = await fetch(url);
      return { status: r.status, corpo: await r.text() };
    }, caminho);
  expect((await baixar("/lojas/outra-e2e/exportar")).status).toBe(404);
  const propria = await baixar("/lojas/barbearia-e2e/exportar");
  expect(propria.status).toBe(200);
  expect(propria.corpo).not.toContain("outra-e2e");
  expect(JSON.parse(propria.corpo).agendamentos).toHaveLength(2);
});
