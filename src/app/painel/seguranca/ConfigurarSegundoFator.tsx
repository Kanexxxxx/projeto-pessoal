"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { avancarSegundoFatorAcao, type EstadoSegundoFator } from "./acoes";

export function ConfigurarSegundoFator() {
  const [estado, acao, pendente] = useActionState<EstadoSegundoFator, FormData>(avancarSegundoFatorAcao, { etapa: "senha" });

  if (estado.etapa === "senha") {
    return (
      <form action={acao} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-(--suave)">
          Você vai precisar de um aplicativo autenticador no celular (por exemplo, Google Authenticator, Microsoft Authenticator ou
          2FAS). Para começar, confirme sua senha.
        </p>
        <Campo id="senha" name="senha" type="password" rotulo="Senha atual" autoComplete="current-password" required />
        {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
        <Botao pendente={pendente}>{pendente ? "Conferindo…" : "Continuar"}</Botao>
      </form>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">1. No aplicativo, leia este QR</p>
        {/* SVG gerado no servidor pelo nosso codificador, com cores fixas. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI gerado no servidor: não há o que otimizar */}
        <img src={estado.qr} alt="QR para cadastrar a conta no aplicativo autenticador" width={200} height={200} className="rounded-lg bg-white p-2" />
        <p className="text-sm text-(--suave)">
          Sem câmera? Digite a chave: <code className="font-mono text-(--texto)">{estado.segredo}</code>
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">2. Guarde os códigos de reserva</p>
        <p className="text-sm text-(--suave)">Cada um funciona uma vez, se você perder o celular. Guarde fora do celular.</p>
        <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
          {estado.codigosReserva.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <Campo id="codigo" name="codigo" rotulo="3. Digite o código que o aplicativo mostra" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      <Botao pendente={pendente}>{pendente ? "Conferindo…" : "Ativar verificação em duas etapas"}</Botao>
    </form>
  );
}
