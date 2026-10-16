"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { entrarAcao, type EstadoForm } from "./acoes";

export function FormularioEntrar() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(entrarAcao, {});
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <Campo id="email" name="email" type="email" rotulo="E-mail" autoComplete="username" inputMode="email" required />
      <Campo id="senha" name="senha" type="password" rotulo="Senha" autoComplete="current-password" required />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      <Botao pendente={pendente}>{pendente ? "Entrando…" : "Entrar"}</Botao>
    </form>
  );
}
