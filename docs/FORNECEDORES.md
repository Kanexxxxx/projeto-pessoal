# Fornecedores para pessoa física — e-mail, cobrança, backup e monitor

Pesquisa de 16/10/2026 em fontes oficiais (registro de trabalho em [execucao/PESQUISA-FORNECEDORES.md](execucao/PESQUISA-FORNECEDORES.md)). Nenhuma conta foi criada e nada foi contratado. "Aceita PF" significa que a documentação oficial admite pessoa física; isso **não** prova que a conta do titular será aprovada nem resolve a questão fiscal (OFERTA.md §8). Contratar qualquer item é decisão e ação do titular.

## 1. E-mail transacional (T11)

| Fornecedor | PF | Grátis / entrada | Pontos de atenção | Fonte |
|---|---|---|---|---|
| **Resend** (candidato principal) | Termos aceitam indivíduos maiores de 18 | 3.000/mês e 100/dia, 3 domínios; Pro US$20 por 50.000 | Retenção anunciada de 30 dias; dados nos EUA; não emite nota brasileira | [resend.com/pricing](https://resend.com/pricing), [termos](https://resend.com/legal/terms-of-service) |
| Brevo | Cadastro de PF brasileira não confirmado | 300/dia, sem acúmulo | Logs e prévias guardados por tempo indefinido por padrão: reduzir a retenção antes de dados reais (exclusão em até 72 h) | [ajuda Brevo](https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews) |
| E-mail da Hostinger | Conta do titular já existe | R$11,99/mês (Starter) | Caixa de e-mail, não serviço transacional; limites de envio a confirmar | catálogo da conta (T01) |

**Recomendação:** Resend no plano grátis para o piloto, com domínio `nexakeep.site` (SPF, DKIM e DMARC). Até o titular autorizar, o projeto grava os e-mails em arquivo local.

## 2. Cobrança (T11/T18)

| Fornecedor | PF | Tarifas | Pontos de atenção | Fonte |
|---|---|---|---|---|
| **Pix manual** (inicial) | Sim | Pode haver tarifa do banco para uso comercial por PF | Conferir no extrato; comprovante enviado não confirma pagamento | [Banco Central](https://www.bcb.gov.br/meubc/faqs/p/quais-as-tarifas-relacionadas-ao-pix) |
| **Mercado Pago — link de pagamento** | Sim, com CPF | Pix no link 0,99%; cartão 4,98% (recebe na hora), 4,48% (14 dias), 3,99% (30 dias) | Antecipação e taxas variam por conta | [cobrar com CPF](https://www.mercadopago.com.br/blog/cobrar-primeiro-cliente-sem-site-maquininha), [tarifas](https://www.mercadopago.com.br/ferramentas-para-vender/link-de-pagamento) |
| Asaas | Conta PF sim | Pix/boleto R$1,99 (promoção R$0,99 por 3 meses) | Notificações por WhatsApp (R$0,55) e e-mail/SMS (R$0,99) são extras; **subcontas exigem CNPJ** | [conta digital](https://www.asaas.com/conta-digital), [preços](https://www.asaas.com/precos-e-taxas), [subcontas](https://docs.asaas.com/docs/criacao-de-subcontas) |

**Recomendação:** Pix manual no início e link do Mercado Pago para quem quiser cartão. Recebimento direto em nome de cada loja (subcontas/split) fica fora do escopo sem CNPJ.

## 3. Backup externo (T10)

| Fornecedor | Grátis | Depois | Fonte |
|---|---|---|---|
| **Cloudflare R2** | 10 GB/mês | US$0,015/GB-mês + operações; sem tarifa de saída | [preços R2](https://developers.cloudflare.com/r2/pricing/) |
| Backblaze B2 | 10 GB | US$6,95/TB-mês (preço de maio/2026); saída grátis até 3× a média armazenada | [preços B2](https://www.backblaze.com/cloud-storage/pricing) |

**Recomendação:** R2 ou B2 dentro da cota grátis no piloto (banco pequeno), com o backup **criptografado antes de sair da VPS**. Ambos pedem cartão no cadastro.

## 4. Monitor externo (T10)

| Fornecedor | Grátis | Pontos de atenção | Fonte |
|---|---|---|---|
| **UptimeRobot** | 50 monitores a cada 5 min; a central de ajuda permite uso comercial no plano grátis | A página de preços ainda fala em uso pessoal: divergência registrada | [quem pode usar o grátis](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan) |

Heartbeat de cron (aviso quando o backup diário não roda): avaliar na T10; não pesquisado a fundo nesta rodada.

## 5. Pendências

1. Confirmar com o contador como emitir recibo/nota por serviço cobrado via Mercado Pago ou Pix (OFERTA.md §8).
2. Brevo: confirmar cadastro de PF brasileira antes de considerar.
3. Resend e R2/B2 processam dados fora do Brasil: registrar na política de privacidade (T09) e minimizar o que vai no e-mail.
