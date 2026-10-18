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

export type Segmento = "barbearia" | "salao" | "estudio" | "outro";
export type SituacaoLoja = "implantacao" | "ativa" | "suspensa" | "encerrada";
export type PapelNaLoja = "dona" | "funcionario";
export type SituacaoAgendamento = "confirmado" | "cancelado" | "concluido" | "faltou";
export type ModeloSite = "letreiro" | "revista" | "paleta";

export interface TabelaLojas {
  id: Generated<string>;
  slug: string;
  nome: string;
  segmento: Segmento;
  situacao: ColumnType<SituacaoLoja, SituacaoLoja | undefined, SituacaoLoja>;
  fuso: ColumnType<string, string | undefined, string>;
  criada_em: Generated<Date>;
  criada_por: string | null;
}

export interface TabelaConfigLoja {
  tenant_id: string;
  modelo: ColumnType<ModeloSite, ModeloSite | undefined, ModeloSite>;
  cor: ColumnType<string, string | undefined, string>;
  chamada: string | null;
  sobre: string | null;
  endereco: string | null;
  whatsapp: string | null;
  instagram: string | null;
  passo_min: ColumnType<number, number | undefined, number>;
  intervalo_min: ColumnType<number, number | undefined, number>;
  antecedencia_min: ColumnType<number, number | undefined, number>;
  horizonte_dias: ColumnType<number, number | undefined, number>;
  atualizado_em: Generated<Date>;
}

export interface TabelaMembrosLoja {
  tenant_id: string;
  usuario_id: string;
  papel: PapelNaLoja;
  criado_em: Generated<Date>;
  revogado_em: MomentoOpcional;
}

export interface TabelaProfissionais {
  tenant_id: string;
  id: Generated<string>;
  nome: string;
  ativo: ColumnType<boolean, boolean | undefined, boolean>;
  ordem: ColumnType<number, number | undefined, number>;
  criado_em: Generated<Date>;
}

export interface TabelaServicos {
  tenant_id: string;
  id: Generated<string>;
  nome: string;
  descricao: string | null;
  duracao_min: number;
  preco_centavos: number | null;
  ativo: ColumnType<boolean, boolean | undefined, boolean>;
  ordem: ColumnType<number, number | undefined, number>;
  criado_em: Generated<Date>;
}

export interface TabelaServicosProfissionais {
  tenant_id: string;
  servico_id: string;
  profissional_id: string;
}

export interface TabelaExpedientes {
  tenant_id: string;
  id: Generated<string>;
  profissional_id: string;
  dia_semana: number;
  inicio_min: number;
  fim_min: number;
}

export interface TabelaBloqueios {
  tenant_id: string;
  id: Generated<string>;
  profissional_id: string | null;
  inicio: Momento;
  fim: Momento;
  motivo: string | null;
  criado_em: Generated<Date>;
  criado_por: string | null;
}

export interface TabelaClientes {
  tenant_id: string;
  id: Generated<string>;
  nome: string;
  telefone: string;
  criado_em: Generated<Date>;
}

export interface TabelaAgendamentos {
  tenant_id: string;
  id: Generated<string>;
  servico_id: string;
  profissional_id: string;
  cliente_id: string;
  inicio: Momento;
  fim: Momento;
  ocupado_ate: Momento;
  situacao: ColumnType<SituacaoAgendamento, SituacaoAgendamento | undefined, SituacaoAgendamento>;
  origem: "site" | "painel";
  preco_centavos: number | null;
  observacao: string | null;
  criado_em: Generated<Date>;
  criado_por: string | null;
  cancelado_em: MomentoOpcional;
  cancelado_por: string | null;
}

export interface BD {
  lojas: TabelaLojas;
  config_loja: TabelaConfigLoja;
  membros_loja: TabelaMembrosLoja;
  profissionais: TabelaProfissionais;
  servicos: TabelaServicos;
  servicos_profissionais: TabelaServicosProfissionais;
  expedientes: TabelaExpedientes;
  bloqueios: TabelaBloqueios;
  clientes: TabelaClientes;
  agendamentos: TabelaAgendamentos;
  auditoria: TabelaAuditoria;
  user: TabelaUsuario;
  session: TabelaSessao;
  operadores: TabelaOperadores;
  convites: TabelaConvites;
  limites_taxa: TabelaLimitesTaxa;
  twoFactor: TabelaSegundoFator;
  mfa_passos_consumidos: { usuario_id: string; fator_id: string; passo: number };
}
