#!/usr/bin/env node
// Cria o .env.local de desenvolvimento com segredos aleatórios.
// Nunca sobrescreve um .env.local existente e nunca imprime os valores.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const ARQUIVO = ".env.local";

if (existsSync(ARQUIVO)) {
  console.log(`${ARQUIVO} já existe; nada foi alterado.`);
  process.exit(0);
}

const segredo = (bytes) => randomBytes(bytes).toString("base64url");
const porta = 54329;
const senhas = { admin: segredo(24), migrador: segredo(24), app: segredo(24) };
const url = (usuario, senha) => `postgres://${usuario}:${senha}@127.0.0.1:${porta}/nexakeep`;

const conteudo = `# Gerado por "npm run preparar" em ${new Date().toISOString()}.
# Só para desenvolvimento local. Nunca versionar, nunca copiar para produção.

NEXAKEEP_MARCA=Nexakeep
NEXAKEEP_DOMINIO_BASE=localhost:3000
NEXAKEEP_PROTOCOLO=http

DATABASE_URL=${url("nexakeep_app", senhas.app)}
DATABASE_URL_MIGRACAO=${url("nexakeep_migrador", senhas.migrador)}

BETTER_AUTH_SECRET=${segredo(48)}
NEXAKEEP_CABECALHO_IP=x-real-ip

NEXAKEEP_EMAIL_TRANSPORTE=arquivo
NEXAKEEP_EMAIL_REMETENTE=Nexakeep <acesso@nexakeep.site>
NEXAKEEP_DADOS_LOCAIS=

NEXAKEEP_BD_PORTA=${porta}
NEXAKEEP_BD_SENHA_ADMIN=${senhas.admin}
NEXAKEEP_BD_SENHA_MIGRADOR=${senhas.migrador}
NEXAKEEP_BD_SENHA_APP=${senhas.app}
`;

writeFileSync(ARQUIVO, conteudo, { encoding: "utf8", mode: 0o600 });
console.log(`${ARQUIVO} criado com segredos aleatórios. Próximo passo: npm run bd:subir`);
