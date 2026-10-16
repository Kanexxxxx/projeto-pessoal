import type { Kysely } from "kysely";
import type { BD } from "./bd/tipos";

export type EventoAuditoria = {
  acao: string;
  atorUsuarioId?: string | null;
  tenantId?: string | null;
  alvo?: string | null;
  detalhes?: Record<string, string | number | boolean | null>;
  ip?: string | null;
  agente?: string | null;
};

const IP_VALIDO = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Registra um evento de acesso ou ação administrativa. Os detalhes são
 * pequenos e nunca levam segredo, token, corpo de mensagem ou dado de
 * contato completo — quem chama já passa a versão mascarada.
 */
export async function registrarAuditoria(db: Kysely<BD>, e: EventoAuditoria): Promise<void> {
  await db
    .insertInto("auditoria")
    .values({
      acao: e.acao,
      ator_usuario_id: e.atorUsuarioId ?? null,
      tenant_id: e.tenantId ?? null,
      alvo: e.alvo?.slice(0, 200) ?? null,
      detalhes: JSON.stringify(e.detalhes ?? {}),
      ip: e.ip && IP_VALIDO.test(e.ip) ? e.ip : null,
      agente: e.agente?.slice(0, 300) ?? null,
    })
    .execute();
}
