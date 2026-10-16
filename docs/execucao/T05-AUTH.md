> **Encerrado em 16/10/2026, 15h45 (Claude Code).** Pendências desta frente fechadas pelo Claude: testes de rotação de segredos e de regeneração das reservas em `test/integracao/rotacao-reservas.test.ts` (4/4, com mutações detectadas). T05 registrada como concluída em CONTINUIDADE.md. Mantido como histórico; não retomar a partir daqui.

# T05 — autenticação e MFA

Estado: em andamento (16/10/2026). Responsável: agente `corrigir_t05`.

Escopo autorizado: correções locais, testes em PostgreSQL descartável, sem envio real, sem publicação e sem commit.

## Evidência e plano

- Lidos AGENTS.md, skills better-auth-best-practices e diagnosing-bugs, guias locais Next de autenticação/cookies, documentação oficial Better Auth de 2FA e implementação instalada 1.7.10.
- Revisor anterior reproduziu sessões anteriores à ativação sobrevivendo, reuso TOTP, ausência de limite na conferência de senha para ativar MFA, falha após rotação do segredo e auditoria prematura de sessão.
- Próximo: regressões integradas no fluxo real, incluindo concorrência; executar antes das correções.
- Correções previstas: revogar sessões anteriores à ativação; impedir reuso de TOTP no banco antes de emitir sessão; limitar ações sensíveis; auditar login concluído e recusas MFA com ator; alinhar IP; preservar criptografia antiga via segredos versionados; aplicar contexto pessoal na redefinição de senha; recuperação administrativa auditada e renovação de códigos de reserva.
- Reservada migração `0004_mfa.sql`; nenhum arquivo de migração já aplicado será alterado.

## Retomada

Arquivos centrais: `src/servidor/auth/fluxos.ts`, `instancia.ts`, `src/servidor/config.ts`, `src/servidor/limites.ts`, `test/integracao/acesso.test.ts`.

Banco descartável: `npx vitest run test/integracao/acesso.test.ts`. O setup global cria e remove o cluster; não usar o banco de desenvolvimento para reproduções.

O E2E original reutiliza o TOTP da ativação em um login imediato; será necessário usar outro passo ou reserva após a correção. Execução E2E coordenada pelo agente raiz.

## Validação

`npx vitest run test/integracao/mfa-seguranca.test.ts`: 6/6 falharam antes das correções, reproduzindo revogação ausente, TOTP repetido (incluindo concorrência), senha de configuração sem limite, auditoria antecipada e redefinição aceitando nome pessoal. Cluster descartável foi encerrado.

Hipóteses confirmadas: a biblioteca só troca sessão corrente ao ativar; aceita TOTP na janela sem guardar consumo; limites HTTP não cobrem chamadas internas; hook de criação de sessão precede desafio. Solução acrescentará marca explícita de MFA verificado na sessão e consumo atômico do passo TOTP antes da emissão do cookie. Recuperação administrativa delegada pelo agente raiz a outra frente.

## Retomada do núcleo — 16/10/2026

- Responsável atual: `t05_auth_retomada`; trabalho herdado preservado.
- Implementados `0004_mfa.sql`, `auth/mfa.ts`, marca `session.mfaVerificado`, consumo de passo TOTP serializado no PostgreSQL com FK do fator, revogação de sessões anteriores e auditoria somente após conclusão do login.
- Limites de configuração por usuário/IP e MFA por conta/desafio/IP; identidade das recusas derivada do desafio assinado. Redefinição consulta nome/e-mail antes de consumir token.
- Config aceita `BETTER_AUTH_SECRETS` validado sem expor valores e compartilha cabeçalho IP com Better Auth. Regeneração de reservas exige sessão MFA e nova conferência de senha; formulário implementado.
- `npx tsc --noEmit`: passou. Em execução: `npx vitest run test/integracao/mfa-seguranca.test.ts` (cluster descartável).
- Próxima ação: conferir regressões; acrescentar rotação, regeneração e testes dos limites/guard; corrigir teste anterior que reutilizava TOTP da ativação. Nenhuma ação externa.
