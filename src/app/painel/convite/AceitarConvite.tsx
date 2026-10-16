"use client";

import { useActionState, useEffect, useState } from "react";
import { Aviso, Botao, Campo } from "@/componentes/formulario";
import { useTokenDoFragmento } from "@/componentes/useTokenDoFragmento";
import { aceitarComContaAcao, aceitarConviteAcao, consultarConviteAcao, type DadosConvite, type EstadoAceite } from "./acoes";

export function AceitarConvite() {
  const token = useTokenDoFragmento();
  const [convite, setConvite] = useState<DadosConvite | undefined>(undefined);
  const [estado, acao, pendente] = useActionState<EstadoAceite, FormData>(aceitarConviteAcao, {});
  const [estadoConta, acaoConta, pendenteConta] = useActionState<EstadoAceite, FormData>(aceitarComContaAcao, {});

  useEffect(() => {
    if (token) consultarConviteAcao(token).then(setConvite, () => setConvite(null));
  }, [token]);

  if (token === undefined || (token && convite === undefined)) return <p className="text-(--suave)">Carregando…</p>;
  if (!token || !convite) {
    return <Aviso>Este convite é inválido, já foi usado ou expirou. Peça um novo a quem convidou você.</Aviso>;
  }
  const descricao = (
    <p className="text-sm text-(--suave)">
      Convite para <strong className="text-(--texto)">{convite.email}</strong> como {convite.papel}
      {convite.loja ? <strong className="text-(--texto)"> {convite.loja}</strong> : null}.
    </p>
  );
  if (convite.comConta) {
    return (
      <form action={acaoConta} className="flex flex-col gap-4">
        {descricao}
        <p className="text-sm">Você já está conectado com esta conta. Confirme para ganhar acesso à loja.</p>
        <input type="hidden" name="token" value={token} />
        {estadoConta.erro ? <Aviso>{estadoConta.erro}</Aviso> : null}
        <Botao pendente={pendenteConta}>{pendenteConta ? "Aceitando…" : "Aceitar acesso"}</Botao>
      </form>
    );
  }
  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {descricao}
      <input type="hidden" name="token" value={token} />
      <Campo id="nome" name="nome" rotulo="Seu nome" autoComplete="name" required maxLength={80} />
      <Campo id="senha" name="senha" type="password" rotulo="Crie uma senha" ajuda="Pelo menos 10 caracteres. Uma frase fácil de lembrar funciona bem." autoComplete="new-password" required minLength={10} />
      <Campo id="confirmacao" name="confirmacao" type="password" rotulo="Repita a senha" autoComplete="new-password" required />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}
      <Botao pendente={pendente}>{pendente ? "Criando acesso…" : "Criar acesso"}</Botao>
    </form>
  );
}
