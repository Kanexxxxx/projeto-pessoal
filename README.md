# Nexakeep

Plataforma de sites, agendamentos e CRM para pequenos negócios. A fundação local de acesso do operador está implementada e em revisão (T05); lojas, agenda e CRM ainda serão construídos.

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

- Plataforma: <http://localhost:3000>
- Painel do operador: <http://app.localhost:3000>
- As páginas de loja ainda retornam 404; serão implementadas na T06/T08.

Em outro terminal, crie um convite com e-mail fictício:

```powershell
npm run operador:convidar -- operador@nexakeep.test
```

O e-mail é gravado em `%LOCALAPPDATA%\Nexakeep\emails` (ou `NEXAKEEP_DADOS_LOCAIS/emails`). Abra o arquivo mais recente de convite e use o link do campo `texto` no navegador. Não há envio real. O token é secreto, vale uma vez e não aparece no terminal.

No convite, crie a senha; depois configure um aplicativo autenticador. Guarde os códigos de reserva apresentados. O painel só libera acesso após verificar o segundo fator. O link “Esqueci minha senha” também produz um e-mail local. Redefinir a senha não remove o segundo fator.

Para desligar: `Ctrl+C` no terminal do Next e `npm run bd:parar` em outro terminal. `npm run bd:estado` mostra o estado local. `npm run bd:migrar` aplica SQL pendente usando `DATABASE_URL_MIGRACAO`; `bd:subir` também aplica migrações locais automaticamente. Não use `bd:recriar` para retomar: esse comando apaga os dados locais e exige `--confirmar`.

## Validar

```powershell
npm run verificar
npm run bd:subir
npm run test:e2e
npm run build
```

`verificar` executa lint, tipos, testes unitários/integração e varredura dos arquivos de trabalho (incluindo novos). Os testes de integração criam PostgreSQL descartável com credenciais aleatórias; aplicam as migrações do zero e verificam permissões.

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
