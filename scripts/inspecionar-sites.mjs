/**
 * Inspeção objetiva dos sites das lojas (juiz determinístico do DESIGN.md).
 *
 *   node scripts/inspecionar-sites.mjs --base http://localhost:3200 \
 *     --lojas navalha-de-ouro,studio-bella,salao-jasmim --saida <pasta> [--modelo letreiro] [--lint]
 *
 * Para cada loja, abre a página inicial e o agendamento no Edge do sistema em
 * 1440, 834 e 390 px, salva capturas de página inteira e mede o que não
 * depende de opinião: rolagem lateral, títulos com mais de 2 linhas, contraste
 * de cada texto visível, alvos de toque no celular, foco visível no teclado,
 * animação com "reduzir movimento", erros de console e um único <h1>. Também
 * acusa texto cortado por overflow (acentos no rodapé), Didone abaixo de 28 px,
 * faixa de horário quebrada em duas linhas e texto coberto por outra camada;
 * avisa grade com item sozinho na última linha e texto igual em todos os itens
 * de uma lista; e toca nas opções da cartela para ver se a página "pula".
 * Com --modelo, a página inicial abre com ?modelo=<id> (prévia do modelo em
 * qualquer loja). Com --lint, também procura no código dos modelos os padrões
 * proibidos.
 *
 * Saída: <pasta>/relatorio.json e um resumo no terminal. Sai com código 1 se
 * houver alguma FALHA.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "1"]);
    return acc;
  }, []),
);
const base = new URL(args.base ?? "http://localhost:3200");
const lojas = (args.lojas ?? "").split(",").filter(Boolean);
const saida = args.saida ?? "test-results/inspecao";
const previa = args.modelo ? `?modelo=${encodeURIComponent(args.modelo)}` : "";
const sufixo = args.modelo ? `-${args.modelo}` : "";
const LARGURAS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "tablet", width: 834, height: 1112 },
  { nome: "celular", width: 390, height: 844 },
];

// Ruído de antivírus/extensões que injetam script nas páginas (não é do site).
const IGNORAR_CONSOLE = /kaspersky|kis\.v2\.scr|chrome-extension:/i;

function urlDaLoja(slug, caminho = "/") {
  return `${base.protocol}//${slug}.${base.host}${caminho}`;
}

/** Medições feitas dentro da página. */
async function medir(page, largura) {
  return page.evaluate((larguraTela) => {
    const res = { falhas: [], avisos: [] };
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) res.falhas.push(`rolagem lateral: ${doc.scrollWidth}px de conteúdo em ${doc.clientWidth}px`);
    const h1s = [...document.querySelectorAll("h1")].filter((h) => h.getClientRects().length);
    if (h1s.length !== 1) res.falhas.push(`${h1s.length} elementos <h1> visíveis (deve ser 1)`);
    if (!document.querySelector("main#conteudo")) res.falhas.push("sem <main id=\"conteudo\"> (alvo do atalho “Pular para o conteúdo”)");

    // Títulos: no máximo 2 linhas em qualquer largura (taste-skill).
    for (const h of document.querySelectorAll("h1, h2")) {
      if (!h.getClientRects().length) continue;
      // Conta as linhas do texto em si (a caixa pode esticar numa grade).
      // Só os retângulos dos nós de texto (caixas inline-block dariam linhas a mais).
      const topos = new Set();
      const textos = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      while (textos.nextNode()) {
        if (!textos.currentNode.textContent.trim()) continue;
        const faixa = document.createRange();
        faixa.selectNodeContents(textos.currentNode);
        for (const r of faixa.getClientRects()) if (r.width > 1) topos.add(Math.round((r.top + r.height / 2) / 8));
      }
      const linhas = topos.size;
      if (linhas > 2) res.avisos.push(`título com ${linhas} linhas: “${h.textContent.trim().slice(0, 60)}”`);
    }

    // Contraste de texto (WCAG 1.4.3), compondo transparências até achar um fundo sólido.
    const rgba = (s) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const c = (v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
    };
    const sobre = (cima, baixo) => ({
      r: cima.r * cima.a + baixo.r * (1 - cima.a),
      g: cima.g * cima.a + baixo.g * (1 - cima.a),
      b: cima.b * cima.a + baixo.b * (1 - cima.a),
      a: 1,
    });
    const fundoDe = (el) => {
      const camadas = [];
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== "none" && !/gradient/.test(cs.backgroundImage)) return null; // sobre imagem: não dá para medir
        const c = rgba(cs.backgroundColor);
        if (c && c.a > 0) {
          camadas.push(c);
          if (c.a >= 1) break;
        }
      }
      let cor = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of camadas.reverse()) cor = sobre(c, cor);
      return cor;
    };
    const vistos = new Set();
    const caminhar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (caminhar.nextNode()) {
      const t = caminhar.currentNode;
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      if (!el || vistos.has(el)) continue;
      vistos.add(el);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
      if (r.width <= 1 || r.height <= 1 || cs.clip === "rect(0px, 0px, 0px, 0px)") continue; // sr-only
      let opacidade = 1;
      for (let e = el; e; e = e.parentElement) opacidade *= parseFloat(getComputedStyle(e).opacity);
      const fundo = fundoDe(el);
      const frente = rgba(cs.color);
      if (!fundo || !frente) continue;
      const cor = sobre({ ...frente, a: frente.a * opacidade }, fundo);
      const [l1, l2] = [lum(cor), lum(fundo)].sort((a, b) => b - a);
      const razao = (l1 + 0.05) / (l2 + 0.05);
      const tamanho = parseFloat(cs.fontSize);
      const grande = tamanho >= 24 || (tamanho >= 18.66 && Number(cs.fontWeight) >= 700);
      const minimo = grande ? 3 : 4.5;
      if (razao < minimo) {
        const decorativo = el.closest("[aria-hidden=true]");
        const alvo = el.closest("[aria-disabled=true], [aria-label*=ocupado], [aria-label*='sem horários']") ? " (desativado)" : "";
        const msg = `contraste ${razao.toFixed(2)}:1 (mín. ${minimo}) em “${t.textContent.trim().slice(0, 40)}”${alvo}`;
        (decorativo || alvo ? res.avisos : res.falhas).push(msg);
      }
    }

    // Alvos de toque no celular (WCAG 2.5.8 pede 24px; usamos 44px como meta).
    if (larguraTela <= 480) {
      for (const campo of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")) {
        // Botão de opção escondido dentro de <label> (cartela da Paleta): o alvo de toque é o label.
        const rc = campo.getBoundingClientRect();
        const el = rc.width <= 1 && rc.height <= 1 && campo.closest("label") ? campo.closest("label") : campo;
        const r = el.getBoundingClientRect();
        // O atalho "Pular para o conteúdo" fica invisível até receber foco, de propósito.
        if (!r.width || !r.height || el.closest("[aria-hidden=true]") || el.getAttribute("href") === "#conteudo") continue;
        const dentroDeTexto = getComputedStyle(el).display === "inline" && el.parentElement && /^(P|LI|SPAN|DD)$/.test(el.parentElement.tagName);
        const menor = Math.min(r.width, r.height) + 0.5; // tolerância de arredondamento
        const nome = (el.getAttribute("aria-label") || el.textContent || el.name || el.tagName).trim().slice(0, 40);
        if (menor < 24 && !dentroDeTexto) res.falhas.push(`alvo de toque ${Math.round(r.width)}×${Math.round(r.height)}px: “${nome}”`);
        else if (menor < 44 && !dentroDeTexto) res.avisos.push(`alvo de toque abaixo de 44px (${Math.round(r.width)}×${Math.round(r.height)}): “${nome}”`);
      }
    }
    for (const img of document.querySelectorAll("img:not([alt])")) res.falhas.push(`imagem sem alt: ${img.src.slice(0, 60)}`);

    // Texto só para leitor de tela (sr-only: caixa de 1 px recortada) não aparece: fica fora das medidas abaixo.
    const escondido = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "contents") continue; // sem caixa própria (0×0), mas não esconde nada
        const r = e.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)") return true;
      }
      return false;
    };

    // Texto cortado: o retângulo do texto passa da caixa de um ancestral com overflow hidden/clip
    // (o scrollHeight não pega acento fora da entrelinha; o retângulo do texto pega).
    // Reticências de propósito (text-overflow: ellipsis) e texto só para leitor de tela não contam.
    const cortados = new Set();
    const nos = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (nos.nextNode()) {
      const t = nos.currentNode;
      if (!t.textContent.trim() || !t.parentElement || !t.parentElement.getClientRects().length || escondido(t.parentElement)) continue;
      const faixa = document.createRange();
      faixa.selectNodeContents(t);
      const rects = [...faixa.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (!rects.length) continue;
      for (let e = t.parentElement; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        const corta = (v) => v === "hidden" || v === "clip";
        if (!corta(cs.overflowX) && !corta(cs.overflowY)) continue;
        if (cs.clip === "rect(0px, 0px, 0px, 0px)" || e.getBoundingClientRect().width <= 1) break;
        // Reticências (text-overflow: ellipsis) são corte horizontal de propósito; o vertical (acento) não.
        const reticencias = cs.textOverflow === "ellipsis";
        const caixa = e.getBoundingClientRect();
        const fora = rects.some(
          (r) =>
            (corta(cs.overflowY) && (r.top < caixa.top - 1 || r.bottom > caixa.bottom + 1)) ||
            (!reticencias && corta(cs.overflowX) && (r.left < caixa.left - 1 || r.right > caixa.right + 1)),
        );
        if (fora && !cortados.has(e)) {
          cortados.add(e);
          res.falhas.push(`texto cortado pela caixa (overflow ${cs.overflowX}/${cs.overflowY}): “${t.textContent.trim().slice(0, 40)}”`);
        }
        break;
      }
      // Faixa de horário ("13:30–19:00") nunca quebra no meio.
      for (const m of t.textContent.matchAll(/\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/g)) {
        const r = document.createRange();
        r.setStart(t, m.index);
        r.setEnd(t, m.index + m[0].length);
        const linhas = new Set([...r.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top / 4)));
        if (linhas.size > 1) res.falhas.push(`faixa de horário quebrada em ${linhas.size} linhas: “${m[0]}”`);
      }
    }

    // Didone (Bodoni) só a partir de 28 px: abaixo disso os traços finos somem.
    const didone = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (!/bodoni/i.test(cs.fontFamily) || parseFloat(cs.fontSize) >= 27.5) continue;
      const proprio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const r = el.getBoundingClientRect();
      if (proprio && r.width > 1 && r.height > 1 && cs.visibility !== "hidden") didone.add(`${Math.round(parseFloat(cs.fontSize))}px “${el.textContent.trim().slice(0, 30)}”`);
    }
    for (const d of didone) res.falhas.push(`Didone abaixo de 28 px: ${d}`);

    // Itens de grade (display: contents conta pelos filhos), só os que aparecem.
    const itensDe = (pai) =>
      [...pai.children].flatMap((c) => (getComputedStyle(c).display === "contents" ? [...c.children] : [c])).filter((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      });

    // Grade regular (todas as linhas cheias) com um item sozinho na última linha: composição que sobra.
    for (const g of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(g);
      if (cs.display !== "grid" && cs.display !== "inline-grid") continue;
      const colunas = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
      if (colunas < 2) continue;
      const linhas = new Map();
      for (const it of itensDe(g)) {
        const topo = Math.round(it.getBoundingClientRect().top / 8);
        linhas.set(topo, [...(linhas.get(topo) ?? []), it]);
      }
      const ordenadas = [...linhas.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      const contagem = ordenadas.map((l) => l.length);
      // Item que ocupa a linha toda de propósito (col-span) não é "sozinho": só conta célula estreita.
      const sozinho = ordenadas.at(-1)?.[0];
      const estreito = sozinho && sozinho.getBoundingClientRect().width < 0.6 * g.getBoundingClientRect().width;
      if (contagem.length >= 2 && contagem.at(-1) === 1 && estreito && contagem.slice(0, -1).every((c) => c === colunas)) {
        res.avisos.push(`grade com um item sozinho na última linha (${contagem.reduce((a, b) => a + b, 0)} itens em ${colunas} colunas): “${g.textContent.trim().slice(0, 40)}”`);
      }
    }

    // O mesmo texto (12+ caracteres) em todos os itens irmãos: repetição que não informa.
    // Compara o texto inteiro de cada elemento que tem texto próprio (um prefixo fixo, como "Reservar com", não conta).
    const textosVisiveis = (el) => {
      const out = new Set();
      for (const e of [el, ...el.querySelectorAll("*")]) {
        if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        if (escondido(e) || !e.getClientRects().length) continue;
        const t = e.innerText.trim().replace(/\s+/g, " ");
        if (t.length >= 12) out.add(t);
      }
      return out;
    };
    const repetidos = new Set();
    for (const pai of document.querySelectorAll("ul, ol, div")) {
      const filhos = itensDe(pai);
      if (filhos.length < 2 || filhos.length > 12 || new Set(filhos.map((c) => c.tagName)).size > 1) continue;
      const conjuntos = filhos.map(textosVisiveis);
      for (const t of conjuntos[0]) if (conjuntos.every((c) => c.has(t))) repetidos.add(t);
    }
    for (const t of repetidos) res.avisos.push(`texto igual em todos os itens de uma lista: “${t.slice(0, 50)}”`);
    return res;
  }, largura);
}

/**
 * Rola a página tela a tela e, em cada texto visível, pergunta ao navegador o
 * que está no centro dele: se for outra camada (que não seja barra fixa nem o
 * próprio texto), o texto está coberto. Ex.: rótulo atrás de outra carta.
 */
async function textoCoberto(page) {
  return page.evaluate(async () => {
    const cobertos = new Set();
    const fixo = (e) => {
      for (let x = e; x; x = x.parentElement) {
        const p = getComputedStyle(x).position;
        if (p === "fixed" || p === "sticky" || x.tagName === "NEXTJS-PORTAL") return true;
      }
      return false;
    };
    const escondido = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "contents") continue; // sem caixa própria (0×0), mas não esconde nada
        const r = e.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)") return true;
      }
      return false;
    };
    // Só cobre quem pinta por cima: fundo, imagem ou caixa posicionada à parte. Texto vizinho com
    // entrelinha apertada "invade" a área do outro no teste de clique, mas não esconde nada.
    const pinta = (alvo, el) => {
      for (let x = alvo; x && !x.contains(el); x = x.parentElement) {
        const cs = getComputedStyle(x);
        const fundo = cs.backgroundColor.match(/[\d.]+/g);
        if (cs.backgroundImage !== "none" || (fundo && (fundo.length < 4 || Number(fundo[3]) > 0)) || cs.position === "absolute") return true;
      }
      return false;
    };
    const altura = innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(altura * 0.8)) {
      scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const nos = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (nos.nextNode()) {
        const t = nos.currentNode;
        const el = t.parentElement;
        if (!t.textContent.trim() || !el || fixo(el) || escondido(el)) continue;
        const faixa = document.createRange();
        faixa.selectNodeContents(t);
        for (const r of faixa.getClientRects()) {
          if (r.width <= 2 || r.height <= 2) continue;
          const cx = r.left + Math.min(r.width / 2, 12);
          const cy = r.top + r.height / 2;
          if (cy < 0 || cy > altura || cx < 0 || cx > innerWidth) continue;
          const alvo = document.elementFromPoint(cx, cy);
          if (!alvo || alvo === el || el.contains(alvo) || alvo.contains(el) || fixo(alvo) || !pinta(alvo, el)) continue;
          cobertos.add(t.textContent.trim().slice(0, 40));
          break;
        }
      }
    }
    scrollTo({ top: 0, behavior: "instant" });
    return [...cobertos];
  });
}

/**
 * Toca nas duas últimas opções de cada grupo de botões de opção com <label>
 * (cartela da Paleta) e mede quanto a opção tocada se moveu na tela. Mais de
 * 100 px = a página "pulou" sob o dedo (ex.: painel que fecha acima dela).
 */
async function saltoAoEscolher(page) {
  const saltos = [];
  const rotulos = page.locator("label:has(input[type=radio])");
  const total = await rotulos.count();
  for (const i of [total - 1, total - 2].filter((x) => x > 0)) {
    const rotulo = rotulos.nth(i);
    if (!(await rotulo.isVisible())) continue;
    await rotulo.scrollIntoViewIfNeeded();
    // Posição na página (topo + rolagem), não na tela: o Chrome compensa parte do salto rolando a página
    // ("scroll anchoring"), mas o Safari do iPhone, não; o que importa é a opção não mudar de lugar.
    const naPagina = async () => {
      const caixa = await rotulo.boundingBox();
      return caixa ? caixa.y + (await page.evaluate(() => scrollY)) : null;
    };
    const antes = await naPagina();
    await rotulo.click();
    await page.waitForTimeout(400);
    const depois = await naPagina();
    if (antes !== null && depois !== null && Math.abs(depois - antes) > 100) saltos.push(`“${(await rotulo.innerText()).trim().slice(0, 30)}” ${Math.round(depois - antes)} px`);
  }
  return saltos;
}

/**
 * Percorre os primeiros alvos de Tab e, para cada um, compara o estilo com e
 * sem foco: anel ou sombra que já existiam sem foco não contam como indicador.
 * Também acusa o elemento focado que está coberto por outro (WCAG 2.4.11).
 */
async function focoVisivel(page, quantos = 25) {
  const sem = [];
  const cobertos = [];
  for (let i = 0; i < quantos; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      // O painel de desenvolvimento do Next (só existe no next dev) não conta.
      if (!el || el === document.body || el.tagName === "NEXTJS-PORTAL") return null;
      // Botão de opção escondido (cartela da Paleta): o indicador de foco fica no <label> dele.
      const rEl = el.getBoundingClientRect();
      const alvo = (rEl.width <= 1 || rEl.height <= 1) && el.closest("label") ? el.closest("label") : el;
      const estilo = () => {
        const cs = getComputedStyle(alvo);
        return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} | ${cs.boxShadow} | ${cs.borderColor}`;
      };
      const comFoco = estilo();
      const r = alvo.getBoundingClientRect();
      const meio = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
      const coberto = r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && meio !== null && !alvo.contains(meio) && !meio.contains(alvo);
      el.blur();
      const semFoco = estilo();
      // Devolve o foco: o próximo Tab segue a partir daqui.
      el.focus();
      return { nome: (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40), muda: comFoco !== semFoco, coberto };
    });
    if (!info) continue;
    if (!info.muda) sem.push(info.nome);
    if (info.coberto) cobertos.push(info.nome);
  }
  return { sem: [...new Set(sem)], cobertos: [...new Set(cobertos)] };
}

async function lintModelos() {
  const raiz = "src/app/loja/[slug]/modelos";
  const regras = [
    [/backdrop-blur|backdrop-filter/, "vidro/desfoque"],
    [/\bshadow-(sm|md|lg|xl|2xl)\b|box-shadow:\s*0\s+\d/, "sombra em elemento em repouso (confirme que é só em estado)"],
    [/(?<!repeating-)(linear|radial|conic)-gradient|bg-gradient|bg-linear-|bg-radial-/, "degradê"],
    [/font-mono|monospace/, "fonte monoespaçada"],
    [/tracking-(widest|\[0\.[1-9])|letter-spacing:\s*0?\.[1-9]\d*em/, "rótulo com letras muito espaçadas"],
    [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, "emoji"],
    [/\b0[1-9]\s*[/·.]/, "numeração decorativa (01/02/03)"],
  ];
  const achados = [];
  async function andar(pasta) {
    for (const e of await readdir(pasta, { withFileTypes: true })) {
      const p = join(pasta, e.name);
      if (e.isDirectory()) await andar(p);
      else if (/\.(tsx?|css)$/.test(e.name)) {
        const linhas = (await readFile(p, "utf8")).split("\n");
        linhas.forEach((l, i) => {
          for (const [re, nome] of regras) if (re.test(l)) achados.push(`${relative(".", p)}:${i + 1} — ${nome}`);
        });
      }
    }
  }
  await andar(raiz);
  return achados;
}

const relatorio = { geradoEm: new Date().toISOString(), base: base.href, paginas: [], lint: [] };
await mkdir(saida, { recursive: true });
const navegador = await chromium.launch({ channel: "msedge" });
try {
  for (const slug of lojas) {
    for (const caminho of ["/", "/agendar"]) {
      for (const tela of LARGURAS) {
        for (const reduzir of tela.nome === "celular" ? [false, true] : [false]) {
          const ctx = await navegador.newContext({ viewport: { width: tela.width, height: tela.height }, reducedMotion: reduzir ? "reduce" : "no-preference", locale: "pt-BR" });
          const page = await ctx.newPage();
          const consoleErros = [];
          page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && !IGNORAR_CONSOLE.test(m.text() + (m.location()?.url ?? "")) && consoleErros.push(m.text().slice(0, 160)));
          page.on("pageerror", (e) => consoleErros.push(`exceção: ${e.message.slice(0, 160)}`));
          page.on("response", (r) => {
            if (r.status() >= 400 && !IGNORAR_CONSOLE.test(r.url())) consoleErros.push(`recurso ${r.status()}: ${r.url().slice(0, 120)}`);
          });
          const resp = await page.goto(urlDaLoja(slug, caminho === "/" ? `/${previa}` : caminho), { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          const item = { loja: slug, caminho, tela: tela.nome, reduzirMovimento: reduzir, status: resp?.status() ?? 0, falhas: [], avisos: [] };
          if (!resp || resp.status() >= 400) item.falhas.push(`HTTP ${resp?.status()}`);
          if (reduzir) {
            const animando = await page.evaluate(() =>
              document.getAnimations().filter((a) => {
                const t = a.effect?.getComputedTiming?.();
                return a.playState === "running" && t && (t.duration === Infinity || t.duration > 50);
              }).length,
            );
            if (animando) item.falhas.push(`${animando} animação(ões) rodando com “reduzir movimento”`);
          } else {
            const m = await medir(page, tela.width);
            item.falhas.push(...m.falhas);
            item.avisos.push(...m.avisos);
            const cobertos = await textoCoberto(page);
            if (cobertos.length) item.falhas.push(`texto coberto por outra camada: ${cobertos.slice(0, 6).join(" | ")}`);
            const arquivo = join(saida, `${slug}${sufixo}${caminho === "/" ? "" : caminho.replace(/\//g, "-")}-${tela.nome}.png`);
            await page.screenshot({ path: arquivo, fullPage: true });
            item.captura = arquivo;
            if (tela.nome !== "tablet") {
              const foco = await focoVisivel(page);
              if (foco.sem.length) item.falhas.push(`foco invisível no teclado em: ${foco.sem.join(", ")}`);
              if (foco.cobertos.length) item.falhas.push(`elemento em foco coberto por outro: ${foco.cobertos.join(", ")}`);
            }
            const saltos = await saltoAoEscolher(page);
            if (saltos.length) item.falhas.push(`a opção tocada pulou na tela: ${saltos.join(", ")}`);
          }
          if (consoleErros.length) item.falhas.push(...consoleErros.map((e) => `console: ${e}`));
          relatorio.paginas.push(item);
          await ctx.close();
        }
      }
    }
  }
} finally {
  await navegador.close();
}
if (args.lint) relatorio.lint = await lintModelos();

await writeFile(join(saida, "relatorio.json"), JSON.stringify(relatorio, null, 2));
let falhas = 0;
for (const p of relatorio.paginas) {
  const rotulo = `${p.loja}${p.caminho === "/" ? "" : p.caminho} · ${p.tela}${p.reduzirMovimento ? " (reduzir movimento)" : ""}`;
  falhas += p.falhas.length;
  console.log(`${p.falhas.length ? "FALHA" : "ok   "}  ${rotulo}  —  ${p.falhas.length} falha(s), ${p.avisos.length} aviso(s)`);
  for (const f of p.falhas.slice(0, 12)) console.log(`         ✗ ${f}`);
  for (const a of p.avisos.slice(0, 6)) console.log(`         · ${a}`);
}
if (relatorio.lint.length) {
  console.log(`\nPadrões proibidos no código dos modelos (${relatorio.lint.length}):`);
  for (const l of relatorio.lint) console.log(`  · ${l}`);
}
console.log(`\nRelatório: ${join(saida, "relatorio.json")}`);
process.exitCode = falhas ? 1 : 0;
