# Nexakeep

Plataforma de sites, agendamentos e CRM para pequenos negócios. Rodam localmente: o acesso do operador com 2FA (T05), as lojas isoladas com painel e agenda (T06) e o site de cada loja com agendamento pelo celular, em três modelos visuais (T08). O CRM (T07) e o WhatsApp automático ainda serão construídos.

**Retomada por Codex/Claude:** leia [docs/CONTINUIDADE.md](docs/CONTINUIDADE.md) e os checkpoints em [docs/execucao/](docs/execucao/). Atualize o progresso durante a execução. Não reinicie o inventário da T01 nem considere pronta uma etapa sem validar seus critérios.

## Rodar localmente

Ambiente usado: Windows, Node.js 24 e npm. O PostgreSQL é fornecido pelo projeto, sem Docker ou instalação de serviço no sistema. O banco fica em `%LOCALAPPDATA%\Nexakeep`, fora do repositório. O domínio `nexakeep.site` continua provisório; estes comandos usam apenas localhost.

```powershell
npm ci --ignore-scripts
git config core.hooksPath .githooks
npm run preparar
npm run bd:subir
npm run dev
```

`preparar` gera segredos aleatórios em `.env.local` e preserva um arquivo já existente. Não copie esses valores para o chat, Git ou produção.

Os comandos de instalação (`npm ci`) só são necessários na primeira vez ou quando `package-lock.json` mudar. **Desligue o banco antes** (`npm run bd:parar`): os programas do PostgreSQL ficam dentro de `node_modules`, e o Windows não deixa apagá-los enquanto estão em uso (erro `EPERM ... icuin77.dll`). No dia a dia bastam `npm run bd:subir` e `npm run dev`. Os avisos `ERESOLVE overriding peer dependency` do ESLint na instalação são esperados: plugins do `eslint-config-next` ainda declaram suporte só até o ESLint 9, e o lint do projeto passa com o 10.

- Plataforma: <http://localhost:3000>
- Painel (operador, dona e equipe): <http://app.localhost:3000>
- Site de cada loja: `http://<endereço-da-loja>.localhost:3000` (Edge e Chrome entendem `*.localhost` sem configurar nada)

Depois de atualizar o código, reinicie o `npm run dev` (`Ctrl+C` e de novo): no OneDrive, o servidor de desenvolvimento às vezes não percebe a mudança num arquivo já carregado e continua com a versão antiga na memória.

Em outro terminal, crie um convite com e-mail fictício:

```powershell
npm run operador:convidar -- operador@nexakeep.test
```

O e-mail é gravado em `%LOCALAPPDATA%\Nexakeep\emails` (ou `NEXAKEEP_DADOS_LOCAIS/emails`). Abra o arquivo mais recente de convite e use o link do campo `texto` no navegador. Não há envio real. O token é secreto, vale uma vez e não aparece no terminal.

No convite, crie a senha; depois configure um aplicativo autenticador. Guarde os códigos de reserva apresentados. O painel só libera acesso após verificar o segundo fator. O link “Esqueci minha senha” também produz um e-mail local. Redefinir a senha não remove o segundo fator.

### Lojas, site e agenda

Com o operador criado, gere duas lojas fictícias de demonstração (rodar de novo não duplica):

```powershell
npm run demo:criar
```

- <http://navalha-de-ouro.localhost:3000> — barbearia, modelo **Letreiro**
- <http://salao-jasmim.localhost:3000> — salão, modelo **Revista**
- <http://studio-bella.localhost:3000> — estúdio de unhas, modelo **Paleta**

Qualquer loja pode ser vista em outro modelo com `?modelo=letreiro`, `?modelo=revista` ou `?modelo=paleta` (é a prévia que a dona abre na aba Site). A direção visual, os tokens e as regras de cada modelo estão em [DESIGN.md](DESIGN.md).

No painel, o operador vê todas as lojas e cria novas em "+ Nova loja". Em cada loja: **Agenda** (dia a dia, criar, remarcar, cancelar, atendido/faltou), **Serviços**, **Profissionais e horários**, **Folgas e bloqueios**, **Site** (modelo, cor, textos, WhatsApp e regras da agenda online) e **Acessos** (convidar a dona e a equipe). Para entrar como dona, convide um e-mail fictício em Acessos e abra o convite numa janela anônima. A dona não precisa de 2FA, mas pode ativar em Segurança; a equipe só vê a agenda.

O cliente agenda pelo site da loja, sem conta. O WhatsApp ainda é manual: botões `wa.me` com a mensagem pronta (o cliente avisa a loja; a loja fala com o cliente). Cancelar ou remarcar é com a loja.

Para desligar: `Ctrl+C` no terminal do Next e `npm run bd:parar` em outro terminal. `npm run bd:estado` mostra o estado local. `npm run bd:migrar` aplica SQL pendente usando `DATABASE_URL_MIGRACAO`; `bd:subir` também aplica migrações locais automaticamente. Não use `bd:recriar` para retomar: esse comando apaga os dados locais e exige `--confirmar`.

## Validar

```powershell
npm run verificar
npm run bd:subir
npm run test:e2e
npm run build
```

`verificar` executa lint, tipos, testes unitários/integração e varredura dos arquivos de trabalho (incluindo novos). Os testes de integração criam PostgreSQL descartável com credenciais aleatórias; aplicam as migrações do zero e verificam permissões e o isolamento entre lojas. `test:e2e` usa o Edge do sistema contra um `next dev` próprio (porta 3100) e um banco recriado a cada execução: ciclo do operador com 2FA e ciclo da loja (dona, agenda, cliente agendando pelo site, isolamento).

Para conferir os sites das lojas (com o `npm run dev` no ar):

```powershell
node scripts/inspecionar-sites.mjs --base http://localhost:3000 --lojas navalha-de-ouro,salao-jasmim,studio-bella --saida test-results/inspecao --lint
```

Abre cada loja no Edge em 1440, 834 e 390 px, salva capturas e mede rolagem lateral, títulos com mais de duas linhas, contraste de cada texto, alvos de toque, foco no teclado (com e sem foco), "reduzir movimento", erros de console, texto cortado por `overflow` (inclusive acento), texto coberto por outra camada, Didone abaixo de 28 px, faixa de horário quebrada em duas linhas, opção da cartela que "pula" ao ser tocada e o caminho "horário primeiro" (todo serviço e toda pessoa oferecidos com um horário chegam a "Seus dados"); com `--lint`, procura padrões proibidos no código dos modelos (DESIGN.md §0). `--modelo letreiro|revista|paleta` abre a página inicial nesse modelo (use com a loja `teste-limites` do banco local, que tem nome de 54 caracteres e 12 serviços).

O E2E usa Microsoft Edge instalado, porta 3100, pasta `.next-e2e` e recria apenas o banco `nexakeep_e2e` no cluster local. Exercita convite, MFA, sessão e redefinição de senha. Não armazene dados manuais nesse banco. Os resultados e traces ficam fora do Git; podem conter dados fictícios e tokens de teste.

Há workflow de CI em `.github/workflows/verificar.yml` para a mesma validação em Windows. A existência do arquivo não significa execução aprovada no GitHub; consultar o checkpoint para resultados efetivamente obtidos.

## Produto e decisões

- [Plano e custos](docs/PLANO.md)
- [Arquitetura e isolamento](docs/ARQUITETURA.md)
- [Tarefas e critérios de aceite](docs/TAREFAS.md)
- [CRM](docs/CRM.md)
- [Oferta comercial proposta](docs/OFERTA.md)
- [WhatsApp — decisão reaberta para número único](docs/WHATSAPP.md)
- [Auditoria da base anterior](docs/BASE-ANTERIOR.md)
- [Fontes](docs/FONTES.md)

O repositório é público. Credenciais, inventários privados e dados de clientes devem permanecer fora do Git. Produção, compras e integrações pagas não são ativadas pelos comandos acima.
