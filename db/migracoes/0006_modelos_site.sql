-- Modelos de site revistos em 17/10/2026 (DESIGN.md): três direções visuais
-- realmente distintas no lugar de "clássico" e "contraste".
--   letreiro  barbearia clássica: azulejo, letreiro condensado, poste listrado
--   revista   revista de moda: capa na cor da loja, Didone, agenda da semana
--   paleta    cartela de esmaltes: cada serviço é uma amostra de cor

alter table config_loja drop constraint config_loja_modelo_check;

-- A RLS forçada vale até para o dono: sem escopo, o UPDATE não veria nenhuma
-- linha. Desliga o "force" só para converter os valores antigos, dentro da
-- mesma transação da migração, e liga de novo em seguida.
alter table config_loja no force row level security;
update config_loja set modelo = case modelo when 'contraste' then 'letreiro' else 'revista' end;
alter table config_loja force row level security;

alter table config_loja
  add constraint config_loja_modelo_check check (modelo in ('letreiro', 'revista', 'paleta')),
  alter column modelo set default 'revista';
