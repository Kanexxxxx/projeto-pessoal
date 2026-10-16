import type { InputHTMLAttributes, ReactNode } from "react";

/** Peças de formulário do painel: rótulo sempre visível, foco evidente, erro anunciado. */
export function Campo({ rotulo, ajuda, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; ajuda?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        className="rounded-lg border border-(--borda) bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-(--destaque)"
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        {...props}
      />
      {ajuda ? (
        <p id={`${id}-ajuda`} className="text-sm text-(--suave)">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}

const CAMPO = "rounded-lg border border-(--borda) bg-transparent px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-(--destaque)";

export function Selecao({
  rotulo,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string; id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <select id={id} className={`${CAMPO} bg-(--fundo)`} {...props}>
        {children}
      </select>
    </div>
  );
}

export function AreaTexto({ rotulo, ajuda, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo: string; ajuda?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <textarea id={id} className={`${CAMPO} min-h-24`} aria-describedby={ajuda ? `${id}-ajuda` : undefined} {...props} />
      {ajuda ? (
        <p id={`${id}-ajuda`} className="text-sm text-(--suave)">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}

export function Botao({ children, pendente, ...props }: { children: ReactNode; pendente?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={pendente}
      aria-busy={pendente || undefined}
      className="rounded-lg bg-(--destaque) px-4 py-2.5 font-medium text-(--fundo) outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--destaque) disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "info"; children: ReactNode }) {
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={tipo === "erro" ? "text-sm text-(--erro)" : "text-sm text-(--suave)"}>
      {children}
    </p>
  );
}

export function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-(--borda) p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold">{titulo}</h1>
      {children}
    </section>
  );
}

const hora = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function mensagemDeLimite(liberaEm: Date): string {
  return `Muitas tentativas. Tente de novo depois das ${hora.format(liberaEm)}.`;
}
