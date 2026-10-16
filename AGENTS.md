<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Continuidade entre agentes

Antes de trabalhar, leia `docs/CONTINUIDADE.md` e os checkpoints de `docs/execucao/`.
Confira o estado real dos arquivos e preserve alterações existentes. Atualize o
checkpoint durante o trabalho, após cada marco ou teste relevante, com o resultado
real, pendências e próxima ação exata. Não espere o fim da sessão para registrar.
Cada subagente mantém seu próprio checkpoint; o responsável consolida a continuidade.
Não grave segredos, tokens, dados de clientes ou saídas privadas nesses arquivos.
