"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { useTokenDoFragmento } from "@/componentes/useTokenDoFragmento";
import { redefinirAcao, type EstadoRedefinir } from "../recuperar/acoes";

export function FormularioRedefinir() {
  const token = useTokenDoFragmento();
  const [estado, acao, pendente] = useActionState<EstadoRedefinir, FormData>(redefinirAcao, {});
  if (token === undefined) return <p className="text-(--suave)">Carregando…</p>;
  if (!token) {
    return (
      <Aviso>
        Link incompleto. Abra o link do e-mail de novo ou <a href="/recuperar" className="underline">peça uma nova redefinição</a>.
      </Aviso>
    );
  }
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Campo id="senha" name="senha" type="password" rotulo="Nova senha" ajuda="Pelo menos 10 caracteres. Uma frase fácil de lembrar funciona bem." autoComplete="new-password" required minLength={10} />
      <Campo id="confirmacao" name="confirmacao" type="password" rotulo="Repita a nova senha" autoComplete="new-password" required />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      <Botao pendente={pendente}>{pendente ? "Salvando…" : "Salvar nova senha"}</Botao>
    </form>
  );
}
