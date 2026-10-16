"use client";

import { useActionState } from "react";
import { formatarPreco, linkWhatsApp } from "@/dominio/contato";
import { dataPorExtenso } from "@/dominio/datas";
import { reservarAcao, type EstadoReserva } from "./acoes";

const CAMPO =
  "rounded-xl border border-(--l-borda) bg-(--l-superficie) px-3.5 py-3 text-base outline-none focus-visible:border-(--marca) focus-visible:ring-2 focus-visible:ring-(--marca)";

export function FormularioReserva(p: {
  servicoId: string;
  profissionalId: string;
  data: string;
  hora: string;
  lojaNome: string;
  whatsappLoja: string | null;
  voltar: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoReserva, FormData>(reservarAcao, {});

  if (estado.reserva) {
    const r = estado.reserva;
    const quando = `${dataPorExtenso(r.data)} às ${r.hora}`;
    const mensagem = `Olá, ${p.lojaNome}! Acabei de agendar pelo site: ${r.servico} com ${r.profissional}, ${quando}. Nome: ${r.nome}.`;
    return (
      <div role="status" className="flex flex-col gap-4 rounded-2xl border border-(--marca) bg-(--l-superficie) p-5">
        <p className="text-xl font-semibold">Horário reservado, {r.nome}!</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-(--l-suave)">Serviço</dt>
          <dd>{r.servico}</dd>
          <dt className="text-(--l-suave)">Com</dt>
          <dd>{r.profissional}</dd>
          <dt className="text-(--l-suave)">Quando</dt>
          <dd className="first-letter:uppercase">{quando}</dd>
          <dt className="text-(--l-suave)">Valor</dt>
          <dd>{formatarPreco(r.precoCentavos)}</dd>
        </dl>
        {p.whatsappLoja ? (
          <a href={linkWhatsApp(p.whatsappLoja, mensagem)} target="_blank" rel="noreferrer" className="rounded-xl bg-(--marca) py-3 text-center font-medium text-(--marca-texto)">
            Avisar a loja no WhatsApp
          </a>
        ) : null}
        <p className="text-sm text-(--l-suave)">Para cancelar ou remarcar, fale direto com a loja{p.whatsappLoja ? " pelo WhatsApp" : ""}.</p>
        <a href="/" className="text-sm underline underline-offset-4">
          Voltar ao site
        </a>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="servico" value={p.servicoId} />
      <input type="hidden" name="profissional" value={p.profissionalId} />
      <input type="hidden" name="data" value={p.data} />
      <input type="hidden" name="hora" value={p.hora} />
      {/* Armadilha para robô: escondida de pessoas e de leitores de tela. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="text-sm font-medium">
          Seu nome
        </label>
        <input id="nome" name="nome" required maxLength={80} autoComplete="name" className={CAMPO} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefone" className="text-sm font-medium">
          Seu WhatsApp
        </label>
        <input id="telefone" name="telefone" type="tel" inputMode="tel" required autoComplete="tel-national" placeholder="(DDD) 9 0000-0000" className={CAMPO} aria-describedby="telefone-ajuda" />
        <p id="telefone-ajuda" className="text-sm text-(--l-suave)">
          A loja usa só para falar sobre o seu horário.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="observacao" className="text-sm font-medium">
          Observação <span className="font-normal text-(--l-suave)">(opcional)</span>
        </label>
        <textarea id="observacao" name="observacao" maxLength={300} rows={2} className={CAMPO} />
      </div>
      {estado.erro ? (
        <p role="alert" className="rounded-xl border border-current px-4 py-3 text-sm">
          {estado.erro}{" "}
          {estado.indisponivel ? (
            <a href={p.voltar} className="font-medium underline underline-offset-4">
              Ver outros horários
            </a>
          ) : null}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pendente}
        aria-busy={pendente || undefined}
        className="rounded-xl bg-(--marca) py-3.5 font-semibold text-(--marca-texto) outline-none focus-visible:ring-2 focus-visible:ring-(--marca) focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pendente ? "Reservando…" : "Confirmar agendamento"}
      </button>
    </form>
  );
}
