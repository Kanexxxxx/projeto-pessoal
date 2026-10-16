# Arquitetura, segurança e operação
Proposta de implementação. Em 16/10/2026, parte dela já existe e foi testada **localmente** (nada implantado): endereços por host (§1), papéis de operador, dona e equipe (§2) e isolamento entre lojas com RLS forçada, chaves compostas e testes negativos (§4). O resto continua proposta.

## 1. Estrutura mínima que pode crescer

Começar com uma aplicação modular e um worker de tarefas, PostgreSQL e proxy HTTPS. Evitar um projeto de código diferente por cliente.

Módulos: identidade/permissões, empresas, sites/temas, agenda, mensagens, consumo/cobrança, CRM interno, suporte e auditoria. Módulos futuros entram por contratos internos claros, não exigem microserviços agora.

Endereços planejados:
- nexakeep.site: apresentação da plataforma.
- app.nexakeep.site: login, painel e CRM do operador.
- nome-da-loja.nexakeep.site: site público da loja.
- status em infraestrutura externa, quando escolhido o serviço.

Domínio recebido no pedido não autentica o usuário. Resolver o host numa lista cadastrada e validar sessão, empresa e papel no servidor. Usar cookies restritos ao host, não cookies administrativos compartilhados com todos os subdomínios.

## 2. Quem pode fazer o quê

| Papel | Permissão |
|---|---|
| Operador da plataforma | Provisionar empresas, suporte e ações administrativas auditadas; MFA obrigatório |
| Dona da loja | Configurações e dados somente das empresas a que está vinculada |
| Funcionário | Recursos e agenda autorizados pela dona; não recebe privilégios automaticamente |
| Cliente final | Criar/consultar ou alterar a própria reserva por fluxo verificado |
| Serviço de notificações | Enviar eventos autorizados e registrar entrega |
| IA da loja | Propor ações usando ferramentas restritas da empresa e do usuário |
| IA de operações | Ler sinais sanitizados e acionar somente procedimentos permitidos |

Administrar suporte não significa visualizar a senha. Recuperação por token aleatório de uso único, com prazo curto, sem registrar o token em logs; confirmação e revogação de sessões conforme o caso. Redefinição administrativa nunca deve mandar senha fixa por WhatsApp. MFA e recuperação do operador precisam de procedimento separado.

## 3. Impedir a confusão entre duas Julianas

Autenticação e autorização são código, não opinião do modelo.

1. O proprietário entra no painel com identidade verificada.
2. Vincula seu WhatsApp por desafio de uso único associado à sessão; prova posse do canal.
3. O vínculo guarda usuário, número/identificador do provedor, empresa, papel, data de verificação e revogação.
4. Webhook precisa passar pela verificação de assinatura do provedor sobre o corpo original. O token de configuração inicial não substitui a assinatura de cada evento.
5. Validar conta/número receptor, tipo de evento e identificador. Gravar o recebimento de forma durável, deduplicar e responder ao provedor no prazo.
6. Consultar vínculo no servidor. Nome, foto, mensagem “sou a dona” e voz não concedem acesso.
7. Sem vínculo: não carregar contexto privado, não chamar IA administrativa e não criar vínculo automaticamente. Pode haver resposta fixa orientando o atendimento da loja, se isso estiver definido.
8. Se o mesmo número estiver ligado a várias empresas, solicitar seleção entre vínculos autorizados. A escolha não concede novos acessos.
9. Revalidar vínculo e permissão quando cada ferramenta for executada. Não confiar somente na permissão vista no começo da conversa.
10. Ações sensíveis, como troca de proprietário, cobrança, exportação ampla ou exclusão, exigem confirmação adicional no painel.

Número verificado prova controle atual do canal, não identidade eterna: prever troca de telefone, perda de aparelho, número reciclado, revogação e nova verificação.

Reservas criadas no site vêm de uma empresa resolvida e validada pelo backend. A fila usa esse vínculo e os dados da reserva para determinar o destinatário. O modelo não escolhe “para qual loja esse evento pertence”.

## 4. Isolamento e testes obrigatórios

Todo registro pertencente a loja deve ter tenant_id; relações, índices e unicidades relevantes incluem essa chave. Exemplo: uma reserva da loja A não pode referenciar profissional da B. Aplicar isolamento também a buscas, arquivos, exportações, caches e filas.

RLS é defesa adicional do PostgreSQL. A aplicação de rotina não deve usar usuário superadmin, dono das tabelas ou BYPASSRLS; essas permissões podem ignorar a proteção [D1]. Separar papel de migração e papel da aplicação. Escopo de empresa em conexões reutilizadas precisa ser limitado à transação e limpo com segurança.

Testes de aceite:
- Trocar identificador da reserva, profissional ou arquivo por um de outra loja.
- Duas pessoas com o mesmo nome; uma cliente final e outra proprietária.
- Funcionário revogado durante uma conversa ainda ativa.
- Tentar mudar tenant_id, papel ou proprietário no corpo da requisição.
- Repetir webhook e duplicar tentativa de pagamento/envio.
- Concorrer pelo mesmo horário: uma reserva válida, sem duplicidade.
- Tentar ler cache/exportação de outra empresa.
- Exceder limite de login, envio, upload ou consumo.
- Injetar instruções maliciosas em mensagens, arquivos e logs.

Falha de isolamento bloqueia liberação. “Nenhuma falha encontrada no teste” não é garantia de segurança perfeita.

## 5. Segurança de aplicação e infraestrutura

- Segredos somente no ambiente/cofre, nunca no frontend, Git, contexto de chat ou log.
- HTTPS, validação de entradas, consultas parametrizadas e proteção de sessão/CSRF conforme o framework.
- Banco sem porta pública; acesso administrativo privado e credenciais distintas por serviço.
- SSH com chave, controle de acesso, atualizações planejadas, firewall mínimo e contas sem root por padrão.
- Uploads privados com limites de tamanho, tipo e duração; nomes aleatórios, leitura controlada e remoção de metadados desnecessários.
- Não executar código/HTML enviado pelo cliente. Templates aceitam dados, não scripts arbitrários.
- Links de imagem enviados à IA passam por regras de origem; bloquear acesso à rede interna e metadados da nuvem.
- Logs mascaram telefone/e-mail quando possível, não guardam áudio, corpo completo nem chaves.
- Registro de auditoria separado de conteúdo de conversas; eventos de acesso e mudanças administrativas com prazo definido.
- Dependências fixadas, revisão de vulnerabilidades e licença antes de reaproveitar código.
- Administração global em sessão forte, MFA e auditoria; acesso extraordinário com motivo, duração e revogação.

## 6. Operação quando o responsável estiver fora

A proposta é automatizar recuperação previsível. Uma IA com root irrestrito e permissão para alterar tudo aumenta o risco de indisponibilidade e vazamento.

| Nível | Ação | Autorização |
|---|---|---|
| Monitor | Detecta falha externa, disco, fila, erro e backup atrasado | Automática |
| Procedimento testado | Reinicia worker, limita tentativas, pausa integração, retorna versão compatível | Automática dentro de condições registradas |
| IA de diagnóstico | Resume evidências sanitizadas, identifica hipótese, sugere solução | Leitura restrita |
| IA de correção | Cria mudança em branch, ambiente isolado e testes | Sem credencial de produção |
| Ação sensível | Alterar schema, apagar dados, trocar segredos, permissões ou restaurar banco | Revisão e autorização específica |

Rollback de aplicação só é automático se a compatibilidade com o banco for conhecida. “Restaurar backup” não é resposta automática a qualquer bug: pode apagar reservas recentes.

Ter um painel seguro que funcione no celular para ver incidente e aprovar ações delimitadas. Avisos por e-mail/push ou outro canal externo ao serviço; WhatsApp somente se o canal oficial estiver viável. Autorização não pode se resumir a responder “sim” para qualquer mensagem.

Exemplo de aviso: “Agenda indisponível há 3 minutos. Reservas novas podem falhar. Reinício do worker tentado; banco acessível. Próxima opção: voltar à versão anterior. Incidente #123.”

Se não houver recuperação segura, ativar modo degradado e orientar atendimento alternativo. Não mostrar reserva como confirmada sem persistência. O fluxo da loja precisa permitir consulta/exportação e uso de agenda alternativa em emergência.

Atendimento humano proposto: segunda a sábado, 09h–18h. Esse horário é uma janela de atendimento, não promessa de resolução imediata. O prazo contratual de resposta depende da capacidade real. Recebimento automático e monitoramento contínuos devem ser comunicados separadamente.

## 7. Backups sem crescer infinitamente

RAM e espaço de armazenamento são recursos diferentes. Backup consome disco e transferência; pode consumir CPU/RAM durante sua execução, mas não precisa permanecer na memória.

Política inicial proposta, ajustável por necessidade:
- Backups de dados diários, criptografados e fora da VPS/conta principal sempre que possível.
- Reter até 7 diários, 4 semanais e 3 mensais, quando houver finalidade documentada para esse histórico.
- Fotos necessárias em armazenamento próprio com versionamento/backup; áudio temporário excluído da rotina de backup.
- Versões da aplicação, configurações não secretas e migrations no Git; chaves de recuperação guardadas separadamente.
- Só descartar versões antigas após confirmar que o novo backup está íntegro e enviado. O processo automático não deve ter poder irrestrito de apagar todo o histórico externo.

Exemplo conservador: 14 cópias completas de 1 GB = cerca de 14 GB, mais arquivos e overhead. Incrementais/deduplicação podem reduzir, mas dumps já comprimidos podem deduplicar pouco. Medir volume real; não prometer fator de redução.

Backup semanal pode perder quase sete dias de registros. Diário pode perder quase 24 horas desde a última cópia concluída fora do servidor. Para agenda ativa, objetivo posterior de RPO até 15 minutos exige arquivamento contínuo de WAL e testes. Um dump diário sozinho não atende esse objetivo.

Proposta de alvo inicial de restauração: até 4 horas em simulação; só transformar em compromisso depois de provar. Testar restauração em ambiente separado antes de atender pagantes e repetir após mudanças relevantes. Segunda VPS sem replicação, roteamento e procedimento de failover não é alta disponibilidade. Backup não é réplica pronta para receber tráfego.

Manter registro de exclusões para reaplicar ao restaurar um backup. Dados que já foram apagados não devem reaparecer no serviço. Retenção longa tem custo e impacto de privacidade; não guardar tudo indefinidamente.

## 8. E-mail de domínio

Planejar remetentes como acesso@nexakeep.site e suporte@nexakeep.site. Endereços ainda não criados. Uma caixa de e-mail recebe mensagens; um serviço SMTP autorizado faz os envios da aplicação. O domínio sozinho não envia e-mail.

Escolher conta disponível para PF, confirmar uso transacional, quotas, bloqueios e custos. Configurar SPF, DKIM e DMARC conforme provedor, HTTPS/TLS, retorno de falhas e endereço de resposta [E1]. Separar transacional de prospecção; não usar senha/reset como propaganda.

Testar recebimento e recuperação em Gmail e Outlook; logar identificador/estado do envio, não o token de recuperação. Nenhum provedor pode garantir “nunca cai no spam”. O nome do remetente e autenticação ajudam na confiança, mas reputação e comportamento de envio também contam.

## 9. Dados temporários, exclusão e LGPD

Proposta de fluxo de mídia: receber apenas o necessário, validar, processar, salvar somente o resultado indispensável e excluir o arquivo temporário após sucesso. Um prazo máximo local, por exemplo 24 horas para falhas/reprocessamento, é uma decisão a implementar e verificar, não uma propriedade já existente.

Separar:
- Arquivo temporário de áudio/imagem.
- Transcrição ou resultado aproveitado.
- Dados persistentes de reserva.
- Auditoria técnica e obrigação de retenção.
- Cópias de backup e dados em fornecedores.

Ao pedir exclusão, verificar a pessoa com dados mínimos, localizar registros por empresa e sistema, interromper usos pertinentes e eliminar/anonimizar onde couber. Registrar o atendimento sem copiar todo o conteúdo apagado. Informar especificamente dados mantidos, finalidade e período quando houver fundamento.

A LGPD prevê hipóteses de conservação; não autoriza prometer apagar qualquer registro em qualquer circunstância [L1]. Plataforma pode operar dados das lojas e também controlar seus próprios leads/cobranças; mapear cada finalidade. Pessoa física também pode ter obrigações como agente de tratamento.

Áudios, fotos e transcrições enviados a fornecedores podem ser processados no exterior. Informar destinatários, finalidade e mecanismo aplicável de transferência, além dos direitos e canal de atendimento [L2]. Fotos de clientes requerem análise de autorização/finalidade; não reutilizar fotos privadas da base anterior em demonstrações.

As regras específicas do fornecedor de IA e o orçamento ficam na próxima seção. Não utilizar “30 dias” como prazo genérico para tudo.

### Exemplo simples: áudio, cadastro e backup

Se alguém envia um áudio pedindo horário, a aplicação pode processar o arquivo e removê-lo do armazenamento temporário assim que concluir. Não é necessário guardar o áudio original para manter a reserva. A limpeza também precisa funcionar quando a chamada falha, incluindo fila de erro, caches e uploads incompletos.

Se a pessoa pede para excluir o cadastro:
1. Verificar quem está solicitando e qual empresa/dado está envolvido.
2. Bloquear imediatamente o uso não necessário e novos envios relacionados ao pedido validado.
3. Executar uma tarefa durável que localiza e remove/anonimiza dados elegíveis do banco, arquivos, índices e caches; cancelar tarefas pendentes que poderiam recriá-los.
4. Confirmar que cada armazenamento ativo foi tratado e registrar somente a evidência mínima do atendimento.
5. Solicitar exclusão de recursos persistentes nos fornecedores quando o produto permitir; acompanhar falhas sem afirmar sucesso antecipado.
6. Manter os backups protegidos até a expiração documentada, com registro mínimo de exclusão aplicado antes de liberar qualquer restauração.

Meta técnica a medir: bloqueio imediato e limpeza dos dados ativos elegíveis em minutos para pedidos simples já validados. Não é prazo legal universal nem garantia antes de testes. Se algum registro precisar ser mantido por fundamento aplicável, restringir acesso e informar motivo/prazo.

O pedido deve distinguir consumidor de uma loja, dono de conta e encerramento de uma empresa inteira. Não identificar registros só pelo nome, nem apagar informações de outras lojas por coincidência de telefone.

Com retenção de backups mensais, não se pode prometer que todas as cópias desaparecem em 30 dias. Áudio/imagem temporários devem ficar fora dos backups persistentes. Se for necessário apagamento mais rápido de conteúdo que está em backups, redesenhar retenção e avaliar criptografia com chaves separadas e ciclo de eliminação verificável; não prometer que apenas apagar uma chave compartilhada resolve.

Nosso sistema não controla cópias de mensagens no celular de quem as recebeu. A política precisa diferenciar nossos ambientes, fornecedores e aparelhos dos participantes.

### Requisito do titular (16/10/2026): o cliente pede para apagar

Dois pedidos, nenhum deles é cancelar agendamento (cancelar segue o fluxo da loja, como na base anterior):

1. **"Apaguem esta foto/mensagem"** (ex.: mandou foto do CPF por engano). A loja ou o operador marca o item; a tarefa apaga o arquivo do armazenamento e do cache, apaga a mídia na Meta se ela ainda estiver lá (`DELETE /MEDIA_ID`), remove a transcrição ou texto derivado e registra só "item X apagado em data Y".
2. **"Apaguem todos os meus dados"**. Depois de confirmar que o pedido vem do próprio telefone/e-mail, a tarefa apaga cadastro, conversas, arquivos, consentimentos e vínculos do cliente **naquela loja**, e anonimiza o que a loja precisa manter para a própria contabilidade (o horário atendido fica, sem nome nem telefone). Pedido feito à plataforma vale para todas as lojas em que a pessoa aparece, uma a uma, sem misturar dados entre elas.

O que dá para garantir e o que não dá:

| Onde está o dado | O que acontece |
|---|---|
| Banco, arquivos, caches, filas e índices da Nexakeep | Apagado na hora, por tarefa durável que confirma cada lugar |
| Mídia nos servidores da Meta | Apagada por API quando ainda existe; senão expira em até 30 dias |
| Backups criptografados | Ficam até a cópia expirar (política proposta: até 35 dias). Um registro de exclusões é reaplicado a qualquer restauração, então o dado nunca volta ao sistema |
| Fornecedor de IA, se usado | Logs do fornecedor seguem o prazo dele (hoje até 30 dias); por isso não mandamos foto de documento nem dado pessoal desnecessário à IA |
| Celular do cliente e da loja | Fora do nosso alcance; o cliente apaga no próprio aparelho, e a loja é orientada a apagar a conversa |

Para apagar mais rápido inclusive dos backups, a T09 deve avaliar criptografar arquivos e campos pessoais com uma chave por cliente (apagar a chave inutiliza todas as cópias), guardando as chaves com retenção curta e separada. Não prometer isso antes de implementar e testar.

## 10. IA: pagar pelo uso real e impedir desperdício

A agenda, confirmação no site e cálculo de horários devem funcionar por código comum. IA entra para interpretar linguagem e ajudar a pessoa, sempre usando ferramentas que verificam autorização.

**Candidatos para avaliação, não escolha definitiva:** GPT-6 Luna para tarefas delimitadas e GPT-6.1 Sol como referência de qualidade/escalonamento. O nome “mini” ou “mais recente” não demonstra qualidade na sua tarefa. Comparar no mesmo conjunto de mensagens em português.

Preços públicos consultados em 15/10/2026, por milhão de tokens de texto, modo Standard e contexto curto [A1–A2]:

| Modelo | Entrada sem cache | Saída |
|---|---:|---:|
| GPT-6 Luna | US$0,10 | US$0,50 |
| GPT-6.1 Sol | US$2,00 | US$10,00 |

Transcrição candidata: GPT-Transcribe, US$0,0045 por minuto [A3]. Avaliar ruído, sotaque, nomes de serviços, datas e números. Confirmar com a pessoa antes de uma mudança importante. Não é necessário manter uma conversa de voz em tempo real para aceitar mensagem de áudio.

**Simulação hipotética:** 20 lojas × 100 chamadas por mês = 2.000 chamadas. Cada chamada com 2.000 tokens de entrada e 300 de saída totaliza 4 milhões de entrada e 600 mil de saída. Câmbio de R$5,50 usado apenas para simular.

| Cenário | Texto/mês em USD | Texto + 400 minutos de transcrição | Conversão ilustrativa em BRL |
|---|---:|---:|---:|
| Todas as chamadas no Luna | 0,70 | 2,50 | R$13,75 |
| Todas as chamadas no Sol | 14,00 | 15,80 | R$86,90 |
| 90% Luna e 10% Sol, uma chamada por ação | 2,03 | 3,83 | R$21,07 |

A mistura acima é roteamento direto. Se chamar Luna e depois Sol para a mesma ação, os dois são cobrados e o cálculo muda. “100 chamadas” não significa 100 conversas ilimitadas.

São estimativas aritméticas, não fatura prevista. Não incluem WhatsApp, impostos, câmbio real, cache writes, imagens, ferramentas pagas, retries nem tokens de raciocínio além dos tokens de saída considerados. Contexto longo e configurações diferentes podem alterar a tarifa. Se houver dez chamadas por conversa, o uso de texto pode multiplicar por dez; se houver histórico enorme, a entrada também cresce.

### Controles concretos

- Identificar empresa e usuário antes de invocar o modelo.
- Agrupar mensagens curtas do mesmo usuário por uma janela pequena, sem processar cada fragmento isolado.
- Manter estado estruturado: serviço, data, horário e etapa; não reenviar todo o histórico.
- Consultar disponibilidade no banco; não pedir à IA para adivinhar.
- Limitar tamanho de entrada, duração de áudio, saída, tempo, número de ferramentas e tentativas.
- Não criar loops de “pensar de novo” sem teto.
- Registrar tokens, modelo, custo estimado e custo confirmado por chamada e empresa, sem conteúdo pessoal desnecessário.
- Reservar orçamento de forma atômica antes da chamada; conciliar depois. Isso evita dez chamadas concorrentes ultrapassarem o mesmo saldo.
- Ter limites por usuário, loja, dia e plataforma. Teto do painel do provedor pode funcionar como alerta e não deve ser a única trava.
- Ao esgotar a franquia, oferecer painel/fluxo determinístico; avisar a dona e pedir autorização para ampliar consumo.
- API key só no backend; projeto/chave de teste separado de produção. Usar uma chave não separa custos nem permissões por loja automaticamente.
- Rate limit de requisições/tokens por minuto é diferente de saldo financeiro. Fila persistente, concorrência limitada e retentativas com espera tratam picos.

### Como decidir a qualidade

Conjunto inicial proposto de 60 casos sintéticos: texto curto, 30 mensagens fragmentadas, pedido ambíguo, horário indisponível, duas lojas, usuário revogado, áudio com erro e tentativa de obter dados alheios.

Critérios: zero acesso indevido ou execução fora da permissão no conjunto; pelo menos 95% de conclusão correta dos casos comuns, como meta inicial; boa clareza em PT-BR; medir custo por tarefa concluída, latência e pedidos de intervenção. Avaliação humana e testes de backend complementam a nota; não confiar somente no julgamento de outra IA.

Se Luna falhar em casos comuns, mudar prompt/fluxo ou escolher modelo mais capaz. Não diminuir qualidade necessária só para bater um preço. Nenhum modelo foi chamado nem comparado neste planejamento.

### O que significam os “30 dias” da OpenAI

A documentação da API informa que dados não são usados para treinamento por padrão, salvo adesão. Logs de prevenção a abuso podem conter conteúdo e ser retidos por até 30 dias, com exceções legais/de segurança. A retenção varia conforme endpoint/recurso; store:false não apaga todo registro do fornecedor. ZDR depende de aprovação e condições. O endpoint de transcrição tem regras distintas; enviar a transcrição depois a um modelo de texto submete essa nova requisição às regras dele [A4].

Portanto: apagar nossos dados aplicáveis sem esperar arbitrariamente 30 dias; tratar recursos persistidos no fornecedor quando existirem; explicar os prazos residuais e exceções. Não prometer exclusão universal em exatamente 30 dias, nem “nada é armazenado em lugar nenhum”.

A alternativa mais simples para reduzir exposição é não enviar telefone, CPF, nome completo ou fotos quando bastam códigos internos, serviço e horário. Processamento totalmente local pode ser estudado, mas traz custo e responsabilidade; não será instalado na VPS pequena por suposição.

## 11. WhatsApp — número central ou canais das lojas

**Requisito corrigido pelo titular em 16/10/2026:** avaliar um único número da plataforma atendendo várias lojas. Evitar criar um app Meta por loja. A pesquisa e suas fontes estão em [WHATSAPP.md](WHATSAPP.md). A decisão de 15/10 que obrigava um canal próprio por loja deixou de ser requisito fechado.

### Alternativas e identidade

- **Número central:** identidade pública da plataforma, loja identificada dentro da conversa e no link de entrada. O cabeçalho oficial do WhatsApp não pode ser prometido como nome diferente para cada interlocutor. A autorização da Meta para o caso multiloja e a elegibilidade da plataforma PF ainda precisam ser comprovadas antes de produção.
- **App central com números das lojas:** mantém identidade por número, sem exigir um software ou um app novo para cada loja. O caminho oficial de integração de terceiros tem requisitos próprios de verificação, permissões e onboarding; não presumir elegibilidade sem CNPJ.
- **Modo local/manual:** continua disponível para desenvolver e testar o produto enquanto os requisitos externos permanecem pendentes. Nenhum canal real deve ser alterado para testar uma hipótese.

### Roteamento do número central (projeto, ainda não implementado)

1. Validar assinatura do webhook e número receptor cadastrado antes de aceitar o evento.
2. Resolver loja por referência validada no servidor (por exemplo, link da página da loja com contexto limitado), ou solicitar seleção explícita. Um telefone do consumidor pode pertencer a relações com várias lojas.
3. Confirmar a loja antes de consultar reservas ou efetuar ações. Se houver ambiguidade, perguntar; não inferir tenant por nome, texto livre ou decisão da IA.
4. Separar contexto por loja + canal + participante. A troca explícita de loja abre outro contexto e não reaproveita histórico, dados ou permissões da anterior.
5. Consumidor só opera seus próprios dados após verificação adequada; prova de posse do WhatsApp não concede papel de proprietário, funcionário ou operador. Ações administrativas permanecem autenticadas no painel, com MFA onde exigido.
6. O servidor resolve canal/template/destinatário e orçamento por loja para cada envio; nunca confiar nesses valores fornecidos pela IA ou pelo frontend. Deduplicação e outbox impedem duplicidade em retries.
7. A franquia/capacidade do número central é compartilhada. Contabilidade por loja e teto global precisam impedir que uma loja consuma o orçamento de todas.

Cadastro de canais deve comportar tanto número da plataforma quanto canais próprios: provedor, WABA, identificador do número, identidade aprovada, titularidade, referência segura da credencial, status e associações autorizadas às lojas. Essas associações são dados controlados pelo servidor.

### Caso de números próprios

Resolver a empresa pelo canal receptor cadastrado, verificar permissões do remetente e manter o mesmo isolamento de contexto. Não reaproveitar aprovação de template entre contas sem comprovação. Verificar Coexistence e portabilidade antes de alterar o número existente; a ausência de elegibilidade não autoriza integração não oficial.

### Decisão pendente e testes

Resultado de 16/10/2026 ([WHATSAPP.md](WHATSAPP.md)): o número central é viável sem CNPJ e é o modelo recomendado. O nome no topo da conversa é um só por número e a política proíbe se passar por outra empresa, então a identidade é sempre "plataforma · loja", transparente. Um número por loja (Tech Provider) exige verificação com CNPJ/MEI e fica como evolução. Criar portfólio, app ou número real depende de autorização do titular; até lá o módulo é desenvolvido contra um provedor simulado em localhost.

T15 deve testar consumidores de duas lojas com mesmo nome/telefone, link de contexto adulterado, conversa sem loja, troca de loja, conta revogada, webhook falso/duplicado, destinatário errado, estouro de orçamento e pedido de exclusão. Solicitação de apagar mídia/dados segue T09; cancelamento de agendamento é outro fluxo.

Nenhuma mensagem real, template, conta ou número foi criado nesta revisão. O domínio provisório continua nexakeep.site; desenvolvimento e demonstração permanecem em localhost.
