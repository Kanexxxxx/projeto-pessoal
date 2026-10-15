# Continuidade no Codex e no Claude

## Estado atual

- Repositório: https://github.com/Kanexxxxx/projeto-pessoal
- Domínio informado: nexakeep.site, Hostinger.
- Entrega atual: documentação de planejamento.
- Aplicação: não implementada.
- Produção, DNS, e-mail, pagamentos e banco: não alterados nesta revisão.
- Próxima tarefa: T01, com inventário privado; depois T02/T03.
- Banco proposto: PostgreSQL na VPS, dependente da auditoria antes de migração.
- WhatsApp automático: decisão pendente de viabilidade oficial sem CNPJ.
- Serviços que exigirem CNPJ no uso pretendido: fora do escopo atual.

## Como iniciar no VS Code

Abra ou clone o repositório informado e use o Codex na pasta dele. O contexto deste chat não deve ser presumido como disponível no editor. Leia README.md e os documentos referenciados.

Prompt de partida:

> Leia README.md, docs/PLANO.md, docs/ARQUITETURA.md, docs/TAREFAS.md e docs/CONTINUIDADE.md. Estamos no planejamento da Nexakeep, domínio nexakeep.site, execução por uma pessoa. Comece pela T01 e pela auditoria da base existente necessária à T03. Identifique o que está realmente acessível, os custos e dependências, sem expor segredos ou dados de clientes. Use os plugins disponíveis para leitura. Serviços que exijam CNPJ não atendem ao escopo atual. Não compre, renove, migre, publique ou altere produção durante o inventário. Depois registre decisões e proponha o próximo trabalho concreto. Não reimplemente tudo sem avaliar o que já existe.

Essa limitação vale para a tarefa inicial de inventário. Etapas futuras seguem o escopo então autorizado pelo responsável.

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
