# Continuidade no Codex e no Claude

## Estado atual

- Repositório: https://github.com/Kanexxxxx/projeto-pessoal
- Domínio informado: nexakeep.site, Hostinger.
- Entrega atual: documentação de planejamento.
- Aplicação: não implementada.
- Produção, DNS, e-mail, pagamentos e banco: não alterados nesta revisão.
- Próxima tarefa: T01, com inventário privado; depois T02/T03.
- Banco proposto: PostgreSQL na VPS, dependente da auditoria antes de migração.
- WhatsApp: plataforma central com um canal próprio por loja; preferir número existente quando houver integração oficial elegível. Viabilidade sem CNPJ e custos por canal ainda precisam de confirmação.
- Serviços que exigirem CNPJ no uso pretendido: fora do escopo atual.

## Como iniciar no VS Code

Abra ou clone o repositório informado e use o Codex na pasta dele. O contexto deste chat não deve ser presumido como disponível no editor. Leia README.md e os documentos referenciados.

Prompt de partida:

> Continue o projeto https://github.com/Kanexxxxx/projeto-pessoal no VS Code. Leia README.md e os documentos de plano, arquitetura, tarefas e continuidade em docs/. O domínio provisório é nexakeep.site. Comece pela T01, avance conforme as dependências e implemente uma etapa por vez, reaproveitando a base existente após auditoria. Use os plugins e skills pertinentes disponíveis. A arquitetura deve conectar um WhatsApp próprio de cada loja à plataforma central, preferindo números existentes por integração oficial elegível. Não adote serviços que exijam CNPJ no uso pretendido nem presuma essa elegibilidade. Siga as regras documentadas de isolamento entre lojas, exclusão de dados, backups e limites de custos. Desenvolva e teste localmente; compras e alterações em produção precisam de autorização específica. Mantenha segredos e dados de clientes fora do Git. Ao concluir cada etapa, registre o que mudou, os testes e a próxima ação em docs/CONTINUIDADE.md.

A continuidade solicitada inclui implementação local por etapas, após o inventário e as decisões necessárias. A execução segue as dependências de TAREFAS.md e os critérios de aceite; uma restrição pendente, como a elegibilidade do WhatsApp, não deve ser ignorada nem impedir tarefas independentes. Esta documentação não afirma que código ou testes da aplicação já foram executados.

## Poupar o limite de desenvolvimento

O limite do plano usado para programar é diferente do consumo da API de produção. Alternar Codex e Claude não transfere a franquia de um para outro e não deve servir para contornar regras das contas.

- Trabalhar em uma tarefa pequena por sessão.
- Pedir primeiro um mapa dos arquivos relevantes; não mandar o repositório inteiro a cada pergunta.
- Fazer comandos determinísticos, lint, testes e busca local sem invocar IA para cada operação.
- Evitar rodar dois agentes alterando os mesmos arquivos.
- Usar revisões focadas no diff e no risco real.
- Antes de encerrar a sessão, salvar o progresso e criar commit quando apropriado.
- Não iniciar refatoração grande quando a franquia estiver perto do fim.
- Quando um limite impedir continuar, deixar uma passagem completa para a outra ferramenta ou para trabalho manual.

Os horários de reset e a franquia semanal devem vir do painel da conta. Não presumir “todo dia recarrega tudo” nem um relógio fixo de três ou cinco horas para todos os planos. Ver referências atualizadas em FONTES.md.

A aplicação de clientes não deve depender de uma sessão pessoal do Codex/Claude. Suas automações funcionam na infraestrutura e em APIs próprias; a interrupção da franquia de programação não deve interromper agendamentos.

## Registro a atualizar ao terminar cada tarefa

Copiar este modelo para um arquivo de status quando a execução começar:

- Tarefa:
- Data e commit:
- O que foi concluído:
- Arquivos alterados:
- Testes executados e resultados:
- Decisões tomadas e motivo:
- Custos/consumo medidos:
- Pendências e riscos conhecidos:
- Próxima ação exata:
- Comandos para retomar:
- Estado do ambiente:
- Ação externa realizada e autorização correspondente, se aplicável:

Não incluir senha, API key, token, dump, CPF, telefone de cliente ou log com conteúdo pessoal.

## Plugins e acesso

Na revisão de 15/10/2026, GitHub permitiu ler e salvar documentação. Não houve acesso às ferramentas de administração de VPS/DNS/faturas da Hostinger. O plugin de criação de sites da Hostinger é outra capacidade; ele não prova acesso à assinatura da VPS e não foi usado para construir o produto.

A instalação/autenticação no computador local deve seguir as instruções atuais do plugin. Não pedir que o responsável cole tokens no chat nem inventar resultado de ferramenta ausente. A conta pode exigir autenticação pelo navegador.

As skills da sessão não demonstram quais skills estão instaladas globalmente no Windows do responsável. Enumerar as disponíveis no VS Code e usar somente as pertinentes.
