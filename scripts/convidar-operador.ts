/**
 * Convida um operador da plataforma (o primeiro acesso nasce assim).
 *
 *   npm run operador:convidar -- pessoa@exemplo.com
 *
 * O link com o token vai só no e-mail; o terminal nunca mostra o token. Em
 * desenvolvimento o e-mail é gravado em NEXAKEEP_DADOS_LOCAIS/emails.
 */
import { criarConvite, normalizarEmail } from "../src/servidor/auth/convites";
import { urlComToken } from "../src/servidor/auth/instancia";
import { criarBd, criarPool } from "../src/servidor/bd/conexao";
import { lerConfig } from "../src/servidor/config";
import { enviadorEmArquivo } from "../src/servidor/email/enviador";
import { emailConvite } from "../src/servidor/email/modelos";
import { mascararEmail } from "../src/servidor/privacidade";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Em produção as variáveis vêm do ambiente do servidor.
}

const email = normalizarEmail(process.argv[2] ?? "");
if (!email) {
  console.error("Uso: npm run operador:convidar -- pessoa@exemplo.com");
  process.exit(1);
}

const c = lerConfig(process.env);
if (c.email.transporte !== "arquivo") {
  console.error("Sem transporte de e-mail real configurado ainda (T11). Use NEXAKEEP_EMAIL_TRANSPORTE=arquivo no desenvolvimento.");
  process.exit(1);
}

const db = criarBd(criarPool(c.bancoUrl, "convidar-operador", 2));
try {
  const { token, expiraEm } = await criarConvite(db, { email, papel: "operador" });
  await enviadorEmArquivo(c.dadosLocais).enviar(
    emailConvite({ para: email, marca: c.marca, url: urlComToken(`${c.urlPainel}/convite`, token), expiraEm, papel: "operador da plataforma" }),
  );
  console.log(`Convite de operador criado para ${mascararEmail(email)}; vale até ${expiraEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`);
} finally {
  await db.destroy();
}
