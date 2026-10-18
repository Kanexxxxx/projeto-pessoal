# Checkpoint — redesenho dos sites das lojas (3 modelos)

Responsável: Claude Code (coordena). Início: 17/10/2026, 07h20. Base: `9c3851f` (já no GitHub, ramo `implementacao`).

## Pedido do titular (17/10)

- Os modelos anteriores foram reprovados ("genéricos, pouco criativos"). Fazer **três** modelos realmente diferentes, com qualidade de produto, usando agentes, skills e ECC, com testes no navegador, notas justificadas e documentação.
- Foco em uma coisa só até ficar bom: **os sites das lojas**. Depois, a próxima tarefa.
- WhatsApp: modelo central (A) reprovado; o titular quer o modelo da DigAÍ (número da própria loja, mensagens da plataforma). Números para os testes: o da base anterior e um reserva (registrados só no inventário privado, fora do Git).
- Autorizado enviar ao GitHub (feito em 17/10, ramo `implementacao`).

## Ferramentas

- **Já instaladas e usadas:** `frontend-design`, `web-design-guidelines`, `create-design-md`, `anti-ui-slop`, `playwright-cli` (skills globais do titular).
- **Taste Skill (Leonxlnx):** lida direto da fonte (SKILL.md principal e `redesign-skill`); as regras da casa estão no DESIGN.md §0. Não instalada: gravar em `~/.claude` foi bloqueado pela proteção de automodificação do Claude Code. Os scripts dela não foram executados (código de terceiros); no lugar, `scripts/inspecionar-sites.mjs`.
- **ECC 2.2.3:** pacote oficial conferido (`affaan-m/ECC`, sem script de instalação) e simulado com sucesso (`setup --mode claude-plugin --scope user --hooks minimal --dry-run`). A instalação real ficou para o titular rodar: mexe em `~/.claude/settings.json` e o mesmo bloqueio vale. Atenção: sem preferência explícita, o setup desliga a atribuição de coautoria nos commits. Os agentes e skills do pacote foram usados como instruções: ciclo gerador/avaliador (`gan-*`), `frontend-design-direction`, `loop-design-check`.
- **Playwright CLI (global):** não instalado. O projeto já tem `@playwright/test` com o Edge do sistema; instalar seria duplicar.

## Feito até aqui

- Migração `0006_modelos_site.sql`: modelos `letreiro`, `revista` e `paleta`; conversão dos antigos.
- `horariosDaVitrine` (agenda.ts), `src/dominio/funcionamento.ts` (aberto agora, dia relativo, duração, iniciais; 6 testes) e `misturar` (cores).
- Contrato dos modelos (`modelos/tipos.ts`), `Casca.tsx` (fontes, tokens, atalho, aviso de implantação, prévia `?modelo=`), `vitrine.ts`, registro `modelos/index.ts` com três modelos provisórios, agendamento reescrito sobre tokens, ícone por loja (com correção do proxy para caminhos internos da mesma área), aba Site do painel com a escolha do modelo e a prévia.
- `DESIGN.md` com a base e as três fichas; `scripts/inspecionar-sites.mjs` (juiz objetivo).
- Demonstração: `navalha-de-ouro` (letreiro), `studio-bella` (paleta), `salao-jasmim` (revista), mais `teste-limites` (só no banco local).
- Servidor de design: `NEXAKEEP_DIST_DIR=.next-design NEXAKEEP_DOMINIO_BASE=localhost:3200 npx next dev -p 3200`. O `next dev` acrescenta `.next-design` ao `tsconfig.json`; restaurar antes do commit.

## Construção (17/10, 10h53–11h45)

- Os três agentes geradores pararam no limite de sessão logo no início (só leram arquivos; nada escrito). Para não repetir o problema, os três modelos foram construídos pelo coordenador, um de cada vez; os agentes ficaram com a avaliação independente e a revisão.
- **Letreiro** (`modelos/letreiro/`): o poste gira por `transform` só com a loja aberta; o próximo horário aparece como letreiro, com "Também livre"; tabela de preços em painel marinho; cadeiras; trilhos de horário da semana; endereço em letreiro; rodapé com o nome de ponta a ponta; barra fixa de reserva no celular; monograma no cabeçalho do celular.
- **Revista** (`modelos/revista/`): capa na cor da loja com o título em Didone animado palavra por palavra; chamadas de capa; "Nesta edição"; equipe com retratos na cor da capa; carta da casa; agenda da semana agrupada por horário; expediente.
- **Paleta** (`modelos/paleta/`): cartela de amostras em OKLCH (`amostras.ts`, 3 testes, contraste ≥ 4,5:1 nas 10 cores possíveis); leque de até 4 amostras; amostras com os próximos horários; quem atende; horários e contato.
- Correções que a inspeção e o olhar pegaram:
  - revelação ao rolar deixava as linhas invisíveis nas capturas (removida);
  - o poste vertical sumia por conflito de `position`;
  - o título com 4 linhas para um nome de 54 caracteres;
  - "SALÃOJASMIM" sem espaço (o espaço ficava dentro da caixa animada);
  - leque transbordando no celular;
  - ícone da loja com 404 (caminho interno prefixado duas vezes no proxy).
- O avaliador objetivo também foi corrigido: os títulos esticados numa grade contavam como linhas, as caixas inline-block também, e faltava tolerância de arredondamento nos alvos de toque.

## Verificação

- `scripts/inspecionar-sites.mjs` nas 4 lojas × início e agendamento × 1440/834/390 px × reduzir movimento: **32 verificações, 0 falha, 0 aviso**; varredura de padrões proibidos sem achados.
- `npm run verificar`: 127 testes, lint, tipos e varredura de publicação ok (antes do teste novo da vitrine; a vitrine tem mais 1 teste, `lojas.test.ts` 20/20).
- `npm run test:e2e`: 2/2. O título da etapa mudou para "Quando?" e o teste foi ajustado.

## Avaliação independente — rodada 1 (17/10, 19h25)

Agente avaliador (papel `gan-evaluator` do ECC, Playwright ao vivo, sem editar nada). **Nenhum modelo passou** (régua: nota ≥ 8 em todos os critérios): Letreiro 7,2, Revista 6,5, Paleta 6,2. Crítica central: por fora pareciam de equipes diferentes, mas por baixo eram a mesma página (capa → serviços → equipe → horários → contato). Também apontou: rótulos do leque cobertos e cartela fugindo da cor da loja (Paleta); hierarquia invertida com nome longo, sem caminho para reservar depois da capa e equipe em blocos iguais (Revista); acentos cortados no rodapé, tablet espremido e poste parado depois de 5 s (Letreiro); agendamento igual nos três e horário sumindo sem aviso. E que o juiz objetivo deixava passar esses defeitos.

## Rodada 2 (17/10, 19h40–20h15)

Cada modelo ganhou **arquitetura própria**:

- **Letreiro — a parede da barbearia:** capa com a "próxima cadeira livre"; o quadro de preços é a peça central, com placa ABERTO/FECHADO e o horário da semana pintado no quadro (a seção de trilhos saiu); cadeiras em colunas, sem zebra, com "Faz todos os serviços"; placa da porta com o endereço; rodapé sem cortar acento (`overflow-x-clip`, entrelinha 0,9, nome longo em 2 linhas, piso de 2 rem). O poste gira **com a rolagem** enquanto a loja está aberta (`animation-timeline: scroll(root)`), com as duas voltas antigas como alternativa. No celular, só a barra fixa reserva. Composição de tablet própria (12 colunas só a partir de `lg`).
- **Revista — a edição do mês:** capa com chamadas (só texto) e "Na agenda desta edição" com 3 horários reais espalhados pelo dia; **a agenda é a página 2** (3 dias, até 4 horários por dia, 2 serviços por horário com "e mais N", lista girando para não repetir); índice "Nesta edição" com quem faz cada serviço; carta da casa; **expediente** no rodapé com "Quem assina" (a equipe), horário e endereço. Barra de reserva em tinta no celular, que entra quando a capa sai da tela. Didone nunca abaixo de 28 px.
- **Paleta — a cartela é a capa:** cada serviço é uma tampa de cor (botão de opção); escolher abre o painel daquele serviço logo abaixo (celular) ou na coluna da direita (computador), com um leque de 3 amostras e os horários em "bolinhas". Sem JavaScript (`.tampa:has(:checked) + .painel`). Cartela dentro da família da cor da loja (matiz a no máximo 45°, variação de luz e croma; teste novo). "Quem atende e quando" num bloco só; "Onde fica". Passar o mouse só com `(hover: hover)`.
- **Comum:** a vitrine ganhou `agenda` (próximos 3 dias com vaga, até 4 horários espalhados e os serviços livres em cada um; `horariosDaVitrine.porDia`, com teste de integração). Agendamento: aviso quando o horário do link saiu da agenda; títulos das etapas com 28 px; horário escolhido na letra de título do modelo; marcador em ponto (forma do modelo) no lugar do ✓; observação com raio de bloco.
- **Juiz objetivo** (`scripts/inspecionar-sites.mjs`): novas verificações de texto cortado por overflow (pelo retângulo do texto, que pega acento), Didone abaixo de 28 px, faixa de horário quebrada em duas linhas e texto coberto por outra camada (rolando a página); foco e alvo de toque de botão de opção escondido medidos no `<label>`. **Teste de mutação:** reintroduzidos os quatro defeitos (rodapé com `overflow-hidden`, títulos de etapa com 24 px, camadas do leque por cima, turnos sem `nowrap`), o juiz acusou os quatro. O teste também achou dois erros no próprio juiz (expressões regulares sem as barras e caixa `display: contents` tratada como texto escondido), corrigidos.

Verificação da rodada 2: inspeção nas 4 lojas × início e agendamento × 3 larguras × reduzir movimento, e a `teste-limites` em cada um dos 3 modelos: **0 falha**; 1 aviso aceito (Revista, nome de 54 caracteres no celular em 3 linhas, porque a Didone não desce de 28 px). Lint dos padrões proibidos sem achados. `npm run verificar`: 128 testes, lint, tipos e varredura de publicação ok. `npm run test:e2e`: 2/2.

Observação: ao formatar um arquivo, `npx prettier` baixou o Prettier para o cache do npm (o projeto não usa Prettier). Nada foi instalado no projeto nem globalmente; o arquivo foi reescrito no estilo do projeto e o Prettier não foi mais usado.

## Avaliação independente — rodada 2 (17/10, 20h40)

**Letreiro passa (8,2).** Revista 7,7 e Paleta 7,9 não passam. O esqueleto comum foi quebrado de fato ("ninguém confunde uma página com a outra, nem em modo de esqueleto"). Pontos que impediam: agenda da Revista como paredão de 36 links repetidos e "e mais N" que levava ao agendamento sem dia nem hora; troca de tampa na Paleta fazendo a lista pular ~440 px no celular; tablet da Paleta como celular esticado. No Letreiro, duas correções de uma linha (acento cortado no cabeçalho a partir de 1024 px; setas sozinhas sob o preço). E o juiz ainda deixava passar defeitos visíveis.

## Rodada 3 — a última (17/10, 20h45–21h40)

- **Letreiro:** cabeçalho só com o monograma (sem o nome truncado que cortava acento); seta ao lado do preço; cadeiras dizem uma vez o que é igual para todas e cada uma fica com "Reservar com …"; coluna de horário presa no alto do quadro.
- **Revista:** a agenda passou a ser por horário — **o horário é o link** e o serviço é escolhido em seguida (12 links em vez de 36); cada dia mostra quantos horários livres tem; "4 de 6 serviços" quando nem todos cabem; três dias em três colunas no tablet; capa até 832 px com o título encostado nas chamadas; sem chamadas no celular com nome muito longo; preço do índice em Bodoni 28 px; "Quem assina" sem repetir o mesmo horário.
- **Paleta:** no celular, tampas em fichas e o painel embaixo de todas (trocar de tampa não move nada); grade de duas colunas desde o tablet; a semana em tampas e a equipe na mesma linguagem; descrição dentro da amostra da frente; marca do modelo no cabeçalho (três tampas); dia da bolinha com 14 px.
- **Agendamento:** "horário primeiro" — `/agendar?data=…&hora=…` pergunta serviço e pessoa e mantém o horário até "Seus dados" (conferido no navegador: agenda 12:30 → serviço → pessoa → "Seus dados" com "Quando 12:30, terça, 20 out"); aviso reescrito para os dois casos (saiu da agenda ou o serviço não cabe).
- **Vitrine:** `porDia` ganhou `livres` (quantos horários livres o dia tem); `agenda` ganhou o link "horário primeiro" e `todos` (todos os serviços cabem).
- **Demonstração:** `npm run demo:criar` agora mantém uma agenda de exemplo nos próximos dias, com movimento diferente em cada dia (manhã cheia, tarde cheia, meio do dia), marcada com a observação "Agendamento de exemplo (demonstração)". Rodar de novo só completa o que faltar (conferido: a segunda execução não criou nada). Sem isso, as três lojas tinham dias idênticos, e o site parecia repetido por causa dos dados, não do desenho.
- **Juiz:** corte vertical acusado também com reticências; aviso de grade com item sozinho (só célula estreita, não linha inteira de propósito); aviso de texto igual em todos os itens de uma lista (texto inteiro do elemento, não pedaço); teste de interação da cartela medindo a posição na página. **Teste de mutação:** reintroduzidos o cabeçalho truncado, o painel entre as tampas, a agenda em colunas automáticas e as cadeiras com texto igual, o juiz acusou os quatro (o salto, depois de trocar a medida de tela para página: −437 px). Antes disso, a primeira versão do teste de salto não acusava nada, porque o Chrome compensava o salto rolando a página.

Verificação da rodada 3: inspeção com 0 falha nas 4 lojas × início e agendamento × 3 larguras × reduzir movimento e na `teste-limites` nos 3 modelos. Avisos restantes, aceitos por serem dado real: "4 de 6 serviços" às 18:00 em todos os dias úteis da Revista (todos fecham na mesma hora); "16 horários livres" nos dois dias da `teste-limites`; título de 3 linhas da Revista com 54 caracteres no celular. `npm run verificar`: 128 testes, lint, tipos e varredura ok. `npm run test:e2e`: 2/2.

## Avaliação independente — rodada 3 (18/10, 09h–09h50)

A sessão de avaliação parou no limite de uso na noite de 17/10 e foi retomada em 18/10. Antes disso, outra sessão separou o projeto de afiliados (Vitraya) desta pasta e enviou este trabalho ao GitHub (commit `d6f919b`); o código avaliado é o mesmo.

**Letreiro passa (8,4).** Revista 7,9 e Paleta 8,1 não passam, cada uma por **um** defeito de correção pequena (não de desenho):

- **Revista:** o "horário primeiro" oferecia serviços e pessoas que não cabiam no horário (às 09:00 de terça, Coloração, Mechas, e Corte com Bianca ou Tati) e respondia "não está mais livre", texto falso, porque o horário nunca esteve livre para eles.
- **Paleta:** o preço sumiu das fichas do celular (`hidden md:inline`).

O avaliador considerou legítima a agenda de exemplo da demonstração: o script recusa produção, os dados são fictícios e marcados, e o desenho não depende deles; foram esses dados que revelaram o defeito da Revista.

## Correção dos bloqueios (18/10, 09h50–10h30)

- `livresNoHorario` (agenda.ts): para um dia e hora, os serviços que cabem e com quem, pela mesma grade da reserva. Teste de integração contra `reservar` (livre com os dois → um ocupado sai da lista e a reserva com o outro é aceita → nenhum livre → antes da antecedência, nenhum).
- Agendamento: com horário pedido, só oferece o que cabe; o resto vai para "outro horário" sem levar o horário; em "Com quem?", "sem vaga às 09:00 · outro horário"; aviso sem "mais".
- Paleta: preço sempre visível nas fichas (14 px no celular).
- Polimento: semana da Paleta numa cor só (a da loja); Revista com o título no topo da capa no computador, horários em uma coluna no tablet e "para 4 dos 6 serviços".
- Juiz: percorre o "horário primeiro" (cada serviço e cada pessoa oferecidos com o horário têm de chegar a "Seus dados"). Mutação: com o filtro desligado, acusou Corte com Bianca e Tati e Coloração.

Verificação: inspeção com 0 falha (4 lojas × início e agendamento × 3 larguras × reduzir movimento; `teste-limites` nos 3 modelos); `npm run verificar` 129 testes; `npm run test:e2e` 2/2.

## Confirmação dos bloqueios e resultado final (18/10, 14h50)

O avaliador conferiu só os dois bloqueios, ao vivo em 390 px:

- **Revista:** seguiu os 12 horários da capa e da agenda (20 a 22/10), cada serviço e cada pessoa oferecidos com o horário, inclusive "Sem preferência": **230 percursos chegaram a "Seus dados", nenhum falhou**. Os serviços que não cabem e as pessoas sem vaga aparecem como "outro horário", sem levar o horário; o aviso diz "não está livre para …".
- **Paleta:** em 390 px, sem tocar em nada, os 4 preços aparecem (e os 12 na `teste-limites`, inclusive "Sob consulta").

| Modelo | Rodada 1 | Rodada 2 | Rodada 3 | Depois dos bloqueios | Veredito |
|---|---|---|---|---|---|
| Letreiro | 7,2 | 8,2 | 8,4 | 8,4 | **passa** |
| Revista | 6,5 | 7,7 | 7,9 | 8,25 | **passa** |
| Paleta | 6,2 | 7,9 | 8,1 | 8,2 | **passa** |

Os três com nota ≥ 8 em todos os critérios. A decisão final é do titular.

Polimento que fica aberto, sem impedir a entrega: na Paleta com muitos serviços (12), o painel abre abaixo da dobra no celular depois do toque; no Letreiro, conferir ao vivo o poste girando com a loja aberta (só foi avaliado pelo código, porque as lojas estavam fechadas nas avaliações).

## Próxima ação

Concluído. Próxima tarefa a escolher pelo titular: fotos das lojas (os três modelos já reservam o lugar), T09 (exclusão a pedido do cliente) ou o módulo de WhatsApp no modelo DigAÍ. Depois: registrar as notas aqui e em CONTINUIDADE.md, commit (sem os arquivos de outras sessões) e envio ao GitHub, e o relatório ao titular. Com o limite de 3 rodadas atingido, o que ainda não passar vai para a decisão do titular, com a lista do avaliador.
