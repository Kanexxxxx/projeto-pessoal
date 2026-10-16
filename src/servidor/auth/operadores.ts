import type { Kysely } from "kysely";
import type { BD } from "../bd/tipos";

/** Operador da plataforma é um vínculo explícito e revogável, conferido a cada uso. */
export async function ehOperadorAtivo(db: Kysely<BD>, usuarioId: string): Promise<boolean> {
  const linha = await db
    .selectFrom("operadores")
    .select("usuario_id")
    .where("usuario_id", "=", usuarioId)
    .where("revogado_em", "is", null)
    .executeTakeFirst();
  return Boolean(linha);
}
