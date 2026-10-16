import type { Kysely } from "kysely";
import { rotuloDeMinutos } from "../../dominio/datas";
import type { BD } from "../bd/tipos";
import { lerConfig, lerExpedientes, lerProfissionais, lerServicos, type Config, type Profissional, type Servico } from "./catalogo";
import { comLoja } from "./escopo";
import { lojaPorSlug, type Loja } from "./lojas";

export type HorarioDoDia = { dia: number; faixas: string[] };

export type DadosSite = {
  loja: Loja;
  config: Config;
  servicos: Servico[];
  profissionais: Profissional[];
  horario: HorarioDoDia[];
};

/** Junta os turnos de todos os profissionais: "09:00–12:00", "14:00–19:00". */
export function horarioDeFuncionamento(turnos: { diaSemana: number; inicioMin: number; fimMin: number }[]): HorarioDoDia[] {
  const dias: HorarioDoDia[] = [];
  for (let dia = 0; dia < 7; dia++) {
    const doDia = turnos.filter((t) => t.diaSemana === dia).sort((a, b) => a.inicioMin - b.inicioMin);
    const juntos: { inicio: number; fim: number }[] = [];
    for (const t of doDia) {
      const ultimo = juntos.at(-1);
      if (ultimo && t.inicioMin <= ultimo.fim) ultimo.fim = Math.max(ultimo.fim, t.fimMin);
      else juntos.push({ inicio: t.inicioMin, fim: t.fimMin });
    }
    dias.push({ dia, faixas: juntos.map((j) => `${rotuloDeMinutos(j.inicio)}–${rotuloDeMinutos(j.fim)}`) });
  }
  return dias;
}

/**
 * Tudo o que o site público mostra. Só dado público da loja: nenhum cliente,
 * reserva ou contato da equipe sai daqui.
 */
export async function dadosDoSite(db: Kysely<BD>, slug: string): Promise<DadosSite | null> {
  const loja = await lojaPorSlug(db, slug);
  if (!loja) return null;
  return comLoja(db, loja.id, async (trx) => {
    const profissionais = await lerProfissionais(trx, true);
    const ativos = new Set(profissionais.map((p) => p.id));
    const servicos = (await lerServicos(trx, true))
      .map((s) => ({ ...s, profissionais: s.profissionais.filter((p) => ativos.has(p)) }))
      .filter((s) => s.profissionais.length > 0);
    const expedientes = (await lerExpedientes(trx)).filter((e) => ativos.has(e.profissionalId));
    return { loja, config: await lerConfig(trx), servicos, profissionais, horario: horarioDeFuncionamento(expedientes) };
  });
}
