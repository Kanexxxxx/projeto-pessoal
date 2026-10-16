# WhatsApp — um número da plataforma para todas as lojas

Revisão de 16/10/2026, a partir da correção do titular: **não** criar um app Meta e um número para cada loja; usar **um número da plataforma** que atende os clientes de todas as lojas, sabe a qual loja cada conversa pertence, distingue cliente de dona/funcionário e mostra a identidade da loja. Esta revisão substitui a decisão de 15/10 ("um canal por loja"). Preços e regras mudam: conferir de novo antes de vender o módulo.

## 1. O que a Meta permite (confirmado em fonte oficial)

| Fato | Consequência | Fonte |
|---|---|---|
| Nome de exibição, foto e descrição pertencem ao **número**; trocar o nome passa por análise e exige novo registro do número | Um número só tem **um** nome no topo da conversa. Não existe nome diferente por cliente ou por loja | [W16], [W17] |
| A política proíbe "impersonate another business or entity, misrepresent your affiliation with a business" | O número da plataforma **não pode se apresentar como se fosse a loja**. A loja aparece de forma transparente: "Nexakeep · Barbearia do Zé" | [W18] |
| Portfólio novo registra **no máximo 2 números** no início | Um número por loja é inviável sem verificação da empresa (que exige CNPJ/MEI) | [W19] |
| Limite inicial de 250 destinatários únicos/24 h fora da janela, por portfólio; sobe para 2.000 por verificação **ou** por 2.000 entregas de alta qualidade em 30 dias, depois escala sozinho | Dá para crescer sem CNPJ, pelo caminho de volume e qualidade | [W10] |
| App central atendendo números de várias empresas = Tech Provider, com verificação da empresa e App Review obrigatórias | Esse é o caminho do "um número por loja sem 100 apps", mas exige CNPJ/MEI hoje | [W9] |
| Desde 01/10/2026 a Meta cobra também as mensagens dentro da janela de 24 h (atendimento e utilidade), mesmo quando o cliente escreveu primeiro | Toda mensagem entregue tem custo, salvo as exceções abaixo | [W14] |
| Exceções gratuitas: as **primeiras 1.000 mensagens de atendimento por número por mês**; tudo dentro da janela de 72 h aberta por anúncio de clique para WhatsApp ou botão da Página; mensagens recebidas dos clientes | No número único, as 1.000 grátis são **divididas entre todas as lojas** | [W7], [W14] |
| Tabela oficial em BRL (01/10/2026, Brasil): marketing **R$0,3217**, utilidade **R$0,035**, autenticação **R$0,035**, atendimento **R$0,035** | Base do orçamento do módulo | [W20] |
| Mídia enviada pela API fica 30 dias, salvo exclusão antes (`DELETE /MEDIA_ID`); ID de mídia recebida expira em 7 dias; URL de mídia em 5 minutos | Dá para apagar o que nós enviamos; o que o cliente mandou fica no aparelho dele e no da loja | [W21] |

## 2. As alternativas

| | Como funciona | Nome no topo da conversa | Exige | Custo para a plataforma | Situação |
|---|---|---|---|---|---|
| **A. Número central da plataforma** (recomendado) | Um app, uma WABA e um número da Nexakeep. Cada mensagem é de uma loja específica, escolhida pelo servidor | Nome da plataforma (ex.: "Nexakeep Agenda") | Número dedicado (chip), forma de pagamento na WABA, opt-in do cliente | Por mensagem (§4) + chip | **Viável sem CNPJ** |
| B. Um número por loja, app central | Tech Provider com Embedded Signup; cada loja conecta o próprio número (inclusive o que já usa, via Coexistence) | Nome da loja | Verificação da empresa + App Review (CNPJ/MEI) | Por mensagem por número | Fora do escopo atual; vira evolução se houver CNPJ |
| C. Um app e um número para cada loja | Como a base anterior | Nome da loja | 100 lojas = 100 apps e 100 chips | Alto em trabalho | **Descartado** pelo titular |
| D. Poucos números temáticos ("Nexakeep Barbearias", "Nexakeep Salões") | Variação de A | Nome do grupo | Máx. 2 números sem verificação | Dois chips | Possível, ganho pequeno |
| E. Não oficiais (Z-API, Evolution) | Simulam o WhatsApp Web | Qualquer | — | Baixo | **Proibido**: banimento do número |

O exemplo da DigAÍ é compatível com A: a central dela diz que usa vários números e que **o nome da assistente muda conforme a empresa** — ou seja, a personalização está no conteúdo da conversa, não num nome de remetente por empresa.

## 3. Como o número central sabe de quem é cada conversa

A loja **nunca** é decidida pela IA nem pelo texto livre. O servidor resolve, nesta ordem:

1. **Link da loja.** O site de cada loja abre o WhatsApp com uma mensagem pronta que leva um código curto da loja (ex.: `Agendar na Barbearia do Zé — cód. BZE7`). O código é conferido no banco; o texto em volta não vale nada.
2. **Histórico verificado.** O telefone tem agendamento ou conversa recente com uma loja → essa loja, confirmada na primeira resposta ("Você está falando com a agenda da Barbearia do Zé").
3. **Mais de uma loja possível** (o mesmo cliente frequenta duas) → o número pergunta com uma lista de botões, só entre as lojas com que ele já tem relação. Escolha registrada por conversa, com prazo.
4. **Nenhuma pista** → resposta fixa pedindo o link da loja; nenhum dado de loja é mostrado.

Cada conversa guarda **loja + telefone + papel**. Trocar de loja abre outra conversa, sem levar histórico nem dados. Respostas, templates e orçamento saem sempre do registro da loja da conversa.

**Cliente × dona × funcionário.** Ninguém vira dona por dizer que é. A dona e a equipe ligam o próprio WhatsApp à conta no painel: o painel mostra um código de uso único, a pessoa manda esse código ao número central e o vínculo fica gravado (usuário, loja, papel, data, revogação). Só esses telefones recebem avisos internos e podem pedir ações de gestão — e ações sensíveis continuam exigindo o painel. Telefone sem vínculo é sempre tratado como cliente.

**Cancelar e remarcar** seguem a regra da base anterior: o pedido do cliente vira aviso para a loja, e quem muda a agenda é a dona.

## 4. Custos no Brasil

Valores da tabela oficial em BRL de 01/10/2026; a franquia de 1.000 mensagens de atendimento é **por número** e, no modelo A, compartilhada por todas as lojas.

| Exemplo | Mensagens pagas/mês | Custo/mês |
|---|---:|---:|
| 1 loja, 300 agendamentos: lembrete por template (300) + confirmação por template (300) | 600 × R$0,035 | R$21,00 |
| Mesma loja, confirmação na tela/e-mail e só lembrete por template | 300 × R$0,035 | R$10,50 |
| 20 lojas assim (só lembrete) | 6.000 × R$0,035 | R$210,00 |
| 20 lojas, 4.000 respostas de atendimento no mês | (4.000 − 1.000 grátis) × R$0,035 | R$105,00 |

Mensagem de marketing (R$0,3217) não entra no plano básico. Conversas iniciadas por anúncio de clique para WhatsApp ficam 72 h grátis.

## 5. Riscos do número compartilhado e como controlar

- **Qualidade compartilhada:** bloqueios e denúncias de clientes de uma loja derrubam a classificação do número de todas. Controles: só mensagens transacionais pedidas pelo cliente; teto de envio por loja; nada de lista de transmissão; botão de "não quero mais receber" respeitado por loja.
- **Limite de 250/24 h no começo:** compartilhado entre as lojas até o número subir pelo caminho de qualidade. Medir e enfileirar; o site e o e-mail continuam funcionando.
- **Custo de uma loja não pode comer o de todas:** contabilidade por loja, teto mensal por loja e teto global (ARQUITETURA.md §10).
- **Nome no topo:** é o da plataforma. A identidade da loja vem em cada mensagem (nome no início, logotipo da loja no cabeçalho dos templates, assistente com nome por loja). Isso precisa ser dito ao vender o módulo.

## 6. Decisões do titular

1. **Aprovar o modelo A** (número central com identidade transparente da loja).
2. **Nome do número** (vai para análise da Meta e precisa ter relação com a plataforma): ex. "Nexakeep" ou "Nexakeep Agenda".
3. **Qual chip:** reaproveitar o número de teste já cadastrado na Meta para a base anterior (o que tira a automação daquele estúdio, que passaria a ser uma loja da plataforma) ou um chip novo só da plataforma.
4. **Criar portfólio/app da plataforma** no nome do titular: é ação externa e será feita só com autorização, depois dos testes locais.

Até lá, o módulo é desenvolvido e testado em localhost com um **provedor simulado** (nenhuma mensagem real é enviada).

## 7. Fontes (consultadas em 15 e 16/10/2026)

- **W7** — Preços da plataforma: <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>
- **W9** — Tech Provider: <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers>
- **W10** — Limites de envio: <https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits>
- **W14** — Mensagens de atendimento e utilidade a partir de 01/10/2026: <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages>
- **W16** — Nome de exibição: <https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names>
- **W17** — Perfil do número: <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-profiles>
- **W18** — Política de mensagens do WhatsApp Business: <https://whatsappbusiness.com/policy/>
- **W19** — Números de telefone comerciais ("Os novos portfólios empresariais são limitados inicialmente a dois telefones comerciais registrados"): <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers>
- **W20** — Tabela oficial em BRL, link "Taxas de lista em BRL" da página W7 (arquivo XLSX, vigência 01/10/2026).
- **W21** — Mídia: <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media>
- DigAÍ, central do candidato: <https://centraldocandidato.digai.ai/guias/confirmar-digai-oficial>

Cópias de leitura das páginas ficaram fora do repositório, na pasta temporária da pesquisa. Nenhum app, número, template ou mensagem real foi criado.
