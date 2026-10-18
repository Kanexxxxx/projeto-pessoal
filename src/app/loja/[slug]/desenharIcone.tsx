import { ImageResponse } from "next/og";
import { textoSobre } from "@/dominio/contato";
import { iniciais } from "@/dominio/funcionamento";

/** Ícone da loja: as iniciais sobre a cor da marca (usado por icon.tsx e apple-icon.tsx). */
export function desenharIcone(nome: string, cor: string, lado: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: cor,
          color: textoSobre(cor),
          fontSize: lado * 0.46,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        {iniciais(nome)}
      </div>
    ),
    { width: lado, height: lado },
  );
}
