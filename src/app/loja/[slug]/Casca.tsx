import { textoSobre } from "@/dominio/contato";
import type { SituacaoLoja } from "@/servidor/bd/tipos";
import { estiloDosTokens, type Modelo } from "./modelos/tipos";

/**
 * Parte comum de toda página do site da loja: fontes e cores do modelo,
 * atalho para o conteúdo, aviso de implantação e, na prévia de outro modelo,
 * uma faixa dizendo que aquele não é o modelo publicado.
 */
export function Casca({
  modelo,
  cor,
  situacao,
  previa,
  children,
}: {
  modelo: Modelo;
  cor: string;
  situacao: SituacaoLoja;
  previa?: { publicado: string } | null;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${modelo.fontes} min-h-dvh bg-(--l-fundo) font-(family-name:--f-texto) text-(--l-texto) antialiased`}
      style={estiloDosTokens(modelo.tokens(cor, textoSobre(cor)))}
    >
      <a
        href="#conteudo"
        className="sr-only z-50 bg-(--l-texto) px-4 py-3 text-(--l-fundo) focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      {previa || situacao === "implantacao" ? (
        <aside aria-label="Avisos">
          {previa ? (
            <p className="bg-(--l-texto) px-4 py-2.5 text-center text-sm text-(--l-fundo)">
              Prévia do modelo {modelo.nome}. O site publicado usa o modelo {previa.publicado}.{" "}
              <a href="?" className="underline underline-offset-4">
                Ver o publicado
              </a>
            </p>
          ) : null}
          {situacao === "implantacao" ? (
            <p className="bg-(--marca) px-4 py-2 text-center text-sm text-(--marca-texto)">Site em preparação: os agendamentos ainda são de teste.</p>
          ) : null}
        </aside>
      ) : null}
      {children}
    </div>
  );
}
