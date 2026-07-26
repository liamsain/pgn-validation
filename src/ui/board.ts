import { DEFAULT_POSITION } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/*
 * Unicode has two chess-piece blocks — U+2654-2659 ("white") and U+265A-265F
 * ("black") — that fonts are supposed to render as hollow vs. solid glyphs.
 * In practice many platforms substitute a fixed-color emoji font for one or
 * both, which bakes in its own colors and ignores the CSS `color` we set.
 * To sidestep that, we render EVERY piece from the single solid-glyph set
 * and do the white/black distinction purely with CSS color + outline. The
 * trailing U+FE0E (text presentation selector) tells the browser to use the
 * plain vector glyph instead of an emoji-style rendering, so `color` works.
 */
const PIECE_GLYPHS: Record<string, string> = {
  k: '♚︎',
  q: '♛︎',
  r: '♜︎',
  b: '♝︎',
  n: '♞︎',
  p: '♟︎',
};

interface LastMove {
  from: string;
  to: string;
}

type Orientation = 'white' | 'black';

export class Board {
  private readonly gridEl: HTMLElement;
  private readonly flipBtn: HTMLButtonElement;
  private readonly squares = new Map<string, HTMLElement>();

  private orientation: Orientation = 'white';
  private currentFen: string = DEFAULT_POSITION;
  private currentLastMove: LastMove | undefined;

  constructor(container: HTMLElement) {
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'board-wrapper';

    const toolbar = document.createElement('div');
    toolbar.className = 'board-toolbar';
    this.flipBtn = document.createElement('button');
    this.flipBtn.type = 'button';
    this.flipBtn.className = 'nav-button';
    this.flipBtn.textContent = '⇅ Flip board';
    this.flipBtn.addEventListener('click', () => this.flip());
    toolbar.append(this.flipBtn);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'board';

    wrapper.append(toolbar, this.gridEl);
    container.append(wrapper);

    this.buildGrid();
  }

  flip(): void {
    this.orientation = this.orientation === 'white' ? 'black' : 'white';
    this.buildGrid();
    this.render();
  }

  setPosition(fen: string, lastMove?: LastMove): void {
    this.currentFen = fen;
    this.currentLastMove = lastMove;
    this.render();
  }

  private buildGrid(): void {
    this.gridEl.innerHTML = '';
    this.squares.clear();

    const ranks = this.orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = this.orientation === 'white' ? FILES : [...FILES].reverse();

    for (const rank of ranks) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const squareName = `${file}${rank}`;
        const square = document.createElement('div');
        const isLight = (FILES.indexOf(file) + rank) % 2 === 1;
        square.className = `square ${isLight ? 'square--light' : 'square--dark'}`;
        square.dataset.square = squareName;

        if (i === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'square-label square-label--rank';
          rankLabel.textContent = String(rank);
          square.append(rankLabel);
        }
        if (rank === ranks[ranks.length - 1]) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'square-label square-label--file';
          fileLabel.textContent = file;
          square.append(fileLabel);
        }

        const piece = document.createElement('span');
        piece.className = 'piece';
        square.append(piece);

        this.gridEl.append(square);
        this.squares.set(squareName, square);
      }
    }
  }

  private render(): void {
    for (const square of this.squares.values()) {
      const piece = square.querySelector('.piece') as HTMLElement;
      piece.textContent = '';
      piece.className = 'piece';
      square.classList.remove('square--last-move');
    }

    const placement = this.currentFen.split(' ')[0];
    const ranks = placement.split('/');
    for (let rankIndex = 0; rankIndex < ranks.length; rankIndex++) {
      const rank = 8 - rankIndex;
      let fileIndex = 0;
      for (const ch of ranks[rankIndex]) {
        if (/\d/.test(ch)) {
          fileIndex += Number(ch);
          continue;
        }
        const squareName = `${FILES[fileIndex]}${rank}`;
        const square = this.squares.get(squareName);
        if (square) {
          const piece = square.querySelector('.piece') as HTMLElement;
          const isWhite = ch === ch.toUpperCase();
          piece.textContent = PIECE_GLYPHS[ch.toLowerCase()] ?? '';
          piece.classList.add(isWhite ? 'piece--white' : 'piece--black');
        }
        fileIndex++;
      }
    }

    if (this.currentLastMove) {
      this.squares.get(this.currentLastMove.from)?.classList.add('square--last-move');
      this.squares.get(this.currentLastMove.to)?.classList.add('square--last-move');
    }
  }
}
