"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { regenerarReservasAcao, type EstadoReservas } from "./acoes";

export function RegenerarReservas() {
  const [estado, acao, pendente] = useActionState(regenerarReservasAcao, {} as EstadoReservas);
  return (
    <div className="mt-5 flex flex-col gap-4">
      <p className="text-sm">Gere novos códigos de reserva se os anteriores acabaram ou foram expostos. Os anteriores deixam de funcionar imediatamente.</p>
      <form action={acao} className="flex flex-col gap-3">
        <Campo rotulo="Confirme sua senha" id="senha-reservas" name="senha" type="password" autoComplete="current-password" required maxLength={256} />
        <Campo rotulo="Código do autenticador" ajuda="Use um código que ainda não usou neste acesso." id="codigo-reservas" name="codigo" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9 ]{6,8}" maxLength={8} />
        <Botao pendente={pendente}>{pendente ? "Gerando…" : "Gerar novos códigos de reserva"}</Botao>
      </form>
      {estado.erro ? <Aviso tipo="erro">{estado.erro}</Aviso> : null}
      {estado.codigos ? <div className="flex flex-col gap-3">
        <Aviso tipo="info">Guarde estes códigos em local seguro. Cada um só pode ser usado uma vez.</Aviso>
        <ul className="grid grid-cols-2 gap-2 font-mono">{estado.codigos.map(codigo => <li key={codigo}>{codigo}</li>)}</ul>
      </div> : null}
    </div>
  );
}
