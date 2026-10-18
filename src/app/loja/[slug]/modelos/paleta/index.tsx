import { Bricolage_Grotesque } from "next/font/google";
import { misturar } from "@/dominio/contato";
import { InicioPaleta } from "./Inicio";
import type { Modelo } from "../tipos";

/** Paleta: cartela de esmaltes — cada serviço é uma amostra de cor. Ver DESIGN.md. */
const fonte = Bricolage_Grotesque({ subsets: ["latin"], variable: "--fonte-paleta", display: "swap", preload: false, axes: ["opsz", "wdth"] });

export const paleta: Modelo = {
  id: "paleta",
  nome: "Paleta",
  descricao: "Cada serviço vira uma amostra de cor, como numa cartela de esmaltes. Leve e divertido.",
  sugerido: "Estúdios de unhas, sobrancelha e estética",
  fontes: fonte.variable,
  tokens: (cor, corTexto) => ({
    "--l-fundo": misturar(cor, "#ffffff", 0.08),
    "--l-superficie": "#FFFFFF",
    "--l-texto": "#2A1726",
    "--l-suave": "#6E5468",
    "--marca": cor,
    "--marca-texto": corTexto,
    "--l-foco": "#2A1726",
    "--raio": "999px",
    "--raio-bloco": "28px",
    "--f-titulo": "var(--fonte-paleta)",
    "--f-texto": "var(--fonte-paleta)",
    "--titulo-peso": "750",
    "--titulo-caixa": "none",
    "--titulo-espaco": "-0.03em",
  }),
  Inicio: InicioPaleta,
};
