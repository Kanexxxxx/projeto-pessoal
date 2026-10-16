import { config } from "@/servidor/config";

export const dynamic = "force-dynamic";

export default function PaginaPlataforma() {
  const { marca, urlPainel } = config();
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm tracking-wide text-(--suave) uppercase">{marca}</p>
      <h1 className="text-3xl font-semibold leading-tight">Site e agenda online para salões, barbearias e estúdios.</h1>
      <p className="text-(--suave)">Em preparação. A agenda funciona pelo celular, com a identidade de cada negócio.</p>
      <p>
        <a className="underline underline-offset-4" href={`${urlPainel}/entrar`}>
          Entrar no painel
        </a>
      </p>
    </main>
  );
}
