import { Cartao } from "@/componentes/formulario";
import { contexto } from "@/servidor/acesso";
import { exigirOperador } from "@/servidor/sessao";
import { FormularioNovaLoja } from "./FormularioNovaLoja";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova loja" };

export default async function PaginaNovaLoja() {
  await exigirOperador();
  const { dominioBase, protocolo } = contexto().config;
  return (
    <div className="flex flex-col gap-4">
      <p className="mx-auto w-full max-w-md text-sm">
        <a href="/" className="text-(--suave) underline underline-offset-4">
          ← Lojas
        </a>
      </p>
      <Cartao titulo="Nova loja">
        <FormularioNovaLoja dominio={dominioBase} protocolo={protocolo} />
      </Cartao>
    </div>
  );
}
