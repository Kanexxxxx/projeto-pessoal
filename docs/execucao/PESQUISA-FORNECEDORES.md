> **Encerrado em 16/10/2026, 15h45 (Claude Code).** Relatório final consolidado em docs/FORNECEDORES.md. Mantido como histórico; não retomar a partir daqui.

# Checkpoint — fornecedores PF

Atualizado em 16/10/2026. Pesquisa em andamento; nenhuma conta criada, contratação, alteração de DNS, envio real ou implantação autorizada nesta frente. Trabalho restrito a documentação.

## Escopo e estado

- Comparar e-mail transacional, cobrança, armazenamento externo de backup e monitoramento para piloto SaaS de R$50/mês.
- Confirmar PF/CPF por documentação explícita; ausência de CNPJ no formulário não comprova elegibilidade.
- Manter Pix manual como alternativa inicial; não sugerir contornar restrições.
- VPS Hostinger será renovada pelo titular depois; domínio provisório `nexakeep.site` mantido. Desenvolvimento permanece em localhost.
- Lidos `docs/OFERTA.md`, `docs/PLANO.md` e `docs/ARQUITETURA.md`.
- Fontes oficiais consultadas: preços/termos Resend; Brevo (limites e retenção); Mercado Pago (CPF e tarifas); Asaas (PF, tarifas e subcontas); Banco Central (tarifa Pix comercial); Cloudflare R2 (preços e termos); Backblaze B2 (tarifa atualizada em maio/2026); UptimeRobot (uso comercial Free e preços).
- Próximo passo: fechar os detalhes de privacidade/saída e escrever o relatório final, sem ampliar fornecedores.
- Relatório de saída: `docs/FORNECEDORES.md`; root consolida oferta e continuidade.

## Critério de encerramento

Recomendação condicional por categoria com elegibilidade PF comprovada ou pendência específica, moeda e cotas/preços, risco de custo e ação futura necessária. Não ativar serviços para resolver lacunas documentais.

## Evidência já encontrada (não perder ao retomar)

- Mercado Pago confirma link com CPF: https://www.mercadopago.com.br/blog/cobrar-primeiro-cliente-sem-site-maquininha . Pix no link 0,99%; cartão D0 4,98%, D14 4,48%, D30 3,99%: https://www.mercadopago.com.br/ferramentas-para-vender/link-de-pagamento .
- Asaas confirma conta PF: https://www.asaas.com/conta-digital . Pix/boleto padrão R$1,99, promoção R$0,99 por três meses; conferir extras de notificações: https://www.asaas.com/precos-e-taxas . Conta-pai CPF **não pode criar subcontas**: https://docs.asaas.com/docs/criacao-de-subcontas .
- Pix manual PF comercial pode ser tarifado pelo banco, não prometer gratuidade universal: https://www.bcb.gov.br/meubc/faqs/p/quais-as-tarifas-relacionadas-ao-pix .
- Resend Free hoje 3.000/mês, 100/dia, 3 domínios; Pro US$20/50.000: https://resend.com/pricing . Termos admitem indivíduos maiores de 18; não é certificação de faturamento fiscal brasileiro: https://resend.com/legal/terms-of-service .
- Brevo transacional Free 300/dia; logs/previews por padrão indefinidos e configuráveis, exclusão em até 72h: https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews . Cadastro comercial PF brasileiro ainda requer confirmação mais específica.
- Backblaze B2 atual US$6,95/TB/mês, 10 GB gratuitos e egress 3x média, excedente US$0,01/GB; fontes antigas US$5/6 por TB estão desatualizadas: https://www.backblaze.com/cloud-storage/pricing e https://www.backblaze.com/blog/backblaze-pricing-and-product-updates/ .
- R2 Standard 10 GB/mês grátis, além US$0,015/GB-mês + operações, sem tarifa de egress: https://developers.cloudflare.com/r2/pricing/ .
- UptimeRobot Free **permite comercial atualmente**, 50 monitores/5 min: https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan . Site de preços ainda usa descrição hobby/non-profit; registrar divergência editorial sem assumir proibição: https://uptimerobot.com/pricing/ .

## Checkpoint 2 — retomada e confirmação em 16/10

- Preços Resend, Mercado Pago, Asaas, B2, R2 e elegibilidade comercial UptimeRobot relidos em fontes oficiais. Nenhum fornecedor novo acrescentado.
- Resend: retenção anunciada de 30 dias; termos aceitam indivíduos maiores de 18, sem comprovar por si só emissão fiscal brasileira em CPF. Excedentes transacionais são opção paga; não habilitar sem orçamento.
- Asaas: conta PF confirmada, mas conta-pai de subcontas exige CNPJ. Pix/boleto padrão R$1,99 após promoção; WhatsApp R$0,55/notificação e pacote e-mail/SMS R$0,99/transação são extras e precisam ficar fora da conta básica se não contratados.
- Brevo: 300 envios/dia, sem acúmulo; logs e previews indefinidos por padrão, com configuração de retenção e exclusão em até 72 h. Necessário reduzir retenção antes de usar dados reais.
- Backblaze B2: US$6,95/TB/mês e 10 GB grátis confirmados; operações A/B/C gratuitas no preço atual, D com tarifa específica. R2: US$0,015/GB-mês Standard após 10 GB, operações A/B e arredondamento por unidade de cobrança.
- Banco Central confirma que Pix comercial PF pode ser tarifado; não escrever “Pix sempre grátis”.
- Próxima ação exata: fechar tabela PF/uso comercial/saída com pendências específicas e salvar `docs/FORNECEDORES.md`, mantendo Pix manual como alternativa inicial e sem ativar contas.
