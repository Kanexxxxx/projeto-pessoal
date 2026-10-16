> **Encerrado em 16/10/2026, 15h45 (Claude Code).** Tabela BRL lida e fontes conferidas pelo Claude; resultado consolidado em docs/WHATSAPP.md (modelo A recomendado, decisões do titular no §6) e ARQUITETURA.md §9/§11. Mantido como histórico; não retomar a partir daqui.

# Pesquisa WhatsApp — checkpoint

Atualizado em 16/10/2026 (America/Sao_Paulo). Pesquisa em andamento; nenhum serviço contratado, canal alterado ou código escrito.

## Escopo autorizado

Comparar um número central da plataforma atendendo até 100 lojas com uma integração central usando números distintos das lojas. Não presumir 100 apps Meta. O nome de cada loja no cabeçalho do WhatsApp, os requisitos para PF sem CNPJ/MEI e os preços devem ser comprovados por fonte oficial.

## Estado para retomada

- Lidos docs/WHATSAPP.md e docs/ARQUITETURA.md. O requisito antigo de um WhatsApp próprio obrigatório por loja está superado pela solicitação atual; o usuário quer avaliar um número central.
- A documentação local afirma cobrança nova em 01/10/2026 dentro da janela de 24 h e R$0,035 por mensagem. Essa alegação ainda NÃO foi validada nesta pesquisa e não deve fundamentar orçamento.
- Próximo passo: consultar documentação oficial da Meta, comparar regras de identidade, acesso de terceiros e preços; documentar o que estiver bloqueado/inconclusivo sem transformar ausência de acesso em certeza.

## Pendências

1. Nome de exibição de um mesmo número pode variar por destinatário?
2. Um único app central pode conectar diversas WABAs/números?
3. Um número da plataforma pode representar sua própria central de agendamentos para lojas, com identidade transparente e autorização?
4. Elegibilidade produtiva da plataforma PF e de lojas PF, inclusive verificação e faturamento.
5. Preços atuais: dentro/fora de 24 h, templates, cliente iniciando contato e eventuais franquias.
6. Retenção/apagamento de mídia, CPF e dados do cliente sem confundir com cancelamento de agendamento.

## Checkpoint 2 — fontes oficiais recuperadas

- A leitura pública por navegador de pesquisa devolveu 429 em Developers, mas Invoke-WebRequest acessou o HTML oficial sem login. Isso resolveu o bloqueio.
- Atenção: a página comercial pública e o export `.md` de preços devolvem texto antigo de gratuidade. O HTML oficial de preços, atualizado em 30/09/2026, expressamente reflete 01/10/2026; a atualização específica datada 28/09/2026 confirma cobrança de serviço e utilidade dentro de 24 h. Priorizar essas páginas técnicas datadas.
- CONFIRMADO no HTML de preços: primeiras 1.000 mensagens de serviço ENTREGUES por número por mês grátis, sem acúmulo; depois cobra. Não são 1.000 conversas nem 1.000 por loja usando número compartilhado. Mensagens recebidas de clientes não são cobradas pela Meta.
- CONFIRMADO: nome e perfil pertencem ao número; mudanças do nome passam por análise. Não há nome oficial por destinatário na API documentada. O contato salvo pelo próprio usuário pode substituir a apresentação.
- CONFIRMADO: um app central de Tech Provider atende clientes integrados; verificação da empresa e App Review para acesso avançado são obrigatórios nesse caminho. Não é necessário um app por loja.
- CONFIRMADO: mídia tem DELETE /MEDIA_ID; upload retido até 30 dias se não apagado antes; ID recebido via webhook expira em sete dias; URL expira em cinco minutos. Apagar asset não prova apagar mensagens nos aparelhos.
- Próximo passo: validar CSV BRL, documentação de verificação PF/limites e consolidar alternativa de número central com identidade transparente/roteamento seguro.

## Checkpoint 3 — retomada e revalidação em 16/10

- Agente de consolidação leu continuidade, relatório e checkpoint, preservando as conclusões já encontradas. `git status --short` conferido; alterações de código pertencem às outras frentes.
- HTML público de preços e atualização de não-templates foi relido via `Invoke-WebRequest`: mudança de 01/10/2026 e franquia de 1.000 mensagens de serviço entregues/número/mês confirmadas novamente. A janela comum de 24 h não garante gratuidade; a franquia não se multiplica por 100 lojas.
- HTML de Tech Provider confirmou verificação empresarial antes da App Review e acesso avançado para operar em nome dos clientes. O caminho central de integração evita um app por loja, mas não comprova a elegibilidade PF.
- Tabela BRL foi localizada no link oficial “Taxas de lista em BRL”. O download tem extensão `.csv`, mas o conteúdo recebido é um pacote XLSX; leitura estruturada ainda pendente. Não interpretar bytes binários como CSV.
- Fontes públicas temporárias foram salvas fora do repositório, em `%TEMP%/nexakeep-pesquisa-publica/`; nenhum dado privado foi salvo.
- Próxima ação exata: ler a planilha BRL por seu formato real, concluir identidade/mídia e substituir o relatório antigo por comparação central versus múltiplos números, com portões explícitos para PF.
