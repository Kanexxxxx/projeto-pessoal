# Continuidade no Codex e no Claude

## Estado atual

Atualizado em 15/10/2026 pela sessão do Claude Code (ver "Registro de execução" abaixo).

- Repositório: <https://github.com/Kanexxxxx/projeto-pessoal> (**público**).
- Domínio informado: nexakeep.site, Hostinger — ativo, renovação automática **desligada**.
- Tarefas concluídas: **T01**, **T14**. Em andamento: T03.
- Aplicação: ainda não implementada.
- Infraestrutura: **não há VPS ativa** na conta Hostinger consultada; a única VPS (de outro projeto) está suspensa após vencimento. Não há e-mail nem hospedagem web contratados. Detalhes no inventário privado (`privado/INVENTARIO-T01.md`, fora do Git).
- Produção, DNS, e-mail, pagamentos e banco: **não alterados**. Todas as consultas foram de leitura.
- Banco proposto: PostgreSQL próprio. A base anterior usa o Supabase só como PostgreSQL hospedado (sem Auth, Storage, Realtime, Edge Functions ou policies), então não há serviço do Supabase a substituir.
- WhatsApp: plataforma central com um canal próprio por loja; preferir número existente quando houver integração oficial elegível. Decisão da T14 em [WHATSAPP.md](WHATSAPP.md): API bloqueada para o número existente (Coexistence exige parceiro; Tech Provider exige CNPJ/MEI); modo inicial manual; piloto com número novo da loja só após os portões de WHATSAPP.md §5.
- Serviços que exigirem CNPJ no uso pretendido: fora do escopo atual.
- Trava de publicação ativa: `scripts/verificar-publicacao.mjs` roda no pre-commit (`.githooks/`). Ao clonar de novo, executar `git config core.hooksPath .githooks`.

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

## Registro de execução

### T01 — Inventário de infraestrutura e da base existente

- **Tarefa:** T01, concluída.
- **Data e commit:** 15/10/2026; commit `docs: concluir T01` (este registro).
- **O que foi concluído:** inventário privado com fato verificado separado de pendência, em `privado/INVENTARIO-T01.md` (fora do Git). Levantamento por leitura das contas Hostinger (VPS, domínios, DNS, assinaturas, catálogo), Supabase, Vercel e GitHub, mais DNS público e `curl` sem login. Trava de publicação criada para o repositório público.
- **Fatos principais (sanitizados):**
  - VPS: a única VPS da conta está **suspensa**; a assinatura mensal foi cancelada e venceu no início de outubro/2026. Ela atendia outro projeto. Uso medido nas três semanas anteriores: CPU média ~2%, RAM ~1,5 de 4 GiB, disco ~9 de 50 GiB. Há dois backups semanais da Hostinger ainda listados.
  - nexakeep.site: ativo, com trava de transferência e privacidade WHOIS; **renovação automática desligada** (renovação anunciada R$203,08/ano). O registro `@` aponta para um servidor que **não está na conta consultada** e não responde HTTP/HTTPS. Sem MX, SPF, DKIM ou DMARC.
  - Hospedagem web e e-mail: nenhum contratado.
  - Base anterior: repositório privado de um estúdio de beleza (Next.js 16, React 19, Supabase, WhatsApp Cloud API, DeepSeek/OpenAI), com produção ativa na Vercel e domínio `*.vercel.app`. O Supabase (plano free) é usado só como PostgreSQL: 5 tabelas, 11 MB, nenhum usuário de Auth, nenhum bucket, nada em Realtime, nenhuma Edge Function, RLS ligada sem policies.
  - WhatsApp: a base anterior tem app e WABA na Meta de uma profissional sem CNPJ; envio oficial funcionou; verificação da empresa ficou pendente por exigir documento.
  - Máquina local: Windows 11, Node 24.20, npm 11.19, Git 2.56, Python 3.14 (via `py`); **sem Docker e sem PostgreSQL**. A pasta do projeto é sincronizada pelo OneDrive.
- **Arquivos alterados:** `.gitignore`, `.gitattributes`, `.githooks/pre-commit`, `scripts/verificar-publicacao.mjs`, `scripts/verificar-publicacao.test.mjs`, `docs/CONTINUIDADE.md`, `docs/TAREFAS.md`, `docs/FONTES.md`, `README.md`.
- **Testes executados e resultados:** `node --test scripts/verificar-publicacao.test.mjs` → 4/4 passaram. Varredura dos arquivos versionáveis → nenhum problema. Commit com chave falsa num repositório descartável → bloqueado pelo hook (0 commits criados). `git check-ignore` confirma `privado/` fora do Git.
- **Decisões tomadas e motivo:** detalhes de conta, IPs, IDs e preços pagos ficam só no inventário privado, porque o repositório é público. Telefones de teste usam DDD não atribuído (ex.: 20) e e-mails de teste usam domínio `.test`, para a trava distinguir dado fictício de real.
- **Custos/consumo medidos:** custo recorrente atual da Nexakeep = domínio (R$203,08/ano na renovação). Nenhum gasto novo.
- **Pendências e riscos conhecidos (decisão do titular):**
  1. VPS cancelada foi intencional? Se houver dado a recuperar do outro projeto, conferir com urgência o prazo de retenção da Hostinger. Recontratar é compra.
  2. De quem é o servidor para onde nexakeep.site aponta?
  3. Ligar a renovação de nexakeep.site antes de divulgar endereços de lojas.
  4. Plano da Vercel: o Hobby é restrito a uso pessoal não comercial; a base anterior atende um negócio.
  5. Titularidade da WABA da base anterior e validade do número/token.
  6. Contas DeepSeek/OpenAI: titular, saldo e teto de gasto.
  7. Confirmar que nenhum acordo cedeu à cliente os direitos sobre o código (o README da base diz que só conteúdo, fotos e textos são dela).
- **Próxima ação exata:** T03 (auditoria da base anterior, em andamento) e T14 (WhatsApp sem CNPJ, pesquisa de custos e requisitos). T02 depende das respostas acima para fechar números.
- **Comandos para retomar:** `git config core.hooksPath .githooks` · `node --test scripts/verificar-publicacao.test.mjs` · `node scripts/verificar-publicacao.mjs --todos`.
- **Estado do ambiente:** nenhum serviço local rodando; nada implantado.
- **Ação externa realizada e autorização:** nenhuma. Só leituras.

### T14 — Decisão de canal WhatsApp sem CNPJ

- **Tarefa:** T14, concluída pelo ramo "não viável para o número existente → modo manual + API bloqueada". O piloto com número novo (caminho B) continua possível, condicionado.
- **Data e commit:** 15/10/2026; commit `docs: decidir canal WhatsApp sem CNPJ (T14)`.
- **O que foi concluído:** pesquisa nas páginas oficiais da Meta (preços, mudança de 01/10/2026, Coexistence, Tech Provider, limites, Termos da Plataforma) e em fontes secundárias identificadas como tais; decisão em [WHATSAPP.md](WHATSAPP.md).
- **Resultado:**
  - Coexistence (número que a loja já usa) só é feito por Solution Partner ou Tech Provider.
  - Tech Provider exige verificação da empresa; no Brasil os documentos aceitos são de PJ (CNPJ, MEI, contrato social) → fora do escopo.
  - Cloud API direta com número novo e app/WABA/cartão da própria loja funcionou sem CNPJ na base anterior; vira piloto só depois dos portões de WHATSAPP.md §5.
  - **Desde 01/10/2026 a Meta cobra mensagens de atendimento e templates de utilidade dentro da janela de 24 h** (≈ R$0,035 cada no Brasil; marketing ≈ R$0,32). A premissa "dentro da janela é grátis" da base anterior não vale mais.
  - Limite inicial de 250 destinatários únicos/24 h por portfólio é suficiente para uma loja pequena.
- **Arquivos alterados:** `docs/WHATSAPP.md` (novo), `docs/ARQUITETURA.md` (§11, resultado), `docs/FONTES.md`, `docs/CONTINUIDADE.md`, `docs/TAREFAS.md`.
- **Testes executados e resultados:** não se aplica (pesquisa). Cada valor tem fonte e data; os valores de fontes secundárias estão marcados.
- **Decisões tomadas e motivo:** modo manual como inicial porque é o único caminho oficial sem CNPJ, sem custo e sem mexer no número da loja. Não oficiais (Z-API, Evolution) proibidos pelo risco de banimento. WABA única da Nexakeep para todas as lojas descartada por contrariar a titularidade por loja.
- **Custos/consumo medidos:** nenhum gasto. Estimativa para 300 reservas/mês no caminho B: R$10,50 a R$31,50/mês em mensagens, pagos pela WABA da loja.
- **Pendências e riscos conhecidos:**
  1. Orientação jurídica: os Termos da Meta (PT) descrevem o "Provedor de Serviços" como pessoa jurídica e exigem acordo escrito — define se o caminho B é permitido para pessoa física.
  2. Franquia de 1.000 mensagens de atendimento por número/mês: relatada por fornecedor, não encontrada no texto oficial lido; confirmar na primeira fatura.
  3. Se a fatura em BRL aceita CPF: não confirmado.
  4. Parceiros para Coexistence com preço por mensagem (sem mensalidade por número) e que aceitem pessoa física: não pesquisados a fundo; 360dialog cobra a partir de €49/número/mês.
- **Próxima ação exata:** concluir T03 (auditoria em andamento); preparar T02 com os custos reais de T01 e T14.
- **Comandos para retomar:** nenhum específico.
- **Estado do ambiente:** inalterado.
- **Ação externa realizada e autorização:** nenhuma; só leitura de páginas públicas.

## Plugins e acesso

Na revisão de 15/10/2026, GitHub permitiu ler e salvar documentação. Não houve acesso às ferramentas de administração de VPS/DNS/faturas da Hostinger.

Na sessão do Claude Code de 15/10/2026 (T01), os conectores da Hostinger (VPS, domínios, DNS, cobrança, hospedagem), do Supabase e da Vercel estavam autenticados e foram usados **só em operações de leitura**. Esses conectores também expõem operações de compra, renovação, alteração de DNS e exclusão: elas exigem autorização específica do titular a cada uso. O plugin de criação de sites da Hostinger é outra capacidade; ele não prova acesso à assinatura da VPS e não foi usado para construir o produto.

A instalação/autenticação no computador local deve seguir as instruções atuais do plugin. Não pedir que o responsável cole tokens no chat nem inventar resultado de ferramenta ausente. A conta pode exigir autenticação pelo navegador.

As skills da sessão não demonstram quais skills estão instaladas globalmente no Windows do responsável. Enumerar as disponíveis no VS Code e usar somente as pertinentes.
