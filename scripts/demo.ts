/**
 * Cria duas lojas FICTÍCIAS para testar em localhost (só desenvolvimento):
 *
 *   npm run demo:criar
 *
 * Nomes, telefones (DDD 20, não atribuído) e endereços são inventados. Rodar
 * de novo não duplica nada: loja que já existe é mantida como está.
 */
import { hojeNoFuso, somarDias } from "../src/dominio/datas";
import { reservar } from "../src/servidor/lojas/agenda";
import { salvarExpediente, salvarProfissional, salvarServico, salvarSite } from "../src/servidor/lojas/catalogo";
import { comLoja } from "../src/servidor/lojas/escopo";
import { criarLoja, lojaPorSlug, type Acesso } from "../src/servidor/lojas/lojas";
import { criarBd, criarPool } from "../src/servidor/bd/conexao";
import { lerConfig, urlDaLoja } from "../src/servidor/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: lerConfig acusa o que faltar
}

const c = lerConfig(process.env);
if (c.ambiente === "production") {
  console.error("Script de demonstração não roda em produção.");
  process.exit(1);
}

type Turno = [string, string];
type Demo = {
  slug: string;
  nome: string;
  segmento: "barbearia" | "salao" | "estudio";
  site: Record<string, string>;
  profissionais: string[];
  /** Dia da semana (0 = domingo) → turnos. */
  horario: Record<number, Turno[]>;
  servicos: { nome: string; duracao: number; preco: string; descricao?: string }[];
};

const DEMOS: Demo[] = [
  {
    slug: "navalha-de-ouro",
    nome: "Barbearia Navalha de Ouro",
    segmento: "barbearia",
    site: {
      modelo: "contraste",
      cor: "#b8860b",
      chamada: "Corte, barba e toalha quente. Hora marcada, sem fila.",
      sobre: "Barbearia de bairro desde 2015 (loja fictícia de demonstração).\nCafé passado na hora e atendimento sem pressa.",
      endereco: "Rua das Tesouras, 100 — Centro, Cidade Exemplo",
      whatsapp: "(20) 98765-4321",
      instagram: "navalhadeouro.demo",
      passo: "30",
      intervalo: "0",
      antecedencia: "60",
      horizonte: "21",
    },
    profissionais: ["Rafael", "Diego"],
    horario: {
      2: [["09:00", "12:00"], ["13:30", "19:00"]],
      3: [["09:00", "12:00"], ["13:30", "19:00"]],
      4: [["09:00", "12:00"], ["13:30", "19:00"]],
      5: [["09:00", "12:00"], ["13:30", "20:00"]],
      6: [["08:00", "14:00"]],
    },
    servicos: [
      { nome: "Corte", duracao: 40, preco: "45" },
      { nome: "Barba", duracao: 30, preco: "35", descricao: "Com toalha quente" },
      { nome: "Corte + barba", duracao: 70, preco: "70" },
      { nome: "Pezinho", duracao: 15, preco: "15" },
    ],
  },
  {
    slug: "studio-bella",
    nome: "Studio Bella Unhas",
    segmento: "estudio",
    site: {
      modelo: "classico",
      cor: "#c2185b",
      chamada: "Unhas e sobrancelhas com hora marcada e material esterilizado.",
      sobre: "Estúdio pequeno e tranquilo, com atendimento individual (loja fictícia de demonstração).",
      endereco: "Avenida das Flores, 250, sala 3 — Jardim Exemplo",
      whatsapp: "(20) 91234-5678",
      instagram: "studiobella.demo",
      passo: "30",
      intervalo: "10",
      antecedencia: "120",
      horizonte: "30",
    },
    profissionais: ["Camila"],
    horario: {
      1: [["09:00", "18:00"]],
      2: [["09:00", "18:00"]],
      3: [["09:00", "18:00"]],
      4: [["09:00", "18:00"]],
      5: [["09:00", "18:00"]],
      6: [["09:00", "13:00"]],
    },
    servicos: [
      { nome: "Manicure", duracao: 45, preco: "35" },
      { nome: "Pedicure", duracao: 50, preco: "40" },
      { nome: "Esmaltação em gel", duracao: 90, preco: "90", descricao: "Dura até 3 semanas" },
      { nome: "Design de sobrancelha", duracao: 30, preco: "40" },
    ],
  },
];

function form(campos: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const item of [v].flat()) f.append(k, item);
  return f;
}

const pool = criarPool(c.bancoUrl, "demo", 2);
const db = criarBd(pool);
try {
  const operador = await db.selectFrom("operadores").select("usuario_id").where("revogado_em", "is", null).orderBy("criado_em").executeTakeFirst();
  if (!operador) {
    console.error("Crie e ative o operador antes (npm run operador:convidar -- operador@nexakeep.test).");
    process.exit(1);
  }

  for (const demo of DEMOS) {
    if (await lojaPorSlug(db, demo.slug)) {
      console.log(`Já existe: ${demo.nome} → ${urlDaLoja(c, demo.slug)}`);
      continue;
    }
    const r = await criarLoja(db, { nome: demo.nome, slug: demo.slug, segmento: demo.segmento, criadaPor: operador.usuario_id });
    if (!r.ok) throw new Error(r.erro);
    const acesso: Acesso = { loja: r.loja, papel: "operador", usuarioId: operador.usuario_id };
    const conferir = (x: { ok: boolean; erro?: string }) => {
      if (!x.ok) throw new Error(x.erro);
    };

    conferir(await salvarSite(db, acesso, form({ loja: demo.slug, ...demo.site })));
    for (const nome of demo.profissionais) conferir(await salvarProfissional(db, acesso, form({ nome })));
    const profs = await comLoja(db, r.loja.id, (trx) => trx.selectFrom("profissionais").select("id").orderBy("ordem").execute());
    const turnos: Record<string, string> = {};
    for (const [dia, lista] of Object.entries(demo.horario)) {
      turnos[`aberto-${dia}`] = "on";
      lista.forEach(([de, ate], i) => Object.assign(turnos, { [`de-${dia}-${i + 1}`]: de, [`ate-${dia}-${i + 1}`]: ate }));
    }
    for (const p of profs) conferir(await salvarExpediente(db, acesso, form({ profissional: p.id, ...turnos })));
    for (const s of demo.servicos) {
      conferir(await salvarServico(db, acesso, form({ nome: s.nome, duracao: String(s.duracao), preco: s.preco, descricao: s.descricao ?? "", profissionais: profs.map((p) => p.id) })));
    }

    // Alguns agendamentos fictícios nos próximos dias úteis, para a agenda não começar vazia.
    const servicos = await comLoja(db, r.loja.id, (trx) => trx.selectFrom("servicos").select("id").orderBy("ordem").execute());
    const hoje = hojeNoFuso(new Date(), r.loja.fuso);
    const exemplos = [
      { dia: 1, hora: "10:00", nome: "Cliente Exemplo Um", telefone: "(20) 90000-0001" },
      { dia: 1, hora: "15:00", nome: "Cliente Exemplo Dois", telefone: "(20) 90000-0002" },
      { dia: 2, hora: "11:00", nome: "Cliente Exemplo Três", telefone: "(20) 90000-0003" },
    ];
    let criados = 0;
    for (const [i, e] of exemplos.entries()) {
      // Procura o próximo dia em que a loja abre, a partir de hoje + e.dia.
      for (let salto = 0; salto < 7; salto++) {
        const data = somarDias(hoje, e.dia + salto);
        const res = await reservar(db, {
          loja: r.loja,
          servicoId: servicos[i % servicos.length]!.id,
          profissionalId: null,
          data,
          hora: e.hora,
          nome: e.nome,
          telefone: e.telefone,
          origem: "site",
        });
        if (res.ok) {
          criados++;
          break;
        }
      }
    }
    console.log(`Criada: ${demo.nome} (${criados} agendamentos de exemplo) → ${urlDaLoja(c, demo.slug)}`);
  }
  console.log(`\nPainel: ${c.urlPainel}`);
} finally {
  await db.destroy();
}
