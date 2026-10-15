# WhatsApp por loja sem CNPJ — decisão da T14

Consulta feita em 15/10/2026. Preços, termos e elegibilidade da Meta mudam com frequência: conferir de novo antes de vender o módulo ou integrar um canal real.

## 1. Pergunta e restrição

A plataforma deve conectar um WhatsApp **próprio de cada loja**, de preferência o número que a loja já usa, por integração **oficial**. Serviços que exigem CNPJ no uso pretendido estão fora do escopo (PLANO.md §1).

## 2. Resposta curta

| Caminho | Exige | CNPJ? | Custo para a loja | Situação |
|---|---|---|---|---|
| **A. Manual** — a loja continua no app WhatsApp Business; a plataforma gera links `wa.me` com texto pronto e envia e-mail | nada | não | R$0 | **Viável agora. Modo inicial.** |
| **B. Cloud API direta, número novo da loja** — app, WABA e cartão em nome da própria loja; a Nexakeep opera por token da loja | número dedicado (chip) sem uso no app; app Meta da loja; acordo escrito loja ↔ operador | não, com evidência real | por mensagem (§4) + chip | **Condicional** (§5) |
| **C. Coexistence — o número que a loja já usa** | Solution Partner ou Tech Provider fazendo o Embedded Signup | depende do parceiro | mensalidade do parceiro + por mensagem | **Bloqueado no orçamento atual** |
| **D. Nexakeep como Tech Provider** | verificação da empresa + App Review | **sim** (documentos de PJ) | — | **Fora do escopo** |
| **E. Uma WABA da Nexakeep com os números das lojas** | nome de exibição ligado à empresa dona da conta | — | — | **Descartado**: contraria a titularidade por loja (ARQUITETURA.md §11) |
| **F. Não oficiais** (Z-API, Evolution, Baileys e similares) | simulam o WhatsApp Web | não | baixo | **Proibido**: risco de banimento do número da loja |

**Decisão T14:** a automação pela API está **bloqueada para o número existente**. O produto começa no **modo manual (A)**, com site, painel e e-mail. O caminho **B** pode virar piloto quando os portões da §5 forem cumpridos; até lá não se anuncia automação de WhatsApp. A arquitetura de canais (T15) já é desenhada para A, B e C, para que a troca não exija outro software.

## 3. Requisitos confirmados

### Coexistence (número do app WhatsApp Business também na API)

- A documentação oficial do Embedded Signup diz: *"You must already be a Solution Partner or Tech Provider."* A loja precisa do app WhatsApp Business 2.24.17 ou superior [W8].
- Limite de 20 mensagens/s; grupos não sincronizam; listas de transmissão ficam desativadas; mensagens temporárias, visualização única e localização em tempo real são desligadas nas conversas individuais [W8].
- O que a loja envia **pelo aplicativo continua grátis**; o que sai pela API segue a tabela da API [W8].
- Desconecta se o celular principal ficar cerca de 14 dias inativo [W8]. A 360dialog pede abrir o app ao menos a cada 13 dias e informa que contas recém-criadas no app não são elegíveis de imediato [W11].

### Tech Provider

- Verificação da empresa é obrigatória antes da App Review; a App Review concede o acesso avançado a `whatsapp_business_messaging` ("required to send messages on behalf of your clients") e `whatsapp_business_management` [W9].
- Documentos aceitos no Brasil para a verificação: extrato bancário da empresa, cartão CNPJ, certificado MEI, contrato social, conta de serviço público [W12]. Nenhum documento de pessoa física aparece. Portanto **D exige CNPJ/MEI** e fica fora do escopo.

### Termos da Plataforma da Meta (versão em português)

- §12(r): "Provedor de Serviços" é "uma **pessoa jurídica** que você escolhe para fornecer serviços a você" [W13].
- §5.a.i: o desenvolvedor só pode usar um Provedor de Serviços se ele aceitar **por escrito** tratar os dados da plataforma unicamente em nome do desenvolvedor e segundo suas instruções [W13].
- §5.b.ii.2: um Provedor de Tecnologia deve manter separados os dados de cada cliente [W13] — coerente com o isolamento por loja.

### Limites de envio

- Portfólio novo: **250 destinatários únicos por 24 h**, fora da janela de atendimento, compartilhados por todos os números do portfólio [W10].
- Sobe para 2.000 por um de três caminhos: verificação da empresa, verificação feita por parceiro, **ou** 2.000 entregas de templates de alta qualidade a números únicos em 30 dias [W10]. Uma loja pequena raramente chega a 250 clientes diferentes por dia.

## 4. Custos confirmados (Brasil)

| Item | Valor | Fonte |
|---|---|---|
| Modelo | cobrança **por mensagem entregue** desde 01/07/2025, conforme categoria e país do destinatário | [W7] |
| **Mudança de 01/10/2026** | a Meta passou a cobrar **mensagens de atendimento** (não-template) e **templates de utilidade enviados dentro da janela de 24 h** | página oficial de atualização de preços [W14] |
| Tarifa de atendimento | igual à de utilidade/autenticação do país, sem faixas de volume | [W14] |
| Utilidade / autenticação / atendimento no Brasil | exemplo oficial: **US$0,0068** por mensagem · tabela em BRL de 01/10/2026: **R$0,0350** | [W14] · [W15] |
| Marketing no Brasil | **R$0,3217** por mensagem | [W15] |
| Franquia de atendimento | **1.000 mensagens de atendimento grátis por número por mês**, sem acúmulo; sem forma de pagamento, o excedente não é entregue | informado por fornecedor [W15] e pelo resumo da página de preços da Meta; **não encontrei no texto oficial lido — confirmar na primeira fatura** |
| Janela de entrada gratuita | 72 h grátis quando a pessoa chega por anúncio de clique para WhatsApp ou botão da Página, respondida em 24 h | [W7], [W14] |
| Moeda | WABAs de clientes com país de venda Brasil na Central de Cobrança devem migrar para BRL até 30/06/2027; depois disso a Meta deixa de entregar mensagens das WABAs não migradas. Fatura emitida pela Facebook Brasil | [W7] |
| Exigência fiscal da fatura em BRL (CPF aceito?) | **não confirmada**: o artigo da Central de Ajuda trata de clientes com faturamento mensal e não abriu sem login | pendente |
| 360dialog (parceiro para C) | licença **por número por mês**: €49 Regular, €99 Premium, €500 Scale (2026), mais as tarifas da Meta sem margem | [W11], terceiros |

### Conta de uma loja no caminho B (estimativa, não fatura)

Loja com 300 reservas/mês, preço de R$0,035 por template de utilidade:

| Desenho | Templates pagos por reserva | Custo/mês |
|---|---:|---:|
| Confirmação + lembrete + agradecimento por template | 3 | R$31,50 |
| Só lembrete por template; confirmação na tela e por e-mail | 1 | R$10,50 |
| Cliente toca em "avisar a loja" (abre a janela) e as respostas são de atendimento dentro da franquia | ~1 | ~R$10,50 |

Com mensalidade de R$50, o primeiro desenho consome mais da metade da receita se a plataforma pagar. No caminho B a cobrança da Meta cai **no cartão da própria loja**, na WABA dela — mesmo assim precisa estar no contrato, no painel de consumo e no teto por loja (ARQUITETURA.md §10).

## 5. Portões para liberar o caminho B (piloto)

1. **Papel jurídico do operador:** os Termos da Meta descrevem o prestador como pessoa jurídica e exigem acordo escrito. Obter orientação qualificada sobre operar como pessoa física; se não houver caminho permitido para PF, B também fica fora do escopo.
2. **Aceite da loja:** número novo, separado do que as clientes já conhecem, com nome de exibição da loja; titularidade do app, da WABA e do chip ficam com a loja.
3. **Custo aceito:** quem paga cada mensagem, teto mensal por loja e aviso ao chegar perto do teto.
4. **Testes da T15** com loja fictícia: assinatura do webhook, número receptor validado, deduplicação, outbox, destinatário correto, consumidor sem acesso administrativo.
5. **Nome exibido testado** no número real antes de anunciar (não testado nesta etapa).

## 6. Evidência da base anterior (setembro de 2026)

Uma profissional autônoma **sem CNPJ** criou app e WABA na Meta, registrou um chip dedicado, aprovou 8 templates, cadastrou cartão na WABA e enviou mensagens pela Cloud API oficial para celulares brasileiros. A verificação da empresa ficou pendente porque pede documento. Lições que entram na T15:

- Aceitar (HTTP 200) não é entregar: o resultado chega depois, no webhook de status, e `failed` precisa virar alerta.
- Decidir template ou texto livre **antes** de enviar, consultando se a janela de 24 h está aberta; na dúvida, template.
- O webhook recusa tudo sem o segredo do app; assinatura conferida no corpo bruto.

Essa evidência é anterior à mudança de preços de 01/10/2026 e não cobre o caso multiloja.

## 7. Fontes (consultadas em 15/10/2026)

- **W7** — Meta, preços da WhatsApp Business Platform: <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>
- **W8** — Meta, Embedded Signup para usuários do app (Coexistence): <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users>
- **W9** — Meta, como se tornar Tech Provider: <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers>
- **W10** — Meta, limites de envio: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits>
- **W11** — 360dialog, Coexistence: <https://docs.360dialog.com/docs/hub/embedded-signup/whatsapp-coexistence> · preços: <https://docs.360dialog.com/docs/360dialog/prices-plans-and-payment-options>
- **W12** — Wati, documentos exigidos por país na verificação da Meta (Brasil): <https://support.wati.io/pt-BR/articles/11463208-verificacao-de-negocios-da-meta-documentos-exigidos-por-pais> — fonte secundária; a página oficial da Meta não abriu sem login.
- **W13** — Meta, Termos da Plataforma: <https://developers.facebook.com/terms/>
- **W14** — Meta, atualização de preços de atendimento e utilidade: <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages>
- **W15** — ChatMaxima, tabela do Brasil a partir de 01/10/2026: <https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/> — fonte secundária que cita a tabela da Meta em BRL; o valor bate com o exemplo oficial em dólar.
- Base anterior: documentação privada do projeto de setembro de 2026 (não publicada).
