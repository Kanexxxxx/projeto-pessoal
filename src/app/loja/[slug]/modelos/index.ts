import type { ModeloSite } from "@/servidor/bd/tipos";
import { letreiro } from "./letreiro";
import { paleta } from "./paleta";
import { revista } from "./revista";
import type { Modelo } from "./tipos";

/** Biblioteca de modelos de site (DESIGN.md). A dona escolhe um em Site. */
export const MODELOS: Record<ModeloSite, Modelo> = { letreiro, revista, paleta };

export function modeloPorId(id: unknown): Modelo | null {
  return typeof id === "string" && Object.hasOwn(MODELOS, id) ? MODELOS[id as ModeloSite] : null;
}
