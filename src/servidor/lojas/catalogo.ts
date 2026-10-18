import { sql, type Kysely, type Selectable } from "kysely";
import { corValida, interpretarPreco, normalizarTelefoneBR } from "../../dominio/contato";
import { minutosDeHora } from "../../dominio/datas";
import type { Expediente } from "../../dominio/horarios";
import { registrarAuditoria } from "../auditoria";
import type { BD, ModeloSite, TabelaConfigLoja } from "../bd/tipos";
import { comLoja, UUID, type Trx } from "./escopo";
import type { Acesso } from "./lojas";

/**
 * Catálogo e conteúdo da loja: serviços, profissionais, expediente e site.
 * Tudo dentro de `comLoja`: o banco recusa qualquer linha de outra loja,
 * mesmo que um id de outra loja chegue no formulário.
 */
export type Resultado = { ok: true } | { ok: false; erro: string };

/** Catálogo, horários e site: dona e operador. A equipe só usa a agenda. */
export function podeGerir(acesso: Acesso): boolean {
  return acesso.papel === "dona" || acesso.papel === "operador";
}

const SEM_PERMISSAO = { ok: false, erro: "Só a dona da loja pode alterar isso." } as const;

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  duracaoMin: number;
  precoCentavos: number | null;
  ativo: boolean;
  profissionais: string[];
};

export type Profissional = { id: string; nome: string; ativo: boolean };

export async function lerServicos(trx: Trx, apenasAtivos = false): Promise<Servico[]> {
  let q = trx
    .selectFrom("servicos")
    .select(["id", "nome", "descricao", "duracao_min", "preco_centavos", "ativo"])
    .orderBy("ordem")
    .orderBy("nome");
  if (apenasAtivos) q = q.where("ativo", "=", true);
  const servicos = await q.execute();
  const vinculos = await trx.selectFrom("servicos_profissionais").select(["servico_id", "profissional_id"]).execute();
  return servicos.map((s) => ({
    id: s.id,
    nome: s.nome,
    descricao: s.descricao,
    duracaoMin: s.duracao_min,
    precoCentavos: s.preco_centavos,
    ativo: s.ativo,
    profissionais: vinculos.filter((v) => v.servico_id === s.id).map((v) => v.profissional_id),
  }));
}

export async function lerProfissionais(trx: Trx, apenasAtivos = false): Promise<Profissional[]> {
  let q = trx.selectFrom("profissionais").select(["id", "nome", "ativo"]).orderBy("ordem").orderBy("nome");
  if (apenasAtivos) q = q.where("ativo", "=", true);
  return q.execute();
}

export async function lerExpedientes(trx: Trx): Promise<Expediente[]> {
  const linhas = await trx
    .selectFrom("expedientes")
    .select(["profissional_id", "dia_semana", "inicio_min", "fim_min"])
    .orderBy("dia_semana")
    .orderBy("inicio_min")
    .execute();
  return linhas.map((e) => ({ profissionalId: e.profissional_id, diaSemana: e.dia_semana, inicioMin: e.inicio_min, fimMin: e.fim_min }));
}

export type Config = Selectable<TabelaConfigLoja>;

export async function lerConfig(trx: Trx): Promise<Config> {
  return trx.selectFrom("config_loja").selectAll().executeTakeFirstOrThrow();
}

function texto(v: FormDataEntryValue | null, max: number): string | null {
  const t = String(v ?? "").trim().replace(/[ \t]+/g, " ");
  return t ? t.slice(0, max) : null;
}

const MAXIMO_PROFISSIONAIS = 3;

/** Cria ou altera um serviço. `id` vazio cria. */
export async function salvarServico(db: Kysely<BD>, acesso: Acesso, form: FormData): Promise<Resultado> {
  if (!podeGerir(acesso)) return SEM_PERMISSAO;
  const id = String(form.get("id") ?? "");
  const nome = texto(form.get("nome"), 80);
  const descricao = texto(form.get("descricao"), 300);
  const duracao = Number(form.get("duracao"));
  const preco = interpretarPreco(String(form.get("preco") ?? ""));
  const profissionais = form.getAll("profissionais").map(String).filter((p) => UUID.test(p));
  if (!nome || nome.length < 2) return { ok: false, erro: "Informe o nome do serviço." };
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 600) return { ok: false, erro: "Duração entre 5 e 600 minutos." };
  if (preco === "invalido") return { ok: false, erro: "Preço inválido. Use, por exemplo, 45 ou 45,90 — ou deixe vazio para “sob consulta”." };
  if (id && !UUID.test(id)) return { ok: false, erro: "Serviço não encontrado." };

  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      const validos = profissionais.length
        ? await trx.selectFrom("profissionais").select("id").where("id", "in", profissionais).execute()
        : [];
      if (validos.length !== new Set(profissionais).size) return { ok: false, erro: "Profissional não encontrado." } as const;
      const valores = { nome, descricao, duracao_min: duracao, preco_centavos: preco };
      let servicoId = id;
      if (id) {
        const r = await trx.updateTable("servicos").set(valores).where("id", "=", id).executeTakeFirst();
        if (r.numUpdatedRows !== 1n) return { ok: false, erro: "Serviço não encontrado." } as const;
        await trx.deleteFrom("servicos_profissionais").where("servico_id", "=", id).execute();
      } else {
        const ordem = await trx.selectFrom("servicos").select(sql<number>`coalesce(max(ordem), 0) + 1`.as("proxima")).executeTakeFirstOrThrow();
        servicoId = (
          await trx
            .insertInto("servicos")
            .values({ ...valores, tenant_id: acesso.loja.id, ordem: ordem.proxima })
            .returning("id")
            .executeTakeFirstOrThrow()
        ).id;
      }
      if (validos.length) {
        await trx
          .insertInto("servicos_profissionais")
          .values(validos.map((p) => ({ tenant_id: acesso.loja.id, servico_id: servicoId, profissional_id: p.id })))
          .execute();
      }
      await registrarAuditoria(trx, { acao: id ? "servico.alterado" : "servico.criado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: servicoId });
      return { ok: true } as const;
    },
  );
}

/** Serviço com reservas não é apagado: sai do site e continua no histórico. */
export async function alternarServico(db: Kysely<BD>, acesso: Acesso, id: string): Promise<Resultado> {
  if (!podeGerir(acesso)) return SEM_PERMISSAO;
  if (!UUID.test(id)) return { ok: false, erro: "Serviço não encontrado." };
  return comLoja(db, acesso.loja.id, async (trx) => {
    const r = await trx.updateTable("servicos").set({ ativo: sql`not ativo` }).where("id", "=", id).executeTakeFirst();
    return r.numUpdatedRows === 1n ? ({ ok: true } as const) : ({ ok: false, erro: "Serviço não encontrado." } as const);
  });
}

export async function salvarProfissional(db: Kysely<BD>, acesso: Acesso, form: FormData): Promise<Resultado> {
  if (!podeGerir(acesso)) return SEM_PERMISSAO;
  const id = String(form.get("id") ?? "");
  const nome = texto(form.get("nome"), 60);
  if (!nome) return { ok: false, erro: "Informe o nome." };
  if (id && !UUID.test(id)) return { ok: false, erro: "Profissional não encontrado." };
  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      if (id) {
        const r = await trx.updateTable("profissionais").set({ nome }).where("id", "=", id).executeTakeFirst();
        if (r.numUpdatedRows !== 1n) return { ok: false, erro: "Profissional não encontrado." } as const;
        return { ok: true } as const;
      }
      const ativos = await trx.selectFrom("profissionais").select(sql<number>`count(*)::int`.as("n")).where("ativo", "=", true).executeTakeFirstOrThrow();
      if (ativos.n >= MAXIMO_PROFISSIONAIS) {
        return { ok: false, erro: `O plano básico inclui até ${MAXIMO_PROFISSIONAIS} profissionais ativos.` } as const;
      }
      const criado = await trx
        .insertInto("profissionais")
        .values({ tenant_id: acesso.loja.id, nome, ordem: ativos.n + 1 })
        .returning("id")
        .executeTakeFirstOrThrow();
      // Profissional novo faz todos os serviços até a dona ajustar.
      const servicos = await trx.selectFrom("servicos").select("id").execute();
      if (servicos.length) {
        await trx
          .insertInto("servicos_profissionais")
          .values(servicos.map((s) => ({ tenant_id: acesso.loja.id, servico_id: s.id, profissional_id: criado.id })))
          .execute();
      }
      await registrarAuditoria(trx, { acao: "profissional.criado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: criado.id });
      return { ok: true } as const;
    },
  );
}

export async function alternarProfissional(db: Kysely<BD>, acesso: Acesso, id: string): Promise<Resultado> {
  if (!podeGerir(acesso)) return SEM_PERMISSAO;
  if (!UUID.test(id)) return { ok: false, erro: "Profissional não encontrado." };
  return comLoja(db, acesso.loja.id, async (trx) => {
    const atual = await trx.selectFrom("profissionais").select("ativo").where("id", "=", id).executeTakeFirst();
    if (!atual) return { ok: false, erro: "Profissional não encontrado." } as const;
    if (!atual.ativo) {
      const ativos = await trx.selectFrom("profissionais").select(sql<number>`count(*)::int`.as("n")).where("ativo", "=", true).executeTakeFirstOrThrow();
      if (ativos.n >= MAXIMO_PROFISSIONAIS) return { ok: false, erro: `O plano básico inclui até ${MAXIMO_PROFISSIONAIS} profissionais ativos.` } as const;
    }
    await trx.updateTable("profissionais").set({ ativo: !atual.ativo }).where("id", "=", id).execute();
    return { ok: true } as const;
  });
}

/**
 * Substitui o expediente semanal de um profissional. O formulário manda, por
 * dia, até dois turnos "HH:MM" (ex.: manhã e tarde). Turnos sobrepostos são
 * recusados aqui e, de novo, pela restrição do banco.
 */
export async function salvarExpediente(db: Kysely<BD>, acesso: Acesso, form: FormData): Promise<Resultado> {
  if (!podeGerir(acesso)) return SEM_PERMISSAO;
  const profissionalId = String(form.get("profissional") ?? "");
  if (!UUID.test(profissionalId)) return { ok: false, erro: "Profissional não encontrado." };
  const turnos: { dia: number; inicio: number; fim: number }[] = [];
  for (let dia = 0; dia < 7; dia++) {
    if (form.get(`aberto-${dia}`) !== "on") continue;
    for (const t of [1, 2]) {
      const de = String(form.get(`de-${dia}-${t}`) ?? "");
      const ate = String(form.get(`ate-${dia}-${t}`) ?? "");
      if (!de && !ate) continue;
      const inicio = minutosDeHora(de);
      const fim = ate === "24:00" ? 1440 : minutosDeHora(ate);
      if (inicio === null || fim === null || inicio >= fim) return { ok: false, erro: "Confira os horários: o fim precisa ser depois do início." };
      turnos.push({ dia, inicio, fim });
    }
  }
  for (const a of turnos) {
    for (const b of turnos) {
      if (a !== b && a.dia === b.dia && a.inicio < b.fim && b.inicio < a.fim) return { ok: false, erro: "Dois turnos do mesmo dia se sobrepõem." };
    }
  }
  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      const existe = await trx.selectFrom("profissionais").select("id").where("id", "=", profissionalId).executeTakeFirst();
      if (!existe) return { ok: false, erro: "Profissional não encontrado." } as const;
      await trx.deleteFrom("expedientes").where("profissional_id", "=", profissionalId).execute();
      if (turnos.length) {
        await trx
          .insertInto("expedientes")
          .values(turnos.map((t) => ({ tenant_id: acesso.loja.id, profissional_id: profissionalId, dia_semana: t.dia, inicio_min: t.inicio, fim_min: t.fim })))
          .execute();
      }
      await registrarAuditoria(trx, { acao: "expediente.alterado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: profissionalId });
      return { ok: true } as const;
    },
  );
}

const MODELOS: ModeloSite[] = ["letreiro", "revista", "paleta"];

/** Conteúdo do site e regras da agenda. */
export async function salvarSite(db: Kysely<BD>, acesso: Acesso, form: FormData): Promise<Resultado> {
  if (!podeGerir(acesso)) return SEM_PERMISSAO;
  const modelo = String(form.get("modelo") ?? "") as ModeloSite;
  const cor = String(form.get("cor") ?? "").toLowerCase();
  const whatsappTexto = String(form.get("whatsapp") ?? "").trim();
  const whatsapp = whatsappTexto ? normalizarTelefoneBR(whatsappTexto) : null;
  const instagram = String(form.get("instagram") ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") || null;
  const numero = (nome: string) => Number(form.get(nome));
  const regras = {
    passo_min: numero("passo"),
    intervalo_min: numero("intervalo"),
    antecedencia_min: numero("antecedencia"),
    horizonte_dias: numero("horizonte"),
  };
  if (!MODELOS.includes(modelo)) return { ok: false, erro: "Escolha um modelo de site." };
  if (!corValida(cor)) return { ok: false, erro: "Cor inválida." };
  if (whatsappTexto && !whatsapp) return { ok: false, erro: "WhatsApp inválido. Use DDD + número, ex.: (20) 98765-4321." };
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { ok: false, erro: "Instagram inválido: informe só o @ da conta." };
  if (![10, 15, 20, 30, 60].includes(regras.passo_min)) return { ok: false, erro: "Intervalo da grade inválido." };
  if (!Number.isInteger(regras.intervalo_min) || regras.intervalo_min < 0 || regras.intervalo_min > 120) return { ok: false, erro: "Intervalo entre clientes de 0 a 120 minutos." };
  if (!Number.isInteger(regras.antecedencia_min) || regras.antecedencia_min < 0 || regras.antecedencia_min > 10080) return { ok: false, erro: "Antecedência inválida." };
  if (!Number.isInteger(regras.horizonte_dias) || regras.horizonte_dias < 1 || regras.horizonte_dias > 180) return { ok: false, erro: "Agenda aberta de 1 a 180 dias." };

  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      await trx
        .updateTable("config_loja")
        .set({
          modelo,
          cor,
          chamada: texto(form.get("chamada"), 120),
          sobre: String(form.get("sobre") ?? "").trim().slice(0, 1200) || null,
          endereco: texto(form.get("endereco"), 200),
          whatsapp,
          instagram,
          ...regras,
          atualizado_em: sql`now()`,
        })
        .execute();
      await registrarAuditoria(trx, { acao: "site.alterado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id });
      return { ok: true } as const;
    },
  );
}
