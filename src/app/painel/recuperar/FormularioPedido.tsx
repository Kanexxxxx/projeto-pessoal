"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { pedirAcao, type EstadoPedido } from "./acoes";

export function FormularioPedido() {
  const [estado, acao, pendente] = useActionState<EstadoPedido, FormData>(pedirAcao, {});
  if (estado.enviado) {
    return (
      <Aviso tipo="info">
        Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale 30 minutos. Confira também a
        caixa de spam.
      </Aviso>
    );
  }
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <Campo id="email" name="email" type="email" rotulo="E-mail da conta" autoComplete="username" inputMode="email" required />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      <Botao pendente={pendente}>{pendente ? "Enviando…" : "Enviar link"}</Botao>
      <a href="/entrar" className="text-sm underline underline-offset-4">
        Voltar para o login
      </a>
    </form>
  );
}
