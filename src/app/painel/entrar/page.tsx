import { redirect } from "next/navigation";
import { Aviso, Cartao } from "@/componentes/formulario";
import { sessaoAtual } from "@/servidor/sessao";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await sessaoAtual()) redirect("/");
  const { expirou, redefinida } = await searchParams;
  return (
    <Cartao titulo="Entrar no painel">
      <div className="flex flex-col gap-5">
        {expirou ? <Aviso tipo="info">A verificação expirou. Entre de novo.</Aviso> : null}
        {redefinida ? <Aviso tipo="info">Senha alterada. Entre com a nova senha.</Aviso> : null}
        <FormularioEntrar />
        <a href="/recuperar" className="text-sm underline underline-offset-4">
          Esqueci minha senha
        </a>
      </div>
    </Cartao>
  );
}
