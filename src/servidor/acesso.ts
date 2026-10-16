import "server-only";
import { criarAuth } from "./auth/instancia";
import type { ContextoAcesso } from "./auth/fluxos";
import { bd, poolDaAplicacao } from "./bd/conexao";
import { config, type Config } from "./config";
import { enviadorEmArquivo, enviadorEmMemoria, type Enviador } from "./email/enviador";

/** Contexto de acesso do processo do Next, criado uma vez (sobrevive ao recarregamento do dev). */
type Contexto = ContextoAcesso & { enviador: Enviador };

const global = globalThis as unknown as { __nexakeepAcesso?: Contexto };

export function enviadorConfigurado(c: Config): Enviador {
  return c.email.transporte === "arquivo" ? enviadorEmArquivo(c.dadosLocais) : enviadorEmMemoria();
}

export function contexto(): Contexto {
  if (!global.__nexakeepAcesso) {
    const c = config();
    const enviador = enviadorConfigurado(c);
    global.__nexakeepAcesso = {
      auth: criarAuth({ pool: poolDaAplicacao(), config: c, enviador }),
      db: bd(),
      config: c,
      enviador,
    };
  }
  return global.__nexakeepAcesso;
}
