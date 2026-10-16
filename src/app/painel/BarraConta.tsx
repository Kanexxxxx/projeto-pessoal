import { sairAcao } from "./acoes";

/** Links da conta, no topo das páginas com sessão. */
export function BarraConta({ nome }: { nome: string }) {
  return (
    <nav aria-label="Conta" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-(--suave)">
      <a href="/" className="underline-offset-4 hover:underline">
        Início
      </a>
      <a href="/seguranca" className="underline-offset-4 hover:underline">
        Segurança
      </a>
      <span aria-hidden>·</span>
      <span>{nome.split(" ")[0]}</span>
      <form action={sairAcao}>
        <button type="submit" className="underline underline-offset-4">
          Sair
        </button>
      </form>
    </nav>
  );
}
