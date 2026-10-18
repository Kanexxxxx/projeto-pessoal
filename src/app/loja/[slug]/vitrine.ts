import "server-only";
import { formatarPreco, linkWhatsApp, telefoneLegivel } from "@/dominio/contato";
import { hojeNoFuso, nomeDoDia } from "@/dominio/datas";
import { diaCurto, diaRelativo, duracaoLegivel, iniciais, situacaoAgora } from "@/dominio/funcionamento";
import type { HorariosVitrine, VagaLivre } from "@/servidor/lojas/agenda";
import { SEGMENTOS } from "@/servidor/lojas/lojas";
import type { DadosSite } from "@/servidor/lojas/site";
import type { VagaVitrine, Vitrine } from "./modelos/tipos";

// Semana como a loja lê: começa na segunda.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function linkReserva(p: { servicoId: string; profissionalId?: string | null; data?: string; hora?: string }): string {
  const q = new URLSearchParams({ servico: p.servicoId });
  if (p.data && p.hora) {
    q.set("prof", p.profissionalId ?? "qualquer");
    q.set("data", p.data);
    q.set("hora", p.hora);
  }
  return `/agendar?${q}`;
}

function linkMapa(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

/** Junta os dados públicos da loja e os horários livres no formato que os modelos recebem. */
export function montarVitrine(site: DadosSite, horarios: HorariosVitrine, agora: Date, marca: string): Vitrine {
  const { loja, config } = site;
  const hoje = hojeNoFuso(agora, loja.fuso);
  const vaga = (v: VagaLivre, servicoId: string, profissionalId?: string | null): VagaVitrine => ({
    data: v.data,
    dia: diaRelativo(v.data, hoje),
    diaCurto: diaCurto(v.data, hoje),
    hora: v.hora,
    href: linkReserva({ servicoId, profissionalId, data: v.data, hora: v.hora }),
  });

  const servicos = site.servicos.map((s) => ({
    id: s.id,
    nome: s.nome,
    descricao: s.descricao,
    duracao: duracaoLegivel(s.duracaoMin),
    duracaoMin: s.duracaoMin,
    preco: formatarPreco(s.precoCentavos),
    temPreco: s.precoCentavos !== null,
    href: linkReserva({ servicoId: s.id }),
    proximas: (horarios.porServico.get(s.id) ?? []).map((v) => vaga(v, s.id)),
  }));

  let primeira: { v: VagaLivre; id: string; nome: string } | null = null;
  for (const s of site.servicos) {
    const v = horarios.porServico.get(s.id)?.[0];
    if (v && (!primeira || v.inicio < primeira.v.inicio)) primeira = { v, id: s.id, nome: s.nome };
  }
  const proxima: Vitrine["proxima"] = primeira ? { ...vaga(primeira.v, primeira.id), servico: primeira.nome, servicoId: primeira.id } : null;

  const nomeDoServico = new Map(site.servicos.map((s) => [s.id, s.nome]));
  const agenda = horarios.porDia.map((d) => ({
    data: d.data,
    dia: diaRelativo(d.data, hoje),
    livres: d.livres,
    horas: d.horas.map((h) => ({
      hora: h.hora,
      href: `/agendar?${new URLSearchParams({ data: h.data, hora: h.hora })}`,
      todos: site.servicos.every((s) => h.servicoIds.includes(s.id)),
      servicos: h.servicoIds.filter((id) => nomeDoServico.has(id)).map((id) => ({ nome: nomeDoServico.get(id)!, href: linkReserva({ servicoId: id, data: h.data, hora: h.hora }) })),
    })),
  }));

  const equipe = site.profissionais.map((p) => {
    const livre = horarios.porProfissional.get(p.id) ?? null;
    const servico = livre ? site.servicos.find((s) => s.id === livre.servicoId) : undefined;
    return {
      id: p.id,
      nome: p.nome,
      iniciais: iniciais(p.nome),
      servicos: site.servicos.filter((s) => s.profissionais.includes(p.id)).map((s) => s.nome),
      proxima: livre && servico ? { ...vaga(livre, servico.id, p.id), servico: servico.nome } : null,
    };
  });

  const semana = ORDEM_DIAS.map((dia) => {
    const h = site.horario.find((x) => x.dia === dia);
    const intervalos = h?.intervalos ?? [];
    return {
      dia,
      nome: nomeDoDia(dia),
      curto: nomeDoDia(dia, true),
      hoje: new Date(`${hoje}T12:00:00Z`).getUTCDay() === dia,
      aberto: intervalos.length > 0,
      texto: intervalos.length ? (h?.faixas ?? []).join(" · ") : "Fechado",
      intervalos,
    };
  });

  const [ano, mes] = hoje.split("-").map(Number) as [number, number];
  return {
    loja: {
      nome: loja.nome,
      slug: loja.slug,
      segmento: loja.segmento,
      segmentoNome: SEGMENTOS[loja.segmento].split(" (")[0]!,
      iniciais: iniciais(loja.nome),
    },
    chamada: config.chamada,
    sobre: config.sobre,
    endereco: config.endereco,
    cor: config.cor,
    contato: {
      whatsapp: config.whatsapp
        ? { texto: telefoneLegivel(config.whatsapp), href: linkWhatsApp(config.whatsapp, `Olá, ${loja.nome}! Vim pelo site.`) }
        : null,
      instagram: config.instagram ? { texto: `@${config.instagram}`, href: `https://instagram.com/${config.instagram}` } : null,
      mapa: config.endereco ? linkMapa(config.endereco) : null,
    },
    servicos,
    equipe,
    semana,
    agora: situacaoAgora(
      site.horario.map((h) => ({ dia: h.dia, intervalos: h.intervalos })),
      agora,
      loja.fuso,
    ),
    agenda,
    proxima,
    agendarHref: "/agendar",
    marca,
    mes: `${MESES[mes - 1]} de ${ano}`,
  };
}
