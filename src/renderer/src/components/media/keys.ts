/** True when a key event belongs to a text field, editor or terminal, not the viewer. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  if (!el || !el.closest) return false
  return Boolean(
    el.closest('input, textarea, select, [contenteditable="true"], .cm-editor, .xterm')
  )
}
