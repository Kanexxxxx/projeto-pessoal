# Fontes e pendências
Consulta em 15/10/2026. Preços, funcionalidades, elegibilidade e políticas podem mudar. Os valores de oferta, limites internos e metas de teste são propostas do projeto, não promessas dos fornecedores.

## Infraestrutura e pagamento

- **H1 — Hostinger, VPS:** https://www.hostinger.com/br/servidor-vps
  Base dos planos, recursos, valores anunciados e pagamento do período. Não comprova assinatura, saldo, vencimento ou renovação da conta do responsável.
- **H2 — Hostinger, upgrade:** https://www.hostinger.com/br/support/como-fazer-upgrade-do-vps-na-hostinger/
  Teto KVM 8 e expansão com VPS adicionais.
- **S1 — Supabase, preços:** https://supabase.com/pricing
  Pro anunciado a partir de US$25/mês. Custos adicionais dependem da configuração.
- **S2 — Supabase, operação própria:** https://supabase.com/docs/guides/self-hosting
  Recursos e responsabilidades da hospedagem própria.
- **S3 — Supabase, mudanças recentes:** https://supabase.com/changelog
  Consultar novamente antes de implementar integração/migração. A versão Markdown não pôde ser aberta nesta revisão; a página HTML foi consultada.
- **P1 — Mercado Pago, cobrança de serviços técnicos:** https://www.mercadopago.com.br/blog/link-pagamento-servicos-tecnicos-cobranca
  Conteúdo oficial indexado informa uso por autônomo com CPF e parcelamento no cartão. A abertura integral retornou bloqueio nesta sessão. Confirmar opções e tarifas na própria conta antes de oferecer.
- **P2 — Mercado Pago, API de checkout:** https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/overview
  Referência para futura integração; não foi integrada nem testada.

## Segurança, dados e comunicação

- **D1 — PostgreSQL, Row Security Policies:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
  RLS, papéis que a ignoram e necessidade de testar permissões.
- **E1 — Gmail, diretrizes para remetentes:** https://support.google.com/mail/answer/81126?hl=pt-BR
  Autenticação de e-mail e requisitos de envio. Não garante entrega fora do spam.
- **L1 — LGPD, texto legal:** https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
  Aplicação a pessoas naturais/jurídicas, princípios, direitos e hipóteses de conservação. A análise contratual/fiscal concreta permanece pendente.
- **L2 — ANPD, transferência internacional:** https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados
  Referência sobre mecanismos e regulação. Contratar fornecedor estrangeiro requer examinar o fluxo e instrumentos aplicáveis, não apenas acrescentar frase genérica à política.

## WhatsApp

- **W1 — Twilio, registro de remetente:** https://www.twilio.com/docs/whatsapp/self-sign-up
  Requisitos de conta, número e verificação; fluxo de ISV separado. Não é prova de que um BSP dispensará documentos.
- **W2 — Twilio, apresentação de contas comerciais:** https://www.twilio.com/docs/whatsapp/tutorial/whatsapp-business-account
  Nome visível e diferenças de apresentação. A própria página observa que o provedor não controla toda a exibição no WhatsApp.
- **W3 — WhatsApp, política de mensagens:** https://whatsappbusiness.com/policy/
  Regras de comunicação, permissões e respeito à saída.
- **W4 — WhatsApp, Meta Verified:** https://faq.whatsapp.com/3872729742954601
  Central oficial encontrada, mas a ferramenta não retornou corpo legível. Elegibilidade/documentos da conta do responsável não foram confirmados.
- **W5 — WhatsApp, perfil comercial:** https://faq.whatsapp.com/577829787429875
  Referência oficial localizada sobre informações do perfil. Não equivale a garantia de nome em toda tela.
- **W6 — WhatsApp, usernames na plataforma:** https://faq.whatsapp.com/2275639699930378
  Recurso encontrado na central oficial; elegibilidade e comportamento não validados para esta conta. Não incluído como solução pronta.

Nenhum remetente foi registrado, nome aprovado, template criado ou mensagem enviada nesta revisão.

As fontes da decisão da T14 (W7–W15: preços oficiais, mudança de 01/10/2026, Coexistence, Tech Provider, limites, Termos da Plataforma, documentos de verificação no Brasil e 360dialog) estão em [WHATSAPP.md §7](WHATSAPP.md#7-fontes-consultadas-em-15102026).

## IA e limites de programação

- **A1 — GPT-6 Luna:** https://developers.openai.com/api/docs/models/gpt-6-luna
- **A2 — GPT-6.1 Sol:** https://developers.openai.com/api/docs/models/gpt-6.1-sol
- **A3 — GPT-Transcribe:** https://developers.openai.com/api/docs/models/gpt-transcribe
- **A4 — Dados na API OpenAI:** https://developers.openai.com/api/docs/guides/your-data
- **A5 — Limites e preços de Codex/ChatGPT Work:** https://learn.chatgpt.com/docs/pricing
- **A6 — Claude, limites de uso:** https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work

A consulta da OpenAI indica janelas de cinco horas no Plus/Standard Business e possível limite semanal; o painel informa o reset concreto. A documentação do Claude descreve limites de sessão de cinco horas e semanais em planos pagos. Franquias dependem da conta e do uso. Estes dados não foram obtidos de um painel autenticado do responsável.

A comparação financeira de modelos é uma simulação com preços públicos, não avaliação de qualidade. GPT-5 Mini e GPT-4.1 Mini foram encontrados como depreciados na documentação atual; não foram escolhidos como nova dependência só pelo preço histórico.

## Referências de CRM

- **C1 — HubSpot, pipelines:** https://knowledge.hubspot.com/pt/object-settings/set-up-and-customize-pipelines
- **C2 — Pipedrive, atividades:** https://support.pipedrive.com/en/article/activities

Referências de comportamento público; nenhuma assinatura é proposta para copiar recursos. Não houve obtenção de código privado nem uso de dados de concorrentes.

## O que ainda falta comprovar

| Pendência | Como resolver | Bloqueia |
|---|---|---|
| ~~VPS atual, fatura, recursos e vencimento~~ | **Verificado em 15/10/2026 (T01):** não há VPS ativa; a única da conta está suspensa após vencimento. Nova VPS é compra e depende do titular | Implantação de teste (T10) |
| ~~DNS e renovação de nexakeep.site~~ | **Verificado em 15/10/2026 (T01):** domínio ativo, sem renovação automática, `@` aponta para servidor fora da conta consultada, sem registros de e-mail. Falta o titular decidir renovação e destino | Publicação e e-mail |
| E-mail SMTP disponível para PF e envio transacional | Conferir plano/termos e teste de entrega | Recuperação e mensagens automáticas |
| ~~Dependências da base anterior~~ | **Concluído (T01/T03):** Supabase usado só como PostgreSQL; decisão de reaproveitamento em [BASE-ANTERIOR.md](BASE-ANTERIOR.md). Migração de dados não executada | Migração de dados da loja anterior (se ela virar cliente) |
| API WhatsApp sem CNPJ para o uso desejado | **Decidido na T14 (15/10/2026):** bloqueada para o número existente (Coexistence exige parceiro; Tech Provider exige CNPJ/MEI). Número novo da loja pela Cloud API direta depende dos portões de WHATSAPP.md §5, inclusive orientação jurídica | Somente o módulo automático de WhatsApp |
| Conta de pagamentos e tarifas | Validar cadastro PF e opções efetivas | Cobrança por cartão/boleto |
| Backup externo | Escolher destino permitido para PF, custo, retenção e restaurar | Dados reais em produção |
| Modelo de IA adequado | Avaliação pequena com dados sintéticos e teto de gasto | Habilitação comercial do assistente |
| Obrigações locais de autônomo e contrato | Orientação qualificada para a operação concreta | Formalização da prestação habitual |
| Capacidade e prazo de atendimento | Medir piloto e disponibilidade real | Promessas comerciais de escala/SLA |

O domínio foi informado pelo responsável; sua propriedade não foi validada nesta sessão. GitHub confirmou o repositório público e inicialmente vazio. A documentação foi salva nele; nenhuma infraestrutura foi configurada.
