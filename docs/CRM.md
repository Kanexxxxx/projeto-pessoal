# CRM da Nexakeep — especificação e guia de uso

Este é o comportamento planejado do CRM. As telas ainda não existem. A versão inicial deve organizar vendas; versões seguintes completam financeiro, suporte e automações.

## 1. Usar referências sem copiar o produto

Comparar funções públicas de CRMs é benchmarking de produto. Não é necessário desmontar software proprietário para criar cadastro, funil, atividades e relatórios.

Referências: pipelines e etapas documentados pela HubSpot; atividades e próxima ação no Pipedrive [C1–C2]. Desenhar nossos próprios componentes, textos e fluxos. Não copiar telas, código, marca ou dados privados. Se houver reaproveitamento de código aberto, revisar licença e obrigações antes de incorporar.

Não foi realizada engenharia reversa de sistemas privados. “Completo” significa atender ao ciclo comercial escolhido, não reproduzir tudo que três grandes CRMs oferecem.

## 2. Módulos

| Módulo | Primeira versão | Evolução |
|---|---|---|
| Contatos/negócios | Nome, segmento, cidade, canal, origem e interesse | Histórico completo e importação validada |
| Funil | Etapa, valor proposto, próxima ação e perda | Comparação por nicho, origem e oferta |
| Atividades | Ligação, mensagem, reunião, retorno | Lembretes e modelos de comunicação |
| Demonstração | Briefing, endereço e datas do teste | Uso do site e obstáculos de ativação |
| Propostas | Plano, escopo, validade e condição | Versões, aceite e anexo contratual |
| Clientes | Data de entrada e situação | Implantação, satisfação, expansão e cancelamento |
| Financeiro | Valor recebido e vencimento | Parcelas, reconciliação, MRR, consumo e margem |
| Suporte | Solicitação, prioridade e resolução | Incidentes, base de ajuda e tempos de atendimento |
| Privacidade | Origem, recusa e bloqueio de contato | Exportação, exclusão e trilha de auditoria |

O CRM interno só é visível ao operador da plataforma. Donas de loja não devem acessar a lista comercial nem os custos/contratos de outras lojas. Se houver CRM para as lojas no futuro, é outro módulo com isolamento próprio.

## 3. Cadastro mínimo de um prospect

Nome comercial, segmento, cidade/bairro, link da fonte pública e data da coleta, canal profissional, responsável quando informado, situação do site/agenda, dor observada, interesse declarado, permissão de contato quando aplicável, recusa, etapa, valor proposto, último contato e próxima ação.

Telefone em formato normalizado ajuda a detectar duplicata, mas um número pode representar várias unidades. Não unir automaticamente todos os negócios que compartilhem contato.

Não concluir que uma empresa “não tem sistema” só porque não apareceu um link na busca. Marcar como hipótese e confirmar na conversa. Coletar apenas o necessário; fotos de clientes e conversas privadas não entram no cadastro de prospecção.

## 4. Etapas e movimentação

| Etapa | Significa | Condição para avançar |
|---|---|---|
| Encontrado | Empresa localizada em fonte permitida | Conferir segmento e canal |
| Qualificado | Há encaixe potencial com o produto | Definir abordagem pertinente |
| Contato realizado | Uma abordagem efetiva registrada | Esperar/registrar resposta |
| Conversando | Prospect respondeu | Entender problema e interesse |
| Demonstração aceita | Quer conhecer a solução | Receber briefing e materiais |
| Em teste | Acesso funcional liberado | Acompanhar uso e data de término |
| Proposta enviada | Escopo e cobrança apresentados | Registrar decisão |
| Contratado | Aceite obtido | Acompanhar pagamento e implantação |
| Ativo e pagante | Pagamento confirmado e serviço entregue | Renovação, suporte e medição |
| Perdido | Não fechou neste ciclo | Motivo registrado |
| Não contatar | Recusou novas abordagens | Bloqueio respeitado em todos os canais aplicáveis |

Negócio perdido pode voltar por iniciativa/interesse legítimo posterior. “Não contatar” nunca vira sequência automática de insistência.

Separar status de contrato, pagamento, implantação e assinatura. Um negócio contratado ainda pode estar aguardando entrada; parcela recebida não significa implantação entregue.

## 5. Guia de uso diário

1. Abrir “Hoje”: retornos vencidos, testes próximos do fim, cobranças e problemas.
2. Cadastrar lote pequeno de novos prospects e conferir duplicatas/origem.
3. Priorizar quem tem necessidade identificada, atende ao nicho e pode usar o produto.
4. Fazer abordagem individual pertinente, pelo canal permitido; registrar o que ocorreu.
5. Em cada conversa, preencher resultado e próxima ação com data. Não deixar cartão parado sem motivo.
6. Se houver interesse, recolher briefing e oferecer demonstração padronizada.
7. Durante o teste, verificar ativação, agendamentos reais autorizados e dificuldade; não apenas visitas.
8. Antes do fim, registrar decisão, objeção ou proposta.
9. Confirmar pagamento no banco/provedor e organizar entrega.
10. No fechamento do dia, revisar caixa recebido, horas gastas e fila de suporte.

Proposta de rotina semanal: revisar conversões, custos, clientes inativos, motivo das perdas, vencimentos de fornecedores e capacidade para receber novos testes.

## 6. Como entender os 200 contatos

Não é um teto nem uma previsão de vendas. É um denominador de exemplo.

Registrar separadamente: prospects únicos encontrados → qualificados → abordados → respondentes → demonstrações → testes → pagantes → renovados. Não usar número de mensagens como número de pessoas alcançadas.

Exemplo puramente hipotético: 200 abordados, 40 respostas, 20 testes e 10 pagantes. Conversão total 10/200 = 5%; de teste para pagamento 10/20 = 50%. Não apresentar esse exemplo como resultado obtido.

É possível pesquisar mais prospects, mas a capacidade de montar testes e atender pagantes limita a velocidade. Começar com um lote de 20–30 qualificados, corrigir a oferta e ampliar. Não disparar “para todo mundo” automaticamente.

A política de mensagens do WhatsApp exige cuidados de autorização e saída [W3]. Um telefone público não equivale a consentimento para marketing pela API. O processo comercial precisa respeitar o canal e a recusa, com avaliação da base legal para dados.

## 7. Relatórios necessários

- Prospects únicos, respostas, demonstrações e clientes pagos por período/origem.
- Conversão em cada etapa e tempo até decisão.
- Receita de implantação contratada, recebida e ainda a receber.
- Mensalidade recorrente ativa (MRR), inadimplência e cancelamentos.
- Custo de mensagens/IA por cliente; margem depois de suporte.
- Horas para configurar teste, concluir implantação e atender suporte.
- Testes que terminaram sem decisão; motivo de recusa.
- Quantidade de agendamentos e uso do painel, com acesso autorizado.

A ferramenta deve permitir exportar os dados comerciais para não prender o operador ao próprio CRM. Backup e restauração incluem esse módulo; conteúdo pessoal não vai para o Git.

## 8. Critério de pronto

O operador consegue inserir um prospect, evitar duplicação evidente, registrar contato, agendar retorno, iniciar teste, emitir proposta, confirmar recebimento, acompanhar mensalidade e registrar cancelamento. As telas refletem o estado real; não inventam venda, taxa de conversão ou probabilidade.
