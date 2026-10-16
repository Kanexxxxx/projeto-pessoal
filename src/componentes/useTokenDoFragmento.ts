"use client";

import { useSyncExternalStore } from "react";

/**
 * Lê `#token=...` da URL e apaga o fragmento da barra de endereço.
 *
 * O token de convite e de redefinição viaja no fragmento justamente porque o
 * navegador não o envia ao servidor: ele não aparece em log de acesso. Depois
 * de lido, sai do histórico para não ficar em favoritos nem à vista.
 */
let lido: string | null | undefined;

function ler(): string | null {
  if (lido !== undefined) return lido;
  const parametros = new URLSearchParams(window.location.hash.slice(1));
  lido = parametros.get("token");
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return lido;
}

export function useTokenDoFragmento(): string | null | undefined {
  return useSyncExternalStore(
    () => () => {},
    ler,
    () => undefined,
  );
}
