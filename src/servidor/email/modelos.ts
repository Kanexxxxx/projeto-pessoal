import type { Email } from "./enviador";

/**
 * Textos transacionais. Nunca misturam propaganda (ARQUITETURA.md §8) e
 * sempre dizem o prazo e o que fazer se a pessoa não pediu nada.
 */
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function emailConvite(p: { para: string; marca: string; url: string; expiraEm: Date; papel: string }): Email {
  return {
    para: p.para,
    finalidade: "convite",
    assunto: `Seu acesso ao painel ${p.marca}`,
    texto: [
      `Olá!`,
      ``,
      `Você recebeu um convite para acessar o painel ${p.marca} como ${p.papel}.`,
      `Para criar sua senha, abra o link abaixo:`,
      ``,
      p.url,
      ``,
      `O link vale até ${formatoData.format(p.expiraEm)} (horário de Brasília) e só pode ser usado uma vez.`,
      `Se você não esperava este convite, ignore esta mensagem: nenhuma conta será criada.`,
    ].join("\n"),
  };
}

export function emailRedefinicaoSenha(p: { para: string; marca: string; url: string; validadeMinutos: number }): Email {
  return {
    para: p.para,
    finalidade: "redefinicao_senha",
    assunto: `Redefinição de senha — ${p.marca}`,
    texto: [
      `Recebemos um pedido para redefinir a senha da sua conta no painel ${p.marca}.`,
      ``,
      `Para escolher uma nova senha, abra o link abaixo:`,
      ``,
      p.url,
      ``,
      `O link vale ${p.validadeMinutos} minutos e só funciona uma vez.`,
      `Se não foi você, ignore esta mensagem: sua senha continua a mesma.`,
    ].join("\n"),
  };
}

export function emailSenhaAlterada(p: { para: string; marca: string; quando: Date }): Email {
  return {
    para: p.para,
    finalidade: "aviso_seguranca",
    assunto: `Sua senha foi alterada — ${p.marca}`,
    texto: [
      `A senha da sua conta no painel ${p.marca} foi alterada em ${formatoData.format(p.quando)} (horário de Brasília).`,
      `Por segurança, todas as sessões abertas foram encerradas.`,
      ``,
      `Se não foi você, peça uma nova redefinição de senha agora e avise o suporte.`,
    ].join("\n"),
  };
}
