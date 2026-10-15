# Roteiro por tarefas e critérios de aceite

Data-base: 15/10/2026. Objetivo de revisão: 22/10/2026, no horário de São Paulo. A ordem depende de entregas, não de uma tarefa obrigatória por dia. É possível concluir duas tarefas no mesmo dia; não marcar pronta uma etapa só porque terminou o dia.

**Estado em 15/10/2026:** T01 concluída · T03 e T14 em andamento · demais pendentes. O registro de cada etapa (o que mudou, testes, pendências e próxima ação) fica em [CONTINUIDADE.md](CONTINUIDADE.md#registro-de-execução).

## 1. Regras de execução

- Uma tarefa em execução por vez para o responsável, salvo trabalho isolável e previamente coordenado.
- Cada tarefa registra entrada, decisão, arquivos alterados, teste executado, resultado e próximo passo.
- Concluir significa cumprir critérios verificáveis; não significa que o produto ficou perfeito para sempre.
- Não migrar a base anterior nem trocar credenciais de produção durante uma tarefa de estudo.
- Conferir elegibilidade PF antes de integrar serviço. Se exigir CNPJ, desativar essa opção e documentar alternativa.
- Uma dependência bloqueada pode liberar tarefas independentes; não contornar bloqueio de segurança.
- Para teste com dados reais, isolamento, recuperação, privacidade e envio correto já precisam funcionar.
- Executar cargas maiores só em ambiente autorizado, com limite de custo e serviços externos simulados.

## 2. Backlog de 20 tarefas

| ID | Entrega | Depende de | Critério de conclusão |
|---|---|---|---|
| T01 | Inventário privado de domínio, VPS, banco, contas e integrações | — | Identificar plano real, vencimento, recursos, renovação, titularidade, acesso e consumo. Separar fato verificado de informação pendente; não gravar segredos no repo |
| T02 | Oferta, orçamento e termos comerciais | T01 | Fechar escopo R$299/R$600/R$50, cobrança, teste, suspensão, domínio, consumo, atendimento, saída e questões fiscais; conta de margem compreensível |
| T03 | Auditoria da base anterior e decisão de reaproveitamento | T01 | Mapear stack, Auth/Storage/DB, dependências, licença/direitos, bugs e riscos; decidir o que reaproveitar e estimar migração sem executá-la |
| T04 | Especificação visual e biblioteca inicial de composições | T02, T03 | Dois modelos realmente distintos para um nicho, mobile, fotos autorizadas/fictícias, edição de marca e limite de personalização; avaliar acessibilidade e movimento reduzido |
| T05 | Fundação local, ambientes e identidade | T03 | Rodar localmente, migrations reproduzíveis, .env.example sem valores reais, login seguro, MFA do operador, recuperação e testes de sessão; nenhuma credencial exposta |
| T06 | Empresas, papéis e isolamento | T05 | Empresas A/B fictícias, proprietária/funcionário/consumidor; testes negativos em APIs, banco, arquivos e exportação passam |
| T07 | CRM operacional inicial | T02, T05 | Cadastrar prospect, contato, origem, permissão/recusa, etapa, atividade e próxima ação; busca, duplicatas, exportação e acesso exclusivo do operador |
| T08 | Agenda e site configurável | T04, T06 | Criar serviços/horários, reservar/reagendar/cancelar, evitar conflito simultâneo, atualizar conteúdo sem novo projeto por loja; agenda funciona sem IA |
| T09 | Privacidade, retenção e exclusão | T06, T08 | Inventário de dados, finalidades, direitos, fornecedores e prazos; exclusão testada em dados sintéticos, logs e arquivos; política de backups compatível |
| T10 | Implantação de teste, backup e monitor externo | T05, T06, T08 | HTTPS, banco privado, credenciais separadas, backup externo criptografado e restauração realizada; incidente simulado gera alerta fora da VPS |
| T11 | E-mail transacional e cobrança inicial | T02, T05, T10 | SPF/DKIM/DMARC verificados, reset de uso único, recebimento testado; Pix/link candidato confirmado para PF e tarifas registradas; conciliação de recebimento correta |
| T12 | Demonstração de sete dias e onboarding | T07–T11 | Loja fictícia ou autorizada, roteiro de treinamento, começo/fim do teste, identidade visual revisada, capacidade de suspender sem eliminar indevidamente |
| T13 | Primeiro ciclo comercial medido | T12 | Abordar lote qualificado, registrar resultados reais, ativar apenas testes suportáveis, colher aceite/recusa e medir horas por cliente e margem |
| T14 | Decisão de canal WhatsApp sem CNPJ | T01, T02 | Documentar elegibilidade da conta para o uso desejado, nome exibido testado e custo; se não viável, aceitar app manual + e-mail/site e marcar API bloqueada |
| T15 | Canal oficial e roteamento, se aprovado | T06, T09, T10, T14 | Assinatura webhook, remetente vinculado, consumidor sem acesso administrativo, deduplicação, outbox, destinatário correto, templates aprovados e orçamento |
| T16 | IA de texto com avaliação e limites | T06, T09, T10; T15 somente para WhatsApp | Comparar candidatos no mesmo conjunto, ferramentas com autorização no servidor, limites por loja/plataforma, modo sem IA, sem vazamento e sem ação indevida |
| T17 | Áudio e imagem sob demanda | T09, T16 | Limites de duração/tamanho, transcrição testada em PT-BR, confirmação de ações, mídia temporária removida inclusive após falha; custo medido |
| T18 | CRM ampliado, cobrança recorrente e painel financeiro | T07, T11, T13 | Propostas versionadas, pagamentos, parcelas, MRR, inadimplência, renovação, suporte, custos por cliente e importação/exportação; sem dupla contagem |
| T19 | Recuperação automatizada e desempenho | T08–T11; T15–T17 apenas se habilitados | Procedimentos de recuperação limitados, acesso móvel seguro, carga progressiva, teste de estouro de orçamento e falha de provedor, sem reservas ou cobranças duplicadas |
| T20 | Liberação gradual, documentação e evolução | T12, T13, T19 | Piloto aprovado, versão e retorno conhecidos, manual atualizado, plano de saída e métricas; habilitar módulos opcionais apenas depois dos seus testes |

“API bloqueada” na T14 não impede vender um agendamento com site, painel e e-mail. Impede anunciar automação de WhatsApp ainda indisponível. T16 pode começar no painel, com autenticação existente, sem depender do WhatsApp.

## 3. Semana e possível aceleração

A primeira semana é um limite de foco para preparar e avaliar um piloto. Não é uma promessa de implementar vinte áreas completas com uma pessoa.

| Bloco | Foco | Saída |
|---|---|---|
| A | T01–T03 | Custos reais, oferta e mapa do que já existe |
| B | T04–T06 | Visual, ambiente e isolamento básico |
| C | T07–T09 | CRM mínimo, agendamento e dados |
| D | T10–T12 | Backup restaurado, alerta, e-mail e demonstração |
| E | T13 e revisão | Resultado comercial, obstáculos e próxima prioridade |

T14 pode ser investigada durante o bloco A. Automação avançada de WhatsApp, áudio/imagem, CRM ampliado e agente de operações entram depois conforme necessidade.

Se o reaproveitamento for alto e os testes passarem, os blocos podem caber em quatro dias. Se faltar segurança ou recuperação, a demonstração fica em ambiente com dados fictícios e o piloto real espera. Não cortar proteção de dados para cumprir uma data.

O primeiro retorno da cliente anterior, previsto pelo responsável para 16/10/2026, entra como evidência comercial. Uso e vontade de pagar são resultados diferentes; registrar ambos, sem expor informações pessoais no Git.

Prospectar depois da preparação, com alvo inicial de início em 22/10/2026. Um teste liberado nessa data termina sete dias depois, em 29/10/2026. Não confundir semana de desenvolvimento com semana de experiência do prospect.

## 4. Testes que respondem às dúvidas principais

**Segurança:** duas empresas e pessoas com nomes iguais; troca de IDs; usuário revogado; webhook falso/duplicado; recuperação expirada; injeção no texto/áudio; orçamento alterado no frontend.

**Confiabilidade:** cair worker, perder conexão com banco, provedor indisponível, disco chegando ao limite, restaurar backup, tentar confirmar duas reservas do mesmo horário.

**Custo:** simular 10, 50 e 100 conversas concorrentes com APIs simuladas. Fazer lote pequeno real apenas com teto financeiro aprovado e dados sintéticos; conciliar consumo do fornecedor com registro interno.

**Capacidade:** medir sessões ativas, requisições/segundo, p95, erros, CPU/RAM, conexões e fila. Começar baixo e aumentar em degraus. “1.500 robôs” precisa definir se são usuários virtuais, sessões ou requisições. Alcançar 1.500 em ambiente controlado só se as etapas anteriores justificarem. Não bombardear APIs pagas nem site de cliente.

**Qualidade visual:** celular real, teclado, contraste, telas pequenas, imagens otimizadas, estados de erro e movimento reduzido. Vídeo 4K não é padrão do site; animação não pode atrapalhar reserva nem carregamento.

**Critérios provisórios de carga:** erro abaixo de 1% e p95 das rotas centrais abaixo de 1 segundo, excluindo dependências externas, na carga-alvo definida. São metas a validar; não são resultados medidos.

## 5. Portão para receber clientes reais

- [ ] Custo e condição de renovação conhecidos.
- [ ] Oferta e condições aceitas.
- [ ] Isolamento entre empresas verificado.
- [ ] Reserva concorrente sem duplicação.
- [ ] Recuperação de senha funcionando.
- [ ] Backup fora da VPS restaurado em teste.
- [ ] Alerta recebido fora do servidor.
- [ ] Privacidade e exclusão com fluxo definido.
- [ ] Consumo pago limitado no servidor.
- [ ] Plano alternativo quando IA/WhatsApp falhar.
- [ ] Operação e atendimento que o responsável consegue cumprir.
- [ ] Credenciais e dados privados fora deste repositório público.
