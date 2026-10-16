# Recuperação de acesso do operador

A redefinição de senha e a recuperação de MFA são procedimentos separados. Esquecer a senha não desativa o autenticador. Se ainda houver um código de reserva, o operador pode entrar com ele e renovar seus códigos na área de segurança. Cada código de reserva só pode ser usado uma vez.

## Perda do autenticador e dos códigos de reserva

Na T05, o procedimento administrativo está disponível **somente em desenvolvimento/testes locais**. Não há endpoint HTTP nem Server Action para remover MFA. O comando recusa `NODE_ENV=production`, banco remoto e parâmetros adicionais na URL do banco. Qualquer adoção em produção depende de um procedimento próprio autorizado, com controles de administração do host e de identidade revisados.

1. Confirme a identidade por canal independente previamente conhecido. A posse de uma sessão, uma mensagem recebida ou um pedido de redefinição de senha, sozinhos, não autorizam a recuperação. No chamado de acesso restrito, registre quem conferiu, quem autorizou e quando; não copie documentos, contatos ou evidências pessoais para o Git ou para logs.
2. Use uma referência opaca e curta, como `REC-123`: de duas a oito letras maiúsculas, hífen e de um a doze dígitos. Não use CPF, telefone, nome, e-mail ou descrição nessa referência.
3. Pare o processo da aplicação (`next dev`, `next start` ou equivalente) e aguarde as requisições em andamento terminarem. Mantenha o PostgreSQL local ativo. Isso impede que uma autenticação já em execução termine depois da revogação administrativa.
4. Em um terminal privado, sem gravação/transcrição, execute `npm run operador:recuperar-mfa`. O comando carrega a configuração local sem mostrá-la. O e-mail é solicitado interativamente, para não ficar no histórico do comando; a tela pode exibir o que for digitado.
5. Confirme `APLICACAO-PARADA`, informe o e-mail do operador ativo e a referência do chamado. Digite `RECUPERAR-MFA` para confirmar a revogação. Até essa última confirmação, o comando não abre conexão com o banco. Uma conta ausente, sem vínculo de operador ou com vínculo revogado é recusada.
6. Confira a mensagem de conclusão e o evento `segundo_fator.recuperado` na auditoria. Reinicie a aplicação. O operador deverá entrar com sua senha existente, cadastrar um novo autenticador e guardar os novos códigos de reserva antes de usar o painel. A senha não é escolhida nem revelada pelo administrador. Se também foi esquecida, use depois o fluxo normal de redefinição por e-mail.

## Efeito e auditoria

A função executa uma única transação: bloqueia o vínculo do operador, remove os desafios e verificações autorizadoras vinculadas à conta, revoga todas as sessões, apaga o registro do fator (segredo e códigos de reserva), apaga por cascata os consumos TOTP e marca o MFA como desativado. A transação só confirma se a auditoria for gravada. Não modifica a senha nem o vínculo de operador.

O evento registra apenas o ID interno do alvo, a referência do chamado, a origem `terminal_local` e contagens. O ator de aplicação fica nulo, pois a execução foi administrativa; quem executou e autorizou deve constar no chamado restrito. Não são gravados e-mail, senha, URI TOTP, código de reserva, token, motivo livre ou conteúdo de documento. Recusas por operador indisponível também são auditadas sem o endereço consultado.

O Better Auth 1.7.10 instalado guarda o identificador de `verification` como SHA-256/base64url. Desafios de MFA, confiança de dispositivo e links de redefinição armazenam o ID do usuário em `value`; a recuperação remove todos esses registros da conta, incluindo links de redefinição já emitidos. Os contadores `2fa-attempts` guardam somente um número e um identificador hash, sem vínculo recuperável com o usuário. Permanecem inertes até a expiração curta original: sem o desafio autorizador removido, não conseguem criar sessão. Não apagar verificações de outras contas para limpar esses contadores.

Não habilitar armazenamento secundário de autenticação ou cache de sessão em cookie sem adaptar e testar esta revogação. Hoje os registros autorizadores ficam no PostgreSQL e o cache de cookie está desativado. Atualizações da biblioteca exigem rever o esquema e os testes antes de manter este procedimento.

## Verificação local

Execute `npx vitest run test/integracao/recuperacao-mfa.test.ts`. A suíte cria PostgreSQL e banco descartáveis, testa revogação completa, preservação de outra conta, desafios antigos após reativação, referências inválidas, operador indisponível, auditoria sem segredos e rollback quando a auditoria falha. Nunca use o banco de desenvolvimento para reproduzir esses casos.

Base técnica: [documentação oficial de MFA do Better Auth](https://better-auth.com/docs/plugins/2fa), conferida com `node_modules/better-auth/dist/plugins/two-factor/`, `dist/db/verification-token-storage.mjs` e migrações locais `0002`/`0004` em 16/10/2026.
