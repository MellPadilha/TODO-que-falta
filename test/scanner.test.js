'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scanText } = require('../src/scanner');

test('encontra somente TODO, FIXME e DOCME em maiúsculas', () => {
  const matches = scanText([
    '// TODO: criar a tela',
    '// FIXME corrigir o fluxo',
    '# DOCME documentar a função',
    '// todo ignorado',
    '// Fixme ignorado',
    '// docme ignorado'
  ].join('\n'));

  assert.deepEqual(
    matches.map(({ marker, line, column, preview }) => ({ marker, line, column, preview })),
    [
      { marker: 'TODO', line: 0, column: 3, preview: 'criar a tela' },
      { marker: 'FIXME', line: 1, column: 3, preview: 'corrigir o fluxo' },
      { marker: 'DOCME', line: 2, column: 2, preview: 'documentar a função' }
    ]
  );
});

test('exige que o marcador seja uma palavra inteira', () => {
  const matches = scanText('TODO TODO_ITEM MYFIXME FIXME2 DOCME');

  assert.deepEqual(matches.map((match) => match.marker), ['TODO', 'DOCME']);
});

test('encontra mais de um marcador na mesma linha', () => {
  const matches = scanText('// TODO: rever FIXME e depois DOCME');

  assert.deepEqual(matches.map((match) => match.marker), ['TODO', 'FIXME', 'DOCME']);
});

test('usa um texto substituto quando não há descrição', () => {
  const [match] = scanText('/* TODO */');

  assert.equal(match.preview, 'Sem descrição');
});
