import { Cartao } from "@/componentes/formulario";
import { FormularioVerificar } from "./FormularioVerificar";

export const metadata = { title: "Verificação em duas etapas" };
export const dynamic = "force-dynamic";

export default function PaginaVerificar() {
  return (
    <Cartao titulo="Verificação em duas etapas">
      <FormularioVerificar />
    </Cartao>
  );
}
