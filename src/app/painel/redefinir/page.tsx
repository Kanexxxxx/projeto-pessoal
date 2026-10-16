import { Cartao } from "@/componentes/formulario";
import { FormularioRedefinir } from "./FormularioRedefinir";

export const metadata = { title: "Nova senha" };

export default function PaginaRedefinir() {
  return (
    <Cartao titulo="Criar nova senha">
      <FormularioRedefinir />
    </Cartao>
  );
}
