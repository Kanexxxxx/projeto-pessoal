/**
 * Mascaramento para logs e mensagens de suporte (ARQUITETURA.md §5): o
 * suficiente para reconhecer o registro, nunca o dado inteiro.
 */
export function mascararEmail(email: string): string {
  const [local, dominio] = email.split("@");
  if (!local || !dominio) return "***";
  return `${local.slice(0, 1)}***@${dominio}`;
}

/** Mantém só os 4 últimos dígitos: "+55 ** *****-1234". */
export function mascararTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 4) return "***";
  return `***${digitos.slice(-4)}`;
}
