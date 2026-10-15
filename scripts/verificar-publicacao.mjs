#!/usr/bin/env node
// Trava de publicação: este repositório é público.
//
// Bloqueia o commit quando um arquivo novo ou alterado contém segredo, dado
// pessoal com cara de real, mídia fora das pastas de demonstração ou caminho
// que nunca pode ir para o GitHub. É uma rede de proteção, não uma garantia:
// revisar o diff continua obrigatório.
//
// Uso:
//   node scripts/verificar-publicacao.mjs            # arquivos em stage (pre-commit)
//   node scripts/verificar-publicacao.mjs --todos    # todos os arquivos versionados
//   node scripts/verificar-publicacao.mjs --arquivos a.txt b.ts   # arquivos do disco
//
// Para marcar um dado fictício que o verificador confundiria com real, use na
// mesma linha o comentário `publicacao:ficticio` e explique no teste.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAMINHOS_PROIBIDOS = [
  /^privado\//,
  /^segredos\//,
  /^backups\//,
  /(^|\/)\.env(\..+)?$/,
  /\.(pem|key|p12|pfx|crt|age|dump|backup)$/i,
  /\.sql\.gz$/i,
];
const CAMINHOS_PERMITIDOS_APESAR_DE_PARECER_PROIBIDO = [/(^|\/)\.env\.example$/];

// Mídia só entra em pastas de demonstração com material fictício ou licenciado.
const EXTENSOES_DE_MIDIA = /\.(png|jpe?g|webp|gif|heic|heif|avif|bmp|tiff?|mp4|mov|webm|mkv|mp3|m4a|ogg|opus|wav|pdf)$/i;
const PASTAS_DE_MIDIA_PERMITIDA = [/^docs\/imagens\//, /^apps\/[^/]+\/public\/demo\//, /^apps\/[^/]+\/public\/marca\//];

const LIMITE_DE_TAMANHO = 2 * 1024 * 1024;

const SEGREDOS = [
  ['chave privada', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY-----/],
  ['token do GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['chave da OpenAI', /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}\b/],
  ['chave da Anthropic', /\bsk-ant-[A-Za-z0-9_-]{32,}\b/],
  ['chave da AWS', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['chave do Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['token da Meta/Facebook', /\bEAA[A-Za-z0-9]{40,}\b/],
  ['token do Slack', /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/],
  ['chave do Stripe', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/],
  ['token do Mercado Pago', /\bAPP_USR-\d{6,}-[A-Za-z0-9-]{20,}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\b/],
  ['URL com senha', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]{6,}@(?!localhost|127\.0\.0\.1|exemplo|example)/i],
  ['atribuição de segredo', /\b(?:password|passwd|senha|secret|segredo|token|api[_-]?key|chave[_-]?api)\b["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];

// DDDs não atribuídos pela Anatel: telefones de teste devem usar um deles.
const DDDS_FICTICIOS = new Set(['20', '23', '25', '26', '29', '30', '36', '39', '40', '50', '52', '56', '57', '58', '59', '60', '70', '72', '76', '78', '80', '90']);
const TELEFONE = /(?<![\d])(?:\+?55[\s.-]?)?\(?([1-9]\d)\)?[\s.-]?(9\d{4})[\s.-]?(\d{4})(?![\d])/g;
const CPF = /(?<![\d])(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})(?![\d])/g;
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const DOMINIOS_DE_EMAIL_PERMITIDOS = /(^|\.)(example\.(com|org|net)|exemplo\.(com|test)|[a-z0-9-]+\.(test|example|invalid|localhost)|nexakeep\.site|users\.noreply\.github\.com|anthropic\.com)$/i;

const MARCA_FICTICIO = 'publicacao:ficticio';

function cpfValido(digitos) {
  if (/^(\d)\1{10}$/.test(digitos)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(digitos.slice(0, 9)) === Number(digitos[9]) && calc(digitos.slice(0, 10)) === Number(digitos[10]);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function listarArquivos(argv) {
  if (argv.includes('--arquivos')) {
    return { origem: 'disco', arquivos: argv.slice(argv.indexOf('--arquivos') + 1) };
  }
  if (argv.includes('--todos')) {
    return { origem: 'indice', arquivos: git(['ls-files', '-z']).split('\0').filter(Boolean) };
  }
  const saida = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  return { origem: 'indice', arquivos: saida.split('\0').filter(Boolean) };
}

function lerConteudo(caminho, origem) {
  if (origem === 'disco') {
    if (!existsSync(caminho) || !statSync(caminho).isFile()) return null;
    return readFileSync(caminho);
  }
  return execFileSync('git', ['show', `:${caminho}`], { maxBuffer: 64 * 1024 * 1024 });
}

function pareceBinario(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

export function verificarTexto(caminho, texto) {
  const achados = [];
  const linhas = texto.split(/\r?\n/);
  linhas.forEach((linha, i) => {
    const onde = `${caminho}:${i + 1}`;
    if (linha.includes(MARCA_FICTICIO)) return;
    for (const [nome, padrao] of SEGREDOS) {
      if (padrao.test(linha)) achados.push(`${onde} — possível ${nome}`);
    }
    for (const m of linha.matchAll(TELEFONE)) {
      if (!DDDS_FICTICIOS.has(m[1])) achados.push(`${onde} — telefone com DDD real (${m[1]}); em teste use DDD não atribuído, ex.: 20`);
    }
    for (const m of linha.matchAll(CPF)) {
      const digitos = m.slice(1, 5).join('');
      if (cpfValido(digitos)) achados.push(`${onde} — CPF com dígitos verificadores válidos`);
    }
    for (const m of linha.matchAll(EMAIL)) {
      if (!DOMINIOS_DE_EMAIL_PERMITIDOS.test(m[1])) achados.push(`${onde} — e-mail de domínio real (${m[1]})`);
    }
  });
  return achados;
}

export function verificarCaminho(caminho, tamanho) {
  const achados = [];
  const normalizado = caminho.replace(/\\/g, '/');
  const permitido = CAMINHOS_PERMITIDOS_APESAR_DE_PARECER_PROIBIDO.some((p) => p.test(normalizado));
  if (!permitido && CAMINHOS_PROIBIDOS.some((p) => p.test(normalizado))) {
    achados.push(`${normalizado} — caminho proibido no repositório público`);
  }
  if (EXTENSOES_DE_MIDIA.test(normalizado) && !PASTAS_DE_MIDIA_PERMITIDA.some((p) => p.test(normalizado))) {
    achados.push(`${normalizado} — mídia fora das pastas de demonstração (fotos de clientes nunca entram)`);
  }
  if (tamanho > LIMITE_DE_TAMANHO) {
    achados.push(`${normalizado} — arquivo com ${(tamanho / 1024 / 1024).toFixed(1)} MB (limite 2 MB)`);
  }
  return achados;
}

function principal() {
  const { origem, arquivos } = listarArquivos(process.argv.slice(2));
  const achados = [];
  for (const caminho of arquivos) {
    const conteudo = lerConteudo(caminho, origem);
    if (conteudo === null) continue;
    achados.push(...verificarCaminho(caminho, conteudo.length));
    if (!pareceBinario(conteudo)) achados.push(...verificarTexto(caminho.replace(/\\/g, '/'), conteudo.toString('utf8')));
  }
  if (achados.length > 0) {
    console.error('\n✖ Publicação bloqueada — o repositório é público:\n');
    for (const a of achados) console.error(`  • ${a}`);
    console.error(`\nSe for dado fictício, use DDD não atribuído/domínio .test ou marque a linha com "${MARCA_FICTICIO}".`);
    console.error('Se for segredo de verdade: remova do stage, troque o segredo e nunca use --no-verify.\n');
    process.exit(1);
  }
  console.log(`✔ Verificação de publicação: ${arquivos.length} arquivo(s), nenhum problema encontrado.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal();
}
