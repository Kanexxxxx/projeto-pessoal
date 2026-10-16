> **Encerrado em 16/10/2026, 15h45 (Claude Code).** Testes de recuperação em `test/integracao/recuperacao-mfa.test.ts` passam na suíte completa (78/78). Procedimento em docs/RECUPERACAO-ACESSO.md. Mantido como histórico; não retomar a partir daqui.

# T05 — recuperação administrativa de MFA

- Tarefa: recuperação administrativa auditada, separada da redefinição de senha.
- Data e commit: 16/10/2026; base `e385cf4`, sem commit nesta frente.
- Responsável: subagente `recuperacao_mfa`; arquivos reservados: `src/servidor/auth/recuperacao.ts`, `scripts/recuperar-mfa-operador.ts`, `test/integracao/recuperacao-mfa.test.ts` e este checkpoint, mais `docs/RECUPERACAO-ACESSO.md`.
- Concluído: lidos AGENTS.md, continuidade, checkpoint de autenticação, skill Better Auth, guias locais Next de autenticação/segurança e documentação oficial do plugin. Conferido estado inicial; preservadas alterações já existentes. Criados função transacional e comando interativo com restrição de loopback, recusa de produção e confirmação literal.
- Testes executados: nenhum nesta frente ainda.
- Decisões: execução administrativa local com confirmação explícita e referência curta de chamado; revogação transacional de sessões, desafios, MFA e consumos. Sem endpoint comum, envio real ou produção.
- Evidência local: Better Auth 1.7.10 grava desafios 2FA, dispositivos confiáveis e redefinições com `verification.value = user.id`; identificadores são SHA-256/base64url. A remoção por usuário invalida os registros autorizadores sem precisar do segredo da biblioteca. Contadores de tentativa sem usuário não podem ser correlacionados pelo hash; tornam-se inertes e expiram junto do desafio. Esta limitação foi comunicada ao responsável.
- Coordenação: migração 0004 do agente de autenticação terá `mfa_passos_consumidos` com FK para `twoFactor` e `ON DELETE CASCADE`; apagar o fator apaga os consumos. Aplicação deve estar parada para drenar logins em voo antes do procedimento administrativo.
- Pendências: escrever documentação e regressões para revogação, desafio antigo após reativação, operador inexistente/inativo, auditoria mínima e rollback se auditoria falhar; executar testes descartáveis.
- Próxima ação exata: criar `test/integracao/recuperacao-mfa.test.ts` e executar após disponibilização da migração 0004.
- Estado do ambiente: somente leitura; nenhuma alteração externa ou gasto.
