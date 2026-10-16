"use client";

import { useState } from "react";
import { FormularioAcao } from "@/componentes/acoes";
import { Campo, Selecao } from "@/componentes/formulario";
import { criarLojaAcao } from "../acoes";

function sugerir(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export function FormularioNovaLoja({ dominio, protocolo }: { dominio: string; protocolo: string }) {
  const [slug, setSlug] = useState("");
  const [editado, setEditado] = useState(false);
  return (
    <FormularioAcao acao={criarLojaAcao} botao="Criar loja" pendenteTexto="Criando…">
      <Campo id="nome" name="nome" rotulo="Nome da loja" required maxLength={80} onChange={(e) => !editado && setSlug(sugerir(e.target.value))} />
      <Campo
        id="slug"
        name="slug"
        rotulo="Endereço do site"
        required
        maxLength={40}
        value={slug}
        onChange={(e) => {
          setEditado(true);
          setSlug(e.target.value.toLowerCase());
        }}
        ajuda={`${protocolo}://${slug || "nome-da-loja"}.${dominio}`}
        autoCapitalize="none"
        spellCheck={false}
      />
      <Selecao id="segmento" name="segmento" rotulo="Tipo de negócio" defaultValue="barbearia">
        <option value="barbearia">Barbearia</option>
        <option value="salao">Salão de beleza</option>
        <option value="estudio">Estúdio (unhas, sobrancelha, estética)</option>
        <option value="outro">Outro</option>
      </Selecao>
    </FormularioAcao>
  );
}
