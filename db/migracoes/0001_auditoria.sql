-- Registro de auditoria (ARQUITETURA.md §5): acessos e ações administrativas.
-- Guarda o mínimo para responder "quem fez o quê e quando". Nunca recebe senha,
-- token, corpo de mensagem, conteúdo de conversa ou telefone completo.
create table auditoria (
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),
  ator_usuario_id text,
  tenant_id uuid,
  acao text not null check (acao ~ '^[a-z][a-z0-9_.]{2,63}$'),
  alvo text check (length(alvo) <= 200),
  detalhes jsonb not null default '{}'::jsonb check (pg_column_size(detalhes) <= 4096),
  ip inet,
  agente text check (length(agente) <= 300)
);

create index auditoria_por_data on auditoria (ocorrido_em desc);
create index auditoria_por_loja on auditoria (tenant_id, ocorrido_em desc) where tenant_id is not null;
create index auditoria_por_ator on auditoria (ator_usuario_id, ocorrido_em desc) where ator_usuario_id is not null;

-- A aplicação registra e consulta, mas não reescreve nem apaga o histórico.
revoke update, delete, truncate on auditoria from nexakeep_app;
