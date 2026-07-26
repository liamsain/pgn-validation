import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { PlyRecord, TokenizeResult, ValidationResult } from './types';

const SAN_SHAPE_RE = /^(O-O-O|O-O|0-0-0|0-0|[KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](=[QRNB])?)[+#]?$/;

export function validate(tokenized: TokenizeResult): ValidationResult {
  if (tokenized.headerError) {
    return { valid: false, error: tokenized.headerError, startFen: DEFAULT_POSITION, plies: [] };
  }
  if (tokenized.structureError) {
    return { valid: false, error: tokenized.structureError, startFen: DEFAULT_POSITION, plies: [] };
  }

  const headerMap: Record<string, string> = {};
  for (const h of tokenized.headers) headerMap[h.key] = h.value;

  let chess: Chess;
  try {
    chess = headerMap.FEN ? new Chess(headerMap.FEN) : new Chess();
  } catch (e) {
    const fenHeader = tokenized.headers.find((h) => h.key === 'FEN')!;
    return {
      valid: false,
      error: {
        start: fenHeader.start,
        end: fenHeader.end,
        title: 'Invalid starting position',
        reason: `The FEN in the header isn't a valid chess position (${(e as Error).message}).`,
        snippet: fenHeader.value,
      },
      startFen: DEFAULT_POSITION,
      plies: [],
    };
  }

  const startFen = chess.fen();
  const plies: PlyRecord[] = [];
  let moveCount = 0;
  let result: string | null = null;
  let moveNumberLabel = '1';

  for (const token of tokenized.tokens) {
    if (token.kind === 'move-number') {
      moveNumberLabel = token.text.replace(/\.+$/, '');
      continue;
    }
    if (token.kind === 'result') {
      result = token.text;
      continue;
    }
    if (token.kind !== 'san') {
      // comments, NAGs, and variations are intentionally not validated
      continue;
    }

    const sideToMove = chess.turn() === 'w' ? 'White' : 'Black';
    try {
      const move = chess.move(token.text, { strict: false });
      moveCount++;
      plies.push({
        san: move.san,
        moveNumber: Number(moveNumberLabel),
        color: move.color,
        from: move.from,
        to: move.to,
        fenAfter: move.after,
      });
    } catch {
      const shapedLikeSan = SAN_SHAPE_RE.test(token.text);
      return {
        valid: false,
        error: {
          start: token.start,
          end: token.end,
          title: shapedLikeSan ? 'Illegal move' : 'Unrecognized move',
          reason: shapedLikeSan
            ? `"${token.text}" isn't a legal move for ${sideToMove} in this position.`
            : `"${token.text}" doesn't look like valid chess notation.`,
          snippet: token.text,
          context: `Move ${moveNumberLabel}${sideToMove === 'Black' ? '...' : '.'} — ${sideToMove} to move`,
        },
        startFen,
        plies,
      };
    }
  }

  return { valid: true, moveCount, result, headers: headerMap, startFen, plies };
}
