"use client";

import { useActionState, useState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { verificarAcao, type EstadoForm } from "../acoes";

export function FormularioVerificar() {
  const [metodo, setMetodo] = useState<"totp" | "reserva">("totp");
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(verificarAcao, {});
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="metodo" value={metodo} />
      {metodo === "totp" ? (
        <Campo
          id="codigo"
          name="codigo"
          rotulo="Código do aplicativo autenticador"
          ajuda="Seis dígitos, renovados a cada 30 segundos."
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
        />
      ) : (
        <Campo id="codigo" name="codigo" rotulo="Código de reserva" ajuda="Cada código de reserva funciona uma vez só." autoComplete="off" required />
      )}
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      <Botao pendente={pendente}>{pendente ? "Conferindo…" : "Confirmar"}</Botao>
      <button
        type="button"
        className="text-left text-sm underline underline-offset-4"
        onClick={() => setMetodo(metodo === "totp" ? "reserva" : "totp")}
      >
        {metodo === "totp" ? "Sem o celular? Usar um código de reserva" : "Usar o aplicativo autenticador"}
      </button>
    </form>
  );
}
