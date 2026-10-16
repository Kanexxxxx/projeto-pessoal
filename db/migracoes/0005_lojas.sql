-- Lojas, equipe e agenda (T06/T08).
--
-- ARQUITETURA.md §4: todo registro de loja tem tenant_id, as relações incluem
-- essa chave (uma reserva da loja A não referencia profissional da B) e o
-- PostgreSQL recusa por RLS ler ou gravar fora da loja definida na transação.
-- A aplicação define o escopo com set_config('app.tenant_id', ..., true), que
-- vale só até o fim da transação: nada vaza entre usos da mesma conexão.

create function app_tenant() returns uuid
  language sql stable
  as $$ select nullif(current_setting('app.tenant_id', true), '')::uuid $$;

create function app_usuario() returns text
  language sql stable
  as $$ select nullif(current_setting('app.usuario_id', true), '') $$;

-- Cadastro de lojas. Sem RLS: o site público precisa achar a loja pelo
-- subdomínio antes de existir escopo. Aqui só há dado público ou de operação;
-- tudo o que é da loja fica nas tabelas abaixo, protegidas.
create table lojas (
  id uuid primary key default uuidv7(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$' and position('--' in slug) = 0),
  nome text not null check (length(nome) between 2 and 80),
  segmento text not null check (segmento in ('barbearia', 'salao', 'estudio', 'outro')),
  -- implantacao: site visível com aviso, agendamentos de teste; ativa: no ar;
  -- suspensa/encerrada: site mostra que está indisponível e não agenda.
  situacao text not null default 'implantacao' check (situacao in ('implantacao', 'ativa', 'suspensa', 'encerrada')),
  fuso text not null default 'America/Sao_Paulo' check (length(fuso) between 3 and 64),
  criada_em timestamptz not null default now(),
  criada_por text references "user" ("id") on delete set null
);

alter table convites
  add constraint convites_loja foreign key (tenant_id) references lojas (id) on delete cascade;

-- Conteúdo do site e regras da agenda: uma linha por loja.
create table config_loja (
  tenant_id uuid primary key references lojas (id) on delete cascade,
  modelo text not null default 'classico' check (modelo in ('classico', 'contraste')),
  cor text not null default '#7a4e2d' check (cor ~ '^#[0-9a-f]{6}$'),
  chamada text check (length(chamada) <= 120),
  sobre text check (length(sobre) <= 1200),
  endereco text check (length(endereco) <= 200),
  whatsapp text check (whatsapp ~ '^\+[1-9][0-9]{9,14}$'),
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  -- Grade oferecida no site, intervalo entre clientes, antecedência mínima e
  -- quantos dias à frente o site aceita reservas.
  passo_min integer not null default 30 check (passo_min in (10, 15, 20, 30, 60)),
  intervalo_min integer not null default 0 check (intervalo_min between 0 and 120),
  antecedencia_min integer not null default 120 check (antecedencia_min between 0 and 10080),
  horizonte_dias integer not null default 30 check (horizonte_dias between 1 and 180),
  atualizado_em timestamptz not null default now()
);

-- Equipe: o vínculo é a permissão. Revogado não volta sozinho.
create table membros_loja (
  tenant_id uuid not null references lojas (id) on delete cascade,
  usuario_id text not null references "user" ("id") on delete cascade,
  papel text not null check (papel in ('dona', 'funcionario')),
  criado_em timestamptz not null default now(),
  revogado_em timestamptz,
  primary key (tenant_id, usuario_id)
);

create index membros_por_usuario on membros_loja (usuario_id) where revogado_em is null;

create table profissionais (
  tenant_id uuid not null references lojas (id) on delete cascade,
  id uuid not null default uuidv7(),
  nome text not null check (length(nome) between 1 and 60),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table servicos (
  tenant_id uuid not null references lojas (id) on delete cascade,
  id uuid not null default uuidv7(),
  nome text not null check (length(nome) between 2 and 80),
  descricao text check (length(descricao) <= 300),
  duracao_min integer not null check (duracao_min between 5 and 600),
  -- Nulo = "valor sob consulta".
  preco_centavos integer check (preco_centavos between 0 and 10000000),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  primary key (tenant_id, id)
);

-- Quem faz cada serviço.
create table servicos_profissionais (
  tenant_id uuid not null,
  servico_id uuid not null,
  profissional_id uuid not null,
  primary key (tenant_id, servico_id, profissional_id),
  foreign key (tenant_id, servico_id) references servicos (tenant_id, id) on delete cascade,
  foreign key (tenant_id, profissional_id) references profissionais (tenant_id, id) on delete cascade
);

-- Expediente semanal de cada profissional, em minutos do dia no fuso da loja.
-- Pode haver mais de um turno no dia (manhã e noite), nunca sobrepostos.
create table expedientes (
  tenant_id uuid not null,
  id uuid not null default uuidv7(),
  profissional_id uuid not null,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  inicio_min smallint not null check (inicio_min between 0 and 1439),
  fim_min smallint not null check (fim_min between 1 and 1440),
  check (inicio_min < fim_min),
  primary key (tenant_id, id),
  foreign key (tenant_id, profissional_id) references profissionais (tenant_id, id) on delete cascade,
  constraint expedientes_sem_sobreposicao exclude using gist (
    tenant_id with =, profissional_id with =, dia_semana with =, int4range(inicio_min, fim_min) with &&
  )
);

-- Folga, feriado ou compromisso. Sem profissional = a loja inteira.
create table bloqueios (
  tenant_id uuid not null references lojas (id) on delete cascade,
  id uuid not null default uuidv7(),
  profissional_id uuid,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text check (length(motivo) <= 120),
  criado_em timestamptz not null default now(),
  criado_por text references "user" ("id") on delete set null,
  check (inicio < fim),
  primary key (tenant_id, id),
  foreign key (tenant_id, profissional_id) references profissionais (tenant_id, id) on delete cascade
);

create index bloqueios_por_periodo on bloqueios (tenant_id, inicio);

-- Clientes finais, por loja: a mesma pessoa em duas lojas são dois registros,
-- e nenhum dado passa de uma loja para a outra.
create table clientes (
  tenant_id uuid not null references lojas (id) on delete cascade,
  id uuid not null default uuidv7(),
  nome text not null check (length(nome) between 2 and 80),
  telefone text not null check (telefone ~ '^\+[1-9][0-9]{9,14}$'),
  criado_em timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, telefone)
);

create table agendamentos (
  tenant_id uuid not null references lojas (id) on delete cascade,
  id uuid not null default uuidv7(),
  servico_id uuid not null,
  profissional_id uuid not null,
  cliente_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  -- Fim do serviço mais o intervalo da loja no momento da reserva.
  ocupado_ate timestamptz not null,
  situacao text not null default 'confirmado' check (situacao in ('confirmado', 'cancelado', 'concluido', 'faltou')),
  origem text not null check (origem in ('site', 'painel')),
  -- Preço e duração do serviço no momento da reserva.
  preco_centavos integer check (preco_centavos between 0 and 10000000),
  observacao text check (length(observacao) <= 300),
  criado_em timestamptz not null default now(),
  criado_por text references "user" ("id") on delete set null,
  cancelado_em timestamptz,
  cancelado_por text references "user" ("id") on delete set null,
  check (inicio < fim and fim <= ocupado_ate),
  check ((situacao = 'cancelado') = (cancelado_em is not null)),
  primary key (tenant_id, id),
  foreign key (tenant_id, servico_id) references servicos (tenant_id, id),
  foreign key (tenant_id, profissional_id) references profissionais (tenant_id, id),
  foreign key (tenant_id, cliente_id) references clientes (tenant_id, id),
  -- Última linha de defesa contra duas reservas no mesmo horário: mesmo que a
  -- aplicação erre, o banco recusa (23P01).
  constraint agendamentos_sem_choque exclude using gist (
    tenant_id with =, profissional_id with =, tstzrange(inicio, ocupado_ate) with &&
  ) where (situacao <> 'cancelado')
);

create index agendamentos_por_periodo on agendamentos (tenant_id, inicio);
create index agendamentos_por_cliente on agendamentos (tenant_id, cliente_id);

-- RLS forçada em todas as tabelas da loja (vale até para o dono das tabelas).
alter table config_loja enable row level security;
alter table config_loja force row level security;
create policy loja on config_loja using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table membros_loja enable row level security;
alter table membros_loja force row level security;
-- A pessoa enxerga os próprios vínculos (para listar suas lojas); alterar,
-- só dentro da loja da transação.
create policy ler on membros_loja for select using (tenant_id = app_tenant() or usuario_id = app_usuario());
create policy incluir on membros_loja for insert with check (tenant_id = app_tenant());
create policy alterar on membros_loja for update using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
create policy excluir on membros_loja for delete using (tenant_id = app_tenant());

alter table profissionais enable row level security;
alter table profissionais force row level security;
create policy loja on profissionais using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table servicos enable row level security;
alter table servicos force row level security;
create policy loja on servicos using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table servicos_profissionais enable row level security;
alter table servicos_profissionais force row level security;
create policy loja on servicos_profissionais using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table expedientes enable row level security;
alter table expedientes force row level security;
create policy loja on expedientes using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table bloqueios enable row level security;
alter table bloqueios force row level security;
create policy loja on bloqueios using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table clientes enable row level security;
alter table clientes force row level security;
create policy loja on clientes using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

alter table agendamentos enable row level security;
alter table agendamentos force row level security;
create policy loja on agendamentos using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

-- Mover um registro para outra loja é recusado pelo "with check" das políticas:
-- a linha alterada precisa continuar na loja da transação.
