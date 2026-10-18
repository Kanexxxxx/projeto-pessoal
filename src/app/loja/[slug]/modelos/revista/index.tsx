import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { InicioRevista } from "./Inicio";
import type { Modelo } from "../tipos";

/** Revista: revista de moda — capa na cor da loja, Didone, agenda da semana. Ver DESIGN.md. */
const titulo = Bodoni_Moda({ subsets: ["latin"], variable: "--fonte-revista-titulo", display: "swap", preload: false, axes: ["opsz"], style: ["normal", "italic"] });
const texto = Hanken_Grotesk({ subsets: ["latin"], variable: "--fonte-revista-texto", display: "swap", preload: false });

export const revista: Modelo = {
  id: "revista",
  nome: "Revista",
  descricao: "Capa de revista de moda na cor da loja, títulos elegantes e a agenda da semana. Sofisticado.",
  sugerido: "Salões de beleza e estética",
  fontes: `${titulo.variable} ${texto.variable}`,
  tokens: (cor, corTexto) => ({
    "--l-fundo": "#FFFFFF",
    "--l-superficie": "#F2F1EF",
    "--l-texto": "#141414",
    "--l-suave": "#5E5E5E",
    "--marca": cor,
    "--marca-texto": corTexto,
    "--l-foco": "#141414",
    "--raio": "0px",
    "--raio-bloco": "0px",
    "--f-titulo": "var(--fonte-revista-titulo)",
    "--f-texto": "var(--fonte-revista-texto)",
    "--titulo-peso": "400",
    "--titulo-caixa": "none",
    "--titulo-espaco": "-0.02em",
  }),
  Inicio: InicioRevista,
};
