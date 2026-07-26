import './style.css';
import { tokenize } from './pgn/tokenizer';
import { validate } from './pgn/validator';
import { EditorOverlay } from './ui/editorOverlay';
import { renderEmpty, renderResult } from './ui/resultPanel';
import { Board } from './ui/board';
import { Navigator } from './ui/moveNavigator';

const form = document.getElementById('pgn-form') as HTMLFormElement;
const textarea = document.getElementById('pgn-input') as HTMLTextAreaElement;
const highlights = document.getElementById('editor-highlights') as HTMLDivElement;
const copyButton = document.getElementById('copy-button') as HTMLButtonElement;
const resultPanel = document.getElementById('result-panel') as HTMLElement;
const boardPanel = document.getElementById('board-panel') as HTMLElement;
const boardMount = document.getElementById('board-mount') as HTMLElement;
const navMount = document.getElementById('nav-mount') as HTMLElement;

const overlay = new EditorOverlay(textarea, highlights);
const board = new Board(boardMount);
const navigator = new Navigator(navMount, board, textarea);

let lastErrorRange: { start: number; end: number } | null = null;

function runValidation(): void {
  const text = textarea.value;

  if (!text.trim()) {
    overlay.clearError();
    lastErrorRange = null;
    renderEmpty(resultPanel);
    boardPanel.hidden = true;
    return;
  }

  const tokenized = tokenize(text);
  const result = validate(tokenized);

  if (result.valid) {
    overlay.clearError();
    lastErrorRange = null;
  } else {
    lastErrorRange = { start: result.error.start, end: result.error.end };
    overlay.showError(result.error.start, result.error.end);
    overlay.focusAndSelect(result.error.start, result.error.end);
  }

  renderResult(resultPanel, result, () => {
    if (lastErrorRange) overlay.focusAndSelect(lastErrorRange.start, lastErrorRange.end);
  });

  boardPanel.hidden = false;
  navigator.load(result.startFen, result.plies);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  runValidation();
});

textarea.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runValidation();
  }
});

let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

copyButton.addEventListener('click', async () => {
  try {
    await window.navigator.clipboard.writeText(textarea.value);
  } catch {
    textarea.select();
    document.execCommand('copy');
  }

  if (copyResetTimer) clearTimeout(copyResetTimer);
  copyButton.textContent = 'Copied!';
  copyButton.classList.add('copy-button--copied');
  copyResetTimer = setTimeout(() => {
    copyButton.textContent = 'Copy';
    copyButton.classList.remove('copy-button--copied');
  }, 1500);
});
