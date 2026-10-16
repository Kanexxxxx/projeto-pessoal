import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mascararEmail } from "../privacidade";

/**
 * Envio de e-mail transacional por trás de uma interface: em desenvolvimento a
 * mensagem vai para um arquivo local, nos testes fica na memória e, quando o
 * provedor for escolhido (T11), entra um transporte SMTP.
 *
 * Log nunca leva o corpo (que pode conter link de redefinição) nem o endereço
 * completo.
 */
export type Finalidade = "convite" | "redefinicao_senha" | "aviso_seguranca";

export type Email = {
  para: string;
  assunto: string;
  texto: string;
  finalidade: Finalidade;
};

export type Enviador = {
  enviar(email: Email): Promise<{ id: string }>;
};

export function enviadorEmArquivo(pastaDadosLocais: string): Enviador {
  const pasta = join(pastaDadosLocais, "emails");
  return {
    async enviar(email) {
      const id = randomUUID();
      await mkdir(pasta, { recursive: true });
      const arquivo = join(pasta, `${new Date().toISOString().replace(/[:.]/g, "-")}-${email.finalidade}-${id.slice(0, 8)}.json`);
      await writeFile(arquivo, JSON.stringify({ id, ...email, gravadoEm: new Date().toISOString() }, null, 2), "utf8");
      console.info(`[email] ${email.finalidade} para ${mascararEmail(email.para)} gravado em ${pasta}`);
      return { id };
    },
  };
}

export type EnviadorEmMemoria = Enviador & { caixa: (Email & { id: string })[] };

export function enviadorEmMemoria(): EnviadorEmMemoria {
  const caixa: (Email & { id: string })[] = [];
  return {
    caixa,
    async enviar(email) {
      const id = randomUUID();
      caixa.push({ ...email, id });
      return { id };
    },
  };
}
