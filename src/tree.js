'use strict';

/**
 * Agrupa ocorrências por arquivo, preservando a ordem em que os arquivos
 * aparecem na lista.
 *
 * @template {{ uri: { toString(): string } }} T
 * @param {T[]} matches
 * @returns {{ uri: T['uri'], matches: T[] }[]}
 */
function groupMatchesByFile(matches) {
  const files = new Map();

  for (const match of matches) {
    const key = match.uri.toString();
    const file = files.get(key);

    if (file) {
      file.matches.push(match);
    } else {
      files.set(key, {
        uri: match.uri,
        matches: [match]
      });
    }
  }

  return Array.from(files.values());
}

module.exports = {
  groupMatchesByFile
};
