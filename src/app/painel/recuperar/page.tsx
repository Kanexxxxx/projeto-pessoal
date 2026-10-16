import { Cartao } from "@/componentes/formulario";
import { FormularioPedido } from "./FormularioPedido";

export const metadata = { title: "Recuperar acesso" };

export default function PaginaRecuperar() {
  return (
    <Cartao titulo="Recuperar acesso">
      <FormularioPedido />
    </Cartao>
  );
}
