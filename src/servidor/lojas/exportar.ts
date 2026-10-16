import type { Kysely } from "kysely";
import { registrarAuditoria } from "../auditoria";
import type { BD } from "../bd/tipos";
import { comLoja } from "./escopo";
import type { Acesso } from "./lojas";

/**
 * Exportação completa da loja (portabilidade e encerramento, PLANO.md §11).
 * Lê tudo dentro do escopo da loja: mesmo uma consulta sem filtro só devolve
 * linhas dela, porque quem filtra é a política de RLS do banco.
 */
export async function exportarLoja(db: Kysely<BD>, acesso: Acesso) {
  if (acesso.papel === "funcionario") return null;
  return comLoja(
    db,
    acesso.loja.id,
    async (trx) => {
      const [config, profissionais, servicos, servicosProfissionais, expedientes, bloqueios, clientes, agendamentos] = await Promise.all([
        trx.selectFrom("config_loja").selectAll().execute(),
        trx.selectFrom("profissionais").selectAll().execute(),
        trx.selectFrom("servicos").selectAll().execute(),
        trx.selectFrom("servicos_profissionais").selectAll().execute(),
        trx.selectFrom("expedientes").selectAll().execute(),
        trx.selectFrom("bloqueios").selectAll().execute(),
        trx.selectFrom("clientes").selectAll().execute(),
        trx.selectFrom("agendamentos").selectAll().execute(),
      ]);
      await registrarAuditoria(trx, { acao: "loja.exportada", atorUsuarioId: acesso.usuarioId, tenantId: acesso.loja.id });
      const { loja } = acesso;
      return {
        geradoEm: new Date().toISOString(),
        loja: { id: loja.id, slug: loja.slug, nome: loja.nome, segmento: loja.segmento, situacao: loja.situacao, fuso: loja.fuso, criadaEm: loja.criada_em },
        config,
        profissionais,
        servicos,
        servicosProfissionais,
        expedientes,
        bloqueios,
        clientes,
        agendamentos,
      };
    },
  );
}
