import { Aviso, Cartao } from "@/componentes/formulario";
import { contexto } from "@/servidor/acesso";
import { ehOperadorAtivo } from "@/servidor/auth/operadores";
import { exigirSessao } from "@/servidor/sessao";
import { ConfigurarSegundoFator } from "./ConfigurarSegundoFator";
import { RegenerarReservas } from "./RegenerarReservas";

export const metadata = { title: "Segurança" };

export default async function PaginaSeguranca() {
  const sessao = await exigirSessao();
  const operador = await ehOperadorAtivo(contexto().db, sessao.user.id);
  return (
    <Cartao titulo="Verificação em duas etapas">
      {sessao.user.twoFactorEnabled ? (
        <div>
          <Aviso tipo="info">Ativa. A cada login o painel pede o código do aplicativo autenticador.</Aviso>
          <RegenerarReservas />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {operador ? <Aviso tipo="info">Para operadores da plataforma, a verificação em duas etapas é obrigatória.</Aviso> : null}
          <ConfigurarSegundoFator />
        </div>
      )}
    </Cartao>
  );
}
