/** Comando administrativo local. Procedimento: docs/RECUPERACAO-ACESSO.md. */
import { createInterface } from "node:readline/promises";
import {
  ambienteDeRecuperacaoLocal,
  chamadoDeRecuperacaoValido,
  CONFIRMACAO_RECUPERACAO_MFA,
  recuperarMfaOperador,
} from "../src/servidor/auth/recuperacao";
import { criarBd, criarPool } from "../src/servidor/bd/conexao";
import { lerConfig } from "../src/servidor/config";

async function executar(): Promise<void> {
  if (process.argv.includes("--help")) {
    console.log("Uso: npm run operador:recuperar-mfa (terminal interativo). Leia docs/RECUPERACAO-ACESSO.md.");
    return;
  }
  if (process.argv.length !== 2 || !process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("A recuperação exige terminal interativo, sem argumentos. Consulte docs/RECUPERACAO-ACESSO.md.");
    process.exitCode = 1;
    return;
  }
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Variáveis já definidas no processo continuam válidas.
  }
  const config = lerConfig(process.env);
  if (!ambienteDeRecuperacaoLocal(config)) {
    console.error("Recuperação recusada: este comando exige desenvolvimento/teste e PostgreSQL em loopback, sem parâmetros na URL.");
    process.exitCode = 1;
    return;
  }

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let email: string;
  let chamado: string;
  let confirmacao: string;
  try {
    console.log("Este procedimento revoga sessões, desafios e MFA do operador. A senha permanece a mesma.");
    console.log("Confirme a identidade por canal independente e registre o responsável no chamado restrito, sem copiar dados para o repositório.");
    const parada = await terminal.question("Aplicação parada e requisições encerradas? Digite APLICACAO-PARADA: ");
    if (parada !== "APLICACAO-PARADA") {
      console.error("Operação cancelada antes de conectar ao banco.");
      process.exitCode = 1;
      return;
    }
    email = await terminal.question("E-mail do operador ativo (entrada local, não registrada na auditoria): ");
    chamado = await terminal.question("Referência do chamado (ex.: REC-123; sem descrição ou dados pessoais): ");
    if (!chamadoDeRecuperacaoValido(chamado)) {
      console.error("Referência inválida: use 2 a 8 letras maiúsculas, hífen e 1 a 12 dígitos.");
      process.exitCode = 1;
      return;
    }
    confirmacao = await terminal.question(`Para revogar o MFA e todos os acessos anteriores, digite ${CONFIRMACAO_RECUPERACAO_MFA}: `);
    if (confirmacao !== CONFIRMACAO_RECUPERACAO_MFA) {
      console.error("Operação cancelada antes de conectar ao banco.");
      process.exitCode = 1;
      return;
    }
  } finally {
    terminal.close();
  }

  const db = criarBd(criarPool(config.bancoUrl, "recuperar-mfa-operador", 1));
  try {
    const r = await recuperarMfaOperador(db, { email, chamado, confirmacao });
    if (r.tipo !== "ok") {
      console.error("Recuperação recusada: confira os dados e o vínculo ativo de operador.");
      process.exitCode = 1;
      return;
    }
    console.log(`Recuperação auditada. Sessões revogadas: ${r.sessoesRevogadas}; verificações revogadas: ${r.verificacoesRevogadas}.`);
    console.log("Reinicie a aplicação. O operador deve entrar com a senha e cadastrar novo MFA antes de usar o painel.");
  } finally {
    await db.destroy();
  }
}

executar().catch(() => {
  // Não imprimir Error/stack: drivers podem incluir URL, SQL e dados privados.
  console.error("Não foi possível concluir a recuperação. Confira a configuração e consulte o procedimento; nenhum detalhe privado foi exibido.");
  process.exitCode = 1;
});
