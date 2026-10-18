import { Archivo, Big_Shoulders } from "next/font/google";
import { InicioLetreiro } from "./Inicio";
import type { Modelo } from "../tipos";

/** Letreiro: barbearia clássica — azulejo, letreiro condensado e o poste listrado. Ver DESIGN.md. */
const titulo = Big_Shoulders({ subsets: ["latin"], variable: "--fonte-letreiro-titulo", display: "swap", preload: false, axes: ["opsz"] });
const texto = Archivo({ subsets: ["latin"], variable: "--fonte-letreiro-texto", display: "swap", preload: false, axes: ["wdth"] });

export const letreiro: Modelo = {
  id: "letreiro",
  nome: "Letreiro",
  descricao: "Azulejo claro, letras de letreiro e o poste listrado de barbearia. Direto e marcante.",
  sugerido: "Barbearias e estúdios masculinos",
  fontes: `${titulo.variable} ${texto.variable}`,
  tokens: (cor, corTexto) => ({
    "--l-fundo": "#F3F4F1",
    "--l-superficie": "#FFFFFF",
    "--l-texto": "#13203B",
    "--l-suave": "#4B5567",
    "--marca": cor,
    "--marca-texto": corTexto,
    "--l-foco": "#13203B",
    "--raio": "0px",
    "--raio-bloco": "0px",
    "--f-titulo": "var(--fonte-letreiro-titulo)",
    "--f-texto": "var(--fonte-letreiro-texto)",
    "--titulo-peso": "800",
    "--titulo-caixa": "uppercase",
    "--titulo-espaco": "-0.01em",
  }),
  Inicio: InicioLetreiro,
};
