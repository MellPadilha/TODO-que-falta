'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { groupMatchesByFile } = require('../src/tree');

test('agrupa as ocorrências por arquivo', () => {
  const arquivoX = fakeUri('file:///projeto/arquivo-x.js');
  const arquivoY = fakeUri('file:///projeto/arquivo-y.js');
  const matches = [
    { marker: 'TODO', uri: arquivoX, preview: 'primeiro' },
    { marker: 'TODO', uri: arquivoX, preview: 'segundo' },
    { marker: 'TODO', uri: arquivoY, preview: 'terceiro' }
  ];

  const files = groupMatchesByFile(matches);

  assert.equal(files.length, 2);
  assert.equal(files[0].uri, arquivoX);
  assert.deepEqual(
    files[0].matches.map((match) => match.preview),
    ['primeiro', 'segundo']
  );
  assert.equal(files[1].uri, arquivoY);
  assert.deepEqual(
    files[1].matches.map((match) => match.preview),
    ['terceiro']
  );
});

function fakeUri(value) {
  return {
    toString() {
      return value;
    }
  };
}
