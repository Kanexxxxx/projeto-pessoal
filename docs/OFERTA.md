# Oferta, custos e termos — proposta da T02

Revisão de 15/10/2026. **Proposta para aceite do titular.** Nada aqui vale como contrato antes do aceite e da revisão fiscal/jurídica indicada na §8. Complementa o [PLANO.md](PLANO.md) com os custos reais levantados na T01 e na T14.

## 1. O que o titular precisa decidir

- [ ] Planos, escopo e limites da §2 (ou ajustes).
- [ ] Onde hospedar o piloto e em qual ciclo de cobrança (§3). Qualquer contratação é compra e depende de autorização.
- [ ] Ligar a renovação de nexakeep.site (vence em julho/2027, renovação R$203,08).
- [ ] Prazos de cobrança, suspensão e encerramento da §5.
- [ ] Preço e condições dos módulos opcionais da §6.
- [ ] Levar as perguntas da §8 a um contador e, para o WhatsApp, a orientação jurídica.

## 2. Planos e escopo

Mantém a oferta do PLANO.md §3: implantação **R$299** (simples) ou **R$600** (personalizada) e **R$50/mês** pelo serviço básico, cobrado antecipadamente após o teste.

Limites provisórios do plano de R$50, para validar no piloto (medir antes de prometer em contrato):

| Item | Incluído | Fora do plano |
|---|---|---|
| Site | subdomínio `loja.nexakeep.site`, um modelo da biblioteca, conteúdo da loja | código sob medida, domínio próprio (§6) |
| Agenda | serviços, profissionais (até 3), horários, bloqueios, reservas sem limite de quantidade | integrações inéditas |
| Painel | dona + até 2 funcionários | — |
| Fotos | até 30 imagens otimizadas (até ~50 MB no total) | vídeo hospedado |
| E-mail transacional | confirmação, lembrete e recuperação de senha, até 1.000/mês | campanhas e prospecção |
| WhatsApp | **modo manual**: links `wa.me` com texto pronto para a loja ou a cliente enviarem | envio automático (§6) |
| IA | desligada | módulo com teto (§6) |
| Alterações | uma rodada pequena de ajuste por mês (texto, foto, preço, horário) | redesenho e alterações contínuas |
| Suporte | uso do produto, seg–sáb 9h–18h (America/Sao_Paulo) | — |

## 3. Custos reais

Fonte: conta Hostinger e catálogo consultados em 15/10/2026 (T01). Valores de catálogo; o checkout pode mudar impostos, cupons e condições.

| Item | Situação hoje | Custo |
|---|---|---|
| Domínio nexakeep.site | ativo, sem renovação automática | R$203,08/ano (≈ R$16,92/mês) |
| VPS | **nenhuma ativa** | ver tabela abaixo |
| E-mail transacional | nenhum | R$0 (cota grátis de um provedor, a escolher na T11) a R$11,99/mês (Hostinger Starter mensal) |
| Backup externo | nenhum | R$0 no volume do piloto (cotas grátis de armazenamento de objetos), a escolher na T10 |
| Monitor externo | nenhum | R$0 (planos grátis), a escolher na T10 |

| VPS Hostinger | Equivalente mensal | Pagamento |
|---|---:|---|
| KVM 1 (1 vCPU, 4 GB, 50 GB) — ciclo de 24 meses | R$29,99 no 1º ciclo · R$59,99 na renovação | R$719,76 à vista no 1º ciclo |
| KVM 1 — mensal | R$52,99 no 1º mês · R$87,99 depois | mês a mês, sem compromisso longo |
| KVM 2 (2 vCPU, 8 GB, 100 GB) — ciclo de 24 meses | R$43,99 no 1º ciclo · R$77,99 na renovação | R$1.055,76 à vista no 1º ciclo |

Medição da VPS anterior (outro projeto, KVM 1): CPU média 2%, RAM ~1,5 de 4 GB, disco ~9 de 50 GB. **Proposta:** piloto em KVM 1; subir para KVM 2 só quando a medição (T19) mostrar gargalo. O ciclo é decisão de caixa: o mensal custa quase o triplo, mas não prende por dois anos.

## 4. Conta de margem

Premissas por cliente pagante de R$50: reserva de 10% para taxas e tributos (**não é alíquota**; definir com contador), R$1 de consumo (armazenamento e e-mail) e 15 minutos de suporte por mês valorizados a R$60/h (R$15).

**Contribuição por cliente = 50 − 5 − 1 − 15 = R$29.**

| Infraestrutura fixa | Fixo/mês | Clientes para cobrir |
|---|---:|---:|
| KVM 1 24 meses (1º ciclo) + domínio + e-mail grátis | R$46,91 | 2 |
| KVM 1 24 meses (1º ciclo) + domínio + e-mail Hostinger | R$58,90 | 3 |
| KVM 1 24 meses (renovação) + domínio + e-mail Hostinger | R$88,90 | 4 |
| KVM 1 mensal + domínio + e-mail Hostinger | R$116,90 | 5 |
| KVM 2 24 meses (1º ciclo) + domínio + e-mail Hostinger | R$72,90 | 3 |

**O suporte decide a margem:** com 30 minutos/mês a contribuição cai para R$14; com 1 hora, fica **negativa (−R$16)**. Medir o tempo real por cliente desde o primeiro piloto (CRM, T07/T13).

Implantação, depois que a plataforma estiver pronta (estimativa interna do PLANO.md §2, a R$60/h): simples ≈ 2 h (R$120) → sobra R$179 dos R$299; personalizada ≈ 4 h (R$240) → sobra R$360 dos R$600. Antes de tributos e taxas.

Não entram nesta conta: as horas já investidas na plataforma, tarifas do meio de pagamento e tributos reais.

## 5. Cobrança, teste e inadimplência (proposta)

- **Implantação:** 50% na contratação e 50% na entrega aprovada (R$149,50 + R$149,50 ou R$300 + R$300). Alternativa para o plano de R$600: 3 × R$200 + R$50 da mensalidade nesses meses (PLANO.md §4).
- **Teste:** 7 dias corridos a partir da liberação funcional, com início e fim registrados no CRM; até 3 testes simultâneos no começo.
- **Mensalidade:** R$50 antecipados, vencimento no mesmo dia de cada mês após o aceite. Pix manual conferido no extrato; comprovante enviado pela cliente não confirma pagamento.
- **Atraso — linha do tempo proposta:**

| Dia | Ação | Efeito para a loja |
|---|---|---|
| D0 | vencimento; aviso por e-mail e no painel | nenhum |
| D+3 | lembrete | nenhum |
| D+10 | **suspensão reversível** de novas reservas online; o site mostra o contato da loja; painel em modo consulta e exportação | reservas já feitas continuam visíveis |
| D+30 | encerramento contratual; aviso com prazo de exportação | painel só para exportar |
| D+60 | eliminação dos dados conforme a política (T09), salvo retenção com fundamento | — |

  Suspensão também corta consumo pago (IA, mensagens). Toda suspensão e reativação fica registrada. São prazos contratuais propostos, não prazos legais.

## 6. Módulos opcionais (preço a definir)

- **Domínio próprio:** titular é a loja e ela paga a renovação; a Nexakeep cobra só a configuração. Se a loja quiser parcelar, adicional explícito de (renovação anual ÷ 12) + margem. Acompanhar renovação a 60, 30 e 7 dias.
- **WhatsApp automático (caminho B de [WHATSAPP.md](WHATSAPP.md)):** só depois dos portões daquele documento. Mensagens cobradas pela Meta na WABA da própria loja (≈ R$0,035 por mensagem de utilidade ou atendimento desde 01/10/2026); a Nexakeep cobraria configuração e eventual taxa mensal do módulo.
- **IA:** desligada por padrão. Quando houver, franquia mensal com teto por loja e reserva atômica de orçamento (ARQUITETURA.md §10); ao esgotar, volta ao fluxo sem IA e avisa a dona.

## 7. Atendimento e saída

- Atendimento humano seg–sáb, 9h–18h; feriados a definir. É janela de atendimento, não prazo de resolução. Monitoramento automático contínuo comunicado separadamente.
- **Saída:** a loja pode exportar a qualquer momento serviços, horários, clientes e reservas (CSV/JSON). Domínio próprio é transferido para a loja. O serviço é licença de uso; código-fonte não está incluído. Fotos e textos continuam da loja.
- Encerramento pela loja: mesmo fluxo da §5 a partir do D+30, sem cobrança adicional.

## 8. Perguntas para contador e orientação jurídica

1. Como faturar como pessoa física (autônomo): recibo, RPA ou NFS-e de autônomo no município? Precisa de inscrição municipal (ISS)?
2. Tributos sobre o serviço e sobre a mensalidade recorrente (IRPF/carnê-leão, ISS, INSS como contribuinte individual) — para substituir a reserva genérica de 10% da §4.
3. A partir de que volume de receita a formalização passa a ser necessária ou vantajosa? (Hoje a regra do projeto é não abrir CNPJ.)
4. Contrato de prestação de serviço com cláusulas de LGPD: a Nexakeep é **operadora** dos dados das clientes de cada loja e **controladora** dos próprios leads e cobranças.
5. WhatsApp: pessoa física pode atuar como prestadora que opera o app da loja, dado que os Termos da Meta descrevem o "Provedor de Serviços" como pessoa jurídica e exigem acordo escrito? (WHATSAPP.md §5)
6. Uso de fotos de clientes finais pela loja no site: autorização e finalidade.

## 9. Cláusulas mínimas do contrato (roteiro)

Objeto e escopo do plano; preço, vencimentos e reajuste; teste e aceite; limites do plano; suporte e janela de atendimento; disponibilidade sem garantia absoluta e plano de contingência; suspensão e encerramento (§5); exportação e eliminação de dados; papéis na LGPD e fornecedores envolvidos; titularidade de domínio, número de WhatsApp, fotos e textos; licença de uso do software; módulos de consumo com teto; foro e comunicação entre as partes.
