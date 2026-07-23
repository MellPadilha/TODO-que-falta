'use strict';

const MARKERS = Object.freeze(['TODO', 'FIXME', 'DOCME']);
const MARKER_PATTERN = /\b(TODO|FIXME|DOCME)\b/g;

/**
 * Encontra marcadores em um texto. A expressão é propositalmente sensível a
 * maiúsculas: "todo", "Fixme" e "docme" não são resultados válidos.
 *
 * @param {string} text
 * @returns {{ marker: string, line: number, column: number, preview: string }[]}
 */
function scanText(text) {
  const matches = [];
  const lines = text.split(/\r?\n/);

  for (let line = 0; line < lines.length; line += 1) {
    const lineText = lines[line];
    MARKER_PATTERN.lastIndex = 0;

    for (let match = MARKER_PATTERN.exec(lineText); match; match = MARKER_PATTERN.exec(lineText)) {
      matches.push({
        marker: match[1],
        line,
        column: match.index,
        preview: createPreview(lineText, match.index, match[1].length)
      });
    }
  }

  return matches;
}

/**
 * @param {string} lineText
 * @param {number} column
 * @param {number} markerLength
 * @returns {string}
 */
function createPreview(lineText, column, markerLength) {
  const withoutMarker = `${lineText.slice(0, column)}${lineText.slice(column + markerLength)}`;
  const cleaned = withoutMarker
    .replace(/^\s*(?:\/\/+|\/\*+|\*+|#+|<!--+|--+|;+)\s*/, '')
    .replace(/\s*(?:\*\/|-->)\s*$/, '')
    .replace(/^\s*[:\-–—]\s*/, '')
    .trim();

  return cleaned || 'Sem descrição';
}

module.exports = {
  MARKERS,
  scanText
};
