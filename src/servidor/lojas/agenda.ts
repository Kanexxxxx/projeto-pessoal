import { sql, type Kysely } from "kysely";
import { normalizarTelefoneBR } from "../../dominio/contato";
import { dataCanonica, hojeNoFuso, instanteNoFuso, minutosDeHora, partesNoFuso, rotuloDeMinutos, somarDias } from "../../dominio/datas";
import {
  gradeCombinada,
  gradeDoDia,
  seSobrepoem,
  turnosDoDia,
  ultimoDiaAceito,
  type Expediente,
  type Intervalo,
  type RegrasAgenda,
  type Vaga,
} from "../../dominio/horarios";
import { registrarAuditoria } from "../auditoria";
import type { BD, SituacaoAgendamento } from "../bd/tipos";
import { lerConfig, lerExpedientes, type Config, type Profissional } from "./catalogo";
import { comLoja, travarAgenda, UUID, type Trx } from "./escopo";
import type { Acesso, Loja } from "./lojas";

/**
 * Agenda da loja. Quem decide se um horário está livre é o servidor, dentro
 * da trava da agenda (escopo.ts), com a mesma conta que o banco usa na
 * restrição `agendamentos_sem_choque` — que continua lá como última defesa.
 */
export function regrasDa(loja: Loja, config: Config): RegrasAgenda {
  return {
    fuso: loja.fuso,
    passoMin: config.passo_min,
    intervaloMin: config.intervalo_min,
    antecedenciaMin: config.antecedencia_min,
    horizonteDias: config.horizonte_dias,
  };
}

/** O site aceita reservas na loja em implantação (testes) e ativa. */
export function lojaAceitaReservas(loja: Loja): boolean {
  return loja.situacao === "implantacao" || loja.situacao === "ativa";
}

type Ocupacao = { profissionalId: string; inicio: Date; fim: Date };
type Bloqueio = { profissionalId: string | null; inicio: Date; fim: Date };

async function ocupacoes(trx: Trx, desde: Date, ate: Date, ignorar?: string): Promise<{ reservas: Ocupacao[]; bloqueios: Bloqueio[] }> {
  let q = trx
    .selectFrom("agendamentos")
    .select(["profissional_id", "inicio", "ocupado_ate"])
    .where("situacao", "<>", "cancelado")
    .where("inicio", "<", ate)
    .where("ocupado_ate", ">", desde);
  if (ignorar) q = q.where("id", "<>", ignorar);
  const reservas = await q.execute();
  const bloqueios = await trx
    .selectFrom("bloqueios")
    .select(["profissional_id", "inicio", "fim"])
    .where("inicio", "<", ate)
    .where("fim", ">", desde)
    .execute();
  return {
    reservas: reservas.map((r) => ({ profissionalId: r.profissional_id, inicio: r.inicio, fim: r.ocupado_ate })),
    bloqueios: bloqueios.map((b) => ({ profissionalId: b.profissional_id, inicio: b.inicio, fim: b.fim })),
  };
}

function gradeDoProfissional(p: {
  profissionalId: string;
  data: string;
  regras: RegrasAgenda;
  expedientes: Expediente[];
  duracaoMin: number;
  ocupacao: { reservas: Ocupacao[]; bloqueios: Bloqueio[] };
  agora: Date;
}): Vaga[] {
  return gradeDoDia({
    data: p.data,
    regras: p.regras,
    turnos: turnosDoDia(p.expedientes, p.profissionalId, p.data),
    duracaoMin: p.duracaoMin,
    reservas: p.ocupacao.reservas.filter((r) => r.profissionalId === p.profissionalId),
    bloqueios: p.ocupacao.bloqueios.filter((b) => b.profissionalId === null || b.profissionalId === p.profissionalId),
    agora: p.agora,
  });
}

type ServicoDaReserva = { id: string; nome: string; duracao_min: number; preco_centavos: number | null };

async function servicoEProfissionais(
  trx: Trx,
  servicoId: string,
  profissionalId: string | null,
): Promise<{ servico: ServicoDaReserva; profissionais: Profissional[] } | null> {
  if (!UUID.test(servicoId) || (profissionalId !== null && !UUID.test(profissionalId))) return null;
  const servico = await trx
    .selectFrom("servicos")
    .select(["id", "nome", "duracao_min", "preco_centavos"])
    .where("id", "=", servicoId)
    .where("ativo", "=", true)
    .executeTakeFirst();
  if (!servico) return null;
  let q = trx
    .selectFrom("profissionais")
    .innerJoin("servicos_profissionais", (j) =>
      j.onRef("servicos_profissionais.profissional_id", "=", "profissionais.id").onRef("servicos_profissionais.tenant_id", "=", "profissionais.tenant_id"),
    )
    .select(["profissionais.id", "profissionais.nome", "profissionais.ativo"])
    .where("servicos_profissionais.servico_id", "=", servicoId)
    .where("profissionais.ativo", "=", true)
    .orderBy("profissionais.ordem")
    .orderBy("profissionais.nome");
  if (profissionalId) q = q.where("profissionais.id", "=", profissionalId);
  const profissionais = await q.execute();
  return profissionais.length ? { servico, profissionais } : null;
}

export type Disponibilidade = {
  dias: { data: string; temVaga: boolean }[];
  /** A data pedida, se estiver na agenda aberta; senão, o primeiro dia com vaga. */
  data: string | null;
  vagas: (Vaga & { profissionais: string[] })[];
};

/** Dias da agenda aberta e, para a data escolhida, os horários (livres e ocupados). */
export async function disponibilidade(
  db: Kysely<BD>,
  loja: Loja,
  p: { servicoId: string; profissionalId: string | null; data: string | null; agora?: Date },
): Promise<Disponibilidade | null> {
  const agora = p.agora ?? new Date();
  return comLoja(db, loja.id, async (trx) => {
    const alvo = await servicoEProfissionais(trx, p.servicoId, p.profissionalId);
    if (!alvo) return null;
    const regras = regrasDa(loja, await lerConfig(trx));
    const expedientes = await lerExpedientes(trx);
    const hoje = hojeNoFuso(agora, regras.fuso);
    const ultimo = ultimoDiaAceito(agora, regras);
    const ocupacao = await ocupacoes(trx, agora, instanteNoFuso(somarDias(ultimo, 1), 0, regras.fuso) ?? agora);

    const gradeDe = (data: string) =>
      gradeCombinada(
        alvo.profissionais.map((prof) => ({
          profissionalId: prof.id,
          vagas: gradeDoProfissional({ profissionalId: prof.id, data, regras, expedientes, duracaoMin: alvo.servico.duracao_min, ocupacao, agora }),
        })),
      );
    const dias: Disponibilidade["dias"] = [];
    for (let data = hoje; data <= ultimo; data = somarDias(data, 1)) {
      dias.push({ data, temVaga: gradeDe(data).some((v) => v.livre) });
    }
    const pedida = p.data && dataCanonica(p.data);
    const data = pedida && dias.some((d) => d.data === pedida) ? pedida : (dias.find((d) => d.temVaga)?.data ?? null);
    return { dias, data, vagas: data ? gradeDe(data) : [] };
  });
}

export type Reserva = {
  id: string;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  duracaoMin: number;
  precoCentavos: number | null;
};

export type ResultadoReserva = { ok: true; reserva: Reserva } | { ok: false; motivo: "indisponivel" | "dados"; erro: string };

const INDISPONIVEL = { ok: false, motivo: "indisponivel", erro: "Esse horário acabou de ser ocupado. Escolha outro." } as const;

/**
 * Reserva um horário. Pelo site, o horário precisa estar na grade da loja
 * (expediente, antecedência, agenda aberta). Pelo painel, a equipe pode
 * encaixar fora da grade, mas nunca por cima de outra reserva ou de bloqueio.
 * Sem profissional escolhido, fica com o primeiro livre na ordem da loja.
 */
export async function reservar(
  db: Kysely<BD>,
  p: {
    loja: Loja;
    servicoId: string;
    profissionalId: string | null;
    data: string;
    hora: string;
    nome: string;
    telefone: string;
    observacao?: string;
    origem: "site" | "painel";
    criadoPor?: string | null;
    agora?: Date;
  },
): Promise<ResultadoReserva> {
  const nome = p.nome.trim().replace(/\s+/g, " ");
  const telefone = normalizarTelefoneBR(p.telefone);
  const data = dataCanonica(p.data);
  const minutos = minutosDeHora(p.hora);
  if (nome.length < 2 || nome.length > 80) return { ok: false, motivo: "dados", erro: "Informe o nome (2 a 80 caracteres)." };
  if (!telefone) return { ok: false, motivo: "dados", erro: "Informe um WhatsApp com DDD, ex.: (20) 98765-4321." };
  if (!data || minutos === null) return { ok: false, motivo: "dados", erro: "Data ou horário inválido." };
  if (p.origem === "site" && !lojaAceitaReservas(p.loja)) return { ok: false, motivo: "indisponivel", erro: "Esta loja não está recebendo reservas pelo site." };
  const agora = p.agora ?? new Date();
  const observacao = p.observacao?.trim().slice(0, 300) || null;

  try {
    return await comLoja(
      db,
      p.loja.id,
      async (trx) => {
        await travarAgenda(trx, p.loja.id);
        const alvo = await servicoEProfissionais(trx, p.servicoId, p.profissionalId);
        if (!alvo) return { ok: false, motivo: "dados", erro: "Serviço ou profissional indisponível." } as const;
        const regras = regrasDa(p.loja, await lerConfig(trx));
        const inicio = instanteNoFuso(data, minutos, regras.fuso);
        if (!inicio) return INDISPONIVEL;
        const fim = new Date(inicio.getTime() + alvo.servico.duracao_min * 60_000);
        const ocupadoAte = new Date(fim.getTime() + regras.intervaloMin * 60_000);
        const ocupacao = await ocupacoes(trx, new Date(inicio.getTime() - 24 * 3_600_000), new Date(ocupadoAte.getTime() + 24 * 3_600_000));
        const expedientes = p.origem === "site" ? await lerExpedientes(trx) : [];

        const livre = (profissionalId: string) => {
          if (p.origem === "site") {
            const grade = gradeDoProfissional({ profissionalId, data, regras, expedientes, duracaoMin: alvo.servico.duracao_min, ocupacao, agora });
            return grade.some((v) => v.livre && v.inicio.getTime() === inicio.getTime());
          }
          const ocupa: Intervalo = { inicio, fim: ocupadoAte };
          return (
            !ocupacao.reservas.some((r) => r.profissionalId === profissionalId && seSobrepoem(ocupa, r)) &&
            !ocupacao.bloqueios.some((b) => (b.profissionalId === null || b.profissionalId === profissionalId) && seSobrepoem({ inicio, fim }, b))
          );
        };
        const profissional = alvo.profissionais.find((prof) => livre(prof.id));
        if (!profissional) return INDISPONIVEL;

        const cliente = await trx
          .insertInto("clientes")
          .values({ tenant_id: p.loja.id, nome, telefone })
          .onConflict((oc) =>
            // Pelo site, o nome já cadastrado não é trocado por quem digitou o telefone; pelo painel, a equipe corrige.
            oc.columns(["tenant_id", "telefone"]).doUpdateSet(p.origem === "painel" ? { nome } : { telefone }),
          )
          .returning("id")
          .executeTakeFirstOrThrow();
        const criado = await trx
          .insertInto("agendamentos")
          .values({
            tenant_id: p.loja.id,
            servico_id: alvo.servico.id,
            profissional_id: profissional.id,
            cliente_id: cliente.id,
            inicio,
            fim,
            ocupado_ate: ocupadoAte,
            origem: p.origem,
            preco_centavos: alvo.servico.preco_centavos,
            observacao,
            criado_por: p.criadoPor ?? null,
          })
          .returning("id")
          .executeTakeFirstOrThrow();
        await registrarAuditoria(trx, {
          acao: "agendamento.criado",
          atorUsuarioId: p.criadoPor ?? null,
          tenantId: p.loja.id,
          alvo: criado.id,
          detalhes: { origem: p.origem },
        });
        return {
          ok: true,
          reserva: {
            id: criado.id,
            servico: alvo.servico.nome,
            profissional: profissional.nome,
            data,
            hora: rotuloDeMinutos(minutos),
            duracaoMin: alvo.servico.duracao_min,
            precoCentavos: alvo.servico.preco_centavos,
          },
        } as const;
      },
    );
  } catch (e) {
    // A restrição do banco segurou um choque que a conta acima não viu.
    if ((e as { code?: string }).code === "23P01") return INDISPONIVEL;
    throw e;
  }
}

export type ItemDaAgenda = {
  id: string;
  inicio: Date;
  fim: Date;
  hora: string;
  situacao: SituacaoAgendamento;
  origem: "site" | "painel";
  servico: string;
  profissionalId: string;
  profissional: string;
  cliente: string;
  telefone: string;
  precoCentavos: number | null;
  observacao: string | null;
};

export type BloqueioDoDia = { id: string; profissionalId: string | null; inicio: Date; fim: Date; motivo: string | null; de: string; ate: string };

/** Reservas e bloqueios de um dia, no fuso da loja. */
export async function agendaDoDia(db: Kysely<BD>, loja: Loja, data: string): Promise<{ itens: ItemDaAgenda[]; bloqueios: BloqueioDoDia[] }> {
  const desde = instanteNoFuso(data, 0, loja.fuso)!;
  const ate = instanteNoFuso(somarDias(data, 1), 0, loja.fuso)!;
  return comLoja(db, loja.id, async (trx) => {
    const linhas = await trx
      .selectFrom("agendamentos as a")
      .innerJoin("servicos as s", (j) => j.onRef("s.id", "=", "a.servico_id").onRef("s.tenant_id", "=", "a.tenant_id"))
      .innerJoin("profissionais as p", (j) => j.onRef("p.id", "=", "a.profissional_id").onRef("p.tenant_id", "=", "a.tenant_id"))
      .innerJoin("clientes as c", (j) => j.onRef("c.id", "=", "a.cliente_id").onRef("c.tenant_id", "=", "a.tenant_id"))
      .select([
        "a.id",
        "a.inicio",
        "a.fim",
        "a.situacao",
        "a.origem",
        "a.preco_centavos",
        "a.observacao",
        "s.nome as servico",
        "p.id as profissionalId",
        "p.nome as profissional",
        "c.nome as cliente",
        "c.telefone",
      ])
      .where("a.inicio", ">=", desde)
      .where("a.inicio", "<", ate)
      .orderBy("a.inicio")
      .execute();
    const bloqueios = await trx
      .selectFrom("bloqueios")
      .select(["id", "profissional_id", "inicio", "fim", "motivo"])
      .where("inicio", "<", ate)
      .where("fim", ">", desde)
      .orderBy("inicio")
      .execute();
    const hora = (d: Date) => {
      const partes = partesNoFuso(d, loja.fuso);
      return partes.data === data ? rotuloDeMinutos(partes.minutos) : partes.data < data ? "00:00" : "24:00";
    };
    return {
      itens: linhas.map((l) => ({
        id: l.id,
        inicio: l.inicio,
        fim: l.fim,
        hora: hora(l.inicio),
        situacao: l.situacao,
        origem: l.origem,
        servico: l.servico,
        profissionalId: l.profissionalId,
        profissional: l.profissional,
        cliente: l.cliente,
        telefone: l.telefone,
        precoCentavos: l.preco_centavos,
        observacao: l.observacao,
      })),
      bloqueios: bloqueios.map((b) => ({
        id: b.id,
        profissionalId: b.profissional_id,
        inicio: b.inicio,
        fim: b.fim,
        motivo: b.motivo,
        de: hora(b.inicio),
        ate: hora(b.fim),
      })),
    };
  });
}

export type Resultado = { ok: true } | { ok: false; erro: string };

export async function cancelarAgendamento(db: Kysely<BD>, acesso: Acesso, id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, erro: "Agendamento não encontrado." };
  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      const r = await trx
        .updateTable("agendamentos")
        .set({ situacao: "cancelado", cancelado_em: sql`now()`, cancelado_por: acesso.usuarioId })
        .where("id", "=", id)
        .where("situacao", "=", "confirmado")
        .executeTakeFirst();
      if (r.numUpdatedRows !== 1n) return { ok: false, erro: "Agendamento não encontrado ou já cancelado." } as const;
      await registrarAuditoria(trx, { acao: "agendamento.cancelado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: id });
      return { ok: true } as const;
    },
  );
}

/** Marca como atendido ou falta. Só reservas confirmadas que já começaram. */
export async function marcarAgendamento(db: Kysely<BD>, acesso: Acesso, id: string, situacao: "concluido" | "faltou"): Promise<Resultado> {
  if (!UUID.test(id) || !["concluido", "faltou"].includes(situacao)) return { ok: false, erro: "Agendamento não encontrado." };
  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      const r = await trx
        .updateTable("agendamentos")
        .set({ situacao })
        .where("id", "=", id)
        .where("situacao", "=", "confirmado")
        .where("inicio", "<=", sql<Date>`now()`)
        .executeTakeFirst();
      if (r.numUpdatedRows !== 1n) return { ok: false, erro: "Só dá para marcar depois do horário de início." } as const;
      await registrarAuditoria(trx, { acao: `agendamento.${situacao}`, atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: id });
      return { ok: true } as const;
    },
  );
}

/** Muda data, hora e (opcionalmente) profissional, dentro da trava e sem passar por cima de ninguém. */
export async function remarcarAgendamento(
  db: Kysely<BD>,
  acesso: Acesso,
  p: { id: string; data: string; hora: string; profissionalId?: string | null },
): Promise<Resultado> {
  const data = dataCanonica(p.data);
  const minutos = minutosDeHora(p.hora);
  if (!UUID.test(p.id) || (p.profissionalId && !UUID.test(p.profissionalId))) return { ok: false, erro: "Agendamento não encontrado." };
  if (!data || minutos === null) return { ok: false, erro: "Data ou horário inválido." };
  try {
    return await comLoja(
      db,
      acesso.loja.id,
      async (trx) => {
        await travarAgenda(trx, acesso.loja.id);
        const atual = await trx
          .selectFrom("agendamentos")
          .select(["id", "servico_id", "profissional_id", "inicio", "fim", "ocupado_ate"])
          .where("id", "=", p.id)
          .where("situacao", "=", "confirmado")
          .forUpdate()
          .executeTakeFirst();
        if (!atual) return { ok: false, erro: "Agendamento não encontrado ou já encerrado." } as const;
        const profissionalId = p.profissionalId || atual.profissional_id;
        const faz = await trx
          .selectFrom("servicos_profissionais")
          .innerJoin("profissionais", (j) =>
            j.onRef("profissionais.id", "=", "servicos_profissionais.profissional_id").onRef("profissionais.tenant_id", "=", "servicos_profissionais.tenant_id"),
          )
          .select("profissionais.id")
          .where("servicos_profissionais.servico_id", "=", atual.servico_id)
          .where("profissionais.id", "=", profissionalId)
          .where("profissionais.ativo", "=", true)
          .executeTakeFirst();
        if (!faz) return { ok: false, erro: "Esse profissional não faz este serviço." } as const;

        const inicio = instanteNoFuso(data, minutos, acesso.loja.fuso);
        if (!inicio) return { ok: false, erro: "Horário inexistente nesse dia." } as const;
        const fim = new Date(inicio.getTime() + (atual.fim.getTime() - atual.inicio.getTime()));
        const ocupadoAte = new Date(fim.getTime() + (atual.ocupado_ate.getTime() - atual.fim.getTime()));
        const ocupacao = await ocupacoes(trx, inicio, ocupadoAte, atual.id);
        const choca =
          ocupacao.reservas.some((r) => r.profissionalId === profissionalId && seSobrepoem({ inicio, fim: ocupadoAte }, r)) ||
          ocupacao.bloqueios.some((b) => (b.profissionalId === null || b.profissionalId === profissionalId) && seSobrepoem({ inicio, fim }, b));
        if (choca) return { ok: false, erro: "Esse horário já está ocupado ou bloqueado." } as const;

        await trx
          .updateTable("agendamentos")
          .set({ inicio, fim, ocupado_ate: ocupadoAte, profissional_id: profissionalId })
          .where("id", "=", atual.id)
          .execute();
        await registrarAuditoria(trx, { acao: "agendamento.remarcado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: atual.id });
        return { ok: true } as const;
      },
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23P01") return { ok: false, erro: "Esse horário já está ocupado." };
    throw e;
  }
}

/**
 * Bloqueia um período (dia inteiro ou de/até) para um profissional ou a loja
 * toda. Dentro da trava: se houver reserva no período, recusa e diz quantas —
 * a equipe remarca ou cancela antes, e ninguém fica com horário fantasma.
 */
export async function criarBloqueio(
  db: Kysely<BD>,
  acesso: Acesso,
  p: { profissionalId: string | null; data: string; ateData?: string; de?: string; ate?: string; motivo?: string },
): Promise<Resultado> {
  const data = dataCanonica(p.data);
  const ateData = p.ateData ? dataCanonica(p.ateData) : data;
  if (!data || !ateData || ateData < data) return { ok: false, erro: "Datas inválidas." };
  if (p.profissionalId && !UUID.test(p.profissionalId)) return { ok: false, erro: "Profissional não encontrado." };
  const deMin = p.de ? minutosDeHora(p.de) : 0;
  const ateMin = p.ate ? minutosDeHora(p.ate) : null;
  if (deMin === null || (p.ate && ateMin === null)) return { ok: false, erro: "Horário inválido." };
  const inicio = instanteNoFuso(data, deMin, acesso.loja.fuso);
  const fim = ateMin === null ? instanteNoFuso(somarDias(ateData, 1), 0, acesso.loja.fuso) : instanteNoFuso(ateData, ateMin, acesso.loja.fuso);
  if (!inicio || !fim || fim <= inicio) return { ok: false, erro: "O fim precisa ser depois do início." };
  if (fim.getTime() - inicio.getTime() > 92 * 24 * 3_600_000) return { ok: false, erro: "Bloqueie no máximo 3 meses de uma vez." };

  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      await travarAgenda(trx, acesso.loja.id);
      if (p.profissionalId) {
        const existe = await trx.selectFrom("profissionais").select("id").where("id", "=", p.profissionalId).executeTakeFirst();
        if (!existe) return { ok: false, erro: "Profissional não encontrado." } as const;
      }
      let conflitos = trx
        .selectFrom("agendamentos")
        .select(sql<number>`count(*)::int`.as("n"))
        .where("situacao", "=", "confirmado")
        .where("inicio", "<", fim)
        .where("fim", ">", inicio);
      if (p.profissionalId) conflitos = conflitos.where("profissional_id", "=", p.profissionalId);
      const { n } = await conflitos.executeTakeFirstOrThrow();
      if (n > 0) {
        return { ok: false, erro: `Há ${n} agendamento${n > 1 ? "s" : ""} nesse período. Remarque ou cancele antes de bloquear.` } as const;
      }
      const criado = await trx
        .insertInto("bloqueios")
        .values({
          tenant_id: acesso.loja.id,
          profissional_id: p.profissionalId,
          inicio,
          fim,
          motivo: p.motivo?.trim().slice(0, 120) || null,
          criado_por: acesso.usuarioId,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      await registrarAuditoria(trx, { acao: "bloqueio.criado", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: criado.id });
      return { ok: true } as const;
    },
  );
}

export async function removerBloqueio(db: Kysely<BD>, acesso: Acesso, id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { ok: false, erro: "Bloqueio não encontrado." };
  return comLoja(db, acesso.loja.id, async (trx) => {
    const r = await trx.deleteFrom("bloqueios").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows !== 1n) return { ok: false, erro: "Bloqueio não encontrado." } as const;
    await registrarAuditoria(trx, { acao: "bloqueio.removido", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id, alvo: id });
    return { ok: true } as const;
  });
}

export type BloqueioFuturo = { id: string; profissional: string | null; inicio: Date; fim: Date; motivo: string | null };

export async function proximosBloqueios(db: Kysely<BD>, loja: Loja): Promise<BloqueioFuturo[]> {
  return comLoja(db, loja.id, (trx) =>
    trx
      .selectFrom("bloqueios as b")
      .leftJoin("profissionais as p", (j) => j.onRef("p.id", "=", "b.profissional_id").onRef("p.tenant_id", "=", "b.tenant_id"))
      .select(["b.id", "p.nome as profissional", "b.inicio", "b.fim", "b.motivo"])
      .where("b.fim", ">", sql<Date>`now()`)
      .orderBy("b.inicio")
      .limit(50)
      .execute(),
  );
}

/** Próximos dias com movimento, para o resumo do painel. */
export async function resumoDaSemana(db: Kysely<BD>, loja: Loja, agora = new Date()): Promise<{ hoje: number; semana: number }> {
  const hoje = hojeNoFuso(agora, loja.fuso);
  const inicioHoje = instanteNoFuso(hoje, 0, loja.fuso)!;
  const amanha = instanteNoFuso(somarDias(hoje, 1), 0, loja.fuso)!;
  const fimSemana = instanteNoFuso(somarDias(hoje, 7), 0, loja.fuso)!;
  return comLoja(db, loja.id, async (trx) => {
    const r = await trx
      .selectFrom("agendamentos")
      .select([
        sql<number>`count(*) filter (where inicio < ${amanha})::int`.as("hoje"),
        sql<number>`count(*)::int`.as("semana"),
      ])
      .where("situacao", "<>", "cancelado")
      .where("inicio", ">=", inicioHoje)
      .where("inicio", "<", fimSemana)
      .executeTakeFirstOrThrow();
    return r;
  });
}
