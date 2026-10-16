import type { ColumnType, Generated } from "kysely";

/**
 * Tipos das tabelas para o Kysely. Mantidos à mão, junto com as migrações em
 * db/migracoes: cada coluna nova entra nos dois lugares no mesmo commit.
 */
type Momento = ColumnType<Date, Date | string | undefined, Date | string>;
type MomentoOpcional = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
type Json = ColumnType<unknown, string, string>;

export interface TabelaAuditoria {
  id: Generated<string>;
  ocorrido_em: Generated<Date>;
  ator_usuario_id: string | null;
  tenant_id: string | null;
  acao: string;
  alvo: string | null;
  detalhes: Json;
  ip: string | null;
  agente: string | null;
}

/** Tabela da biblioteca de autenticação: só os campos que a aplicação lê. */
export interface TabelaUsuario {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean | null;
  createdAt: Momento;
  updatedAt: Momento;
}

export interface TabelaSessao {
  id: string;
  token: string;
  userId: string;
  expiresAt: Momento;
  createdAt: Momento;
  updatedAt: Momento;
  ipAddress: string | null;
  userAgent: string | null;
  mfaVerificado: Generated<boolean>;
}

export interface TabelaSegundoFator {
  id: string;
  userId: string;
  secret: string;
  backupCodes: string;
  verified: boolean | null;
}

export interface TabelaOperadores {
  usuario_id: string;
  criado_em: Generated<Date>;
  revogado_em: MomentoOpcional;
}

export type Papel = "operador" | "dona" | "funcionario";

export interface TabelaConvites {
  id: Generated<string>;
  email: string;
  papel: Papel;
  tenant_id: string | null;
  token_hash: Buffer;
  criado_por: string | null;
  criado_em: Generated<Date>;
  expira_em: Momento;
  usado_em: MomentoOpcional;
  usado_por: string | null;
  revogado_em: MomentoOpcional;
}

export interface TabelaLimitesTaxa {
  chave: string;
  contagem: number;
  janela_inicio: Momento;
}

export interface BD {
  auditoria: TabelaAuditoria;
  user: TabelaUsuario;
  session: TabelaSessao;
  operadores: TabelaOperadores;
  convites: TabelaConvites;
  limites_taxa: TabelaLimitesTaxa;
  twoFactor: TabelaSegundoFator;
  mfa_passos_consumidos: { usuario_id: string; fator_id: string; passo: number };
}
