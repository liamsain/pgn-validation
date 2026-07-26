import type { Board } from './board';
import type { PlyRecord } from '../pgn/types';

export class Navigator {
  private readonly board: Board;
  private readonly textarea: HTMLTextAreaElement;
  private readonly label: HTMLElement;
  private readonly startBtn: HTMLButtonElement;
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly endBtn: HTMLButtonElement;

  private startFen = '';
  private plies: PlyRecord[] = [];
  private currentPly = 0;

  constructor(container: HTMLElement, board: Board, textarea: HTMLTextAreaElement) {
    this.board = board;
    this.textarea = textarea;

    container.innerHTML = '';

    const controls = document.createElement('div');
    controls.className = 'nav-controls';

    this.startBtn = makeButton('⏮ Start', () => this.goTo(0));
    this.prevBtn = makeButton('◀ Prev', () => this.goTo(this.currentPly - 1));
    this.nextBtn = makeButton('Next ▶', () => this.goTo(this.currentPly + 1));
    this.endBtn = makeButton('End ⏭', () => this.goTo(this.plies.length));

    this.label = document.createElement('span');
    this.label.className = 'nav-label';

    controls.append(this.startBtn, this.prevBtn, this.label, this.nextBtn, this.endBtn);
    container.append(controls);

    window.addEventListener('keydown', (event) => {
      if (document.activeElement === this.textarea) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.goTo(this.currentPly - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.goTo(this.currentPly + 1);
      }
    });
  }

  load(startFen: string, plies: PlyRecord[]): void {
    this.startFen = startFen;
    this.plies = plies;
    this.goTo(plies.length);
  }

  private goTo(ply: number): void {
    this.currentPly = Math.max(0, Math.min(ply, this.plies.length));

    const fen = this.currentPly === 0 ? this.startFen : this.plies[this.currentPly - 1].fenAfter;
    const lastMove = this.currentPly === 0 ? undefined : this.plies[this.currentPly - 1];
    this.board.setPosition(fen, lastMove);

    if (this.currentPly === 0) {
      this.label.textContent = 'Starting position';
    } else {
      const p = this.plies[this.currentPly - 1];
      const sideToMove = p.color === 'w' ? 'Black' : 'White';
      this.label.textContent = `Move ${p.moveNumber}${p.color === 'b' ? '...' : '.'} ${p.san} — ${sideToMove} to move`;
    }

    this.startBtn.disabled = this.currentPly === 0;
    this.prevBtn.disabled = this.currentPly === 0;
    this.nextBtn.disabled = this.currentPly === this.plies.length;
    this.endBtn.disabled = this.currentPly === this.plies.length;
  }
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}
