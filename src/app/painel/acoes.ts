"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { contexto } from "@/servidor/acesso";
import { sair } from "@/servidor/auth/fluxos";

export async function sairAcao(): Promise<void> {
  await sair(contexto(), { headers: await headers() });
  redirect("/entrar");
}
