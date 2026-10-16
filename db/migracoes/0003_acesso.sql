-- Operadores da plataforma (ARQUITETURA.md §2): acesso administrativo, sempre
-- com MFA. Ser operador é um vínculo explícito, nunca um campo editável do usuário.
create table operadores (
  usuario_id text primary key references "user" ("id") on delete cascade,
  criado_em timestamptz not null default now(),
  revogado_em timestamptz
);

-- Convites: a única forma de uma conta nascer. O token vai só no e-mail; aqui
-- fica o SHA-256 dele. Uso único, prazo curto, revogável.
create table convites (
  id uuid primary key default uuidv7(),
  email text not null check (email = lower(email) and length(email) between 3 and 254 and position('@' in email) > 1),
  papel text not null check (papel in ('operador', 'dona', 'funcionario')),
  -- Loja do convite (a tabela de lojas chega na T06); nulo só para operador.
  tenant_id uuid,
  token_hash bytea not null unique check (length(token_hash) = 32),
  criado_por text references "user" ("id") on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  usado_por text references "user" ("id") on delete set null,
  revogado_em timestamptz,
  check (expira_em > criado_em),
  check ((papel = 'operador') = (tenant_id is null))
);

create index convites_pendentes on convites (email) where usado_em is null and revogado_em is null;

-- Limite de tentativas durável (lição da base anterior: contador em memória não
-- protege nada). A chave é um HMAC do escopo com o identificador, então o banco
-- não guarda e-mail nem IP de quem tentou.
create table limites_taxa (
  chave text primary key check (length(chave) = 64),
  contagem integer not null check (contagem >= 0),
  janela_inicio timestamptz not null
);

create index limites_taxa_por_janela on limites_taxa (janela_inicio);
