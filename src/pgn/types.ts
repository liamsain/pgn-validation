export interface Span {
  start: number;
  end: number;
}

export interface HeaderToken extends Span {
  key: string;
  value: string;
}

export type MoveTokenKind = 'move-number' | 'san' | 'comment' | 'nag' | 'result' | 'variation';

export interface MoveToken extends Span {
  kind: MoveTokenKind;
  text: string;
}

export interface TokenizeResult {
  headers: HeaderToken[];
  tokens: MoveToken[];
  /** Error found while scanning header lines (malformed bracket/quote syntax). */
  headerError: ValidationError | null;
  /** Error found while scanning movetext structure (e.g. unmatched parenthesis). */
  structureError: ValidationError | null;
}

export interface ValidationError extends Span {
  /** Short label shown in the UI, e.g. "Malformed header" or "Illegal move". */
  title: string;
  /** Longer, human-readable explanation of why this text is invalid. */
  reason: string;
  /** The exact offending snippet of text. */
  snippet: string;
  /** Move number + side, when known, e.g. "12...Bxc6" context. */
  context?: string;
}

export interface PlyRecord {
  san: string;
  moveNumber: number;
  color: 'w' | 'b';
  from: string;
  to: string;
  fenAfter: string;
}

export interface ValidationSuccess {
  valid: true;
  moveCount: number;
  result: string | null;
  headers: Record<string, string>;
  startFen: string;
  plies: PlyRecord[];
}

export interface ValidationFailure {
  valid: false;
  error: ValidationError;
  startFen: string;
  plies: PlyRecord[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;
