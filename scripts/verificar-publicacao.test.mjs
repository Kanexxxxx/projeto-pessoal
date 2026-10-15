// Amostras montadas por concatenação: o arquivo de teste não pode, ele mesmo,
// conter um segredo ou telefone real em texto corrido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificarTexto, verificarCaminho } from './verificar-publicacao.mjs';

const bloqueia = (texto) => verificarTexto('amostra.ts', texto).length > 0;

test('bloqueia segredos de alta confiança', () => {
  assert.ok(bloqueia('const t = "' + 'gh' + 'p_' + 'a1B2'.repeat(10) + '"'));
  assert.ok(bloqueia('OPENAI=' + 's' + 'k-proj-' + 'x9'.repeat(20)));
  assert.ok(bloqueia('-----BEGIN ' + 'PRIVATE KEY-----'));
  assert.ok(bloqueia('meta: ' + 'E' + 'AA' + 'Zz'.repeat(25)));
  assert.ok(bloqueia('jwt=' + 'ey' + 'J' + 'a'.repeat(20) + '.ey' + 'J' + 'b'.repeat(20) + '.' + 'c'.repeat(25)));
  assert.ok(bloqueia('senha: "' + 'Correta-Cavalo-Bateria' + '"'));
  assert.ok(bloqueia('postgres://app:' + 'umaSenhaLonga' + '@db.interno:5432/x'));
});

test('bloqueia dados pessoais com cara de reais', () => {
  assert.ok(bloqueia('Ligar para (1' + '6) 99' + '123-4567'));
  assert.ok(bloqueia('to: "55' + '18' + '997' + '000001"'));
  assert.ok(bloqueia('cliente@' + 'gmail.com'));
  // CPF com dígitos verificadores válidos (gerado para o teste).
  assert.ok(bloqueia('cpf ' + '529.982.' + '247-25'));
});

test('aceita dados fictícios convencionados', () => {
  assert.equal(bloqueia('telefone de teste (20) 99999-0001'), false);
  assert.equal(bloqueia('dona@loja-a.test e suporte@nexakeep.site'), false);
  assert.equal(bloqueia('cpf inválido 111.111.111-11'), false);
  assert.equal(bloqueia('postgres://app:senha@localhost:5432/nexakeep'), false);
  assert.equal(bloqueia('linha marcada 55' + '11' + '988887777 // publicacao:ficticio'), false);
});

test('bloqueia caminhos privados, mídia solta e arquivos grandes', () => {
  assert.ok(verificarCaminho('privado/INVENTARIO-T01.md', 10).length > 0);
  assert.ok(verificarCaminho('apps/web/.env.local', 10).length > 0);
  assert.ok(verificarCaminho('backups/2026-10-15.dump', 10).length > 0);
  assert.ok(verificarCaminho('apps/web/public/fotos/cliente.jpg', 10).length > 0);
  assert.ok(verificarCaminho('docs/grande.md', 3 * 1024 * 1024).length > 0);
  assert.equal(verificarCaminho('.env.example', 10).length, 0);
  assert.equal(verificarCaminho('apps/web/public/demo/salao-ficticio.webp', 10).length, 0);
});
