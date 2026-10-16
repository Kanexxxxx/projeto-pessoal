import { Cartao } from "@/componentes/formulario";
import { AceitarConvite } from "./AceitarConvite";

export const metadata = { title: "Convite" };

export default function PaginaConvite() {
  return (
    <Cartao titulo="Criar seu acesso">
      <AceitarConvite />
    </Cartao>
  );
}
