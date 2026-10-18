"use client";

import { useActionState } from "react";
import { formatarPreco, linkWhatsApp } from "@/dominio/contato";
import { dataPorExtenso } from "@/dominio/datas";
import { FOCO, TITULO } from "../modelos/estilo";
import { reservarAcao, type EstadoReserva } from "./acoes";

// O contorno do campo usa a cor de texto secundário: contraste ≥ 3:1 com o fundo (WCAG 1.4.11).
const CAMPO = `w-full rounded-(--raio) bg-(--l-superficie) px-4 py-3 text-base ring-1 ring-(--l-suave) ring-inset ${FOCO}`;
const BOTAO = `flex min-h-13 w-full items-center justify-center rounded-(--raio) bg-(--marca) px-6 font-semibold text-(--marca-texto) transition-transform duration-150 active:scale-[0.99] disabled:opacity-60 ${FOCO}`;

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
      <div role="status" className="flex flex-col gap-5 rounded-(--raio-bloco) bg-(--l-superficie) p-6">
        <p className={`${TITULO} text-3xl leading-tight`}>Horário reservado, {r.nome}!</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
          <dt className="text-(--l-suave)">Serviço</dt>
          <dd className="font-medium">{r.servico}</dd>
          <dt className="text-(--l-suave)">Com</dt>
          <dd className="font-medium">{r.profissional}</dd>
          <dt className="text-(--l-suave)">Quando</dt>
          <dd className="font-medium first-letter:uppercase">{quando}</dd>
          <dt className="text-(--l-suave)">Valor</dt>
          <dd className="font-medium">{formatarPreco(r.precoCentavos)}</dd>
        </dl>
        {p.whatsappLoja ? (
          <a href={linkWhatsApp(p.whatsappLoja, mensagem)} target="_blank" rel="noreferrer" className={BOTAO}>
            Avisar a loja no WhatsApp
          </a>
        ) : null}
        <p className="text-(--l-suave)">Para cancelar ou remarcar, fale direto com a loja{p.whatsappLoja ? " pelo WhatsApp" : ""}.</p>
        <a href="/" className={`self-start py-2 underline underline-offset-4 ${FOCO}`}>
          Voltar ao site
        </a>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
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
      <div className="flex flex-col gap-2">
        <label htmlFor="nome" className="font-medium">
          Seu nome
        </label>
        <input id="nome" name="nome" required maxLength={80} autoComplete="name" className={CAMPO} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="telefone" className="font-medium">
          Seu WhatsApp
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel-national"
          placeholder="(DDD) 9 0000-0000"
          className={CAMPO}
          aria-describedby="telefone-ajuda"
        />
        <p id="telefone-ajuda" className="text-sm text-(--l-suave)">
          A loja usa só para falar sobre o seu horário.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="observacao" className="font-medium">
          Observação <span className="font-normal text-(--l-suave)">(opcional)</span>
        </label>
        {/* Campo de várias linhas usa o raio de bloco: com o raio de botão (redondo na Paleta) viraria cápsula. */}
        <textarea id="observacao" name="observacao" maxLength={300} rows={2} className={CAMPO.replace("rounded-(--raio)", "rounded-(--raio-bloco)")} />
      </div>
      {estado.erro ? (
        <p role="alert" className="rounded-(--raio-bloco) bg-(--l-superficie) px-4 py-3 font-medium">
          {estado.erro}{" "}
          {estado.indisponivel ? (
            <a href={p.voltar} className={`underline underline-offset-4 ${FOCO}`}>
              Ver outros horários
            </a>
          ) : null}
        </p>
      ) : null}
      <button type="submit" disabled={pendente} aria-busy={pendente || undefined} className={BOTAO}>
        {pendente ? "Reservando…" : "Confirmar agendamento"}
      </button>
    </form>
  );
}
