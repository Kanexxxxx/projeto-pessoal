# Base anterior — auditoria e decisão de reaproveitamento (T03)

Auditoria de 15/10/2026 sobre o repositório privado de um sistema de agendamento feito para **uma** profissional de beleza (Next.js 16, React 19, Tailwind 4, Supabase, WhatsApp Cloud API, IA). O relatório completo, com arquivo e linha de cada achado, fica fora do Git (`privado/AUDITORIA-BASE-ANTERIOR.md`): o sistema auditado está em produção e este repositório é público.

## 1. Como foi feita

Somente leitura do código, sem acesso a produção, banco, Meta ou provedores de IA. Comandos executados na cópia local (Node 24.20, npm 11.19):

| Comando | Resultado |
|---|---|
| `npm ci` | ok (409 pacotes) |
| `npm test` | **614 passaram, 12 pulados, 0 falharam** (os pulados chamam IA real) |
| `npm run lint` | ok, zero avisos |
| `tsc --noEmit` | 1 erro de ambiente (tipos gerados pelo `next typegen`); passa depois dele |
| `npm audit --omit=dev` | 3 vulnerabilidades (1 crítica no Next, 2 altas) |

Nenhum teste da base usa PostgreSQL real; todos usam banco simulado.

## 2. Uso do Supabase

Só PostgreSQL via API REST, sempre com a *service role* (que ignora RLS). Não usa Auth, Storage, Realtime, Edge Functions nem funções RPC. As tabelas têm RLS ligada sem nenhuma policy. **Migrar para PostgreSQL próprio não substitui nenhum serviço do Supabase.**

## 3. Decisão

**Não fazer fork.** A Nexakeep nasce neste repositório, sem importar o histórico da base (que contém mídia e dados de clientes). Motivos:

- Não há conceito de loja, usuário, papel ou profissional; todo acesso a dados ignora RLS; a autenticação é uma senha compartilhada sem identidade nem MFA. Levar o código como está carregaria premissas de loja única para cada módulo.
- O valor está nas **regras de negócio e nos testes**, que viram especificação dos módulos novos.

| Classe | Módulos | Horas de porte |
|---|---|---:|
| Reaproveitar quase como está | BR Code PIX, QR e PNG próprios (com gabaritos), normalização de telefone, padrão "proposta da IA + toque humano + reserva atômica", componentes genéricos de UI, cabeçalhos de segurança | ≈ 15–25 |
| Adaptar | motor de horários (expediente, regras, profissional e fuso como parâmetros), bloqueios, parser e HMAC do webhook, janela de 24 h e montagem de templates, roteamento cliente/dona, fluxo da cliente, remarcação, assistente, relatório, telas de agenda e painel, Docker | ≈ 130–200 |
| Reescrever | gravação de agendamentos (transação, máquina de estados, outbox), rota do webhook (inbox durável + worker), rate limit durável, cliente de IA com orçamento, lembretes por fila, schema e migrações | ≈ 65–100 |
| Descartar | sessão e login caseiros, site institucional, conteúdo, fotos e textos da cliente, scripts de fotos | 0 |
| **Total** | | **≈ 210–327 h** |

Funcionalidades novas (lojas, papéis, MFA, subdomínios, CRM, onboarding) não estão nesse total.

## 4. Regras herdadas (viram requisito e teste)

1. Trava, fila, deduplicação, limite de taxa e reserva de tarefa ficam **no banco**, nunca em memória.
2. Webhook: HMAC sobre o corpo bruto em tempo constante, falhando fechado; conferir o número receptor; gravar na inbox antes de processar; processar todas as mensagens e status do lote; responder rápido.
3. Envio por outbox com idempotência; aceite da API ≠ entrega; status `failed` volta ao fluxo; falha de entrega nunca dispara mensagem para destino de alerta.
4. Janela de 24 h consultada antes de enviar; na dúvida, template; ordem e quantidade de variáveis e botões validadas contra a definição aprovada.
5. Lembretes com reserva atômica e marca só após sucesso; teste com execuções concorrentes.
6. **Data aceita só na forma canônica** (`formatar(interpretar(x)) === x`) e **bloqueio de agenda dentro da mesma trava de banco** que impede choque de horários.
7. Fuso explícito por loja; suíte rodando em UTC e em outro fuso.
8. Telefone sempre normalizado e comparado normalizado; sem telefone, gravar NULL e não enviar — nunca inventar dado.
9. Id vindo de botão ou de proposta é conferido contra a loja e o remetente.
10. IA nunca altera agenda sem toque humano; proposta com validade, presa ao usuário, reservada atomicamente e revalidada; orçamento reservado antes da chamada; agenda funciona sem IA.
11. Nenhuma variável de ambiente roteia comunicação de loja; configuração por loja no banco.
12. Chave PIX por loja validada por tipo; troca exige sessão com MFA, gera auditoria e avisa a dona; valor do sinal guardado na reserva.
13. Logs sem telefone completo, corpo de mensagem ou chave; com código de erro e id de correlação.
14. Migrações aplicadas a partir de um banco vazio em CI; `next typegen && tsc`, lint, unidade e integração com PostgreSQL real (incluindo duas reservas simultâneas do mesmo horário).
15. Segredo nunca em camada de imagem nem no Git; segredo exposto é rotacionado no mesmo dia.

## 5. Dependências e licenças

As 5 dependências diretas de produção são MIT. Os binários opcionais da libvips (usados pelo `sharp` na otimização de imagens) são LGPL-3.0: em SaaS sem distribuir binários normalmente não há obrigação, mas distribuir imagens Docker a terceiros pode gerar — confirmar se isso ocorrer. Código da base é do titular; fotos, textos e dados da cliente não são reutilizáveis (README da base).

## 6. Migração dos dados da base anterior

**Não executada.** O banco de produção tem 5 tabelas e 11 MB. Se a loja anterior virar cliente da Nexakeep, migrar por script com conferência de contagens, depois da T09 (exclusão) e da T10 (backup restaurado), com aceite da cliente. Estimativa: 4–8 h.

## 7. Achados na produção da base anterior

A auditoria encontrou problemas de segurança no sistema que está no ar, incluindo dependência com avisos de segurança corrigidos em versão mais nova. Foram comunicados ao titular; os detalhes ficam no relatório privado até a correção. Corrigir aquele sistema é alteração de produção e depende de autorização dele.
