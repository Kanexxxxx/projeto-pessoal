-- Sessões emitidas antes de provar o segundo fator nunca autorizam o painel.
alter table "session" add column "mfaVerificado" boolean not null default false;

-- A mesma janela TOTP só pode ser consumida uma vez, inclusive entre processos.
-- A referência ao fator impede que o histórico sobreviva a uma recuperação.
create table mfa_passos_consumidos (
  usuario_id text not null references "user" (id) on delete cascade,
  fator_id text not null references "twoFactor" (id) on delete cascade,
  passo bigint not null,
  primary key (usuario_id, fator_id, passo)
);
