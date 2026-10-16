/**
 * Mostra o SQL que a biblioteca de autenticação espera e que ainda falta no
 * banco migrado. Rodar depois de atualizar `better-auth` ou mudar plugins,
 * revisar e salvar como NOVA migração em db/migracoes (nunca editar uma já
 * aplicada). O teste "esquema da autenticação em dia" falha enquanto faltar.
 *
 *   npx tsx scripts/gerar-sql-auth.ts
 */
import { getMigrations } from "better-auth/db/migration";
import { criarAuth } from "../src/servidor/auth/instancia";
import { criarPool } from "../src/servidor/bd/conexao";
import { PAPEIS } from "../src/servidor/bd/provisionar";
import { lerConfig } from "../src/servidor/config";
import { enviadorEmMemoria } from "../src/servidor/email/enviador";
import { subirCluster, url } from "../test/apoio/cluster";

const cluster = await subirCluster();
const pool = criarPool(url(cluster.info, PAPEIS.migrador, cluster.info.senhaMigrador, cluster.info.modelo), "gerar-sql-auth", 2);
try {
  const config = lerConfig({
    NEXAKEEP_DOMINIO_BASE: "localhost:3000",
    NEXAKEEP_PROTOCOLO: "http",
    DATABASE_URL: "postgres://nao-usado",
    BETTER_AUTH_SECRET: "gerador-de-sql-nao-usa-este-segredo-para-nada",
  });
  const auth = criarAuth({ pool, config, enviador: enviadorEmMemoria() });
  const plano = await getMigrations(auth.options, { throwOnUnsafe: false });
  if (plano.schemaProblems.length) console.error("Problemas de esquema:", plano.schemaProblems);
  if (plano.unsafeChanges.length) console.error("Mudanças inseguras:", plano.unsafeChanges);
  const sql = await plano.compileMigrations();
  console.log(sql.trim() ? sql : "-- nada a criar: o esquema da autenticação está em dia");
} finally {
  await pool.end();
  await cluster.encerrar();
}
