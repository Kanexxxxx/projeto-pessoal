import type { TestProject } from "vitest/node";
import { subirCluster, type InfoCluster } from "./cluster";

declare module "vitest" {
  export interface ProvidedContext {
    cluster: InfoCluster;
  }
}

/** Um PostgreSQL real e descartável por execução da suíte de integração. */
export default async function preparar(projeto: TestProject) {
  const cluster = await subirCluster();
  projeto.provide("cluster", cluster.info);
  return async () => {
    await cluster.encerrar();
  };
}
