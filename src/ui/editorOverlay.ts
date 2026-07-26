export class EditorOverlay {
  private readonly textarea: HTMLTextAreaElement;
  private readonly highlights: HTMLDivElement;

  constructor(textarea: HTMLTextAreaElement, highlights: HTMLDivElement) {
    this.textarea = textarea;
    this.highlights = highlights;
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('input', () => this.clearError());
  }

  private syncScroll(): void {
    this.highlights.scrollTop = this.textarea.scrollTop;
    this.highlights.scrollLeft = this.textarea.scrollLeft;
  }

  clearError(): void {
    this.highlights.innerHTML = '';
  }

  showError(start: number, end: number): void {
    const text = this.textarea.value;
    const before = escapeHtml(text.slice(0, start));
    const flagged = escapeHtml(text.slice(start, end)) || ' ';
    const after = escapeHtml(text.slice(end));
    // Trailing newline keeps the overlay's height in sync with the textarea.
    this.highlights.innerHTML = `${before}<mark>${flagged}</mark>${after}\n`;
    this.syncScroll();
  }

  focusAndSelect(start: number, end: number): void {
    this.textarea.focus();
    this.textarea.setSelectionRange(start, end);
    this.syncScroll();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
