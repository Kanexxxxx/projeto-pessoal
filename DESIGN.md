# DESIGN.md — Sites das lojas

Sistema de design dos **sites públicos das lojas** (página inicial e agendamento), lido por pessoas e por agentes. Formato inspirado no Stitch/awesome-design-md: uma base comum e uma ficha por modelo. O painel e a página da plataforma têm direção própria, fora deste documento.

Revisão de 18/10/2026. **Os três modelos passaram na avaliação independente** (rubrica da §5, nota ≥ 8 em todos os critérios): Letreiro 8,4, Revista 8,25, Paleta 8,2, depois de três rodadas (histórico em `docs/execucao/SITES-DESIGN.md`). Os modelos anteriores ("Clássico" e "Contraste") foram reprovados pelo titular por serem genéricos: mesma estrutura nos dois (capa, serviços, sobre, horários, contato), creme com terracota, rótulos em caixa alta espaçada, degradê decorativo, cabeçalho com vidro e etapas numeradas — os vícios que a skill `taste` lista como marca de design feito por IA.

---

## 0. Base comum

### Para quem e para quê

- **Quem usa:** o cliente final da loja, quase sempre no celular, vindo do link do Instagram ou de uma conversa no WhatsApp.
- **O trabalho da página:** responder em segundos "tem horário para mim, quanto custa e onde fica?" e levar à reserva em poucos toques.
- **Consequência de design:** os **horários livres de verdade** aparecem na primeira tela. É o que nenhum site estático de concorrente faz, e cada modelo dá a essa informação uma forma própria.

### Conteúdo: só o real

O modelo recebe a `Vitrine` (`src/app/loja/[slug]/modelos/tipos.ts`), montada pela plataforma com dados da loja e horários calculados pela mesma conta da reserva. **Nada é inventado**: sem depoimentos, notas, "+500 clientes", fotos de banco, anos de experiência ou selos. Textos fixos da interface (rótulos, botões, mensagens) são escritos em português, frase com maiúscula só no início, voz ativa, específicos ("Reservar 14:30", nunca "Enviar").

O modelo precisa ficar bom com o conteúdo mínimo **e** com o máximo:

| Campo | Faixa real |
|---|---|
| Nome da loja | 2 a 80 caracteres (testar com 12 e com 54) |
| Chamada, sobre, endereço, WhatsApp, Instagram | podem faltar — a seção some sem deixar buraco |
| Serviços | 1 a ~20; descrição opcional; preço pode ser "Sob consulta" |
| Equipe | 1 a 3 pessoas |
| Horários | de 0 a 7 dias abertos, até 2 turnos por dia |
| Próximos horários | podem estar todos vazios (agenda cheia) — oferecer WhatsApp |

A loja `teste-limites` (banco de desenvolvimento) tem nome de 54 caracteres, 12 serviços, nada de contato e só dois dias abertos. Teste cada modelo nela com `?modelo=<id>`.

### Contrato técnico

- Cada modelo vive em `src/app/loja/[slug]/modelos/<id>/` e exporta um `Modelo` (`tipos.ts`): nome, descrição, fontes (`next/font/google`, `preload: false`), `tokens(cor, corTexto)` e o componente `Inicio({ v })`.
- `Inicio` renderiza `<main id="conteudo">` (alvo do atalho "Pular para o conteúdo") com **um único `<h1>` = nome da loja**.
- Todo serviço tem **um único** link cujo nome acessível **começa pelo nome do serviço** e leva a `servico.href` (os testes de ponta a ponta usam isso). Repetições do mesmo serviço em outro ponto da página são texto (chamadas de capa da Revista), levam a um horário (`/agendar?…&hora=`) ou são decorativas (`aria-hidden`). Na Paleta, o link do serviço fica no painel da tampa escolhida (só um painel aparece por vez).
- **Cada modelo tem a própria arquitetura de informação** (a ordem e o tipo das seções), não só a própria pele. A rodada 1 foi reprovada por ser "três temas sobre uma página só".
- Links com o mesmo texto e destinos diferentes ("Livre hoje às 14:30") levam o contexto em texto só para leitor de tela ("com Bianca").
- Texto só para leitor de tela (`sr-only`, posição absoluta) dentro de uma área que rola de lado precisa de um ancestral `relative` dentro da rolagem; senão ele escapa e alarga a página.
- Componentes de servidor por padrão; `"use client"` só para interação real, em arquivo próprio, com funcionamento sem JavaScript (links normais).
- Sem dependência nova. Tailwind 4 (sintaxe `bg-(--var)`, `font-(family-name:--f)`), CSS Modules na pasta do modelo para keyframes e animação por rolagem.
- A parte comum (`Casca.tsx`, `agendar/*`, `vitrine.ts`, `estilo.ts`) não é editada pelo modelo; ela lê os tokens. Pedidos de mudança nela vão para quem coordena.

### Tokens obrigatórios (`TokensModelo`)

`--l-fundo`, `--l-superficie`, `--l-texto`, `--l-suave`, `--marca` (cor da loja), `--marca-texto`, `--l-foco`, `--raio`, `--raio-bloco`, `--f-titulo`, `--f-texto`, `--titulo-peso`, `--titulo-caixa`, `--titulo-espaco`. Texto em `--l-texto` e `--l-suave` precisa de contraste ≥ 4,5:1 sobre `--l-fundo` e `--l-superficie` (medido nas fichas abaixo). A cor da marca é escolhida pela dona entre 10 opções; texto sobre ela usa sempre `--marca-texto` (preto ou branco, o que contrastar mais).

### Regras da casa (skill `taste` + `frontend-design`)

1. Uma ideia por modelo, dita numa frase: "Nesta página, [coisa do mundo da loja] vira [recurso de design]". Se um concorrente pudesse usar a mesma frase, ela não serve.
2. Coragem gasta num lugar só (a assinatura); o resto, quieto e disciplinado.
3. No máximo duas famílias tipográficas; duas ou três escalas visíveis, uma bem grande. Títulos de exibição com espaçamento entre −0,01 e −0,05 em e entrelinha 0,85–1,05. Texto corrido de 16 a 19 px, entrelinha 1,45–1,6, até ~65 caracteres por linha.
4. Títulos em **no máximo duas linhas** em qualquer largura (o tamanho do nome da loja depende do comprimento dele).
5. Proibido: rótulos pequenos em caixa alta espaçada ("eyebrow"), etiquetas em pílula, numeração decorativa (01/02/03), linhas finas separando seções, degradê decorativo, sombra em elemento parado, vidro/desfoque, emoji, ícones aleatórios, cartões idênticos em fila, blobs, fonte monoespaçada.
6. Separar áreas por espaço, tom e escala — não por linhas.
7. Botões decididos uma vez por modelo (quadrados **ou** totalmente redondos), planos.
8. Sem fotos por enquanto (o envio de fotos é a próxima etapa): cada modelo é completo só com tipografia, cor e forma, e reserva lugar para fotos sem depender delas.

### Acessibilidade e qualidade mínima

- Contraste AA em todo texto; contorno de campo ≥ 3:1.
- Foco visível em tudo que é clicável (`FOCO` em `estilo.ts` ou equivalente).
- Alvos de toque ≥ 44 px no celular.
- `prefers-reduced-motion`: nenhuma animação rodando (o CSS global já zera durações).
- Movimento automático para sozinho em até 5 s; acima disso, só com botão de pausa (WCAG 2.2.2).
- Animar só `transform` e `opacity`; entrada escalonada de 60–90 ms, subida de 16–32 px.
- Sem revelação ao rolar (`animation-timeline: view()`): o conteúdo abaixo da dobra fica transparente até a rolagem, some nas capturas de página inteira e, no fim de páginas curtas, pode nunca ficar opaco. A entrada animada fica só na primeira tela.
- Sem rolagem lateral em 390, 834 e 1440 px.
- Nenhum texto cortado por `overflow` (acento incluído), coberto por outra camada ou com faixa de horário ("13:30–19:00") quebrada em duas linhas.
- Composição própria no tablet: divisões em 12 colunas só a partir de `lg` (1024 px).
- Informação que está num gráfico (barras de horário, cores) também está em texto.

### Juiz e ciclo

1. **Inspeção objetiva:** `node scripts/inspecionar-sites.mjs --base http://localhost:3200 --lojas <slugs> --saida <pasta> --lint` — rolagem lateral, títulos > 2 linhas, contraste, alvos de toque, foco (com e sem foco; botão de opção escondido pelo `<label>`), reduzir movimento, erros de console, `<h1>` único, texto cortado, texto coberto, Didone abaixo de 28 px, faixa de horário quebrada e padrões proibidos no código. Também avisa grade com um item sozinho na última linha e o mesmo texto em todos os itens de uma lista, toca nas opções da cartela para medir se a página "pula" (posição na página, não na tela: o Chrome compensa rolando, o Safari do iPhone não) e percorre o "horário primeiro" (todo serviço e toda pessoa oferecidos com um horário têm de chegar a "Seus dados"). Zero FALHA para entregar; aviso exige olhar e decidir. Cada verificação nova passa por teste de mutação (reintroduzir o defeito e ver o juiz acusar).
2. **Olhar:** capturas em 1440, 834 e 390 px; corrigir os três piores problemas; no máximo três rodadas.
3. **Avaliação independente** (agente avaliador, rubrica da §5). Quem construiu não se avalia.
4. **A decisão final é do titular.**

---

## 1. Letreiro — barbearia de azulejo

> **Ideia:** nesta página, a parede da barbearia vira o site: o próximo horário livre é o letreiro da vitrine, o quadro de preços (com a placa ABERTO/FECHADO e o horário pintado) é a peça central, e o endereço é a placa da porta. O poste listrado gira com a rolagem enquanto a loja está aberta.

### 1.1 Atmosfera

Barbearia clássica de bairro: parede de azulejo branco, letreiro pintado à mão, quadro de preços na parede, poste listrado girando na porta. Direta, confiante, legível de longe. **Não** é a barbearia "escura com dourado" que todo template usa.

### 1.2 Cores e papéis

| Nome | Hex | Papel | Contraste |
|---|---|---|---|
| Azulejo | `#F3F4F1` | fundo da página | — |
| Porcelana | `#FFFFFF` | superfícies, campos | — |
| Azul-marinho de letreiro | `#13203B` | texto, quadro de preços (fundo) | 14,7:1 sobre azulejo |
| Grafite | `#4B5567` | texto secundário | 6,8:1 / 7,5:1 |
| Cor da loja (padrão `#B3202A`) | `--marca` | listra do poste, botão principal, ponto "aberto", hoje | branco sobre `#B3202A`: 6,7:1 |

O poste usa três listras: cor da loja, porcelana e marinho. É o único lugar onde a cor da loja ocupa área grande.

### 1.3 Tipografia

- **Big Shoulders** (letreiro de rua de Chicago; eixo de tamanho óptico): títulos, nome da loja, horários e preços. Caixa alta, peso 800–900, entrelinha 0,82–0,9, espaçamento −0,01 em.
- **Archivo**: texto, rótulos e botões. 16–18 px, peso 400/500/600.

| Uso | Família | Tamanho (390 → 1440) |
|---|---|---|
| Próximo horário (algarismos) | Big Shoulders 900 | 88 → 220 px |
| Nome da loja | Big Shoulders 800 | conforme comprimento, até 2 linhas |
| Títulos de seção | Big Shoulders 800 | 44 → 96 px |
| Serviço no quadro | Big Shoulders 700 | 28 → 44 px |
| Texto | Archivo 400 | 17 px |

Algarismos sempre tabulares.

### 1.4 Componentes (ordem da página)

1. **Cabeçalho:** o monograma quadrado em todas as larguras (o nome inteiro é o título logo abaixo); links "Preços e horário", "Cadeiras", "Endereço"; "Agendar" secundário (contorno), para não competir com o botão na cor da loja.
2. **Poste:** faixa de listras a 45°. Computador e tablet: vertical, à esquerda da capa (20 px no tablet, 32 px no computador). Celular: horizontal, logo abaixo do cabeçalho. Com a loja aberta, **gira com a rolagem** (`animation-timeline: scroll(root)`): movimento comandado pela pessoa, sem limite de tempo. Sem esse recurso no navegador, duas voltas de 2,4 s ao abrir e para (WCAG 2.2.2). Parado com a loja fechada e com "reduzir movimento".
3. **Capa (a vitrine):** situação ("Fechado agora · abre terça às 09:00"), o nome e a chamada; "Próxima cadeira livre" com o dia e a hora em algarismos enormes, "para Corte", "Reservar 09:00" (só a partir do tablet), "Ver todos os horários" e "Também livre: 09:30 10:00". Agenda cheia: "Agenda cheia nos próximos dias" e WhatsApp.
4. **Quadro (a parede):** bloco marinho com o título "Tabela de preços"; a **placa** ABERTO (acesa na cor da loja) ou FECHADO (contorno) com o horário de hoje; as linhas de serviço (nome e preço em Big Shoulders, com a seta ao lado do preço; duração e descrição; o próximo horário do serviço **só quando é diferente** do primeiro da loja); e, ao lado (embaixo no celular), o **horário da semana pintado**, com dias seguidos agrupados ("ter a qui") e cada turno inteiro numa linha. As cores do quadro são variáveis locais (`--quadro`, `--quadro-linha`, `--quadro-texto`, `--quadro-suave`, `--quadro-realce`).
5. **Cadeiras:** uma coluna por barbeiro (nome grande), o que faz e "Cadeira livre ter, 20/10 às 09:00 →". O que é igual para todas é dito uma vez, sob o título ("Todas as cadeiras fazem todos os serviços da tabela, todas livres ter, 20/10 às 09:00."), e cada cadeira fica com "Reservar com Rafael →". Sem faixas alternadas.
6. **Placa da porta:** o endereço em Big Shoulders grande dentro de uma placa com borda marinha, com "Abrir no mapa", WhatsApp e Instagram. Some se não houver nenhum dos três.
7. **Rodapé:** o nome da loja de ponta a ponta (`overflow-x-clip`, entrelinha 0,9, piso de 2 rem; nome longo ou muito longo em até 2 linhas), "Agenda online por Nexakeep" e uma listra do poste parada.
8. **Barra fixa no celular:** a reserva principal ("Reservar ter, 20/10 às 09:00"), quadrada, de largura total, com a margem de segurança do iPhone fora da área do botão.

### 1.5 Layout

Largura máxima de 1360 px; margens de 20 px (celular) e 48 px (computador); espaço entre seções de 144 px (computador) e 96 px (celular).

```
Computador (1440)
┌──┬──────────────────────────────────────────────────────────────┐
│▚▚│ BARBEARIA NAVALHA DE OURO  Preços e horário  Cadeiras [Agendar] │
│▚▚│ ■ Fechado agora · abre terça às 09:00                        │
│▚▚│ BARBEARIA NAVALHA DE OURO                                    │
│▚▚│ Próxima cadeira livre                                        │
│▚▚│ TER, 20/10                    para Corte                     │
│▚▚│ 09:00                         [RESERVAR 09:00] Ver todos     │
└──┴──────────────────────────────────────────────────────────────┘
 ┌──────────────────── quadro marinho ────────────────────────────┐
 │ TABELA DE PREÇOS                                   ┌─────────┐ │
 │                                                    │ FECHADO │ │
 │ CORTE ............................. R$ 45  │ HORÁRIO          │
 │ BARBA ............................. R$ 35  │ TER A QUI 09–19  │
 └────────────────────────────────────────────────────────────────┘
 CADEIRAS   RAFAEL        DIEGO
 ┌ placa: RUA DAS TESOURAS, 100 — CENTRO ┐
 BARBEARIA NAVALHA DE OURO   (rodapé)
```

### 1.6 Profundidade

Plana. A profundidade vem do quadro marinho, que é um objeto inserido na página, e das listras. Sem sombras.

### 1.7 Faça / não faça

- **Faça:** caixa alta só na Big Shoulders; algarismos grandes; o poste como única assinatura (no máximo uma segunda aparição pequena no rodapé).
- **Não faça:** preto com dourado, bigode, tesoura ou navalha desenhados, textura de couro ou madeira, fonte manuscrita, "estilo é atitude", pontilhado entre nome e preço.

### 1.8 Responsivo

- **Tablet (834):** capa em uma coluna, poste vertical fino, quadro com o horário embaixo das linhas, cadeiras em 2 colunas, botão "Reservar" na capa.
- **Celular:** poste horizontal; a barra fixa é o único botão principal de reserva; horário pintado embaixo do quadro.
- **Quadro de preços:** o nome quebra antes de o preço apertar.

### 1.9 Guia rápido para agente

Azulejo `#F3F4F1`, marinho `#13203B`, grafite `#4B5567`, cor da loja nas listras, na placa acesa e no botão. Big Shoulders em caixa alta para tudo que é "letreiro"; Archivo para o resto. Botões quadrados. Ordem: vitrine (próximo horário) → parede (quadro com placa e horário) → cadeiras → placa da porta.

---

## 2. Revista — edição do mês

> **Ideia:** nesta página, o salão vira a edição do mês de uma revista de moda, na ordem de uma revista: capa (a loja como título, os serviços como chamadas e a agenda da edição), a **agenda como página 2**, o índice, a carta da casa e o **expediente** (quem assina a edição, o horário e o endereço).

### 2.1 Atmosfera

Revista de moda folheada na sala de espera do salão: capa de cor chapada, título da revista em Didone, chamadas de capa e páginas internas brancas e arejadas. Sofisticada e calma. **Não** é jornal: nada de colunas densas, fios ou creme.

### 2.2 Cores e papéis

| Nome | Hex | Papel | Contraste |
|---|---|---|---|
| Capa | `--marca` (padrão `#8C2F39`) | fundo da capa inteira | texto da capa em `--marca-texto` |
| Papel | `#FFFFFF` | fundo das páginas internas | — |
| Tinta | `#141414` | texto | 18,4:1 |
| Grafite | `#5E5E5E` | texto secundário | 6,5:1 / 5,7:1 |
| Papel-cartão | `#F2F1EF` | blocos internos (retratos, agenda) | — |

Nas páginas internas, a cor da loja aparece só em detalhes: o sublinhado dos links, os horários livres e a página "Agenda".

### 2.3 Tipografia

- **Bodoni Moda** (Didone, tamanho óptico até 96): o título da revista (nome da loja), títulos e chamadas de capa. **Nunca abaixo de 28 px**: o fio fino da Didone some em tamanho pequeno.
- **Hanken Grotesk**: texto, preços, horários e botões.

| Uso | Família | Tamanho (390 → 1440) |
|---|---|---|
| Título da revista (nome) | Bodoni Moda 500, caixa alta, −0,025 em | conforme comprimento, até 2 linhas, ocupando a largura; acima de 36 caracteres, em caixa normal (a Didone em caixa alta é larga demais) e no mínimo 28 px. **Exceção aceita:** nome de 54 caracteres no celular fica em 3 linhas, porque as duas regras não cabem juntas |
| Chamadas de capa | Bodoni Moda itálico 400 | 28 → 40 px (28 px fixos com nome muito longo, para o título continuar o maior) |
| Títulos de seção | Bodoni Moda 400 | 44 → 88 px |
| Abertura da "Carta da casa" | Bodoni Moda 400 | 30 → 44 px |
| Texto | Hanken Grotesk 400 | 18 px, entrelinha 1,6 |

### 2.4 Componentes (ordem da página)

1. **Capa** (altura da tela no tablet e no computador, até 832 px; no computador o título fica no topo, como o logotipo de uma revista, e o vão entre ele e as chamadas é o lugar da foto de capa; no celular, a altura do conteúdo):
   - topo: "Edição de outubro de 2026 · Salão de beleza" e a navegação (Agenda, Nesta edição, Expediente);
   - meio: o nome como título da revista, cada palavra entrando em sequência, e a chamada da loja;
   - embaixo: até três chamadas de capa **só em texto**, como numa revista impressa (com nome muito longo, duas no computador e nenhuma no celular, para o título continuar o maior); e "Na agenda desta edição" com **três horários reais espalhados pelo dia**, cada um num botão papel sobre a capa que abre a reserva naquele dia e hora (o serviço é escolhido em seguida).
2. **Agenda (página 2):** os próximos 3 dias com vaga (`v.agenda`), cada um com quantos horários livres tem e até 4 horários espalhados de manhã à noite. **O horário é o link** (`/agendar?data=…&hora=…`): a reserva abre naquele dia e hora e o serviço é escolhido em seguida. Quando nem todos os serviços cabem no horário, aparece "para 4 dos 6 serviços"; quando todos cabem em todos os horários, isso é dito uma vez, no alto. Três dias em três colunas a partir do tablet (horários em uma coluna no tablet, em duas no computador e no celular). Sem horários: "Agenda cheia nos próximos dias" e o WhatsApp. (A rodada 2 listava serviços em cada horário: 36 links repetidos.)
3. **Nesta edição (o índice):** cada serviço com o preço em Bodoni 28 px, como o número da página, duração, **quem faz** ("com Bianca e Lorena", quando não é a equipe toda), a descrição e o próximo horário só quando ele difere do primeiro da casa.
4. **Carta da casa (sobre):** a primeira frase em Bodoni grande; o resto em uma coluna de ~60 caracteres, assinada com o nome.
5. **Expediente (rodapé, em papel-cartão):** "Quem assina" (cada pessoa em Bodoni itálico, o que faz e "Na agenda: ter, 20/10, 09:00"; o que é igual para todas é dito uma vez — "Toda a equipe faz todos os serviços da casa; próxima vaga de cada pessoa: ter, 20/10 às 09:00" — e cada pessoa fica com "Reservar com Bianca"); "Horário da casa"; "Onde fica" com mapa, WhatsApp e Instagram; e o nome da loja com "Edição de outubro de 2026 · agenda online por Nexakeep".
6. **Barra de reserva no celular:** fundo tinta, cantos retos, "Reservar ter, 20/10 às 09:00". Entra quando a capa sai da tela (animação por rolagem; enquanto está fora, fica escondida também para o teclado); sem esse recurso, fica sempre visível.
- **Botões:** retângulo de canto reto, plano. Na capa, fundo papel com texto tinta; no miolo, fundo tinta com texto papel.

### 2.5 Layout

Grade de 12 colunas a partir de `lg` e largura máxima de 1320 px. Composições assimétricas: título da seção nas colunas 1–4, conteúdo nas 6–12. A agenda usa colunas automáticas (`repeat(auto-fit, minmax(16rem, 1fr))`), para 1, 2 ou 3 dias ficarem equilibrados.

```
Capa (1440)
┌──────────────────────────────────────────────────────────────┐
│ Edição de outubro de 2026 · Salão de beleza    Agenda  Nesta edição  Expediente │
│  S A L Ã O   J A S M I M          ← título de ponta a ponta  │
│  Cabelo, cor e cuidado, com hora marcada.                    │
│ Corte feminino R$ 90       Na agenda desta edição            │
│ Escova modelada R$ 60      [Ter 09:00] [Ter 12:00] [Ter 15:00] │
└──────────────────────────────────────────────────────────────┘
Página 2:  Agenda   Ter, 20/10      Qua, 21/10      Qui, 22/10
                    09:00 Corte · Escova · e mais 4
Página 3:  Nesta edição      Corte feminino ........ R$ 90
Expediente: Quem assina | Horário da casa | Onde fica
```

### 2.6 Profundidade

Plana. Contraste entre a capa chapada e o papel branco; blocos em papel-cartão. Sem sombras.

### 2.7 Faça / não faça

- **Faça:** muito espaço em branco; a Didone grande; o itálico só nas chamadas de capa (todas, de forma consistente).
- **Não faça:** creme, dourado, fonte manuscrita, colunas de jornal, fios entre as seções, palavra destacada em cor dentro do título, Didone em texto pequeno.

### 2.8 Responsivo

- **Celular:** capa com o título em até 2 linhas (3 com nome de 54 caracteres), as chamadas empilhadas e os três horários em botões de largura total; agenda em uma coluna; barra de reserva depois da capa.
- **Tablet:** seções com o título em cima do conteúdo; os três horários da capa lado a lado; agenda em colunas automáticas.

### 2.9 Guia rápido para agente

Capa na cor da loja; miolo branco `#FFFFFF`, tinta `#141414`, grafite `#5E5E5E`, papel-cartão `#F2F1EF` no expediente. Bodoni Moda grande (≥ 28 px) e Hanken para o resto. Botões retos. Ordem de revista: capa → agenda (p. 2) → nesta edição → carta da casa → expediente.

---

## 3. Paleta — cartela de esmaltes

> **Ideia:** nesta página, a cartela de esmaltes é a capa: cada serviço é uma tampa de cor; escolher a tampa abre o leque daquele serviço com os horários livres.

### 3.1 Atmosfera

Bancada de estúdio de unhas: amostras de esmalte em leque, cores que dão vontade de escolher, formas arredondadas de frasco e de tampa. Leve, alegre e confiante. **Não** é infantil: sem confete, emoji ou ilustração fofa.

### 3.2 Cores e papéis

| Nome | Hex | Papel | Contraste |
|---|---|---|---|
| Fundo | 8% da cor da loja sobre branco (`misturar`) | fundo da página | — |
| Branco | `#FFFFFF` | cartões, painéis | — |
| Ameixa | `#2A1726` | texto | 15,0:1 sobre o fundo rosado |
| Ameixa suave | `#6E5468` | texto secundário | ≥ 6,0:1 (testado com as 10 cores da loja) |
| Cor da loja | `--marca` | botão principal e base da paleta de amostras | — |
| Amostras | geradas da cor da loja | uma cor por serviço | texto sobre a amostra via `textoSobre` |

As amostras são uma **coleção da mesma família** da cor da loja, como os tons de uma marca de esmalte: o matiz gira no máximo 40° (teste: nenhuma passa de 45°) e a variedade vem da luz e da intensidade (claros e escuros na mesma cartela). A rodada 1 girava até 180° e saía da marca (mostarda e oliva ao lado de magenta). A função é pura e testada na pasta do modelo, e o texto sobre cada amostra passa de 4,5:1.

### 3.3 Tipografia

**Bricolage Grotesque** é a única família (eixos de largura e de tamanho óptico):

| Uso | Ajuste | Tamanho (390 → 1440) |
|---|---|---|
| Nome da loja | 800, largura 90, −0,025 em (com −0,04 as letras colavam) | até 2 linhas |
| Títulos de seção | 800, largura 90 | 36 → 60 px |
| Nome na amostra da frente | 800 | 24 → 48 px, pelo comprimento do nome |
| Texto | 400, óptico 14 | 17 px |

### 3.4 Componentes (ordem da página)

1. **Cabeçalho:** a marca do modelo — três tampas da cartela sobrepostas (o nome inteiro é o título logo abaixo); links "Serviços", "Quem atende", "Onde fica" a partir do tablet; "Agendar" com contorno (o botão cheio é só o da capa).
2. **Capa = cartela:**
   - o nome, a chamada, a situação e "Reservar seg, 19/10 às 09:00";
   - **"Escolha o serviço":** uma tampa por serviço — um `<label>` com botão de opção escondido, a bolinha na cor da amostra, o nome e o preço (sempre visível: 14 px no celular, 16 px do tablet em diante; na rodada 3 ele sumiu no celular e "quanto custa" exigia um toque por serviço). No celular, as tampas são fichas que quebram linha. A tampa marcada ganha fundo branco e anel. Teclado: as setas trocam o serviço, e o anel de foco fica na tampa inteira;
   - **painel do serviço:** vem logo depois da tampa no HTML e aparece só para a marcada (`.tampa:has(:checked) + .painel`, sem JavaScript e sem regra por posição). No celular, vai para depois de todas as tampas (`order`): trocar de tampa não move nenhuma (na rodada 2, o painel entre as tampas fazia a lista pular ~440 px sob o dedo). Mostra o **leque**: a amostra escolhida na frente (nome, descrição e quem faz, preço e duração, "Escolher dia e hora", link para `servico.href`) e as duas seguintes atrás, abrindo para a direita cada vez que o painel aparece. Embaixo, a descrição, quem faz e os **horários livres em bolinhas** (hora e dia), cada uma abrindo a reserva naquele horário. Navegador sem `:has`: todos os painéis abertos, como lista.
3. **Quem atende e quando:** um bloco branco só, com as pessoas (iniciais numa tampa de cor, nome, "Atende todos os serviços", "Livre seg 19, 09:00") e **a semana em tampas**: cada dia aberto é uma tampa cheia na cor da loja (uma cor só: a cor de um serviço num dia da semana sugeria uma relação que não existe), o fechado só o contorno, hoje com anel; embaixo, cada turno em duas linhas ("09:00" / "às 18:00"). Quatro por linha no celular, sete no tablet e no computador. Sem equipe, vira "Quando abre".
4. **Onde fica:** endereço grande e botões redondos com contorno ("Como chegar", WhatsApp, Instagram). Some sem contato.
5. **Rodapé:** uma fileira das primeiras tampas da cartela e "Studio Bella Unhas · agenda online por Nexakeep".
- **Botões e horários:** totalmente redondos (`--raio: 999px`), planos; campos de várias linhas usam `--raio-bloco`.

### 3.5 Layout

Largura máxima de 1240 px; blocos com raio de 28 px. A partir do tablet (`md`), a cartela vira grade de duas colunas (5/12 para as tampas, 7/12 para o painel, que fica preso no alto ao rolar). No celular, fichas que quebram linha e o painel embaixo de todas.

```
Computador (1440)
┌──────────────────────────────────────────────────────────────┐
│ Studio Bella Unhas      Serviços  Quem atende  Onde fica (Agendar) │
│ Studio                       Unhas e sobrancelhas…           │
│ Bella Unhas                  ● Fechado agora · abre seg 09:00 │
│                              (Reservar seg, 19/10 às 09:00)  │
│ Escolha o serviço                                            │
│ (●) Manicure    R$ 35 ← marcada      ╭──────────╮╮╮  ← leque  │
│ (●) Pedicure    R$ 40                │ Manicure ││          │
│ (●) Esmaltação  R$ 90                │ R$ 35 · 45 min       │
│                                      (09:00) (09:30) (10:00) │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 Profundidade

A sobreposição das amostras no leque dá a profundidade, e a elevação aparece só no estado de interação. Em repouso, sem sombra.

### 3.7 Faça / não faça

- **Faça:** muitas cores, mas sempre derivadas da cor da loja; formas redondas e grandes; o movimento de leque.
- **Não faça:** rosa-bebê com dourado, unha ou mão desenhada, brilho/glitter, emoji, letra manuscrita, blob decorativo.

### 3.8 Responsivo

- **Celular:** tampas como fichas; o painel (leque e bolinhas) embaixo de todas; o leque abre menos (4° por amostra) para caber na largura.
- **Tablet e computador:** tampas à esquerda, painel à direita; leque com 5° por amostra a partir de `lg`.
- Efeitos de passar o mouse só com `(hover: hover)`: no toque eles "grudavam".

### 3.9 Guia rápido para agente

Fundo 8% da cor da loja, ameixa `#2A1726`, ameixa suave `#6E5468`. Só Bricolage Grotesque. Tudo redondo. A capa é a cartela: tampa → leque → horários.

---

## 4. Agendamento (parte comum)

`src/app/loja/[slug]/agendar/` usa só tokens: títulos na fonte e no estilo do modelo (`TITULO`; 28 px nas etapas, o piso da Didone), cantos de `--raio`/`--raio-bloco`, a cor da loja no dia escolhido e no botão principal. Etapas sem número: o que já foi escolhido aparece resumido, com um ponto na forma do modelo e "Alterar"; o horário escolhido aparece grande, na letra de título do modelo. **Horário primeiro:** um link só com `data` e `hora` (agenda da Revista) mostra o horário escolhido, pergunta o serviço e a pessoa e mantém o horário até "Seus dados". **Só oferece o que cabe** (`livresNoHorario`, a mesma grade da reserva): os serviços que não cabem naquele horário ficam abaixo, como "outro horário" (o link não leva o horário), e em "Com quem?" quem não está livre aparece com "sem vaga às 09:00 · outro horário". Se um link com serviço e horário chega quando o horário já não está livre, a página avisa ("O horário das 13:30 de terça, 20 out não está livre para corte. Escolha outro abaixo.") em vez de cair calada na escolha. Confirmação com o botão "Avisar a loja no WhatsApp" (modo manual do plano básico).

## 5. Rubrica de avaliação

Notas de 0 a 10, justificadas com o que foi implementado e medido (capturas, relatório da inspeção):

| Critério | Peso | 10 significa |
|---|---|---|
| Originalidade e identidade | 0,20 | a ideia só serve para este modelo; ninguém confundiria com os outros dois |
| Estética e direção de arte | 0,20 | tipografia, cor e composição de produto profissional |
| Usabilidade e navegação | 0,15 | reserva em poucos toques; horários livres visíveis de cara |
| Responsividade e acessibilidade | 0,15 | composição própria em cada largura; inspeção sem falha |
| Qualidade técnica | 0,15 | código limpo, sem dependência nova, sem JS desnecessário |
| Coerência com o propósito | 0,15 | conteúdo real, linguagem da loja, nada inventado |

Calibragem (do avaliador do ECC): 6 = correto mas comum; 7 = bom trabalho de júnior; 8 = profissional com arestas; 9 = polido; 10 = poderia ir ao ar como produto. **Entrega exige nota ≥ 8 em todos os critérios e zero falha na inspeção.** Abaixo disso, o avaliador aponta as correções e o modelo volta para quem o construiu.
