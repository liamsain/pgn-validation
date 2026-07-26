import type { HeaderToken, MoveToken, TokenizeResult, ValidationError } from './types';

const HEADER_RE = /^\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]/;
const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*']);
const MOVE_NUMBER_RE = /^\d+\.+/;

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/** Scans leading `[Key "Value"]` header lines. Returns the index where movetext begins. */
function scanHeaders(text: string): { headers: HeaderToken[]; movetextStart: number; error: ValidationError | null } {
  const headers: HeaderToken[] = [];
  let i = 0;

  while (true) {
    let j = i;
    while (j < text.length && isWhitespace(text[j])) j++;
    if (j >= text.length || text[j] !== '[') {
      i = j;
      break;
    }

    const slice = text.slice(j);
    const match = slice.match(HEADER_RE);
    if (!match) {
      let lineEnd = text.indexOf('\n', j);
      if (lineEnd === -1) lineEnd = text.length;
      return {
        headers,
        movetextStart: i,
        error: {
          start: j,
          end: lineEnd,
          title: 'Malformed header',
          reason: 'This header line doesn\'t match the required [Key "Value"] format — check for a missing quote or closing bracket.',
          snippet: text.slice(j, lineEnd).trim(),
        },
      };
    }

    headers.push({
      key: match[1],
      value: match[2],
      start: j,
      end: j + match[0].length,
    });
    i = j + match[0].length;
  }

  return { headers, movetextStart: i, error: null };
}

/**
 * Finds the end of a `(...)` variation starting at `openIndex`, respecting nested
 * variations and comments (whose contents are skipped verbatim). Returns the index
 * just past the matching `)`, or -1 if unterminated.
 */
function findVariationEnd(text: string, openIndex: number): number {
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      const close = text.indexOf('}', i + 1);
      if (close === -1) return -1;
      i = close + 1;
      continue;
    }
    if (ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')') {
      depth--;
      i++;
      if (depth === 0) return i;
      continue;
    }
    i++;
  }
  return -1;
}

function isStopChar(ch: string): boolean {
  return isWhitespace(ch) || ch === '{' || ch === '(' || ch === ')' || ch === '}';
}

function tokenizeMovetext(text: string, start: number): { tokens: MoveToken[]; error: ValidationError | null } {
  const tokens: MoveToken[] = [];
  let i = start;

  while (i < text.length) {
    if (isWhitespace(text[i])) {
      i++;
      continue;
    }

    const ch = text[i];

    if (ch === ')') {
      return {
        tokens,
        error: {
          start: i,
          end: i + 1,
          title: 'Unmatched parenthesis',
          reason: "This closing parenthesis doesn't have a matching opening one.",
          snippet: ')',
        },
      };
    }

    if (ch === '}') {
      return {
        tokens,
        error: {
          start: i,
          end: i + 1,
          title: 'Unmatched brace',
          reason: "This closing brace doesn't have a matching opening one.",
          snippet: '}',
        },
      };
    }

    if (ch === '{') {
      const close = text.indexOf('}', i + 1);
      if (close === -1) {
        return {
          tokens,
          error: {
            start: i,
            end: text.length,
            title: 'Unterminated comment',
            reason: 'This comment is missing its closing "}".',
            snippet: text.slice(i, Math.min(text.length, i + 40)),
          },
        };
      }
      tokens.push({ kind: 'comment', start: i, end: close + 1, text: text.slice(i, close + 1) });
      i = close + 1;
      continue;
    }

    if (ch === '(') {
      const end = findVariationEnd(text, i);
      if (end === -1) {
        return {
          tokens,
          error: {
            start: i,
            end: text.length,
            title: 'Unmatched parenthesis',
            reason: 'This variation is missing its closing ")".',
            snippet: text.slice(i, Math.min(text.length, i + 40)),
          },
        };
      }
      // Variations (sub-lines) are intentionally not validated — only the mainline is checked.
      tokens.push({ kind: 'variation', start: i, end, text: text.slice(i, end) });
      i = end;
      continue;
    }

    if (ch === '$') {
      let j = i + 1;
      while (j < text.length && /\d/.test(text[j])) j++;
      if (j > i + 1) {
        tokens.push({ kind: 'nag', start: i, end: j, text: text.slice(i, j) });
        i = j;
        continue;
      }
    }

    // Grab the next whitespace/bracket-delimited word.
    let j = i;
    while (j < text.length && !isStopChar(text[j])) j++;
    const word = text.slice(i, j);
    let pos = i;
    let rest = word;

    const numMatch = rest.match(MOVE_NUMBER_RE);
    if (numMatch) {
      tokens.push({ kind: 'move-number', start: pos, end: pos + numMatch[0].length, text: numMatch[0] });
      pos += numMatch[0].length;
      rest = rest.slice(numMatch[0].length);
    }

    if (rest.length > 0) {
      if (RESULT_TOKENS.has(rest)) {
        tokens.push({ kind: 'result', start: pos, end: pos + rest.length, text: rest });
        // A result token ends the game; anything after it is ignored.
        return { tokens, error: null };
      }
      tokens.push({ kind: 'san', start: pos, end: pos + rest.length, text: rest });
    }

    i = j;
  }

  return { tokens, error: null };
}

export function tokenize(text: string): TokenizeResult {
  const { headers, movetextStart, error: headerError } = scanHeaders(text);
  if (headerError) {
    return { headers, tokens: [], headerError, structureError: null };
  }

  const { tokens, error: structureError } = tokenizeMovetext(text, movetextStart);
  return { headers, tokens, headerError: null, structureError };
}
