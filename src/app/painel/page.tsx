import { redirect } from "next/navigation";
import { contexto } from "@/servidor/acesso";
import { ehOperadorAtivo } from "@/servidor/auth/operadores";
import { exigirSessao } from "@/servidor/sessao";
import { sairAcao } from "./acoes";

export const dynamic = "force-dynamic";

export default async function PaginaPainel() {
  const sessao = await exigirSessao();
  const operador = await ehOperadorAtivo(contexto().db, sessao.user.id);
  if (operador && !sessao.user.twoFactorEnabled) redirect("/seguranca");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {sessao.user.name.split(" ")[0]}</h1>
        <p className="text-(--suave)">{operador ? "Operador da plataforma." : "Conta ativa."}</p>
      </div>
      <p className="text-sm text-(--suave)">
        As lojas, a agenda e o CRM chegam nas próximas etapas. <a href="/seguranca" className="underline underline-offset-4">Segurança da conta</a>
      </p>
      <form action={sairAcao}>
        <button type="submit" className="text-sm underline underline-offset-4">
          Sair
        </button>
      </form>
    </main>
  );
}
