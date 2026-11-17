export interface InlineEditOptions {
  type?: string;
  maxLength?: number;
  commit: (value: string) => void;
  cancel: () => void;
}

/** Swap a text span for an input; Enter or blur commits, Escape cancels. */
export function startInlineEdit(span: HTMLElement, current: string, options: InlineEditOptions): void {
  const input = document.createElement('input');
  input.type = options.type ?? 'text';
  if (options.maxLength) input.maxLength = options.maxLength;
  input.value = current;
  input.className = 'inline-edit';
  span.replaceWith(input);
  input.focus();
  if (input.type !== 'date') input.select();

  let done = false;
  const finish = (save: boolean): void => {
    if (done) return;
    done = true;
    if (save) options.commit(input.value);
    else options.cancel();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true);
    else if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}
