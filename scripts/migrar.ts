/** Aplica migrações usando exclusivamente a credencial de migração. */
import { resolve } from "node:path";
import pg from "pg";
import { aplicarMigracoes } from "../src/servidor/bd/migracoes";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Em outro ambiente, a credencial deve ser fornecida pelo processo.
}

const conexao = process.env.DATABASE_URL_MIGRACAO;
if (!conexao) {
  console.error("Falta DATABASE_URL_MIGRACAO. No desenvolvimento, rode npm run preparar.");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: conexao, connectionTimeoutMillis: 10_000 });
try {
  await cliente.connect();
  const novas = await aplicarMigracoes(cliente, resolve(import.meta.dirname, "../db/migracoes"));
  console.log(novas.length ? `Migrações aplicadas: ${novas.join(", ")}` : "Nenhuma migração pendente.");
} catch {
  // Erros do driver podem trazer a URL ou credenciais; não repassá-los ao terminal.
  console.error("Falha na migração. Confira conexão, papel migrador e integridade dos arquivos SQL; nenhuma credencial foi exibida.");
  process.exitCode = 1;
} finally {
  await cliente.end();
}
