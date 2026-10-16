"use client";

import { startTransition, useActionState, useRef, type ReactNode } from "react";
import { Aviso, Botao } from "./formulario";

export type EstadoAcao = { erro?: string; ok?: string };
type Acao = (anterior: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;

/**
 * Formulário do painel ligado a uma Server Action. Envia por onSubmit para o
 * React não limpar os campos quando a ação devolve erro; limpa só quando dá
 * certo e `limpar` estiver ligado (formulários de inclusão).
 */
export function FormularioAcao({
  acao,
  botao,
  pendenteTexto = "Salvando…",
  limpar = false,
  className = "flex flex-col gap-4",
  children,
}: {
  acao: Acao;
  botao: string;
  pendenteTexto?: string;
  limpar?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [estado, despachar, pendente] = useActionState<EstadoAcao, FormData>(async (anterior, dados) => {
    const r = await acao(anterior, dados);
    if (r.ok && limpar) ref.current?.reset();
    return r;
  }, {});
  return (
    <form
      ref={ref}
      className={className}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => despachar(dados));
      }}
    >
      {children}
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      {estado.ok ? <Aviso tipo="info">{estado.ok}</Aviso> : null}
      <div>
        <Botao pendente={pendente}>{pendente ? pendenteTexto : botao}</Botao>
      </div>
    </form>
  );
}

/** Botão pequeno de ação (cancelar, desativar, remover), com confirmação opcional. */
export function BotaoAcao({
  acao,
  campos,
  rotulo,
  confirmar,
  perigo = false,
}: {
  acao: Acao;
  campos: Record<string, string>;
  rotulo: string;
  confirmar?: string;
  perigo?: boolean;
}) {
  const [estado, despachar, pendente] = useActionState<EstadoAcao, FormData>(acao, {});
  return (
    <form
      className="inline-flex flex-col items-start gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const dados = new FormData(e.currentTarget);
        startTransition(() => despachar(dados));
      }}
    >
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <button
        type="submit"
        disabled={pendente}
        className={`rounded-md border px-2.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--destaque) disabled:opacity-60 ${
          perigo ? "border-(--erro) text-(--erro)" : "border-(--borda)"
        }`}
      >
        {pendente ? "…" : rotulo}
      </button>
      {estado.erro ? <span className="text-xs text-(--erro)" role="alert">{estado.erro}</span> : null}
    </form>
  );
}
