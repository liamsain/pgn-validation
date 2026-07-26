import type { ValidationResult } from '../pgn/types';

export function renderEmpty(container: HTMLElement): void {
  container.className = 'result-panel';
  container.innerHTML = '';
}

export function renderResult(container: HTMLElement, result: ValidationResult, onJump: () => void): void {
  container.innerHTML = '';

  if (result.valid) {
    container.className = 'result-panel result-panel--success';

    const heading = document.createElement('h2');
    heading.className = 'result-title';
    heading.textContent = 'Valid PGN';

    const parts = [`${result.moveCount} move${result.moveCount === 1 ? '' : 's'}`];
    if (result.result) parts.push(`result ${result.result}`);
    const players = [result.headers.White, result.headers.Black].filter(Boolean).join(' vs ');
    if (players) parts.push(players);
    if (result.headers.Event) parts.push(result.headers.Event);

    const detail = document.createElement('p');
    detail.className = 'result-detail';
    detail.textContent = parts.join(' · ');

    container.append(heading, detail);
    return;
  }

  container.className = 'result-panel result-panel--error';

  const heading = document.createElement('h2');
  heading.className = 'result-title';
  heading.textContent = result.error.title;

  const reason = document.createElement('p');
  reason.className = 'result-detail';
  reason.textContent = result.error.reason;

  container.append(heading, reason);

  if (result.error.context) {
    const context = document.createElement('p');
    context.className = 'result-context';
    context.textContent = result.error.context;
    container.append(context);
  }

  const snippetRow = document.createElement('p');
  snippetRow.className = 'result-snippet-row';
  snippetRow.append('Flagged text: ');
  const code = document.createElement('code');
  code.className = 'result-snippet';
  code.textContent = result.error.snippet || '(empty)';
  snippetRow.append(code);
  container.append(snippetRow);

  const jumpButton = document.createElement('button');
  jumpButton.type = 'button';
  jumpButton.className = 'jump-button';
  jumpButton.textContent = 'Select it in the editor';
  jumpButton.addEventListener('click', onJump);
  container.append(jumpButton);
}
