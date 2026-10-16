# Continuidade no Codex e no Claude

## Estado atual

Atualizado em 16/10/2026, 15h40, pelo Claude Code, depois de conferir o trabalho que o Codex fez enquanto o limite do Claude recarregava. **Leia primeiro o checkpoint abaixo; os registros de 15/10 são históricos.**

### Checkpoint de retomada — 16/10/2026, 15h40

- **Ambiente autorizado:** tudo em localhost, com lojas e pessoas fictícias. Hospedagem será renovada depois pelo titular; `nexakeep.site` segue provisório, sem mexer na renovação. Nenhuma compra nem alteração de produção.
- **Correções de produto do titular (16/10):** (1) WhatsApp com **um número da plataforma para todas as lojas**, sem um app por loja; (2) exclusão = o cliente pedir para apagar uma foto/mensagem ou todos os seus dados (não é cancelar agendamento, que segue o fluxo da loja).
- **T05 — concluída nesta sessão** (registro abaixo). O Codex implementou as correções que a revisão apontou (marca `mfaVerificado` na sessão, consumo único do código TOTP no banco, sessões anteriores derrubadas ao ativar o 2FA, limites na configuração, auditoria só após o login, rotação de segredos `BETTER_AUTH_SECRETS`, recuperação administrativa de MFA, CI). Conferido por leitura e por execução; o Claude acrescentou os testes de rotação e de regeneração que faltavam. 78 testes, E2E e build passaram.
- **T14 — revista** em [WHATSAPP.md](WHATSAPP.md): modelo recomendado é o número central com identidade "plataforma · loja"; aguarda decisões do titular (§6 daquele documento).
- **Pesquisa de fornecedores** consolidada em [FORNECEDORES.md](FORNECEDORES.md).
- **Workflows do Claude de 16/10:** o crítico de completude da T05 entregou relatório (insumo das correções acima); os demais agentes pararam por limite e não deixaram resultado. Os checkpoints do Codex em [execucao/](execucao/) supriram as duas pesquisas.
- **Próxima ação exata:** T06 — lojas, papéis e isolamento (tabelas `lojas`, `membros_loja` e tabelas da loja com RLS forçada e chaves compostas com `tenant_id`; testes negativos de troca de id, funcionário revogado, exportação).
- **Regra de passagem:** atualizar este checkpoint após cada resultado relevante; cada agente atualiza seu próprio arquivo em `docs/execucao/`. Registrar teste realmente executado, resultado e próximo comando.

### Estado anterior (15/10; consultar checkpoint acima)

- Repositório: <https://github.com/Kanexxxxx/projeto-pessoal> (**público**).
- Domínio informado: nexakeep.site, Hostinger — ativo, renovação automática **desligada**.
- Tarefas concluídas: **T01**, **T03** ([BASE-ANTERIOR.md](BASE-ANTERIOR.md)), **T05** (fundação local). **T14** revista em 16/10 para número central ([WHATSAPP.md](WHATSAPP.md)), aguardando decisões do titular. Preparada, aguardando aceite: **T02** ([OFERTA.md](OFERTA.md)).
- Aplicação: fundação local (acesso do operador com MFA) pronta; lojas, agenda e CRM ainda pendentes.
- Infraestrutura: **não há VPS ativa** na conta Hostinger consultada; a única VPS (de outro projeto) está suspensa após vencimento. Não há e-mail nem hospedagem web contratados. Detalhes no inventário privado (`privado/INVENTARIO-T01.md`, fora do Git).
- Produção, DNS, e-mail, pagamentos e banco: **não alterados**. Todas as consultas foram de leitura.
- Banco proposto: PostgreSQL próprio. A base anterior usa o Supabase só como PostgreSQL hospedado (sem Auth, Storage, Realtime, Edge Functions ou policies), então não há serviço do Supabase a substituir.
- WhatsApp: decisão da T14 reaberta em 16/10 pelo pedido de número único. Consultar [WHATSAPP.md](WHATSAPP.md) e o checkpoint da pesquisa antes de usar as conclusões antigas, inclusive preços.
- Serviços que exigirem CNPJ no uso pretendido: fora do escopo atual.
- Trava de publicação ativa: `scripts/verificar-publicacao.mjs` roda no pre-commit (`.githooks/`). Ao clonar de novo, executar `git config core.hooksPath .githooks`.

## Como iniciar no VS Code

Abra ou clone o repositório informado e use o Codex na pasta dele. O contexto deste chat não deve ser presumido como disponível no editor. Leia README.md e os documentos referenciados.

Prompt de partida:

> Continue o projeto Nexakeep nesta pasta. Leia primeiro docs/CONTINUIDADE.md e os checkpoints em docs/execucao/, depois README.md, TAREFAS.md e ARQUITETURA.md. Confira o diff e preserve o trabalho existente. Retome a próxima ação registrada, sem reiniciar T01. Desenvolva e teste em localhost; mantenha nexakeep.site provisório. Estude o número único WhatsApp para várias lojas conforme a correção do titular em 16/10; não presuma nome personalizado por interlocutor, elegibilidade PF ou preços sem evidência. Não adote serviços que exijam CNPJ no uso pretendido. Siga isolamento, exclusão dos dados, backups e limites de custos. Compras e produção exigem autorização específica. Mantenha segredos e dados de clientes fora do Git. Atualize os checkpoints durante o trabalho, não apenas no encerramento, com testes reais e próxima ação exata.

A continuidade solicitada inclui implementação local por etapas. A execução segue as dependências de TAREFAS.md e os critérios de aceite; uma restrição pendente, como a elegibilidade do WhatsApp, não deve ser ignorada nem impedir tarefas independentes. Distinguir sempre resultados herdados dos testes executados na sessão atual.

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

### T02 — Oferta, orçamento e termos comerciais

- **Tarefa:** T02, **preparada — aguarda aceite do titular**. Os itens dependem de decisão comercial e de orientação fiscal/jurídica; não foram dados como fechados.
- **Data e commit:** 15/10/2026; commit `docs: preparar oferta e conta de margem (T02)`.
- **O que foi concluído:** [OFERTA.md](OFERTA.md) com limites provisórios do plano de R$50, custos reais (domínio, catálogo de VPS e e-mail), conta de margem por cenário, linha do tempo de cobrança e suspensão, módulos opcionais, regras de saída, perguntas para contador/jurídico e roteiro de cláusulas.
- **Resultado da conta:** contribuição de R$29 por cliente (com 15 min de suporte/mês); 2 a 5 clientes cobrem a infraestrutura, conforme ciclo da VPS e e-mail. Com 1 h de suporte/mês a contribuição fica negativa.
- **Arquivos alterados:** `docs/OFERTA.md` (novo), `docs/CONTINUIDADE.md`, `docs/TAREFAS.md`, `README.md`.
- **Testes executados e resultados:** conta reproduzida por script Node com os valores do catálogo (saída registrada na OFERTA.md §4).
- **Decisões tomadas e motivo:** os limites do plano são provisórios até medir o piloto, como pede o PLANO.md §3. A reserva de 10% não é alíquota e será substituída pela orientação do contador.
- **Custos/consumo medidos:** nenhum gasto.
- **Pendências e riscos conhecidos:** decisões da OFERTA.md §1; perguntas da §8.
- **Próxima ação exata:** concluir T03 e iniciar T05 (fundação local). T04 e T07 usam a OFERTA.md como base de trabalho e devem ser revistas se o titular mudar escopo.
- **Ação externa realizada e autorização:** nenhuma.

### T03 — Auditoria da base anterior e decisão de reaproveitamento

- **Tarefa:** T03, concluída.
- **Data e commit:** 15/10/2026; commit `docs: auditar base anterior e decidir reaproveitamento (T03)`.
- **O que foi concluído:** auditoria somente leitura do repositório privado da base anterior, feita por um agente dedicado e conferida nesta sessão. Decisão e regras herdadas em [BASE-ANTERIOR.md](BASE-ANTERIOR.md); relatório completo com arquivo:linha em `privado/AUDITORIA-BASE-ANTERIOR.md` (fora do Git, porque o sistema auditado está no ar).
- **Decisão:** não fazer fork; a Nexakeep nasce neste repositório, sem o histórico da base. Reaproveitar PIX, QR/PNG, telefone e o padrão de proposta com toque humano; adaptar motor de horários, webhook e notificações; reescrever dados, webhook, lembretes, limites e IA; descartar sessão caseira e todo conteúdo da cliente. Porte estimado em 210–327 h, além das funções novas.
- **Testes executados e resultados (na cópia da base):** `npm ci` ok; `npm test` 614 passaram, 12 pulados, 0 falharam; lint ok; `tsc` só passa após `next typegen`; `npm audit --omit=dev` com 3 vulnerabilidades. Achado de validação de data reproduzido de forma independente nesta sessão (prova de conceito com banco simulado: 2/2 testes confirmaram o desvio).
- **Teste de viabilidade técnica (fora do repositório):** PostgreSQL 18.4 embutido via npm, sem instalação de sistema, subiu em ~10 s no Windows. Papel de aplicação sem SUPERUSER/BYPASSRLS; RLS isolou loja A de B; sem escopo nada é visível; gravação cruzada recusada (42501); escopo não vaza após a transação; duas conexões disputando o mesmo horário → uma grava, outra recebe 23P01. O pacote **não traz `pg_dump`** (afeta o teste de backup da T10) e o npm 11 exige aprovação para scripts de instalação.
- **Arquivos alterados:** `docs/BASE-ANTERIOR.md` (novo), `docs/CONTINUIDADE.md`, `docs/TAREFAS.md`, `docs/FONTES.md`, `README.md`.
- **Decisões tomadas e motivo:** detalhes exploráveis do sistema em produção ficam no relatório privado (divulgação responsável). Next.js da nova base fixado em versão ≥ 16.4.1, que corrige avisos críticos publicados em 14/10/2026.
- **Custos/consumo medidos:** nenhum.
- **Pendências e riscos conhecidos (decisão do titular, sistema da base anterior):**
  1. Atualizar a produção da base anterior para Next ≥ 16.4.2: o aviso de negação de serviço via Server Actions (alto) se aplica a ela; os dois críticos de execução remota dependem de pré-condições que a auditoria não encontrou (`use cache`, SVG no otimizador).
  2. Corrigir a validação de data do agendamento público (detalhe no relatório privado, §4.5).
  3. Confirmar a rotação de um token que apareceu em captura de tela (relatório privado, S13).
- **Próxima ação exata:** T05 — fundação local (Next.js 16.4, PostgreSQL embutido fora do OneDrive, migrações SQL versionadas, papéis de banco, autenticação por biblioteca com MFA do operador, recuperação de senha e testes de sessão).
- **Ação externa realizada e autorização:** nenhuma. O clone do repositório privado foi feito com a credencial Git já existente na máquina, só para leitura.

### T05 — Fundação local, ambientes e identidade

- **Tarefa:** T05, concluída.
- **Data e commit:** 15–16/10/2026; commit `feat: fundação local com acesso do operador e MFA (T05)`. Trabalho em três rodadas: Claude (fundação), Codex (correções da revisão, enquanto o limite do Claude recarregava) e Claude (conferência, testes que faltavam e consolidação).
- **O que foi concluído:**
  - Next.js 16.4.2, React 19.3, Tailwind 4, TypeScript estrito. Painel em `app.<domínio>`; a plataforma responde no domínio-base.
  - PostgreSQL 18.4 local sem instalar nada no sistema (binários via npm), dados em `%LOCALAPPDATA%\Nexakeep`, fora do OneDrive e do repositório. Migrações SQL versionadas com hash e trava; migração alterada ou desconhecida é recusada. Papéis separados: dono sem login, migrador, aplicação só com DML e sem `BYPASSRLS`.
  - Acesso do operador com Better Auth chamado só pelo servidor (nenhuma rota HTTP da biblioteca montada): conta só por convite (72 h, uso único), login, 2FA por aplicativo autenticador com códigos de reserva, redefinição de senha com token no fragmento da URL, limites de tentativa gravados no banco e auditoria.
  - Correções do Codex sobre a revisão: sessão só vale com a marca `mfaVerificado`; cada código TOTP é consumido uma vez no banco (inclusive em logins simultâneos); ativar o 2FA derruba as sessões anteriores; limites na configuração do 2FA; auditoria de sessão só depois do segundo fator; política de senha aplicada também na redefinição; rotação de segredos (`BETTER_AUTH_SECRETS`); regeneração dos códigos de reserva com senha e código novo; recuperação administrativa local de MFA ([RECUPERACAO-ACESSO.md](RECUPERACAO-ACESSO.md)); CI no GitHub Actions (Windows).
  - Nesta conferência: testes de rotação de segredos e de regeneração das reservas (`test/integracao/rotacao-reservas.test.ts`), que o Codex tinha deixado pendentes.
- **Arquivos alterados:** `package.json`, `package-lock.json`, configs (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `postcss.config.mjs`), `.env.example`, `db/migracoes/0001–0004`, `src/` (app, proxy, servidor), `scripts/` (banco local, migração, convite, recuperação de MFA, preparação), `test/`, `.github/workflows/verificar.yml`, `README.md`, `docs/RECUPERACAO-ACESSO.md`, `docs/execucao/`, `AGENTS.md`.
- **Testes executados e resultados (16/10/2026):** `npm run verificar` → lint sem problemas, `tsc` sem erros, Vitest **78/78** em 13 arquivos (banco descartável por arquivo), varredura de publicação sem achados; `npm run test:e2e` → 1/1 (convite → senha → 2FA → sair → login com código, no Edge do sistema); `npm run build` ok; `npm audit --omit=dev` → 0 vulnerabilidades. Testes de mutação: remover `FOR UPDATE` do convite, ligar o cadastro público, desligar a rotação de segredos e tirar a conferência do TOTP na regeneração — todos fazem testes falharem.
- **Decisões tomadas e motivo:** rotas HTTP da biblioteca fora do ar (menos superfície; limites próprios no banco); token no fragmento para não cair em log; cache de sessão em cookie desligado para a revogação valer na hora; host lido de `X-Forwarded-Host` antes de `Host` porque o próprio Next usa esse cabeçalho no redirecionamento interno das Server Actions.
- **Custos/consumo medidos:** nenhum.
- **Pendências e riscos conhecidos:**
  1. Em produção (T10), o proxy precisa **sobrescrever** `X-Forwarded-Host` e `X-Real-IP`; sem isso, o host e o IP podem ser forjados.
  2. O CI só roda depois de um push; ainda não foi executado no GitHub.
  3. `npm audit` completo aponta 5 itens altos na cadeia de desenvolvimento do ESLint (`braces/micromatch/fast-glob`); não entram no build de produção. Reavaliar quando houver versão compatível.
  4. E-mail real só na T11 (hoje os e-mails vão para arquivo em `%LOCALAPPDATA%\Nexakeep\emails`).
  5. A recuperação de MFA não consegue apagar contadores de tentativa sem usuário (são hash); eles expiram sozinhos.
- **Próxima ação exata:** T06 — tabelas `lojas` e `membros_loja`, papéis dona/funcionário/consumidor, RLS forçada com `app.tenant_id` por transação, chaves compostas com `tenant_id` e testes negativos (troca de id, funcionário revogado, exportação).
- **Comandos para retomar:** `npm ci --ignore-scripts`, `npm run preparar`, `npm run bd:subir`, `npm run verificar`, `npm run test:e2e`.
- **Estado do ambiente:** só local. Banco de desenvolvimento em `%LOCALAPPDATA%\Nexakeep\pg-dev`; `.env.local` gerado pelo `npm run preparar`, fora do Git.
- **Ação externa realizada e autorização:** nenhuma.

### T14 (revisão) — Um número WhatsApp da plataforma para todas as lojas

- **Tarefa:** T14 reaberta e revista a pedido do titular em 16/10/2026; aguarda decisões dele.
- **O que foi concluído:** pesquisa nas páginas oficiais da Meta (feita pelo Codex e conferida pelo Claude) e reescrita de [WHATSAPP.md](WHATSAPP.md). Recomendação: **número central da plataforma** (modelo A), viável sem CNPJ. O nome no topo da conversa é do número (um só) e a política proíbe se passar por outra empresa; a identidade da loja vai no conteúdo ("Nexakeep · Barbearia do Zé", logotipo nos templates, assistente com nome por loja), como faz a DigAÍ. Um número por loja exige Tech Provider com verificação da empresa (CNPJ/MEI): fica como evolução.
- **Também registrado:** roteamento sem IA (código da loja no link → histórico verificado → lista de botões → resposta fixa); vínculo da dona/equipe por código de uso único; custos (desde 01/10/2026 a Meta cobra também dentro da janela de 24 h: R$0,035 por mensagem de atendimento/utilidade; 1.000 de atendimento grátis por número por mês, divididas entre as lojas); exclusão a pedido do cliente em ARQUITETURA.md §9; conclusão de §11.
- **Pesquisa de fornecedores** (e-mail, cobrança, backup, monitor) consolidada em [FORNECEDORES.md](FORNECEDORES.md), base para T10 e T11.
- **Pendências (decisões do titular, WHATSAPP.md §6):** aprovar o modelo A; nome do número; reaproveitar o chip de teste da base anterior ou chip novo; autorizar a criação do portfólio/app quando os testes locais estiverem prontos.
- **Próxima ação exata:** seguir com T06; o módulo de WhatsApp (T15) será feito em localhost com provedor simulado.
- **Ação externa realizada e autorização:** nenhuma (só leitura de páginas públicas).

## Plugins e acesso

Na revisão de 15/10/2026, GitHub permitiu ler e salvar documentação. Não houve acesso às ferramentas de administração de VPS/DNS/faturas da Hostinger.

Na sessão do Claude Code de 15/10/2026 (T01), os conectores da Hostinger (VPS, domínios, DNS, cobrança, hospedagem), do Supabase e da Vercel estavam autenticados e foram usados **só em operações de leitura**. Esses conectores também expõem operações de compra, renovação, alteração de DNS e exclusão: elas exigem autorização específica do titular a cada uso. O plugin de criação de sites da Hostinger é outra capacidade; ele não prova acesso à assinatura da VPS e não foi usado para construir o produto.

A instalação/autenticação no computador local deve seguir as instruções atuais do plugin. Não pedir que o responsável cole tokens no chat nem inventar resultado de ferramenta ausente. A conta pode exigir autenticação pelo navegador.

As skills da sessão não demonstram quais skills estão instaladas globalmente no Windows do responsável. Enumerar as disponíveis no VS Code e usar somente as pertinentes.
