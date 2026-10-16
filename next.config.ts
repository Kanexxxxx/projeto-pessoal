import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as respostas (herdados da base anterior,
 * ver docs/BASE-ANTERIOR.md):
 *
 * - `frame-ancestors 'none'` + `X-Frame-Options`: ninguém embute o painel num
 *   <iframe> para induzir cliques.
 * - `nosniff`: o navegador não "adivinha" tipo de arquivo.
 * - HSTS com subdomínios: todas as lojas ficam em `*.nexakeep.site` sob HTTPS.
 * - `Referrer-Policy`: endereço completo não vaza para outros sites.
 * - `Permissions-Policy`: câmera, microfone e localização desligados.
 *
 * A CSP ainda não restringe `script-src`: o Next injeta script inline e isso
 * exige nonce por requisição. Fica para quando houver medição do custo.
 */
const CABECALHOS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // A implantação é numa VPS (docs/ARQUITETURA.md): o build standalone leva só
  // as dependências usadas, sem os ~500 MB de node_modules.
  output: "standalone",
  poweredByHeader: false,
  // O teste de navegador sobe um `next dev` próprio; pasta separada evita
  // disputa com o servidor de desenvolvimento aberto ao mesmo tempo.
  distDir: process.env.NEXAKEEP_DIST_DIR || ".next",

  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS }];
  },
};

export default nextConfig;
